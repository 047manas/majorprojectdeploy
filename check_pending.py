from app import create_app
from app.models import db, StudentActivity, User
app = create_app()
with app.app_context():
    pending = StudentActivity.query.filter_by(status='pending').all()
    for a in pending:
        reviewer = User.query.get(a.assigned_reviewer_id) if a.assigned_reviewer_id else None
        print(f"Activity: {a.title}")
        print(f"  Student: {a.student.full_name} ({a.student.department})")
        print(f"  Assigned To: {reviewer.full_name if reviewer else 'NONE'} ({reviewer.email if reviewer else 'N/A'})")
        print(f"  Reviewer Role: {reviewer.position if reviewer else 'N/A'}")
        print()
