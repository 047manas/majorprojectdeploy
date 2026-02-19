from app import create_app
from app.models import db, User
app = create_app()
with app.app_context():
    users = User.query.all()
    with open("users_list.txt", "w") as f:
        for u in users:
            f.write(f"{u.email:35} role={u.role:10} active={u.is_active}\n")
    print(f"Written {len(users)} users to users_list.txt")
