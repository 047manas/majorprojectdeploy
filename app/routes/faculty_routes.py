from flask import Blueprint, request, abort, jsonify, current_app
from flask_login import login_required, current_user
from app.models import StudentActivity, ActivityType, db, User, Notification
from app.utils.decorators import role_required
from app.verification import hashstore
import secrets
import csv
import io
import json
from datetime import datetime
from app.utils.audit import add_audit_event
import pandas as pd
from app.services.storage_service import storage_service

faculty_bp = Blueprint('faculty', __name__)

@faculty_bp.route('/')
@role_required('faculty', 'admin')
def dashboard():
    query = db.session.query(StudentActivity).outerjoin(ActivityType).filter(StudentActivity.is_deleted == False)
    
    if current_user.role == 'faculty':
        if current_user.position == 'hod' and current_user.department:
            from sqlalchemy import or_, and_
            query = query.outerjoin(User, StudentActivity.student_id == User.id)
            
            # Join with uploader to check uploader's department
            from app.models import User as Uploader
            query = query.outerjoin(Uploader, StudentActivity.attendance_uploaded_by == Uploader.id)
            
            query = query.filter(
                or_(
                    # Case 1: Specifically assigned to this HOD
                    and_(StudentActivity.status == 'pending', StudentActivity.assigned_reviewer_id == current_user.id),
                    # Case 2: Not assigned, but student is in HOD's department
                    and_(StudentActivity.status == 'pending', StudentActivity.assigned_reviewer_id == None, User.department == current_user.department),
                    # Case 3: Not assigned, but EVENT was organized by HOD's dept
                    and_(StudentActivity.status == 'pending', StudentActivity.assigned_reviewer_id == None, Uploader.department == current_user.department)
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
        'status': a.status,
        'audit_trail': json.loads(a.audit_trail) if a.audit_trail else []
    } for a in pending_activities]
    
    return jsonify(activities_data)

@faculty_bp.route('/pending-count')
@role_required('faculty', 'admin')
def get_pending_count():
    query = db.session.query(StudentActivity).filter(StudentActivity.is_deleted == False)
    
    if current_user.role == 'faculty':
        if current_user.position == 'hod' and current_user.department:
            from sqlalchemy import or_, and_
            query = query.outerjoin(User, StudentActivity.student_id == User.id)

            # Join with uploader to check uploader's department
            from app.models import User as Uploader
            query = query.outerjoin(Uploader, StudentActivity.attendance_uploaded_by == Uploader.id)

            query = query.filter(
                or_(
                    # Case 1: Specifically assigned to this HOD
                    and_(StudentActivity.status == 'pending', StudentActivity.assigned_reviewer_id == current_user.id),
                    # Case 2: Not assigned, but student is in HOD's department
                    and_(StudentActivity.status == 'pending', StudentActivity.assigned_reviewer_id == None, User.department == current_user.department),
                    # Case 3: Not assigned, but EVENT was organized by HOD's dept
                    and_(StudentActivity.status == 'pending', StudentActivity.assigned_reviewer_id == None, Uploader.department == current_user.department)
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
        'attendance_verified_by': activity.attendance_uploader.full_name if activity.attendance_uploader else None,
        'is_attendance_uploaded': activity.is_attendance_uploaded,
        'certificate_url': f"/api/student/uploads/{activity.certificate_file}?token={activity.verification_token}" if activity.certificate_file else None,
        'certificate_file': activity.certificate_file,
        'created_at': activity.created_at.isoformat(),
        'audit_trail': json.loads(activity.audit_trail) if activity.audit_trail else []
    })

