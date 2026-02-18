
from app import create_app, db
from app.models import User

app = create_app()
with app.app_context():
    users = User.query.all()
    print(f"{'ID':<4} {'Email':<30} {'Role':<10} {'Position':<10} {'Dept':<10} {'Active':<6}")
    print("-" * 80)
    for u in users:
        print(f"{u.id:<4} {u.email:<30} {u.role:<10} {u.position:<10} {u.department:<10} {u.is_active!s:<6}")
