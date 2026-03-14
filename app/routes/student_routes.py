from flask import Blueprint, request, current_app, make_response, send_from_directory, abort, jsonify, render_template, redirect
from flask_login import login_required, current_user
from app.models import ActivityType, StudentActivity, db, User, Notification
from app.services.verification.verification_service import VerificationService
from app.verification import extract, hashstore
from werkzeug.utils import secure_filename
from xhtml2pdf import pisa
import os
import io
import json
import logging
import secrets
from datetime import datetime
import uuid
import filetype
from app.utils.audit import add_audit_event
from app.utils.gamification import get_gamification_cutoffs
from app.services.storage_service import storage_service

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

    # Enforce 5MB file size limit
    file.seek(0, 2)
    size = file.tell()
    file.seek(0)
    if size > current_app.config.get('MAX_UPLOAD_SIZE', 5 * 1024 * 1024):
        return jsonify({'error': 'File too large. Maximum size is 5MB.'}), 400
        
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
        
        # --- Verification Logic (Local First) ---
        file_hash = hashstore.calculate_file_hash(filepath)
        
        verifier = VerificationService()
        verification = verifier.verify(filepath)
        
        status = 'pending'
        auto_decision = verification['auto_decision']
        
        approved_record = hashstore.lookup_hash(file_hash)
        
        if approved_record:
            status = 'auto_verified'
            auto_decision = "Verified by previously stored hash (tamper-proof)."
        elif verification['strong_auto']:
            status = 'auto_verified'
        
        # Upload to Cloud (Supabase) AFTER confirming valid file/metadata
        public_url, is_cloud = storage_service.upload_file(filepath, unique_filename)
        
        # In production, if cloud upload fails, it's an error
        if os.getenv('FLASK_ENV') == 'production' and not is_cloud:
            logging.error(f"Production Upload Failure: Could not upload {unique_filename} to Supabase.")
            return jsonify({'error': 'Cloud storage error. Please try again later or contact support.'}), 500
        
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
                else:
                    pass  # No HOD found, leave unassigned

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
            verification_token=secrets.token_urlsafe(16),
            verification_mode=verification.get('verification_mode', 'text_only'),
            auto_details=verification.get('auto_details'),
            campus_type=campus_type
        )
        db.session.add(new_activity)
        db.session.commit()

        if status == 'pending' and assigned_reviewer_id:
            notif_msg = f"New activity '{title}' submitted by {current_user.full_name} is awaiting your verification."
            notif = Notification(
                user_id=assigned_reviewer_id,
                title="Activity Verification Required",
                message=notif_msg,
                type='info',
                action_url=f"/faculty/queue",
                action_data=json.dumps({'activity_id': new_activity.id})
            )
            db.session.add(notif)
            db.session.commit()
        
        # Notify student about successful upload
        student_notif_msg = f"Certificate for '{title}' uploaded successfully. It is now pending verification."
        student_notif = Notification(
            user_id=current_user.id,
            title="Upload Successful",
            message=student_notif_msg,
            type='success',
            action_url='/student/portfolio',
            action_data=json.dumps({'activity_id': new_activity.id})
        )
        db.session.add(student_notif)
        db.session.commit()
        
        # Log Audit Trail
        aud_msg = f"Uploaded via portal. Initial Status: {status}"
        add_audit_event(new_activity.id, current_user.full_name, "Document Uploaded", aud_msg)

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
    data = []
    total_points = 0
    for a in activities:
        # Calculate points for verified activities
        if a.status in ['auto_verified', 'faculty_verified', 'hod_approved'] and a.activity_type:
            total_points += a.activity_type.weightage
            
        data.append({
            'id': a.id,
            'title': a.title,
            'issuer_name': a.issuer_name,
            'start_date': a.start_date.isoformat() if a.start_date else None,
            'status': a.status,
            'campus_type': a.campus_type or 'off_campus',
            'is_attendance_uploaded': a.is_attendance_uploaded,
            'certificate_url': f"/api/student/uploads/{a.certificate_file}?token={a.verification_token}" if a.certificate_file else None,
            'verification_token': a.verification_token,
            'verification_mode': a.verification_mode,
            'activity_type_name': a.activity_type.name if a.activity_type else (a.custom_category or 'Other'),
            'points': a.activity_type.weightage if a.activity_type else 0,
            'audit_trail': json.loads(a.audit_trail) if a.audit_trail else []
        })

    return jsonify({
        'activities': data,
        'total_points': total_points,
        'gamification': get_gamification_cutoffs()
    })