@faculty_bp.route('/approve/<int:act_id>', methods=['POST'])
@role_required('faculty', 'admin')
def approve_request(act_id):
    activity = StudentActivity.query.get_or_404(act_id)
    
    if current_user.role == 'faculty':
        is_assigned = (activity.assigned_reviewer_id == current_user.id)
        is_hod = (current_user.position == 'hod' and (
            activity.student.department == current_user.department or 
            (activity.attendance_uploader and activity.attendance_uploader.department == current_user.department)
        ))
        
        if activity.assigned_reviewer_id is not None:
            # If assigned, ONLY the assigned incharge can approve
            if not is_assigned:
                return jsonify({'error': "Only the assigned Activity In-Charge can verify this activity."}), 403
        else:
            # If unassigned, ONLY the HOD can verify
            if not is_hod:
                return jsonify({'error': "Unauthorized. This unassigned activity must be verified by the HOD."}), 403

    data = request.get_json()
    comment = data.get('faculty_comment', '')
    
    # ANY authorized approval (Faculty, HOD, Admin) is now FINAL
    if current_user.role == 'faculty' and current_user.position == 'hod':
        activity.status = 'hod_approved'
    else:
        activity.status = 'faculty_verified'
        
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

    db.session.commit()

    # Notify student about the decision
    status_label = 'HOD Approved' if (is_hod or current_user.role == 'admin') else 'Faculty Verified'
    
    # Log Audit Trail
    add_audit_event(activity.id, current_user.full_name, status_label, f"Comment: {comment}" if comment else "Approved")

    notif = Notification(
        user_id=activity.student_id,
        title='Verification Complete',
        message=f'Verification is done: Your activity "{activity.title}" has been verified and approved by {current_user.full_name}.',
        type='success',
        action_url='/student/portfolio',
        action_data=json.dumps({'activity_id': activity.id})
    )
    db.session.add(notif)

    # Cleanup: Remove the "Verification Required" notification for the faculty/admin
    Notification.query.filter(
        Notification.user_id == current_user.id,
        Notification.action_data.contains(f'"activity_id": {activity.id}')
    ).delete(synchronize_session=False)

    db.session.commit()

    return jsonify({'success': True, 'message': f"Activity #{act_id} Approved."})

