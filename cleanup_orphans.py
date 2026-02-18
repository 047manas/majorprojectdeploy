"""Delete ONLY orphaned certificate files (on disk but not referenced by any activity in DB)."""
import os
from app import create_app
from app.models import db, StudentActivity

app = create_app()
with app.app_context():
    upload_dir = app.config.get('UPLOAD_FOLDER', 'uploads')
    
    # Get all files referenced in DB
    db_files = set()
    for a in StudentActivity.query.all():
        if a.certificate_file:
            db_files.add(a.certificate_file)
    
    # Get all files on disk
    files_on_disk = set(os.listdir(upload_dir))
    
    # Find orphaned files (on disk but NOT in DB)
    orphaned = files_on_disk - db_files - {'.gitkeep'}  # Keep .gitkeep
    
    print(f"DB references: {len(db_files)} files")
    print(f"Disk files: {len(files_on_disk)} files")
    print(f"Orphaned files to delete: {len(orphaned)}")
    print()
    
    deleted = 0
    for f in sorted(orphaned):
        filepath = os.path.join(upload_dir, f)
        size = os.path.getsize(filepath)
        os.remove(filepath)
        print(f"  DELETED: {f} ({size} bytes)")
        deleted += 1
    
    print(f"\nDone. Deleted {deleted} orphaned files.")
    print(f"Remaining files on disk: {len(os.listdir(upload_dir))}")
