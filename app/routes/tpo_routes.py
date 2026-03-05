from flask import Blueprint, jsonify
from flask_login import login_required, current_user
from app.models import db, User, StudentActivity, ActivityType
from app.utils.decorators import role_required
from sqlalchemy import or_

tpo_bp = Blueprint('tpo', __name__)

@tpo_bp.route('/student/<string:roll_number>', methods=['GET'])
@role_required('admin')
def get_student_profile(roll_number):
    """
    Fetch a student's profile, verified activities, and calculate total activity points.
    Restricted to admin (or TPO).
    """
    student = User.query.filter_by(institution_id=roll_number, role='student', is_deleted=False).first()
    
    if not student:
        return jsonify({'error': 'Student not found.'}), 404

    # Fetch only verified activities (auto_verified or hod_approved)
    # Plus faculty_verified if we consider that partially verified, but let's stick to fully approved
    verified_activities = db.session.query(StudentActivity).join(ActivityType).filter(
        StudentActivity.student_id == student.id,
        or_(StudentActivity.status == 'auto_verified', StudentActivity.status == 'hod_approved'),
        StudentActivity.is_deleted == False
    ).all()

    total_points = 0
    activities_data = []

    for act in verified_activities:
        weightage = act.activity_type.weightage if act.activity_type else 0
        total_points += weightage
        
        activities_data.append({
            'id': act.id,
            'title': act.title,
            'activity_type_name': act.activity_type.name if act.activity_type else 'Unknown',
            'weightage': weightage,
            'start_date': act.start_date.isoformat() if act.start_date else None,
            'issuer_name': act.issuer_name,
            'status': act.status,
            'verification_mode': act.verification_mode,
            'certificate_url': f"/api/public/certificate/{act.certificate_hash}" if act.certificate_hash else None
        })

    return jsonify({
        'student': {
            'full_name': student.full_name,
            'institution_id': student.institution_id,
            'department': student.department,
            'batch_year': student.batch_year,
            'email': student.email
        },
        'total_points': total_points,
        'activities': activities_data
    })
