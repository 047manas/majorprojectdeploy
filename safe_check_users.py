
from app import create_app, db
from app.models import User

app = create_app()
with app.app_context():
    users = User.query.all()
    print(f"{'ID':<4} {'Email':<30} {'Role':<10} {'Position':<10} {'Dept':<10}")
    print("-" * 70)
    for u in users:
        pos = str(u.position) if u.position else "None"
        dept = str(u.department) if u.department else "None"
        print(f"{u.id:<4} {u.email:<30} {u.role:<10} {pos:<10} {dept:<10}")
