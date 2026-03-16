from flask import Blueprint, redirect, url_for, flash, request, abort, jsonify, current_app
import os
from flask_login import login_required, current_user
from app.models import User, db, ActivityType, StudentActivity, Notification
from app.utils.decorators import role_required
from werkzeug.security import generate_password_hash
from app.services.storage_service import storage_service
from app.verification import hashstore

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/users')
@role_required('admin')
def users_dashboard():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 100, type=int)
    per_page = min(per_page, 200)

    pagination = User.query.filter_by(is_deleted=False).order_by(User.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    users = pagination.items
    users_data = [{
        'id': u.id,
        'email': u.email,
        'role': u.role,
        'position': u.position,
        'full_name': u.full_name,
        'department': u.department,
        'institution_id': u.institution_id,
        'is_active': u.is_active,
        'created_at': u.created_at.isoformat() if u.created_at else None
    } for u in users]
    return jsonify(users_data)

@admin_bp.route('/users/create', methods=['POST'])
@role_required('admin')
def create_user():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    password = data.get('password')
    role = data.get('role')
    position = data.get('position')
    full_name = data.get('full_name')
    department = data.get('department')
    institution_id = data.get('institution_id')
    
    if not full_name:
         return jsonify({'error': 'Full Name is required.'}), 400
         
    if role == 'faculty':
        if not department or not institution_id:
            return jsonify({'error': 'Faculty must have Department and Institution ID.'}), 400
            
    if role == 'student':
        if not department:
            return jsonify({'error': 'Students must have a Department.'}), 400
        if not institution_id:
             return jsonify({'error': 'Students must have an Institution ID.'}), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered.'}), 400
    
    if institution_id and User.query.filter_by(institution_id=institution_id).first():
        return jsonify({'error': 'Institution ID must be unique.'}), 400
        
    new_user = User(
        email=email,
        password_hash=generate_password_hash(password),
        role=role,
        position=position,
        full_name=full_name,
        department=department,
        institution_id=institution_id
    )
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({'success': True, 'message': f'User {email} created successfully.'})

@admin_bp.route('/users/<int:user_id>/edit', methods=['GET', 'POST'])
@role_required('admin')
def edit_user(user_id):
    user = User.query.get_or_404(user_id)
    
    if request.method == 'GET':
        return jsonify({
            'id': user.id,
            'email': user.email,
            'role': user.role,
            'position': user.position,
            'full_name': user.full_name,
            'department': user.department,
            'institution_id': user.institution_id,
            'is_active': user.is_active
        })
    
    data = request.get_json()
    full_name = data.get('full_name')
    email = data.get('email', '').strip().lower()
    role = data.get('role')
    position = data.get('position')
    department = data.get('department')
    institution_id = data.get('institution_id')
    password = data.get('password')
    is_active = data.get('is_active')
    
    if not full_name:
        return jsonify({'error': 'Full Name is required.'}), 400
    if not email:
        return jsonify({'error': 'Email is required.'}), 400

    import logging
    logging.info(f"Admin {current_user.email} attempting to update user {user_id}. New email: {email}")

    existing_email = User.query.filter(User.email == email, User.id != user_id).first()
    if existing_email:
        return jsonify({'error': 'Email already in use.'}), 400
        
    if institution_id:
        existing_id = User.query.filter(User.institution_id == institution_id, User.id != user_id).first()
        if existing_id:
            return jsonify({'error': 'Institution ID already in use.'}), 400
    
    if user.role == 'admin' and user.email == 'admin@example.com':
            if is_active is False:
                return jsonify({'error': "Cannot deactivate default admin."}), 400
            if role != 'admin':
                return jsonify({'error': "Cannot change role of default admin."}), 400

    # Apply updates
    user.full_name = full_name
    user.email = email
    user.role = role
    user.position = position
    user.department = department
    user.institution_id = institution_id
    if is_active is not None:
        user.is_active = is_active
    
    if password:
            user.password_hash = generate_password_hash(password)
    
    try:
        db.session.commit()
        logging.info(f"User {user_id} updated successfully. Email set to: {user.email}")
    except Exception as e:
        db.session.rollback()
        logging.error(f"Failed to update user {user_id}: {str(e)}")
        return jsonify({'error': 'Database update failed. Please try again.'}), 500

    return jsonify({'success': True, 'message': 'User updated successfully.'})


@admin_bp.route('/users/toggle/<int:user_id>', methods=['POST'])
@role_required('admin')
def toggle_user(user_id):
    user = User.query.get_or_404(user_id)
    if user.role == 'admin' and user.email == 'admin@example.com':
        return jsonify({'error': 'Cannot deactivate default admin'}), 400
    else:
        user.is_active = not user.is_active
        db.session.commit()
        status = "Activated" if user.is_active else "Deactivated"
        return jsonify({'success': True, 'message': f"User {user.email} {status}."})

@admin_bp.route("/users/<int:user_id>/delete", methods=["POST"])
@role_required('admin')
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json() or {}
    reason = data.get('reason', 'No reason provided')
    
    if user.id == current_user.id:
        return jsonify({'error': 'Cannot delete your own admin account.'}), 400
        
    if user.role == 'admin' and user.email == 'admin@example.com':
        return jsonify({'error': 'Cannot delete default admin.'}), 400
    
    # Notify student of deletion
    notif_student = Notification(
        user_id=user.id,
        title='Account Management',
        message=f'Your account record has been updated/removed by an Admin. Reason: {reason}',
        type='warning'
    )
    db.session.add(notif_student)
    
    # Hard delete: remove record from database
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({'success': True, 'message': f"User {user.email} permanently deleted."})

# --- Activity Types ---
@admin_bp.route('/activity-types', methods=['GET', 'POST'])
@role_required('admin', 'faculty')
def activity_types():
    if request.method == 'GET':
        # Faculty only sees their assigned activity types; admin sees all
        if current_user.role == 'faculty':
            activity_types = ActivityType.query.filter_by(faculty_incharge_id=current_user.id).all()
        else:
            activity_types = ActivityType.query.all()
        # Optionally return faculty list for dropdowns if needed, or separate endpoint
        at_data = [{
            'id': at.id,
            'name': at.name,
            'description': at.description,
            'default_campus_type': at.default_campus_type or 'off_campus',
            'weightage': at.weightage,
            'faculty_incharge_id': at.faculty_incharge_id,
            'faculty_incharge_name': at.faculty_incharge.full_name if at.faculty_incharge else None
        } for at in activity_types]
        return jsonify(at_data)

    data = request.get_json()
    name = data.get('name')
    faculty_id = data.get('faculty_id')
    description = data.get('description')
    default_campus_type = data.get('default_campus_type', 'off_campus')
    if default_campus_type not in ('in_campus', 'off_campus'):
        default_campus_type = 'off_campus'
    
    if ActivityType.query.filter_by(name=name, description=description).first():
        return jsonify({'error': f"An activity with the name '{name}' and title '{description}' already exists."}), 400
    else:
        weightage = data.get('weightage', 10)
        try:
            weightage = int(weightage)
        except (TypeError, ValueError):
            weightage = 10
        new_at = ActivityType(name=name, faculty_incharge_id=faculty_id, description=description, default_campus_type=default_campus_type, weightage=weightage)
        db.session.add(new_at)
        db.session.commit()
        
        # Notify assigned faculty ONLY for in_campus activities
        if faculty_id and default_campus_type == 'in_campus':
            msg = f"You have been assigned as In-Charge for a new In-Campus event: {name}. Please upload attendance."
            notif = Notification(
                user_id=faculty_id,
                title="New In-Campus Event Assigned",
                message=msg,
                type='info',
                action_url=f"/faculty/attendance?activity_type_id={new_at.id}"
            )
            db.session.add(notif)
            db.session.commit()
            
        return jsonify({'success': True, 'message': 'Activity Type created.'})

@admin_bp.route('/activity-types/<int:at_id>/edit', methods=['GET', 'POST'])
@role_required('admin')
def edit_activity_type(at_id):
    at = ActivityType.query.get_or_404(at_id)
    
    if request.method == 'GET':
        return jsonify({
            'id': at.id,
            'name': at.name,
            'description': at.description,
            'default_campus_type': at.default_campus_type or 'off_campus',
            'weightage': at.weightage,
            'faculty_incharge_id': at.faculty_incharge_id
        })
        
    data = request.get_json()
    at.name = data.get('name')
    at.faculty_incharge_id = data.get('faculty_id')
    at.description = data.get('description')
    default_campus_type = data.get('default_campus_type', at.default_campus_type)
    if default_campus_type in ('in_campus', 'off_campus'):
        at.default_campus_type = default_campus_type
    
    existing = ActivityType.query.filter(ActivityType.name == at.name, ActivityType.description == at.description, ActivityType.id != at.id).first()
    if existing:
        return jsonify({'error': f"An activity with the name '{at.name}' and title '{at.description}' already exists."}), 400
    else:
        weightage = data.get('weightage', at.weightage)
        try:
            at.weightage = int(weightage)
        except (TypeError, ValueError):
            pass
        db.session.commit()
        return jsonify({'success': True, 'message': f"Activity Type '{at.name}' updated."})
@admin_bp.route('/activity-types/<int:at_id>/usage', methods=['GET'])
@role_required('admin')
def get_activity_type_usage(at_id):
    at = ActivityType.query.get_or_404(at_id)
    count = StudentActivity.query.filter_by(activity_type_id=at_id).count()
    return jsonify({
        'id': at.id,
        'count': count,
        'has_linked_activities': count > 0
    })

@admin_bp.route('/activity-types/delete/<int:at_id>', methods=['POST'])
@role_required('admin')
def delete_activity_type(at_id):
    at = ActivityType.query.get_or_404(at_id)
    
    # Preserve student certificates: Convert linked activities to 'Other' (Custom Category)
    try:
        linked_activities = StudentActivity.query.filter_by(activity_type_id=at.id).all()
        count = 0
        for act in linked_activities:
            # Only migrate active (non-deleted) records
            if not act.is_deleted:
                act.activity_type_id = None
                act.custom_category = at.name # Preserve original category name
                # Optional: act.deletion_reason = f"Migrated from deleted type '{at.name}'"
                count += 1
        
        db.session.delete(at)
        db.session.commit()
        return jsonify({'success': True, 'message': f"Activity Type deleted. {count} student records moved to '{at.name}' (Custom)."})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/student-activities/delete/<int:activity_id>', methods=['DELETE', 'POST'])
@role_required('admin', 'faculty')
def admin_delete_activity(activity_id):
    activity = StudentActivity.query.get_or_404(activity_id)
    data = request.get_json() or {}
    reason = data.get('reason', 'No reason provided')

    # Permission check for Faculty
    if current_user.role == 'faculty':
        is_incharge = activity.activity_type and activity.activity_type.faculty_incharge_id == current_user.id
        if not is_incharge:
             return jsonify({'error': 'Unauthorized: You are not the In-Charge for this activity category.'}), 403

    # Notify stakeholders before deletion
    # 1. Notify Student
    notif_student = Notification(
        user_id=activity.student_id,
        title='Activity Record Deleted',
        message=f'Your activity "{activity.title}" was deleted by an Admin. Reason: {reason}',
        type='error'
    )
    db.session.add(notif_student)

    # 2. Notify Assigned Faculty (if any and not the one deleting)
    if activity.assigned_reviewer_id and activity.assigned_reviewer_id != current_user.id:
        notif_faculty = Notification(
            user_id=activity.assigned_reviewer_id,
            title='Assigned Activity Deleted',
            message=f'The activity "{activity.title}" (Student: {activity.student.full_name}) assigned to you was deleted by {current_user.full_name}.',
            type='warning'
        )
        db.session.add(notif_faculty)

    # Note: We do NOT hard-delete existing notifications anymore so they show as "Done/Deleted"
    # Mark the activity as deleted in the DB instead of hard delete if we want to preserve audit trail?
    # Actually, the user wants it "deleted from list" but notifications to stay.
    
    # Cleanup pending notifications for this specific activity
    Notification.query.filter(
        Notification.action_data.contains(f'"activity_id": {activity.id}')
    ).delete(synchronize_session=False)
        
    # Cleanup storage if file exists
    if activity.certificate_file:
        try:
            storage_service.delete_file(activity.certificate_file)
        except Exception as e:
            current_app.logger.error(f"Failed to delete file from storage during admin delete: {e}")

    activity.is_deleted = True
    activity.deletion_reason = reason
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Student activity record soft-deleted.'})
