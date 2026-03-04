from flask import Blueprint, request, abort, jsonify, current_app
from flask_login import login_required, current_user
from app.models import StudentActivity, ActivityType, db, User, Notification
from app.verification import hashstore
import secrets
import csv
import io
from functools import wraps
from datetime import datetime

faculty_bp = Blueprint('faculty', __name__)

# --- Auth Helpers ---
def role_required(*roles):
    def decorator(f):
        @wraps(f)
        @login_required
        def wrapped(*args, **kwargs):
            if current_user.role not in roles:
                return jsonify({'error': 'Unauthorized access'}), 403
            return f(*args, **kwargs)
        return wrapped
    return decorator

@faculty_bp.route('/')
@role_required('faculty', 'admin')
def dashboard():
    query = db.session.query(StudentActivity).outerjoin(ActivityType)
    
    if current_user.role == 'faculty':
        if current_user.position == 'hod' and current_user.department:
            from sqlalchemy import or_, and_
            query = query.outerjoin(User, StudentActivity.student_id == User.id).filter(
                or_(
                    and_(StudentActivity.status == 'pending', StudentActivity.assigned_reviewer_id == current_user.id),
                    and_(StudentActivity.status == 'faculty_verified', User.department == current_user.department)
                )
            )
        else:
            query = query.filter(
                StudentActivity.status == 'pending', 
                StudentActivity.assigned_reviewer_id == current_user.id
            )
    elif current_user.role == 'admin':
        from sqlalchemy import or_
        query = query.filter(or_(StudentActivity.status == 'pending', StudentActivity.status == 'faculty_verified'))
        
    pending_activities = query.order_by(StudentActivity.created_at.desc()).all()
    
    # Serialize
    activities_data = [{
        'id': a.id,
        'title': a.title,
        'student_name': a.student.full_name,
        'student_id': a.student.institution_id,
        'activity_type_name': a.activity_type.name if a.activity_type else (a.custom_category or 'Other'),
        'created_at': a.created_at.isoformat(),
        'status': a.status
    } for a in pending_activities]
    
    return jsonify(activities_data)

@faculty_bp.route('/pending-count')
@role_required('faculty', 'admin')
def get_pending_count():
    query = db.session.query(StudentActivity)
    
    if current_user.role == 'faculty':
        if current_user.position == 'hod' and current_user.department:
            from sqlalchemy import or_, and_
            query = query.outerjoin(User, StudentActivity.student_id == User.id).filter(
                or_(
                    and_(StudentActivity.status == 'pending', StudentActivity.assigned_reviewer_id == current_user.id),
                    and_(StudentActivity.status == 'faculty_verified', User.department == current_user.department)
                )
            )
        else:
            query = query.filter(
                StudentActivity.status == 'pending', 
                StudentActivity.assigned_reviewer_id == current_user.id
            )
    elif current_user.role == 'admin':
        from sqlalchemy import or_
        query = query.filter(or_(StudentActivity.status == 'pending', StudentActivity.status == 'faculty_verified'))
            
    count = query.count()
    return jsonify({'count': count})


@faculty_bp.route('/review/<int:act_id>')
@role_required('faculty', 'admin')
def review_request(act_id):
    activity = StudentActivity.query.get_or_404(act_id)
    # Access Control
    if current_user.role == 'faculty':
        is_hod = (current_user.position == 'hod' and activity.student.department == current_user.department)
        is_assigned = (activity.assigned_reviewer_id == current_user.id)
        
        if not (is_assigned or is_hod):
             return jsonify({'error': "You are not assigned to review this activity."}), 403

    # Build certificate URL
    cert_url = None
    if activity.certificate_file:
        from flask import url_for as flask_url_for
        try:
            cert_url = flask_url_for('student.serve_upload', filename=activity.certificate_file, _external=True)
        except Exception:
            cert_url = f"/api/student/uploads/{activity.certificate_file}"

    return jsonify({
        'id': activity.id,
        'title': activity.title,
        'student_name': activity.student.full_name,
        'student_roll': activity.student.institution_id,
        'student_department': activity.student.department,
        'category': activity.activity_type.name if activity.activity_type else (activity.custom_category or 'Other'),
        'issuer_name': activity.issuer_name or '',
        'organizer': activity.organizer or '',
        'start_date': str(activity.start_date) if activity.start_date else None,
        'end_date': str(activity.end_date) if activity.end_date else None,
        'status': activity.status,
        'verification_mode': activity.verification_mode,
        'certificate_url': cert_url,
        'certificate_file': activity.certificate_file,
        'created_at': activity.created_at.isoformat()
    })

