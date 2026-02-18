from flask import Blueprint, request, abort, jsonify
from flask_login import login_required, current_user
from app.models import StudentActivity, ActivityType, db, User
from app.verification import hashstore
import secrets
from functools import wraps

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
    # Fetch from DB now
    query = db.session.query(StudentActivity).outerjoin(ActivityType).filter(StudentActivity.status == 'pending')
    
    if current_user.role == 'faculty':
        # Implement Access Control: HOD vs Regular Faculty
        if current_user.position == 'hod' and current_user.department:
            # HOD: See all pending activities from students in their department
            # Join with User (aliased as student) to filter by department
            query = query.join(User, StudentActivity.student_id == User.id).filter(User.department == current_user.department)
        else:
            # Regular Faculty: See only assigned activities
            query = query.filter(StudentActivity.assigned_reviewer_id == current_user.id)
        
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

@faculty_bp.route('/review/<int:act_id>')
@role_required('faculty', 'admin')
def review_request(act_id):
    activity = StudentActivity.query.get_or_404(act_id)
    # Optional: Check if assigned to this faculty
    if current_user.role == 'faculty':
        is_hod = (current_user.position == 'hod' and activity.student.department == current_user.department)
        is_assigned = (activity.assigned_reviewer_id == current_user.id)
        
        if not (is_assigned or is_hod):
             return jsonify({'error': "You are not assigned to review this activity."}), 403
         
    return jsonify({
        'id': activity.id,
        'title': activity.title,
        'student_name': activity.student.full_name,
        'description': "Details...", # Add more fields as needed
        'certificate_url': f"/uploads/{activity.certificate_file}" # Construct URL
    })

@faculty_bp.route('/approve/<int:act_id>', methods=['POST'])
@role_required('faculty', 'admin')
def approve_request(act_id):
    activity = StudentActivity.query.get_or_404(act_id)
    
    # Access Control
    if current_user.role == 'faculty':
        is_hod = (current_user.position == 'hod' and activity.student.department == current_user.department)
        is_assigned = (activity.assigned_reviewer_id == current_user.id)
        
        if not (is_assigned or is_hod):
             return jsonify({'error': "You are not authorized to approve this activity."}), 403

    data = request.get_json()
    comment = data.get('faculty_comment', '')
    
    activity.status = 'faculty_verified'
    activity.faculty_id = current_user.id
    activity.faculty_comment = comment
    
    # Generate Verification Token if not exists
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
