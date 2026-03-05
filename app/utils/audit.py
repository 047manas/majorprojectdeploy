import json
from datetime import datetime
from app.models import db, StudentActivity, User

def add_audit_event(activity_id, actor_name, action, details=""):
    """
    Appends a new event to the audit_trail JSON array of a given activity.
    action: e.g., 'Uploaded', 'Auto-Verified', 'Faculty Reviewed', 'HOD Approved'
    """
    activity = StudentActivity.query.get(activity_id)
    if not activity:
        return

    # Parse existing trail or create empty list
    try:
        trail = json.loads(activity.audit_trail) if activity.audit_trail else []
    except json.JSONDecodeError:
        trail = []

    # Add new event
    new_event = {
        "timestamp": datetime.utcnow().isoformat(),
        "actor": actor_name,
        "action": action,
        "details": details
    }
    trail.append(new_event)

    # Save back to model
    activity.audit_trail = json.dumps(trail)
    db.session.commit()