@faculty_bp.route('/reject/<int:act_id>', methods=['POST'])
@role_required('faculty', 'admin')
def reject_request(act_id):
    activity = StudentActivity.query.get_or_404(act_id)
    
    # Access Control
    if current_user.role == 'faculty':
        is_assigned = (activity.assigned_reviewer_id == current_user.id)
        is_hod = (current_user.position == 'hod' and (
            activity.student.department == current_user.department or 
            (activity.attendance_uploader and activity.attendance_uploader.department == current_user.department)
        ))
        
        if activity.assigned_reviewer_id is not None:
            # If assigned, ONLY the assigned incharge can reject
            if not is_assigned:
                return jsonify({'error': "Only the assigned Activity In-Charge can reject this activity."}), 403
        else:
            # If unassigned, ONLY the HOD can reject
            if not is_hod:
                return jsonify({'error': "Unauthorized. This unassigned activity must be handled by the HOD."}), 403

    data = request.get_json()
    comment = data.get('faculty_comment', '')
    
    activity.status = 'rejected'
    activity.faculty_id = current_user.id
    activity.faculty_comment = comment
    
    db.session.commit()

    # Log Audit Trail
    add_audit_event(activity.id, current_user.full_name, "Rejected", f"Reason: {comment}" if comment else "Rejected")

    # Notify student about rejection
    notif = Notification(
        user_id=activity.student_id,
        title='Verification Complete',
        message=f'Verification is done: Your activity "{activity.title}" was not approved by {current_user.full_name}.' + (f' Reason: {comment}' if comment else ''),
        type='warning',
        action_url='/student/upload',
        action_data=json.dumps({'activity_id': activity.id, 'title': activity.title, 'prefill': True})
    )
    db.session.add(notif)

    # Cleanup: Remove the "Verification Required" notification for the faculty/admin
    Notification.query.filter(
        Notification.user_id == current_user.id,
        Notification.action_data.contains(f'"activity_id": {activity.id}')
    ).delete(synchronize_session=False)

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
        return jsonify({'error': 'No file uploaded.'}), 400

    file = request.files['file']
    filename = file.filename.lower()
    if not (filename.endswith('.csv') or filename.endswith('.xlsx') or filename.endswith('.xls')):
        return jsonify({'error': 'Please upload a valid Excel or CSV file.'}), 400

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

    # Parse Excel / CSV using pandas
    try:
        # Read the file without assuming a header row, so we don't accidentally skip the first roll number
        if filename.endswith('.csv'):
            df = pd.read_csv(file.stream, header=None, dtype=str)
        else:
            file_bytes = file.read()
            df = pd.read_excel(io.BytesIO(file_bytes), header=None, dtype=str)
    except Exception as e:
        return jsonify({'error': f'Failed to parse file: {str(e)}'}), 400

    if df.empty:
        return jsonify({'error': 'File appears to be empty.'}), 400

    # Extract Roll Numbers
    # We assume the first column contains the IDs. Drop any empty/null cells.
    roll_numbers = []
    first_col = df.iloc[:, 0].dropna()
    
    for val in first_col:
        str_val = str(val).strip()
        if not str_val:
            continue
        
        # Ignore common header names in case the user did include a header
        col_lower = str_val.lower().replace(' ', '_')
        if col_lower in ('institution_id', 'roll_number', 'roll_no', 'rollno', 'roll', 'student_id', 'id', 'course', 'name'):
            continue
            
        roll_numbers.append(str_val)

    if not roll_numbers:
        return jsonify({'error': 'Could not find any roll numbers in the first column.'}), 400

    # Process each row
    created = 0
    not_found = []
    already_exists = []

    # First pass: Filter out invalid roll numbers and identify existing records
    to_process = []
    for roll in roll_numbers:
        student = User.query.filter_by(institution_id=roll, role='student').first()
        if not student:
            not_found.append(roll)
            continue
        
        existing = StudentActivity.query.filter_by(
            student_id=student.id,
            title=title,
            start_date=start_date,
            is_deleted=False
        ).first()
        
        if existing:
            already_exists.append(roll)
            continue
            
        to_process.append(roll)

    if not_found:
        return jsonify({
            'error': f"The following roll numbers are not registered students: {', '.join(not_found)}.",
            'not_found': not_found
        }), 400

    # Second pass: Create the records for new entries only
    for roll in to_process:
        student = User.query.filter_by(institution_id=roll, role='student').first()
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
        db.session.flush() # Flush to assign new_activity.id

        # Create notification for the student
        notif = Notification(
            user_id=student.id,
            title='Certificate Upload Required',
            message=f'You participated in "{title}" (In-Campus). Please upload your certificate to complete the verification.',
            type='info',
            action_url='/student/upload',
            action_data=json.dumps({'activity_id': new_activity.id, 'title': title, 'prefill': True})
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
    """Returns in-campus events.
    - Admin: all events
    - HOD: events from their department (read-only view)
    - Faculty: only events they uploaded
    """
    from sqlalchemy import func, or_

    base_filter = [
        StudentActivity.campus_type == 'in_campus',
        StudentActivity.is_attendance_uploaded == True,
        StudentActivity.is_deleted == False
    ]

    events = db.session.query(
        StudentActivity.title,
        StudentActivity.start_date,
        StudentActivity.attendance_uploaded_by,
        func.count(StudentActivity.id).label('total_students'),
        func.sum(
            db.case(
                (StudentActivity.status != 'pending_upload', 1),
                else_=0
            )
        ).label('uploaded_count')
    ).filter(*base_filter)

    if current_user.role == 'faculty':
        if current_user.position and current_user.position.lower() == 'hod' and current_user.department:
            # HOD sees: their own events + events where students belong to their dept
            events = events.outerjoin(User, StudentActivity.student_id == User.id).filter(
                or_(
                    StudentActivity.attendance_uploaded_by == current_user.id,
                    User.department == current_user.department
                )
            )
        else:
            events = events.filter(StudentActivity.attendance_uploaded_by == current_user.id)

    events = events.group_by(
        StudentActivity.title,
        StudentActivity.start_date,
        StudentActivity.attendance_uploaded_by
    ).order_by(StudentActivity.start_date.desc()).all()

    data = [{
        'title': e.title,
        'start_date': e.start_date.isoformat() if e.start_date else None,
        'total_students': e.total_students,
        'uploaded_count': e.uploaded_count,
        'pending_count': e.total_students - e.uploaded_count,
        'is_owner': e.attendance_uploaded_by == current_user.id
    } for e in events]

    return jsonify(data)

@faculty_bp.route('/event/<path:title>/<start_date>', methods=['GET'])
@role_required('faculty', 'admin')
def get_event_students(title, start_date):
    """Returns students and upload status for a managed event.
    HOD can view department events (read-only). Event in-charge has edit rights.
    """
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

    # Determine edit permission
    can_edit = False
    if current_user.role == 'admin':
        can_edit = True
    elif current_user.role == 'faculty':
        # Check if current user is the event uploader
        sample = query.first()
        if sample and sample.attendance_uploaded_by == current_user.id:
            can_edit = True
            query = query.filter_by(attendance_uploaded_by=current_user.id)
        elif current_user.position and current_user.position.lower() == 'hod' and current_user.department:
            # HOD can VIEW and EDIT department students records for in-campus events
            query = query.join(User, StudentActivity.student_id == User.id).filter(
                User.department == current_user.department
            )
            can_edit = True
        else:
            query = query.filter_by(attendance_uploaded_by=current_user.id)

    activities = query.join(User, StudentActivity.student_id == User.id).order_by(User.institution_id).all()

    # Serialize the student records
    data = [{
        'activity_id': a.id,
        'student_name': a.student.full_name,
        'student_roll': a.student.institution_id,
        'student_department': a.student.department,
        'status': a.status,
        'certificate_file': a.certificate_file
    } for a in activities]

    # Get metadata from the first record if it exists
    metadata = {}
    if activities:
        a = activities[0]
        metadata = {
            'title': a.title,
            'issuer_name': a.issuer_name,
            'start_date': a.start_date.isoformat(),
            'end_date': a.end_date.isoformat() if a.end_date else None,
            'activity_type_id': a.activity_type_id
        }

    return jsonify({
        'students': data, 
        'can_edit': can_edit,
        'metadata': metadata
    })


@faculty_bp.route('/event/add-student', methods=['POST'])
@role_required('faculty', 'admin')
def add_student_to_event():
    """Add a student to an existing event roster by roll number.
    Only the event in-charge (uploader) or admin can do this.
    """
    data = request.get_json()
    title = data.get('title')
    start_date_str = data.get('start_date')
    roll_number = data.get('roll_number', '').strip()

    if not title or not start_date_str or not roll_number:
        return jsonify({'error': 'Title, start_date, and roll_number are required.'}), 400

    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format.'}), 400

    # Verify the event exists and current user is the in-charge
    sample_record = StudentActivity.query.filter_by(
        title=title,
        start_date=start_date,
        campus_type='in_campus',
        is_attendance_uploaded=True,
        is_deleted=False
    ).first()

    if not sample_record:
        return jsonify({'error': 'Event not found.'}), 404

    if current_user.role == 'faculty' and sample_record.attendance_uploaded_by != current_user.id:
        return jsonify({'error': 'Only the event in-charge can modify the roster.'}), 403

    # Find the student (Case-insensitive lookup)
    from sqlalchemy import func
    student = User.query.filter(
        func.lower(User.institution_id) == roll_number.lower(),
        User.role == 'student',
        User.is_deleted == False
    ).first()
    
    if not student:
        return jsonify({'error': f'Student with roll number "{roll_number}" not found.'}), 404

    # Check for duplicate
    existing = StudentActivity.query.filter_by(
        student_id=student.id,
        title=title,
        start_date=start_date,
        is_deleted=False
    ).first()
    
    if existing:
        return jsonify({
            'success': True, 
            'message': f'Student {student.full_name} is already in the event roster.',
            'already_exists': True
        })

    # Create the record
    new_activity = StudentActivity(
        student_id=student.id,
        activity_type_id=sample_record.activity_type_id,
        title=title,
        issuer_name=sample_record.issuer_name,
        start_date=start_date,
        end_date=sample_record.end_date,
        certificate_file='',
        status='pending_upload',
        campus_type='in_campus',
        is_attendance_uploaded=True,
        attendance_uploaded_by=sample_record.attendance_uploaded_by,
    )
    db.session.add(new_activity)
    db.session.flush() # Ensure new_activity.id is populated for the notification

    # Notify the student
    notif = Notification(
        user_id=student.id,
        title='Certificate Upload Required',
        message=f'You have been added to "{title}" (In-Campus). Please upload your certificate.',
        type='info',
        action_url='/student/upload',
        action_data=json.dumps({'activity_id': new_activity.id, 'title': title, 'prefill': True})
    )
    db.session.add(notif)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'Student {student.full_name} ({roll_number}) added to the event.'
    })


