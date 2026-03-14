from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import check_password_hash
from app.models import User
from app.utils.api_response import success_response, error_response
import logging
from flask import current_app

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    # Browser GET request -> Redirect to Frontend
    if request.method == 'GET':
        from flask import redirect
        from flask import current_app
        frontend_url = current_app.config['ALLOWED_ORIGINS'][0]
        if current_user.is_authenticated:
             return redirect(f"{frontend_url}/")
        return redirect(f"{frontend_url}/login")
    
    # API POST request
    data = request.get_json()
    if not data:
        return error_response('Invalid request data', 400)
        
    email = data.get('email', '').strip().lower()
    password = data.get('password')
    
    user = User.query.filter_by(email=email).first()
    
    if user and check_password_hash(user.password_hash, password):
        if not user.is_active:
            return error_response('Account deactivated. Contact administrator.', 403)
            
        login_user(user)
        
        user_data = {
            'id': user.id,
            'email': user.email,
            'role': user.role,
            'full_name': user.full_name,
            'department': user.department,
            'institution_id': user.institution_id
        }
        
        return jsonify({
            'success': True,
            'message': 'Logged in successfully',
            'user': user_data
        })
    else:
        logging.warning(f"Failed login attempt for email: {email}")
        return error_response('Invalid email or password', 401)

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'success': True, 'message': 'Logged out successfully'})

# Fix #5 & #6: Return standardized response format matching what AuthContext expects
@auth_bp.route('/me', methods=['GET'])
@login_required
def get_current_user():
    return success_response({
        'id': current_user.id,
        'full_name': current_user.full_name,
        'email': current_user.email,
        'role': current_user.role,
        'department': current_user.department,
        'institution_id': current_user.institution_id
    })

@auth_bp.route('/diag', methods=['GET'])
def diag():
    """
    Hidden diagnostic endpoint to verify user existence without revealing secrets.
    Usage: /api/auth/diag?email=admin@example.com
    """
    email = request.args.get('email', '').strip().lower()
    if not email:
        return jsonify({'error': 'Email parameter required'}), 400
        
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({
            'status': 'not_found',
            'suggested_fix': 'Ensure the user was created in the production database.'
        })
        
    return jsonify({
        'status': 'found',
        'is_active': user.is_active,
        'role': user.role,
        'has_hash': bool(user.password_hash),
        'hash_len': len(user.password_hash) if user.password_hash else 0,
        'full_name': user.full_name
    })