@faculty_bp.route('/approve/<int:act_id>', methods=['POST'])
@role_required('faculty', 'admin')
def approve_request(act_id):
    activity = StudentActivity.query.get_or_404(act_id)
    
    is_hod = False
    if current_user.role == 'faculty':
        is_hod = (current_user.position == 'hod' and activity.student.department == current_user.department)
        is_assigned = (activity.assigned_reviewer_id == current_user.id)
        
        if not (is_assigned or is_hod):
             return jsonify({'error': "You are not authorized to approve this activity."}), 403

    data = request.get_json()
    comment = data.get('faculty_comment', '')
    
    if is_hod or current_user.role == 'admin':
        activity.status = 'hod_approved'
        activity.faculty_id = current_user.id
        activity.faculty_comment = comment
        
        if not activity.verification_token:
            activity.verification_token = secrets.token_urlsafe(16)
        
        if activity.certificate_hash:
             hashstore.store_approved_hash(
                file_hash=activity.certificate_hash,
                roll_no=activity.student.institution_id,
                filename=activity.certificate_file,
                request_id=activity.id,
                faculty_comment=comment
            )
    else:
        # Regular Faculty
        activity.status = 'faculty_verified'
        activity.faculty_id = current_user.id
        activity.faculty_comment = comment

    db.session.commit()
    return jsonify({'success': True, 'message': f"Activity #{act_id} Approved."})

@faculty_bp.route('/reject/<int:act_id>', methods=['POST'])
@role_required('faculty', 'admin')
def reject_request(act_id):
    activity = StudentActivity.query.get_or_404(act_id)
    
    # Access Control
    if current_user.role == 'faculty':
        is_hod = (current_user.position == 'hod' and activity.student.department == current_user.department)
        is_assigned = (activity.assigned_reviewer_id == current_user.id)
        
        if not (is_assigned or is_hod):
             return jsonify({'error': "You are not authorized to reject this activity."}), 403

    data = request.get_json()
    comment = data.get('faculty_comment', '')
    
    activity.status = 'rejected'
    activity.faculty_id = current_user.id
    activity.faculty_comment = comment
    
    db.session.commit()
    return jsonify({'success': True, 'message': f"Activity #{act_id} Rejected."})

# --- Attendance Upload for In-Campus Events ---

