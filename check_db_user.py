
import os
from dotenv import load_dotenv
load_dotenv()

from app import create_app
from app.models import db, User
from werkzeug.security import check_password_hash

app = create_app()

with app.app_context():
    print(f"Database URI: {app.config['SQLALCHEMY_DATABASE_URI']}")
    user = User.query.filter_by(email='admin@example.com').first()
    if not user:
        print("User admin@example.com NOT FOUND in database!")
    else:
        print(f"User found: {user.email}")
        print(f"Role: {user.role}")
        print(f"Is active: {user.is_active}")
        
        # Test a standard password if you know what it should be
        # print(f"Password 'admin123' check: {check_password_hash(user.password_hash, 'admin123')}")
