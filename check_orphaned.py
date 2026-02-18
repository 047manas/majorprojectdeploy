"""Check DB state and find orphaned uploads - writes to file."""
import os
from app import create_app
from app.models import db, StudentActivity, User

app = create_app()
with app.app_context():
    lines = []
    
    # 1. All activities by status
    lines.append("=== ALL ACTIVITIES BY STATUS ===")
    activities = StudentActivity.query.all()
    status_map = {}
    for a in activities:
        status_map.setdefault(a.status, []).append(a)
    for status, items in status_map.items():
        lines.append(f"  {status}: {len(items)}")
    lines.append(f"Total activities in DB: {len(activities)}")
    
    # 2. Pending detail
    lines.append("\n=== PENDING ACTIVITIES ===")
    pending = StudentActivity.query.filter_by(status='pending').all()
    if not pending:
        lines.append("  (none)")
    for a in pending:
        reviewer = User.query.get(a.assigned_reviewer_id) if a.assigned_reviewer_id else None
        lines.append(f"  id={a.id} | {a.title[:40]} | student={a.student.full_name}({a.student.department}) | reviewer={reviewer.email if reviewer else 'NONE'}")

    # 3. Uploads folder
    upload_dir = app.config.get('UPLOAD_FOLDER', 'uploads')
    lines.append(f"\n=== FILES IN UPLOADS ({upload_dir}) ===")
    if os.path.exists(upload_dir):
        files_on_disk = set(os.listdir(upload_dir))
        lines.append(f"  Files on disk: {len(files_on_disk)}")
        for f in sorted(files_on_disk):
            size = os.path.getsize(os.path.join(upload_dir, f))
            lines.append(f"    {f} ({size} bytes)")
    else:
        files_on_disk = set()
        lines.append("  Upload folder does not exist!")

    # 4. DB references
    db_files = set()
    for a in activities:
        if a.certificate_file:
            db_files.add(a.certificate_file)
    lines.append(f"\n  Files referenced in DB: {len(db_files)}")
    for f in sorted(db_files):
        lines.append(f"    {f}")

    # 5. Orphaned
    orphaned = files_on_disk - db_files
    lines.append(f"\n=== ORPHANED FILES (on disk but NOT in DB) ===")
    lines.append(f"  Count: {len(orphaned)}")
    for f in sorted(orphaned):
        size = os.path.getsize(os.path.join(upload_dir, f))
        lines.append(f"  ORPHAN: {f} ({size} bytes)")

    # 6. Missing
    missing = db_files - files_on_disk
    lines.append(f"\n=== MISSING FILES (in DB but NOT on disk) ===")
    lines.append(f"  Count: {len(missing)}")
    for f in sorted(missing):
        lines.append(f"  MISSING: {f}")

    result = "\n".join(lines)
    with open("orphan_report.txt", "w") as f:
        f.write(result)
    print("Report written to orphan_report.txt")
