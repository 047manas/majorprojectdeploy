from flask import Blueprint, request, current_app, make_response, send_from_directory, abort, jsonify, render_template
from flask_login import login_required, current_user
from app.models import ActivityType, StudentActivity, db, User, Notification
from app.services.verification.verification_service import VerificationService
from app.verification import extract, hashstore
from werkzeug.utils import secure_filename
from xhtml2pdf import pisa
import os
import io
import json
import secrets
from datetime import datetime
import uuid
import filetype

student_bp = Blueprint('student', __name__)

ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}
ALLOWED_MIME_TYPES = {'application/pdf', 'image/png', 'image/jpeg', 'image/jpg'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def validate_mime_type(file_stream):
    header = file_stream.read(2048)
    file_stream.seek(0)
    kind = filetype.guess(header)
    if kind is None:
        return False
    return kind.mime in ALLOWED_MIME_TYPES

@student_bp.route('/', methods=['GET'])
@login_required
def dashboard():
    # Role Check
    if current_user.role != 'student':
        return jsonify({'error': 'Unauthorized'}), 403

    # Return Dashboard Data - Filter out deleted
    activities = StudentActivity.query.filter_by(student_id=current_user.id, is_deleted=False).order_by(StudentActivity.created_at.desc()).all()
    activities_data = [{
        'id': a.id,
        'title': a.title,
        'status': a.status,
        'campus_type': a.campus_type or 'off_campus',
        'created_at': a.created_at.isoformat(),
        'certificate_file': a.certificate_file
    } for a in activities]
    
    # Also return activity types for the dropdown
    activity_types = ActivityType.query.all()
    types_data = [{'id': at.id, 'name': at.name} for at in activity_types]
        
    # Remove POST handling from dashboard
    return jsonify({
        'activities': activities_data,
        'activity_types': types_data,
        'user_roll_no': current_user.institution_id
    })

@student_bp.route('/upload', methods=['POST'])
@login_required
def upload_activity():
    print(f"DEBUG: UPLOAD ROUTE HIT by User {current_user.id}")
    print(f"DEBUG: Form Data: {request.form}")
    print(f"DEBUG: Files: {request.files}")

    if current_user.role != 'student':
        return jsonify({'error': 'Unauthorized'}), 403

    # Use hidden field or current_user data if student
    roll_number = request.form.get('roll_number') if not (current_user.role == 'student' and current_user.institution_id) else current_user.institution_id
    
    activity_type_id = request.form.get('activity_type_id')
    title = request.form.get('title')
    issuer = request.form.get('issuer_name')
    start_date_str = request.form.get('start_date')
    end_date_str = request.form.get('end_date')
    campus_type = request.form.get('campus_type', 'off_campus')
    if campus_type not in ('in_campus', 'off_campus'):
        campus_type = 'off_campus'

    # Basic Form Validation
    if not activity_type_id:
        return jsonify({'error': "Please select an Activity Type."}), 400
    if not title:
        return jsonify({'error': "Activity Title is required."}), 400

    selected_activity = None
    custom_category = None
    
    if activity_type_id == 'other':
        custom_category = request.form.get('custom_category')
        if not custom_category:
             return jsonify({'error': "Custom Category is required for 'Other'."}), 400
    else:
        selected_activity = ActivityType.query.get(int(activity_type_id))
        if not selected_activity:
            return jsonify({'error': "Invalid Activity Type."}), 400
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    # Secure Upload Logic
    if file and allowed_file(file.filename):
        if not validate_mime_type(file.stream):
           return jsonify({'error': 'Invalid file type detected. Please upload a valid PDF or Image.'}), 400

        original_filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4().hex}_{original_filename}"
        
        upload_folder = current_app.config['UPLOAD_FOLDER']
        os.makedirs(upload_folder, exist_ok=True)
        
        filepath = os.path.join(upload_folder, unique_filename)
        file.save(filepath)
        
        # --- Verification Logic ---
        verifier = VerificationService()
        verification = verifier.verify(filepath)
        
        status = 'pending'
        auto_decision = verification['auto_decision']
        
        file_hash = hashstore.calculate_file_hash(filepath)
        approved_record = hashstore.lookup_hash(file_hash)
        
        if approved_record:
            status = 'auto_verified'
            auto_decision = "Verified by previously stored hash (tamper-proof)."
        elif verification['strong_auto']:
            status = 'auto_verified'
        
        # --- Routing Logic ---
        assigned_reviewer_id = None
        if status == 'pending':
            # Priority 1: Faculty In-Charge for defined Activity Types
            if selected_activity and selected_activity.faculty_incharge_id:
                assigned_reviewer_id = selected_activity.faculty_incharge_id
            
            # Priority 2: HOD of Student's Department (For 'Other' or if In-Charge missing)
            if not assigned_reviewer_id:
                # Find HOD
                hod = User.query.filter_by(
                    department=current_user.department, 
                    role='faculty',
                    position='hod'
                ).first()
                if hod:
                    assigned_reviewer_id = hod.id
                    print(f"DEBUG: Assigned to HOD {hod.email} (Reason: 'Other' or No In-Charge)")
                else:
                    print(f"DEBUG: No HOD found for {current_user.department}. Leaving unassigned.")

        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        else:
            start_date = datetime.now().date() # Default to upload date (today) as per request
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else None

        prev_activity = StudentActivity.query.filter_by(student_id=current_user.id).order_by(StudentActivity.created_at.desc()).first()
        prev_id = prev_activity.id if prev_activity else None

        new_activity = StudentActivity(
            student_id=current_user.id,
            activity_type_id=selected_activity.id if selected_activity else None,
            custom_category=custom_category,
            title=title,
            issuer_name=issuer,
            start_date=start_date,
            end_date=end_date,
            certificate_file=unique_filename,
            certificate_hash=file_hash,
            urls_json=json.dumps(verification['urls']),
            ids_json=json.dumps(verification['ids']),
            status=status,
            auto_decision=auto_decision,
            prev_activity_id=prev_id,
            assigned_reviewer_id=assigned_reviewer_id,
            verification_token=secrets.token_urlsafe(16) if status == 'auto_verified' else None,
            verification_mode=verification.get('verification_mode', 'text_only'),
            auto_details=verification.get('auto_details'),
            campus_type=campus_type
        )
        db.session.add(new_activity)
        db.session.commit()
        
        msg_status = "Verified!" if status == "auto_verified" else "Queued for Faculty."
        
        return jsonify({
            'success': True, 
            'message': f"Activity '{title}' Recorded. {msg_status}",
            'activity': {
                'id': new_activity.id,
                'status': status
            }
        })
    else:
        return jsonify({'error': 'Invalid file type.'}), 400