@student_bp.route('/portfolio.pdf')
@login_required
def portfolio_pdf():
    # Keep PDF generation as BLOB/Download response - this is compatible with Frontend
    mode = request.args.get('mode', 'full')
    
    query = StudentActivity.query.filter_by(student_id=current_user.id, is_deleted=False)
    
    if mode == 'verified':
        query = query.filter(StudentActivity.status.in_(['auto_verified', 'faculty_verified', 'hod_approved']))
        
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
    
@student_bp.route('/uploads/<path:filename>')
def serve_upload(filename):
    """
    Serve uploaded files. Supports both session-based and token-based access.
    Token-based access uses the ?token= query parameter.
    """
    # Check if this file exists in Cloud Storage first
    cloud_url = storage_service.get_file_url(filename)
    if cloud_url:
        # Fix: For existing files with wrong metadata (serving as text), 
        # we proxy the request for PDFs to force the correct header.
        if filename.lower().endswith('.pdf'):
            try:
                import requests
                # Proxy the file from Supabase
                proxied_resp = requests.get(cloud_url, timeout=5)
                if proxied_resp.status_code == 200:
                    response = make_response(proxied_resp.content)
                    response.headers['Content-Type'] = 'application/pdf'
                    # Allow browser to cache for performance
                    response.headers['Cache-Control'] = 'public, max-age=3600'
                    return response
            except Exception as e:
                current_app.logger.error(f"Failed to proxy PDF from cloud: {e}")
        
        # Fallback to direct redirect for non-PDFs or failed proxy
        return redirect(cloud_url)

    token = request.args.get('token')
    
    # Check if a valid token is provided
    if token:
        activity = StudentActivity.query.filter_by(certificate_file=filename, verification_token=token).first()
        if activity:
            return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)

    # Fallback to session-based access
    if not current_user or not current_user.is_authenticated:
         return jsonify({'error': 'Authentication required'}), 401
         
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
            # Enforce 5MB file size limit
            file.seek(0, 2)
            size = file.tell()
            file.seek(0)
            if size > current_app.config.get('MAX_UPLOAD_SIZE', 5 * 1024 * 1024):
                return jsonify({'error': 'File too large. Maximum size is 5MB.'}), 400
                
            # Delete old file
            if activity.certificate_file:
                old_path = os.path.join(current_app.config['UPLOAD_FOLDER'], activity.certificate_file)
                if os.path.exists(old_path):
                    try:
                        os.remove(old_path)
                    except Exception as e:
                        current_app.logger.error(f"Error deleting old certificate: {e}")
                
                # Cleanup from Cloud Storage
                storage_service.delete_file(activity.certificate_file)
            
            # Save new file
            filename = f"{current_user.institution_id}_{uuid.uuid4().hex}_{secure_filename(file.filename)}"
            upload_folder = current_app.config['UPLOAD_FOLDER']
            os.makedirs(upload_folder, exist_ok=True)
            
            filepath = os.path.join(upload_folder, filename)
            file.save(filepath)
            
            # --- Verification Logic for Re-upload ---
            file_hash = hashstore.calculate_file_hash(filepath)
            
            verifier = VerificationService()
            verification = verifier.verify(filepath)
            
            status = 'pending'
            auto_decision = verification['auto_decision']
            
            # Check for existing verified hash
            approved_record = hashstore.lookup_hash(file_hash)
            if approved_record:
                status = 'auto_verified'
                auto_decision = "Verified by previously stored hash (tamper-proof)."
            elif verification['strong_auto']:
                status = 'auto_verified'
                
            # Upload to Cloud
            public_url, is_cloud = storage_service.upload_file(filepath, filename)

            activity.certificate_file = filename
            activity.certificate_hash = file_hash
            activity.urls_json = json.dumps(verification['urls'])
            activity.ids_json = json.dumps(verification['ids'])
            activity.status = status
            activity.auto_decision = auto_decision
            activity.verification_mode = verification.get('verification_mode', 'text_only')
            activity.auto_details = verification.get('auto_details')
            activity.verification_token = secrets.token_urlsafe(16)
            activity.faculty_comment = None
        else:
            # Metadata only update - still reset to pending to be safe, or keep current?
            # Usually, if they change the title/issuer, it needs re-verification.
            activity.status = 'pending'
            activity.faculty_comment = None
    else:
        # Metadata only update (no certificate in request)
        activity.status = 'pending'
        activity.faculty_comment = None
    
    db.session.commit()
    
    if activity.status == 'pending' and activity.assigned_reviewer_id:
        notif_msg = f"Activity '{activity.title}' was re-uploaded by {current_user.full_name} and is awaiting your verification."
        notif = Notification(
            user_id=activity.assigned_reviewer_id,
            title="Activity Re-submitted for Verification",
            message=notif_msg,
            type='info',
            action_url=f"/faculty/queue",
            action_data=json.dumps({'activity_id': activity.id})
        )
        db.session.add(notif)
        db.session.commit()
    
    # Log Audit Trail
    add_audit_event(activity.id, current_user.full_name, "Document Re-uploaded/Edited", "Student edited metadata or replaced the certificate.")
    
    return jsonify({'success': True, 'message': 'Activity updated successfully'})

