import os
import time
from sqlalchemy import create_engine, text

url = 'postgresql://postgres.bxhcnefxrccbrtfisinx:viXuTh6kuPD5gGw6@aws-1-ap-south-1.pooler.supabase.com:6543/postgres'
engine = create_engine(url)

def time_q(name, q):
    t0 = time.time()
    try:
        with engine.connect() as conn:
            res = conn.execute(text(q)).scalar()
            print(f'{name}: {res} ({time.time()-t0:.2f}s)')
    except Exception as e:
        print(f'{name}: FAILED ({e})')

print('Benchmarking KPI Subqueries on Supabase...')
time_q('Total Students', "SELECT count(*) FROM users WHERE role='student' AND is_active=true AND is_deleted=false")
time_q('Total Participations', "SELECT count(*) FROM student_activities s JOIN users u ON s.student_id = u.id WHERE s.is_deleted=false AND u.is_deleted=false")
time_q('Unique Students', "SELECT count(distinct student_id) FROM student_activities s JOIN users u ON s.student_id = u.id WHERE s.is_deleted=false AND u.is_deleted=false AND u.role='student'")

identity_expr = """
CASE 
    WHEN activity_type_id IS NOT NULL THEN 'TYPE-' || activity_type_id || '-' || COALESCE(start_date::text, 'nodate') 
    ELSE 'CUSTOM-' || COALESCE(custom_category, 'other') || '-' || LOWER(TRIM(title)) || '-' || COALESCE(start_date::text, 'nodate') 
END
"""
time_q('Total Events', f"SELECT count(distinct {identity_expr}) FROM student_activities s JOIN users u ON s.student_id = u.id WHERE s.is_deleted=false AND u.is_deleted=false")

status_q = """
SELECT 
    SUM(CASE WHEN status IN ('faculty_verified', 'auto_verified', 'hod_approved') THEN 1 ELSE 0 END) as verified,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
FROM student_activities s
JOIN users u ON s.student_id = u.id
WHERE s.is_deleted=false AND u.is_deleted=false
"""
time_q('Status Counts', status_q)