@student_bp.route('/portfolio')
@login_required
def portfolio():
    activities = StudentActivity.query.filter_by(student_id=current_user.id, is_deleted=False).order_by(StudentActivity.created_at.desc()).all()
    # Serialize
    data = [{
        'id': a.id,
        'title': a.title,
        'issuer_name': a.issuer_name,
        'start_date': a.start_date.isoformat() if a.start_date else None,
        'status': a.status,
        'campus_type': a.campus_type or 'off_campus',
        'is_attendance_uploaded': a.is_attendance_uploaded,
        'certificate_url': f"/api/student/uploads/{a.certificate_file}" if a.certificate_file else None,
        'verification_token': a.verification_token,
        'verification_mode': a.verification_mode,
        'activity_type_name': a.activity_type.name if a.activity_type else (a.custom_category or 'Other')
    } for a in activities]
    return jsonify(data)

@student_bp.route('/portfolio.pdf')
@login_required
def portfolio_pdf():
    # Keep PDF generation as BLOB/Download response - this is compatible with Frontend
    mode = request.args.get('mode', 'full')
    
    query = StudentActivity.query.filter_by(student_id=current_user.id, is_deleted=False)
    
    if mode == 'verified':
        query = query.filter(StudentActivity.status.in_(['auto_verified', 'faculty_verified']))
        
    activities = query.order_by(StudentActivity.created_at.desc()).all()
    
    # NOTE: Render template here acts as an internal mechanism to generate PDF string, NOT a browser response
    # We need to make sure 'student/portfolio_pdf.html' actually exists or replace it.
    # Assuming it exists for now as I didn't verify its deletion.
    if not os.path.exists(os.path.join(current_app.root_path, 'templates', 'student', 'portfolio_pdf.html')):
         # Fallback or error if template missing
         return jsonify({'error': 'PDF Template missing'}), 500

    html = render_template('student/portfolio_pdf.html', 
                           activities=activities, 
                           user=current_user,
                           generation_date=datetime.now().strftime('%Y-%m-%d'))
    
    pdf_buffer = io.BytesIO()
    pisa_status = pisa.CreatePDF(html, dest=pdf_buffer)
    
    if pisa_status.err:
       return jsonify({'error': f"Error creating PDF: {pisa_status.err}"}), 500
       
    response = make_response(pdf_buffer.getvalue())
    response.headers['Content-Type'] = 'application/pdf'
    response.headers['Content-Disposition'] = f'attachment; filename=portfolio_{current_user.institution_id}.pdf'
    
    return response