@student_bp.route('/activity/<int:activity_id>', methods=['GET'])
@login_required
def get_activity(activity_id):
    activity = StudentActivity.query.filter_by(id=activity_id, is_deleted=False).first()
    if not activity:
        return jsonify({'error': 'Activity not found or has been removed.'}), 404
    if activity.student_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
        
    return jsonify({
        'activity': {
            'id': activity.id,
            'title': activity.title,
            'activity_type_id': activity.activity_type_id,
            'issuer_name': activity.issuer_name,
            'issuer_editable': not bool(activity.issuer_name),
            'start_date': activity.start_date.isoformat() if activity.start_date else '',
            'end_date': activity.end_date.isoformat() if activity.end_date else '',
            'campus_type': activity.campus_type,
            'status': activity.status,
            'is_attendance_uploaded': activity.is_attendance_uploaded
        }
    })

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
        
        # Cleanup from Cloud Storage
        storage_service.delete_file(activity.certificate_file)
            
    # Notify assigned faculty of withdrawal
    if activity.assigned_reviewer_id:
        notif = Notification(
            user_id=activity.assigned_reviewer_id,
            title='Activity Withdrawn',
            message=f'Student {current_user.full_name} has withdrawn their activity submission: "{activity.title}".',
            type='warning'
        )
        db.session.add(notif)

    # Note: We do NOT hard-delete existing notifications anymore (managed by is_completed in get_notifications)
    # However, we DO want to remove "Upload Required" notifications if the activity is deleted
    Notification.query.filter(
        Notification.action_data.contains(f'"activity_id": {activity.id}')
    ).delete(synchronize_session=False)
    
    activity.is_deleted = True
    activity.deletion_reason = 'Withdrawn by student'
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Activity withdrawn successfully'})

