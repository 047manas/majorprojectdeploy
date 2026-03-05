"""Shared authentication decorators for route protection."""
from functools import wraps
from flask import jsonify
from flask_login import login_required, current_user


def role_required(*roles):
    """Decorator that restricts access to users with specific roles.
    
    Usage:
        @role_required('admin')
        @role_required('faculty', 'admin')
    """
    def decorator(f):
        @wraps(f)
        @login_required
        def wrapped(*args, **kwargs):
            if current_user.role not in roles:
                return jsonify({'error': 'Unauthorized access'}), 403
            return f(*args, **kwargs)
        return wrapped
    return decorator