@student_bp.route('/uploads/<path:filename>')
@login_required
def serve_upload(filename):
    if current_user.role not in ['faculty', 'admin', 'student']:
        return jsonify({'error': 'Unauthorized'}), 403
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)

@student_bp.route('/activity/<int:activity_id>', methods=['PUT'])
@login_required
def edit_activity(activity_id):
    activity = StudentActivity.query.get_or_404(activity_id)
    
    # Security: Only owner can edit
    if activity.student_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
        
    data = request.form
    activity.title = data.get('title', activity.title)
    activity.issuer_name = data.get('issuer_name', activity.issuer_name)
    activity.custom_category = data.get('custom_category', activity.custom_category)
    activity.organizer = data.get('organizer', activity.organizer)
    
    # Campus type
    campus_type = data.get('campus_type')
    if campus_type in ('in_campus', 'off_campus'):
        activity.campus_type = campus_type
    
    # Handle dates
    if data.get('start_date'):
        try:
            activity.start_date = datetime.strptime(data.get('start_date'), '%Y-%m-%d').date()
        except ValueError:
            pass
    if data.get('end_date'):
        try:
            activity.end_date = datetime.strptime(data.get('end_date'), '%Y-%m-%d').date()
        except ValueError:
            pass

    if 'activity_type_id' in data and data.get('activity_type_id'):
        activity.activity_type_id = int(data.get('activity_type_id'))

    # Handle file replacement
    if 'certificate' in request.files:
        file = request.files['certificate']
        if file and file.filename and allowed_file(file.filename):
            # Delete old file
            if activity.certificate_file:
                old_path = os.path.join(current_app.config['UPLOAD_FOLDER'], activity.certificate_file)
                if os.path.exists(old_path):
                    try:
                        os.remove(old_path)
                    except Exception as e:
                        current_app.logger.error(f"Error deleting old certificate: {e}")
            
            # Save new file
            filename = f"{current_user.institution_id}_{uuid.uuid4().hex}_{secure_filename(file.filename)}"
            filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            activity.certificate_file = filename
            activity.certificate_hash = hashstore.calculate_file_hash(filepath)
            
    # Reset status on edit to re-trigger verification (manual or auto)
    activity.status = 'pending'
    activity.verification_token = None
    activity.verification_mode = None
    activity.faculty_comment = None
    
    db.session.commit()
    return jsonify({'success': True, 'message': 'Activity updated successfully'})