@faculty_bp.route('/event/remove-student/<int:activity_id>', methods=['DELETE'])
@role_required('faculty', 'admin')
def remove_student_from_event(activity_id):
    """Remove a student from an event roster.
    Only allowed for pending_upload records (student hasn't uploaded yet).
    Only the event in-charge or admin can do this.
    """
    activity = StudentActivity.query.get_or_404(activity_id)

    # Must be an attendance record
    if not activity.is_attendance_uploaded:
        return jsonify({'error': 'This is not an attendance record.'}), 400

    # Permission: only event in-charge or admin
    if current_user.role == 'faculty' and activity.attendance_uploaded_by != current_user.id:
        return jsonify({'error': 'Only the event in-charge can modify the roster.'}), 403

    # Cleanup: if there's a file, we should probably delete it or at least mark it
    if activity.certificate_file:
        storage_service.delete_file(activity.certificate_file)

    # Cleanup pending notifications for this specific activity
    Notification.query.filter(
        Notification.action_data.contains(f'"activity_id": {activity.id}')
    ).delete(synchronize_session=False)

    activity.is_deleted = True
    activity.deletion_reason = f'Removed from roster by {current_user.full_name}'
    db.session.commit()

    return jsonify({'success': True, 'message': 'Student removed from event roster.'})

