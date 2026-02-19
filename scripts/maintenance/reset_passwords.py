from app import create_app
from app.models import db, User
from werkzeug.security import generate_password_hash

app = create_app()
with app.app_context():
    pw_map = {'admin': 'admin123', 'faculty': 'faculty123', 'student': 'student123'}
    for u in User.query.all():
        new_pw = pw_map.get(u.role, 'password')
        u.password_hash = generate_password_hash(new_pw)
    db.session.commit()
    
    for u in User.query.all():
        print(f"{u.email:35} -> {pw_map.get(u.role)}")
    print("All passwords reset!")
