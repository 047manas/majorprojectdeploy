from sqlalchemy import func
from app.models import StudentActivity, ActivityType
from app import db
import math

def get_gamification_cutoffs():
    """
    Calculates dynamic gamification cutoffs based on the percentiles 
    of points across all active students with at least 1 verified activity.
    """
    try:
        # Get total points for each student
        student_points_query = db.session.query(
            func.sum(ActivityType.weightage).label('total')
        ).join(StudentActivity, StudentActivity.activity_type_id == ActivityType.id).filter(
            StudentActivity.status.in_(['auto_verified', 'faculty_verified', 'hod_approved']),
            StudentActivity.is_deleted == False
        ).group_by(StudentActivity.student_id).all()
        
        points_list = [int(p.total) for p in student_points_query]
        max_points = max(points_list) if points_list else 0
        
        # Relative Target System
        # Platinum target is the highest score, but at least 100
        target = max(max_points, 100)
        
        # Multiply by target
        silver = int(target * 0.4)
        gold = int(target * 0.7)
        platinum = target
        
        return {
            'bronze': 0,
            'silver': silver,
            'gold': gold,
            'platinum': platinum,
            'max_on_platform': max_points
        }
    except Exception as e:
        # Fallback to defaults
        return {
            'bronze': 0,
            'silver': 50,
            'gold': 120,
            'platinum': 250
        }

def get_tier_for_points(points, cutoffs=None):
    if not cutoffs:
        cutoffs = get_gamification_cutoffs()
        
    if points >= cutoffs['platinum']:
        return 'Platinum'
    elif points >= cutoffs['gold']:
        return 'Gold'
    elif points >= cutoffs['silver']:
        return 'Silver'
    return 'Bronze'