@faculty_bp.route('/delete-event', methods=['POST'])
@role_required('faculty', 'admin')
def delete_event():
    """
    Bulk delete all student records for a specific event.
    Usually used to clear a mistake before re-uploading.
    """
    data = request.get_json() or {}
    title = data.get('title')
    start_date_str = data.get('start_date')

    if not title or not start_date_str:
        return jsonify({'error': 'Title and start_date are required.'}), 400

    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
    except ValueError:
        # Try ISO format if simple date fails
        try:
            start_date = datetime.fromisoformat(start_date_str.replace('Z', '')).date()
        except ValueError:
            return jsonify({'error': 'Invalid date format.'}), 400

    # Find all activities for this event uploaded by this faculty (or allow admin)
    query = StudentActivity.query.filter_by(
        title=title,
        start_date=start_date,
        is_deleted=False
    )
    
    if current_user.role == 'faculty':
        query = query.filter_by(attendance_uploaded_by=current_user.id)

    activities = query.all()
    if not activities:
        return jsonify({'error': 'No matching event records found.'}), 404

    deleted_count = 0
    migrated_count = 0
    notified_student_ids = set()
    event_incharge_id = activities[0].attendance_uploaded_by if activities else None

    for act in activities:
        if act.status == 'pending_upload':
            if act.certificate_file:
                storage_service.delete_file(act.certificate_file)
                
            act.is_deleted = True
            act.deletion_reason = f"Event removed by {current_user.full_name}"
            deleted_count += 1
            
            # Notify of removal
            if act.student_id not in notified_student_ids:
                notif = Notification(
                    user_id=act.student_id,
                    title='Event Removed',
                    message=f'The event "{title}" has been removed by {current_user.full_name}. Asscoiated pending records have been deleted.',
                    type='warning',
                    action_url='/student/portfolio'
                )
                db.session.add(notif)
                notified_student_ids.add(act.student_id)
            
            # Audit Cleanup: Remove any "Certificate Upload Required" or "Verification Required" notifications
            Notification.query.filter(
                Notification.action_data.contains(f'"activity_id": {act.id}')
            ).delete(synchronize_session=False)
        else:
            # Student already uploaded a certificate! Do NOT delete.
            # Convert to a standard off-campus activity and re-route to HOD
            act.campus_type = 'off_campus'
            act.is_attendance_uploaded = False
            act.attendance_uploaded_by = None
            act.activity_type_id = None # Move to 'Other' category as requested
            
            # Find the HOD for the student's department to take over review
            hod = User.query.filter_by(
                department=act.student.department, 
                role='faculty',
                position='hod'
            ).first()
            
            old_reviewer = act.assigned_reviewer_id
            act.assigned_reviewer_id = hod.id if hod else None
            
            if act.status == 'faculty_verified' and old_reviewer != act.assigned_reviewer_id:
                # If it was already verified by the current incharge, keep it verified.
                # If it's still pending, it just shifts to the HOD's queue.
                pass
                
            migrated_count += 1
                
            # Notify of migration
            if act.student_id not in notified_student_ids:
                notif = Notification(
                    user_id=act.student_id,
                    title='Event Removed (Certificate Preserved)',
                    message=f'The in-campus event "{title}" was removed by {current_user.full_name}. However, because you already uploaded your certificate, your record has been preserved and converted to a regular off-campus activity for your HOD to verify.',
                    type='info'
                )
                db.session.add(notif)
                notified_student_ids.add(act.student_id)

    # Notify incharge if someone else deleted their event
    if event_incharge_id and event_incharge_id != current_user.id:
        incharge_notif = Notification(
            user_id=event_incharge_id,
            title='In-Campus Event Deleted',
            message=f'The event "{title}" has been deleted by {current_user.full_name}. {deleted_count} pending student records were removed, and {migrated_count} submitted certificates were converted to off-campus records (Other).',
            type='error'
        )
        db.session.add(incharge_notif)

    db.session.commit()
    return jsonify({
        'success': True,
        'message': f'Deleted {deleted_count} pending records. Preserved {migrated_count} submitted certificates. {len(notified_student_ids)} students notified.'
    })

