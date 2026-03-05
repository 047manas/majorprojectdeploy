import os
import sys

# Add project root to path so we can import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from app import create_app
from app.models import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    # SQLite does NOT support ADD COLUMN with constraints easily, but nullable=True is fine
    try:
        db.session.execute(text('ALTER TABLE student_activities ADD COLUMN audit_trail TEXT'))
        db.session.commit()
        print("Success: Added audit_trail column to student_activities table")
    except Exception as e:
        if "duplicate column name" in str(e).lower():
            print("Column already exists. Skipping.")
        else:
            print(f"Error: {e}")
