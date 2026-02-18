
from app import create_app, db
from app.models import User
from werkzeug.security import generate_password_hash

app = create_app()
with app.app_context():
    user = User.query.filter_by(email='admin@example.com').first()
    if user:
        print(f"User found: {user.email}, Role: {user.role}")
        # Reset password to 'admin'
        user.password_hash = generate_password_hash('admin')
        db.session.commit()
        print("Password reset to 'admin'.")
    else:
        print("User admin@example.com NOT FOUND.")
