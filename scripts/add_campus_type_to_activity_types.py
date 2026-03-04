"""Add default_campus_type column to activity_types table."""
from app import create_app
from app.models import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    try:
        with db.engine.connect() as conn:
            conn.execute(text("ALTER TABLE activity_types ADD COLUMN default_campus_type VARCHAR(20) DEFAULT 'off_campus'"))
            conn.commit()
        print("Column 'default_campus_type' added to activity_types successfully.")
    except Exception as e:
        if 'duplicate column' in str(e).lower() or 'already exists' in str(e).lower():
            print("Column already exists, skipping.")
        else:
            print(f"Error: {e}")
