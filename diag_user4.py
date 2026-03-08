
from app import create_app
from app.models import db, User

app = create_app()
with app.app_context():
    u = User.query.get(4)
    if u:
        print(f"User ID 4 | Name: {u.full_name} | Role: {u.role} | Position: {u.position} | Dept: {u.department}")
    else:
        print("User ID 4 not found.")