@student_bp.route('/notifications', methods=['GET'])
@login_required
def get_notifications():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    per_page = min(per_page, 100)  # Cap at 100

    pagination = Notification.query.filter_by(
        user_id=current_user.id
    ).order_by(
        Notification.created_at.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)

    data = []
    for n in pagination.items:
        is_completed = False
        action_url = n.action_url
        
        # Check if this is an attendance upload notification that has been completed
        if n.action_data:
            try:
                action_info = json.loads(n.action_data)
                activity_id = action_info.get('activity_id')
                if activity_id:
                    linked_activity = StudentActivity.query.get(activity_id)
                    # Completed if activity is successfully reviewed (approval states) or removed
                    # Rejections and pending_uploads are NOT completed as they still require action.
                    if not linked_activity or linked_activity.is_deleted:
                        is_completed = True
                    elif linked_activity.student_id != current_user.id:
                        is_completed = True
                        action_url = None
                    elif linked_activity.status not in ('pending_upload', 'rejected'):
                        is_completed = True
                        action_url = None
                    else:
                        is_completed = False
                        # Ensure we have a valid action_url if not completed
                        if not action_url:
                            action_url = n.action_url
  # Make non-clickable
            except (json.JSONDecodeError, ValueError):
                pass
        
        # Check 2: Legacy Fallback for "ghost" notifications (No metadata)
        if not is_completed and "Certificate Upload Required" in n.title:
            import re
            # Matches: You participated in "[TITLE]" (In-Campus). Please upload your certificate...
            match = re.search(r'participated in "(.+?)"', n.message)
            if match:
                legacy_title = match.group(1)
                # Check if student already uploaded for this event
                legacy_activity = StudentActivity.query.filter_by(
                    student_id=current_user.id,
                    title=legacy_title,
                    is_deleted=False
                ).first()
                if legacy_activity and legacy_activity.status != 'pending_upload':
                    is_completed = True
                    action_url = None
                else:
                    # Final check: Does the student have ANY activity with this title that is DONE?
                    title_match = StudentActivity.query.filter_by(
                        student_id=current_user.id,
                        title=legacy_title,
                        is_deleted=False
                    ).filter(StudentActivity.status != 'pending_upload').first()
                    if title_match:
                        is_completed = True
                        action_url = None
        
        # Check 3: If the notification title itself implies completion
        if not is_completed and n.type not in ('warning', 'error'):
            if "Upload Successful" in n.title or "Verification is done" in n.message:
                is_completed = True
                action_url = None

        data.append({
            'id': n.id,
            'title': n.title,
            'message': n.message,
            'type': n.type if not is_completed else 'success',
            'is_read': n.is_read,
            'action_url': action_url,
            'action_data': n.action_data,
            'created_at': n.created_at.isoformat(),
            'is_completed': is_completed
        })
    return jsonify({
        'notifications': data,
        'total': pagination.total,
        'page': pagination.page,
        'pages': pagination.pages,
        'has_next': pagination.has_next
    })

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

    activity = StudentActivity.query.filter_by(id=activity_id, is_deleted=False).first()
    if not activity:
        return jsonify({'error': 'Activity not found or has been removed by the faculty.'}), 404

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

    # Handle optionally updating missing metadata during upload if provided
    # Only update if the existing field is empty/null
    title = request.form.get('title')
    if title and not activity.title:
        activity.title = title

    attr_type_id = request.form.get('activity_type_id')
    if attr_type_id and not activity.activity_type_id:
        try:
            activity.activity_type_id = int(attr_type_id)
        except: pass

    issuer_name = request.form.get('issuer_name')
    if issuer_name and not activity.issuer_name:
        # Student fills in the issuer that was left blank by incharge
        activity.issuer_name = issuer_name

    for date_field in ['start_date', 'end_date']:
        date_str = request.form.get(date_field)
        if date_str and not getattr(activity, date_field):
            try:
                setattr(activity, date_field, datetime.fromisoformat(date_str))
            except: pass

    # Enforce 5MB file size limit
    file.seek(0, 2)
    size = file.tell()
    file.seek(0)
    if size > current_app.config.get('MAX_UPLOAD_SIZE', 5 * 1024 * 1024):
        return jsonify({'error': 'File too large. Maximum size is 5MB.'}), 400

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

        # Upload to Cloud (Supabase)
        public_url, is_cloud = storage_service.upload_file(filepath, unique_filename)
        
        # In production, if cloud upload fails, it's an error
        if os.getenv('FLASK_ENV') == 'production' and not is_cloud:
            logging.error(f"Production Attendance Upload Failure: Could not upload {unique_filename} to Supabase.")
            return jsonify({'error': 'Cloud storage error. Please try again later or contact support.'}), 500

        # Update the activity record
        activity.certificate_file = unique_filename
        activity.certificate_hash = file_hash
        activity.urls_json = json.dumps(verification['urls'])
        activity.ids_json = json.dumps(verification['ids'])
        activity.status = status  # <-- FIX: Update the status from 'pending_upload'
        activity.auto_decision = auto_decision
        activity.verification_mode = verification.get('verification_mode', 'text_only')
        activity.auto_details = verification.get('auto_details')
        activity.is_attendance_uploaded = True # Ensure it stays True
        if not activity.verification_token:
            activity.verification_token = secrets.token_urlsafe(16)

        # Assign reviewer if pending
        if status == 'pending':
            if activity.campus_type == 'in_campus' and activity.attendance_uploaded_by:
                # For In-Campus, the person who uploaded the attendance gets first review
                activity.assigned_reviewer_id = activity.attendance_uploaded_by
            elif activity.activity_type and activity.activity_type.faculty_incharge_id:
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

        if status == 'pending' and activity.assigned_reviewer_id:
            notif_msg = f"Attendance certificate for '{activity.title}' uploaded by {current_user.full_name} is awaiting your verification."
            notif = Notification(
                user_id=activity.assigned_reviewer_id,
                title="Attendance Verification Required",
                message=notif_msg,
                type='info',
                action_url=f"/faculty/queue",
                action_data=json.dumps({'activity_id': activity.id})
            )
            db.session.add(notif)
            db.session.commit()

        # Notify student about successful upload
        student_notif_msg = f"Certificate for '{activity.title}' uploaded successfully. It is now pending verification."
        student_notif = Notification(
            user_id=current_user.id,
            title="Upload Successful",
            message=student_notif_msg,
            type='success',
            action_url='/student/portfolio',
            action_data=json.dumps({'activity_id': activity.id})
        )
        db.session.add(student_notif)
        db.session.commit()

        # Log Audit Trail
        add_audit_event(activity.id, current_user.full_name, "Attendance Document Uploaded", f"Result: {status}")

        msg_status = "Verified!" if status == 'auto_verified' else 'Queued for Faculty.'
        return jsonify({
            'success': True,
            'message': f"Certificate uploaded for '{activity.title}'. {msg_status}",
            'activity': {'id': activity.id, 'status': status}
        })
    else:
        return jsonify({'error': 'Invalid file type.'}), 400