@student_bp.route('/activity/<int:activity_id>', methods=['DELETE'])
@login_required
def delete_activity(activity_id):
    activity = StudentActivity.query.get_or_404(activity_id)
    
    # Security: Only owner can delete (Admin route is separate)
    if activity.student_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403

    # Delete file
    if activity.certificate_file:
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], activity.certificate_file)
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except Exception as e:
                current_app.logger.error(f"Error deleting certificate file: {e}")
            
    db.session.delete(activity)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Activity deleted successfully'})

@student_bp.route('/notifications', methods=['GET'])
@login_required
def get_notifications():
    notifs = Notification.query.filter_by(user_id=current_user.id).order_by(Notification.created_at.desc()).all()
    data = [{
        'id': n.id,
        'title': n.title,
        'message': n.message,
        'type': n.type,
        'is_read': n.is_read,
        'created_at': n.created_at.isoformat()
    } for n in notifs]
    return jsonify(data)

@student_bp.route('/notifications/read-all', methods=['POST'])
@login_required
def mark_all_read():
    Notification.query.filter_by(user_id=current_user.id, is_read=False).update({Notification.is_read: True})
    db.session.commit()
    return jsonify({'success': True})

@student_bp.route('/upload-for-attendance/<int:activity_id>', methods=['POST'])
@login_required
def upload_for_attendance(activity_id):
    """Student uploads a certificate for an attendance-driven pending record."""
    if current_user.role != 'student':
        return jsonify({'error': 'Unauthorized'}), 403

    activity = StudentActivity.query.get_or_404(activity_id)

    # Security: Only the student who owns this record
    if activity.student_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403

    # Only allow for pending_upload records
    if activity.status != 'pending_upload':
        return jsonify({'error': 'This activity is not awaiting certificate upload.'}), 400

    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file and allowed_file(file.filename):
        if not validate_mime_type(file.stream):
            return jsonify({'error': 'Invalid file type detected.'}), 400

        original_filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4().hex}_{original_filename}"

        upload_folder = current_app.config['UPLOAD_FOLDER']
        os.makedirs(upload_folder, exist_ok=True)

        filepath = os.path.join(upload_folder, unique_filename)
        file.save(filepath)

        # Verification
        verifier = VerificationService()
        verification = verifier.verify(filepath)

        status = 'pending'
        auto_decision = verification['auto_decision']

        file_hash = hashstore.calculate_file_hash(filepath)
        approved_record = hashstore.lookup_hash(file_hash)

        if approved_record:
            status = 'auto_verified'
            auto_decision = "Verified by previously stored hash (tamper-proof)."
        elif verification['strong_auto']:
            status = 'auto_verified'

        # Update the activity record
        activity.certificate_file = unique_filename
        activity.certificate_hash = file_hash
        activity.urls_json = json.dumps(verification['urls'])
        activity.ids_json = json.dumps(verification['ids'])
        activity.status = status
        activity.auto_decision = auto_decision
        activity.verification_mode = verification.get('verification_mode', 'text_only')
        activity.auto_details = verification.get('auto_details')
        if status == 'auto_verified':
            activity.verification_token = secrets.token_urlsafe(16)

        # Assign reviewer if pending
        if status == 'pending':
            if activity.activity_type and activity.activity_type.faculty_incharge_id:
                activity.assigned_reviewer_id = activity.activity_type.faculty_incharge_id
            else:
                hod = User.query.filter_by(
                    department=current_user.department,
                    role='faculty',
                    position='hod'
                ).first()
                if hod:
                    activity.assigned_reviewer_id = hod.id

        db.session.commit()

        msg_status = "Verified!" if status == 'auto_verified' else 'Queued for Faculty.'
        return jsonify({
            'success': True,
            'message': f"Certificate uploaded for '{activity.title}'. {msg_status}",
            'activity': {'id': activity.id, 'status': status}
        })
    else:
        return jsonify({'error': 'Invalid file type.'}), 400
