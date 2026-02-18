from flask import Blueprint, render_template, current_app, redirect, jsonify
from app.models import StudentActivity
from app.verification import hashstore
import os

public_bp = Blueprint('public', __name__)

@public_bp.route('/')
def index():
    # Redirect to the Vite Frontend during development
    return redirect("http://localhost:5173")

@public_bp.route('/api/verify/<token>')
def verify_api(token):
    """JSON API for React public verification page."""
    activity = StudentActivity.query.filter_by(verification_token=token).first()
    if not activity:
        return jsonify({'error': 'Certificate not found or not verified.'}), 404
    
    if activity.status not in ['faculty_verified', 'auto_verified']:
        return jsonify({'error': 'This record is not fully verified yet.'}), 400
    
    hash_match = None
    recomputed_hash = None
    
    if activity.certificate_file:
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], activity.certificate_file)
        if os.path.exists(filepath):
            recomputed_hash = hashstore.calculate_file_hash(filepath)
            hash_match = (recomputed_hash == activity.certificate_hash)
    
    verified_by = 'Institution'
    if activity.status == 'auto_verified':
        verified_by = 'System (Automated)'
    elif activity.faculty:
        verified_by = activity.faculty.full_name
    
    return jsonify({
        'student_name': activity.student.full_name,
        'institution_id': activity.student.institution_id,
        'title': activity.title,
        'activity_type': activity.activity_type.name if activity.activity_type else (activity.custom_category or 'Other'),
        'start_date': activity.start_date.isoformat() if activity.start_date else None,
        'status': activity.status,
        'verified_by': verified_by,
        'certificate_hash': activity.certificate_hash,
        'hash_match': hash_match,
        'recomputed_hash': recomputed_hash
    })

@public_bp.route('/verify/<token>')
def verify_public(token):
    activity = StudentActivity.query.filter_by(verification_token=token).first_or_404()
    
    if activity.status not in ['faculty_verified', 'auto_verified']:
        return render_template('verify_public.html', error="This record is not fully verified yet.")
        
    hash_match = False
    recomputed_hash = None
    
    if activity.certificate_file:
         filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], activity.certificate_file)
         if os.path.exists(filepath):
             recomputed_hash = hashstore.calculate_file_hash(filepath)
             if recomputed_hash == activity.certificate_hash:
                 hash_match = True
    
    return render_template('verify_public.html', activity=activity, hash_match=hash_match)

