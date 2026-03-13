import os
import sys
from werkzeug.security import generate_password_hash

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from app.models import db, User

def sync_users():
    """
    Synchronizes Users from LOCAL to SUPABASE.
    Handles Additions, Updates, and Soft-Deletions.
    """
    # 1. Connect to Local DB
    app = create_app()
    
    # We need to temporarily swap the DATABASE_URL to connect to Supabase
    supabase_url = "postgresql://postgres.bxhcnefxrccbrtfisinx:viXuTh6kuPD5gGw6@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"
    local_url = os.getenv('DATABASE_URL')

    with app.app_context():
        print("🔍 Fetching users from LOCAL database...")
        local_users = User.query.all()
        local_data = {u.email: u for u in local_users}
        print(f"📊 Found {len(local_users)} users locally.")

    # 2. Re-initialize app with Supabase URL
    os.environ['DATABASE_URL'] = supabase_url
    app_supabase = create_app()

    with app_supabase.app_context():
        print("\n🚀 Connecting to SUPABASE...")
        remote_users = User.query.all()
        remote_emails = {u.email for u in remote_users}
        
        added = 0
        updated = 0
        deleted = 0

        # Sync additions and updates
        for email, l_user in local_data.items():
            r_user = User.query.filter_by(email=email).first()
            
            if not r_user:
                print(f"➕ Adding: {email} ({l_user.role})")
                new_user = User(
                    email=l_user.email,
                    password_hash=l_user.password_hash,
                    role=l_user.role,
                    full_name=l_user.full_name,
                    institution_id=l_user.institution_id,
                    department=l_user.department,
                    position=l_user.position,
                    is_deleted=l_user.is_deleted,
                    is_active=l_user.is_active
                )
                db.session.add(new_user)
                added += 1
            else:
                # Update existing
                changed = False
                if r_user.full_name != l_user.full_name: 
                    r_user.full_name = l_user.full_name
                    changed = True
                if r_user.is_deleted != l_user.is_deleted:
                    r_user.is_deleted = l_user.is_deleted
                    changed = True
                if r_user.institution_id != l_user.institution_id:
                    r_user.institution_id = l_user.institution_id
                    changed = True
                if r_user.department != l_user.department:
                    r_user.department = l_user.department
                    changed = True
                
                if changed:
                    print(f"🔄 Updated: {email}")
                    updated += 1

        # Handle deletions (Remote users not in Local)
        # Note: We prefer Soft Delete (is_deleted = True)
        for r_user in remote_users:
            if r_user.email not in local_data and not r_user.is_deleted:
                print(f"🗑️ Soft-Deleting from Supabase (not in local): {r_user.email}")
                r_user.is_deleted = True
                deleted += 1

        db.session.commit()
        print("\n✨ Sync Complete!")
        print(f"   - Added: {added}")
        print(f"   - Updated: {updated}")
        print(f"   - Deleted (Soft): {deleted}")

if __name__ == "__main__":
    confirm = input("⚠️ This will MIRROR your local users to Supabase. Continue? (y/n): ")
    if confirm.lower() == 'y':
        sync_users()
    else:
        print("❌ Sync cancelled.")