@faculty_bp.route('/upload-attendance', methods=['POST'])
@role_required('faculty')
def upload_attendance():
    """
    Faculty uploads attendance CSV for an in-campus event.
    Creates pending_upload StudentActivity records and notifies students.
    """
    activity_type_id = request.form.get('activity_type_id')
    title = request.form.get('title')
    start_date_str = request.form.get('start_date')
    end_date_str = request.form.get('end_date')
    issuer_name = request.form.get('conducted_by') or request.form.get('issuer_name', '')

    if not title:
        return jsonify({'error': 'Event title is required.'}), 400
    if not start_date_str:
        return jsonify({'error': 'Start date is required.'}), 400

    if 'file' not in request.files:
        return jsonify({'error': 'No CSV file uploaded.'}), 400

    file = request.files['file']
    if file.filename == '' or not file.filename.lower().endswith('.csv'):
        return jsonify({'error': 'Please upload a valid CSV file.'}), 400

    # Parse dates
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid start date format.'}), 400
    end_date = None
    if end_date_str:
        try:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError:
            pass

    # Resolve activity type
    selected_activity_type = None
    if activity_type_id and activity_type_id != 'other':
        try:
            selected_activity_type = ActivityType.query.get(int(activity_type_id))
        except (ValueError, TypeError):
            pass

    # Parse CSV - look for institution_id / roll_number column
    try:
        content = file.stream.read().decode('utf-8-sig')
        reader = csv.DictReader(io.StringIO(content))
    except Exception as e:
        return jsonify({'error': f'Failed to parse CSV: {str(e)}'}), 400

    # Find the column containing roll numbers
    if not reader.fieldnames:
        return jsonify({'error': 'CSV file appears to be empty.'}), 400

    roll_col = None
    for col in reader.fieldnames:
        col_lower = col.strip().lower().replace(' ', '_')
        if col_lower in ('institution_id', 'roll_number', 'roll_no', 'rollno', 'roll', 'student_id', 'id'):
            roll_col = col
            break

    if not roll_col:
        return jsonify({'error': f'CSV must have a column named one of: institution_id, roll_number, roll_no, roll, student_id. Found: {", ".join(reader.fieldnames)}'}), 400

    # Process each row
    created = 0
    not_found = []
    already_exists = []

    for row in reader:
        roll = row.get(roll_col, '').strip()
        if not roll:
            continue

        # Look up the student
        student = User.query.filter_by(institution_id=roll, role='student').first()
        if not student:
            not_found.append(roll)
            continue

        # Check if an activity with the same title + start_date already exists for this student
        existing = StudentActivity.query.filter_by(
            student_id=student.id,
            title=title,
            start_date=start_date,
            is_deleted=False
        ).first()
        if existing:
            already_exists.append(roll)
            continue

        # Create the pending_upload record
        new_activity = StudentActivity(
            student_id=student.id,
            activity_type_id=selected_activity_type.id if selected_activity_type else None,
            title=title,
            issuer_name=issuer_name,
            start_date=start_date,
            end_date=end_date,
            certificate_file='',  # Empty - student fills this later
            status='pending_upload',
            campus_type='in_campus',
            is_attendance_uploaded=True,
            attendance_uploaded_by=current_user.id,
        )
        db.session.add(new_activity)

        # Create notification for the student
        notif = Notification(
            user_id=student.id,
            title='Certificate Upload Required',
            message=f'You participated in "{title}" (In-Campus). Please upload your certificate to complete the verification.',
            type='info'
        )
        db.session.add(notif)
        created += 1

    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Attendance processed: {created} records created.',
        'summary': {
            'created': created,
            'not_found': not_found,
            'already_exists': already_exists
        }
    })

@faculty_bp.route('/managed-events', methods=['GET'])
@role_required('faculty', 'admin')
def managed_events():
    """Returns in-campus events managed by this faculty member."""
    query = StudentActivity.query.filter_by(
        campus_type='in_campus',
        is_attendance_uploaded=True,
        is_deleted=False
    )

    if current_user.role == 'faculty':
        query = query.filter_by(attendance_uploaded_by=current_user.id)

    # Group by title + start_date
    from sqlalchemy import func
    events = db.session.query(
        StudentActivity.title,
        StudentActivity.start_date,
        func.count(StudentActivity.id).label('total_students'),
        func.sum(
            db.case(
                (StudentActivity.status != 'pending_upload', 1),
                else_=0
            )
        ).label('uploaded_count')
    ).filter(
        StudentActivity.campus_type == 'in_campus',
        StudentActivity.is_attendance_uploaded == True,
        StudentActivity.is_deleted == False
    )

    if current_user.role == 'faculty':
        events = events.filter(StudentActivity.attendance_uploaded_by == current_user.id)

    events = events.group_by(
        StudentActivity.title,
        StudentActivity.start_date
    ).order_by(StudentActivity.start_date.desc()).all()

    data = [{
        'title': e.title,
        'start_date': e.start_date.isoformat() if e.start_date else None,
        'total_students': e.total_students,
        'uploaded_count': e.uploaded_count,
        'pending_count': e.total_students - e.uploaded_count
    } for e in events]

    return jsonify(data)

@faculty_bp.route('/event/<path:title>/<start_date>', methods=['GET'])
@role_required('faculty', 'admin')
def get_event_students(title, start_date):
    """Returns specific students and their upload status for a managed event."""
    try:
        parsed_date = datetime.strptime(start_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid start date format.'}), 400

    query = StudentActivity.query.filter_by(
        title=title,
        start_date=parsed_date,
        campus_type='in_campus',
        is_attendance_uploaded=True,
        is_deleted=False
    )

    if current_user.role == 'faculty':
        query = query.filter_by(attendance_uploaded_by=current_user.id)

    activities = query.join(User, StudentActivity.student_id == User.id).order_by(User.institution_id).all()

    data = [{
        'activity_id': a.id,
        'student_name': a.student.full_name,
        'student_roll': a.student.institution_id,
        'status': a.status,
    } for a in activities]

    return jsonify(data)
