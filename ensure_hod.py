
from app import create_app, db
from app.models import User
from werkzeug.security import generate_password_hash

app = create_app()
with app.app_context():
    # Check for HOD in CSE
    hod = User.query.filter_by(role='faculty', position='hod', department='CSE').first()
    if not hod:
        print("Creating CSE HOD...")
        hod = User(
            email='hod.cse@college.edu',
            password_hash=generate_password_hash('hod123'),
            role='faculty',
            position='hod',
            full_name='Dr. CSE HOD',
            department='CSE',
            institution_id='FAC001'
        )
        db.session.add(hod)
        db.session.commit()
        print(f"Created HOD: {hod.email}")
    else:
        print(f"Found HOD: {hod.email}")
