import csv
import os
import sys
from werkzeug.security import generate_password_hash

# Add the project root to sys.path so we can import 'app'
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.models import db, User

def import_users(csv_path):
    app = create_app()
    with app.app_context():
        if not os.path.exists(csv_path):
            print(f"❌ Error: File not found at {csv_path}")
            return

        print(f"📂 Reading users from {csv_path}...")
        
        created_count = 0
        skipped_count = 0
        errors = []

        with open(csv_path, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            # Expected columns: full_name, email, role, institution_id, department, position, password
            for row in reader:
                full_name = row.get('full_name')
                email = row.get('email')
                role = row.get('role', 'student').lower()
                institution_id = row.get('institution_id')
                department = row.get('department')
                position = row.get('position')
                password = row.get('password', 'User123!') # Default password

                if not email or not full_name:
                    errors.append(f"Row missing email or name: {row}")
                    skipped_count += 1
                    continue

                # Check if user already exists
                existing_user = User.query.filter((User.email == email) | (User.institution_id == institution_id)).first()
                if existing_user:
                    print(f"⚠️  Skipping {email} / {institution_id} (Already exists)")
                    skipped_count += 1
                    continue

                try:
                    new_user = User(
                        email=email,
                        password_hash=generate_password_hash(password),
                        role=role,
                        full_name=full_name,
                        institution_id=institution_id,
                        department=department,
                        position=position
                    )
                    db.session.add(new_user)
                    created_count += 1
                    print(f"✅ Created: {full_name} ({email})")
                except Exception as e:
                    errors.append(f"Failed to create {email}: {str(e)}")
                    skipped_count += 1

            try:
                db.session.commit()
                print("\n✨ Import Summary:")
                print(f"   - Users Created: {created_count}")
                print(f"   - Users Skipped/Error: {skipped_count}")
                
                if errors:
                    print("\n❌ Errors encountered:")
                    for err in errors:
                        print(f"   - {err}")
            except Exception as e:
                db.session.rollback()
                print(f"❌ Critical error during commit: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/import_users.py <path_to_csv>")
    else:
        import_users(sys.argv[1])
