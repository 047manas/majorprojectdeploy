
from app import create_app
from app.models import db, User, StudentActivity
import json

app = create_app()
with app.app_context():
    data = {
        "hods": [],
        "pending_activities": []
    }
    
    hods = User.query.filter_by(role='faculty', position='hod').all()
    for h in hods:
        data["hods"].append({
            "id": h.id,
            "name": h.full_name,
            "dept": h.department,
            "inst_id": h.institution_id
        })
    
    activities = StudentActivity.query.filter(StudentActivity.status.in_(['faculty_verified', 'pending'])).all()
    for a in activities:
        student = User.query.get(a.student_id)
        data["pending_activities"].append({
            "id": a.id,
            "title": a.title,
            "status": a.status,
            "student_dept": student.department if student else "Unknown",
            "reviewer_id": a.assigned_reviewer_id,
            "uploader_id": a.attendance_uploaded_by
        })
    
    with open('diag_output.json', 'w') as f:
        json.dump(data, f, indent=4)