@faculty_bp.route('/event/bulk-approve', methods=['POST'])
@role_required('faculty', 'admin')
def bulk_approve_event():
    """Approve all students in an event roster who have 'pending' status.
    Only the event uploader or admin can do this.
    """
    data = request.get_json()
    title = data.get('title')
    start_date_str = data.get('start_date')

    if not title or not start_date_str:
        return jsonify({'error': 'Title and start_date are required.'}), 400

    try:
        from datetime import datetime
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format.'}), 400

    # Find pending activities for this event
    query = StudentActivity.query.filter_by(
        title=title,
        start_date=start_date,
        status='pending',
        is_deleted=False
    )

    # Scoping: Only uploader or admin
    if current_user.role == 'faculty':
        # Check if they are the uploader of at least one record in this event
        sample = StudentActivity.query.filter_by(title=title, start_date=start_date).first()
        if not sample or sample.attendance_uploaded_by != current_user.id:
            return jsonify({'error': 'Only the event in-charge can bulk approve.'}), 403
        
        query = query.filter_by(attendance_uploaded_by=current_user.id)

    activities = query.all()
    count = 0
    from app.routes.analytics_routes import add_audit_event
    for activity in activities:
        activity.status = 'faculty_verified'
        activity.faculty_id = current_user.id
        
        # Log Audit Trail
        add_audit_event(activity.id, current_user.full_name, "Verified (Bulk)", "Approved via Event Roster Bulk Action")
        
        # Cleanup: Remove the "Verification Required" notification for the faculty/admin
        Notification.query.filter(
            Notification.user_id == current_user.id,
            Notification.action_data.contains(f'"activity_id": {activity.id}')
        ).delete(synchronize_session=False)
        
        count += 1

    db.session.commit()
    return jsonify({'success': True, 'message': f'Successfully approved {count} certificates.'})


