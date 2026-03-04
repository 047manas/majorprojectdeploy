from app import create_app
from app.models import db, ActivityType

app = create_app()

with app.app_context():
    # Set default weightages based on type
    types = ActivityType.query.all()
    for t in types:
        if 'national' in t.name.lower() or 'international' in t.name.lower():
            t.weightage = 50
        elif 'state' in t.name.lower():
            t.weightage = 30
        elif 'workshop' in t.name.lower():
            t.weightage = 15
        elif 'internship' in t.name.lower():
            t.weightage = 100
        else:
            t.weightage = 10
            
    db.session.commit()
    print("Backfilled weightages successfully.")