@faculty_bp.route('/event/update-details', methods=['PATCH'])
@role_required('faculty', 'admin')
def update_event_details():
    """Update event details (title, dates, issuer) for all records in a roster.
    Only the event uploader or admin can do this.
    """
    data = request.get_json()
    old_title = data.get('old_title')
    old_start_date_str = data.get('old_start_date')
    
    new_title = data.get('title')
    new_issuer_name = data.get('issuer_name')
    new_start_date_str = data.get('start_date')
    new_end_date_str = data.get('end_date')

    if not old_title or not old_start_date_str:
        return jsonify({'error': 'Original Title and start_date are required.'}), 400

    try:
        from datetime import datetime
        old_start_date = datetime.strptime(old_start_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid old_start_date format.'}), 400

    # Find activities for this event
    query = StudentActivity.query.filter_by(
        title=old_title,
        start_date=old_start_date,
        is_deleted=False
    )

    # Scoping: Only uploader or admin
    if current_user.role == 'faculty':
        sample = StudentActivity.query.filter_by(title=old_title, start_date=old_start_date).first()
        if not sample or sample.attendance_uploaded_by != current_user.id:
            return jsonify({'error': 'Only the event in-charge can edit details.'}), 403
        query = query.filter_by(attendance_uploaded_by=current_user.id)

    activities = query.all()
    if not activities:
        return jsonify({'error': 'No matching event records found.'}), 404

    # Validate new dates
    new_start_date = None
    if new_start_date_str:
        try:
            new_start_date = datetime.strptime(new_start_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid new start_date format.'}), 400

    new_end_date = None
    if new_end_date_str:
        try:
            new_end_date = datetime.strptime(new_end_date_str, '%Y-%m-%d').date()
        except ValueError:
            pass # allow null or ignore invalid end date if not essential

    # Track what changed for notification message
    changes = []
    if new_title and new_title != old_title:
        changes.append(f'title changed to "{new_title}"')
    if new_issuer_name is not None:
        changes.append('issuer updated')
    if new_start_date and str(new_start_date) != str(old_start_date):
        changes.append('start date updated')
    if new_end_date:
        changes.append('end date updated')

    # Update all records
    for activity in activities:
        if new_title:
            activity.title = new_title
        if new_issuer_name is not None:
            activity.issuer_name = new_issuer_name
        if new_start_date:
            activity.start_date = new_start_date
        if new_end_date:
            activity.end_date = new_end_date

    db.session.commit()

    # Notify students about the event detail changes
    if changes:
        notified_ids = set()
        change_summary = ', '.join(changes)
        for activity in activities:
            if activity.student_id not in notified_ids:
                notif = Notification(
                    user_id=activity.student_id,
                    title='Event Details Updated',
                    message=f'The event "{old_title}" has been updated by {current_user.full_name}: {change_summary}.',
                    type='info',
                    action_url='/student/upload',
                    action_data=json.dumps({
                        'activity_id': activity.id,
                        'title': activity.title,
                        'prefill': True
                    })
                )
                db.session.add(notif)
                notified_ids.add(activity.student_id)
        db.session.commit()

    return jsonify({
        'success': True, 
        'message': f'Successfully updated details for {len(activities)} records.',
        'updated_event': {
            'title': new_title or old_title,
            'start_date': new_start_date_str or old_start_date_str
        }
    })

@faculty_bp.route('/notifications', methods=['GET'])
@role_required('faculty')
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

        # Check 1: Notification links to a specific activity via action_data
        if n.action_data:
            try:
                action_info = json.loads(n.action_data)
                activity_id = action_info.get('activity_id')
                if activity_id:
                    linked_activity = StudentActivity.query.get(activity_id)
                    # Completed if activity is reviewed (not pending) or removed
                    if not linked_activity or linked_activity.is_deleted or linked_activity.status not in ['pending', 'pending_upload']:
                        is_completed = True
                        action_url = None
            except (json.JSONDecodeError, ValueError):
                pass

        # Check 2: Faculty "event assigned" notification — check if attendance already uploaded
        if not is_completed and n.action_url and 'activity_type_id=' in str(n.action_url):
            try:
                from urllib.parse import urlparse, parse_qs
                parsed = urlparse(n.action_url)
                qs = parse_qs(parsed.query)
                at_id = qs.get('activity_type_id', [None])[0]
                if at_id:
                    has_uploads = StudentActivity.query.filter_by(
                        activity_type_id=int(at_id),
                        is_attendance_uploaded=True,
                        is_deleted=False
                    ).first()
                    if has_uploads:
                        is_completed = True
                        action_url = None
            except (ValueError, Exception):
                pass
        
        # Check 3: Legacy Fallback for "ghost" notifications (No metadata)
        if not is_completed and "awaiting your verification" in n.message:
            import re
            # Matches: Attendance certificate for '[TITLE]' uploaded by student [ROLL] is awaiting your verification.
            match = re.search(r"certificate for '(.+?)' uploaded by student (\w+)", n.message)
            if match:
                legacy_title = match.group(1)
                legacy_roll = match.group(2)
                
                # Check if this specific activity is already reviewed
                from app.models import User as Student
                legacy_activity = StudentActivity.query.join(Student, StudentActivity.student_id == Student.id).filter(
                    StudentActivity.title == legacy_title,
                    Student.institution_id == legacy_roll,
                    StudentActivity.status.notin_(['pending', 'pending_upload']),
                    StudentActivity.is_deleted == False
                ).first()
                if legacy_activity:
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

@faculty_bp.route('/notifications/read-all', methods=['POST'])
@role_required('faculty')
def mark_all_read():
    Notification.query.filter_by(user_id=current_user.id, is_read=False).update({Notification.is_read: True})
    db.session.commit()
    return jsonify({'success': True})

