from app.models import db, User, StudentActivity, ActivityType
from sqlalchemy import func, case, or_, and_, distinct, extract, Integer, tuple_, literal
from flask_login import current_user
from flask import url_for
from datetime import datetime
import pandas as pd
import io
from openpyxl.styles import Font
from openpyxl.utils import get_column_letter

class AnalyticsService:
    @staticmethod
    def _get_event_date_expr():
        """Coalesce start_date or created_at (cast to date)."""
        return func.coalesce(StudentActivity.start_date, func.cast(StudentActivity.created_at, db.Date))

    @staticmethod
    def _get_event_identity_expr():
        """Unique Event Identity grouping logic."""
        return case(
            (StudentActivity.activity_type_id.isnot(None),
             func.concat('TYPE-', StudentActivity.activity_type_id, '-', func.coalesce(func.cast(StudentActivity.start_date, db.String), 'nodate'))),
            else_=func.concat('CUSTOM-', func.coalesce(StudentActivity.custom_category, 'other'), '-', func.lower(func.trim(StudentActivity.title)), '-', func.coalesce(func.cast(StudentActivity.start_date, db.String), 'nodate'))
        )

    @staticmethod
    def _apply_role_scope(query):
        """Strict role-based data shielding."""
        from flask import has_request_context
        if not has_request_context() or not current_user or not current_user.is_authenticated:
            return query
        if current_user.role == 'admin':
            return query
        if current_user.role == 'faculty':
            conditions = []
            if getattr(current_user, 'position', '') == 'hod' and current_user.department:
                conditions.append(User.department == current_user.department)
            # Managed activities or uploaded by self
            managed_ids = [a.id for a in ActivityType.query.filter_by(faculty_incharge_id=current_user.id).all()]
            if managed_ids:
                conditions.append(StudentActivity.activity_type_id.in_(managed_ids))
            conditions.append(StudentActivity.attendance_uploaded_by == current_user.id)
            return query.filter(or_(*conditions))
        if current_user.role == 'student':
            return query.filter(StudentActivity.student_id == current_user.id)
        return query.filter(1 == 0)

    @staticmethod
    def _apply_filters(query, filters):
        """Dynamic query filtering."""
        if not filters: return query
        event_date = AnalyticsService._get_event_date_expr()
        if filters.get('year'):
            query = query.filter(extract('year', event_date) == int(filters['year']))
        if filters.get('department'):
            query = query.filter(User.department == filters['department'])
        if filters.get('campus_type'):
            query = query.filter(StudentActivity.campus_type == filters['campus_type'])
        if filters.get('verified_only'):
            query = query.filter(StudentActivity.status.in_(['faculty_verified', 'auto_verified', 'hod_approved']))
        if filters.get('start_date'):
            query = query.filter(event_date >= filters['start_date'])
        if filters.get('end_date'):
            query = query.filter(event_date <= filters['end_date'])
        if filters.get('event_identity'):
            query = query.filter(AnalyticsService._get_event_identity_expr() == filters['event_identity'])
        return query

    @staticmethod
    def _get_base_query(filters=None):
        """Single source of truth for all activity retrieval."""
        query = db.session.query(StudentActivity).join(User, StudentActivity.student_id == User.id)
        query = query.filter(StudentActivity.is_deleted == False, User.is_deleted == False)
        # Exclude orphans but allow official attendance upload items
        query = query.filter(or_(
            StudentActivity.activity_type_id.isnot(None),
            func.coalesce(StudentActivity.custom_category, '') != '',
            StudentActivity.is_attendance_uploaded == True
        ))
        query = AnalyticsService._apply_role_scope(query)
        query = AnalyticsService._apply_filters(query, filters)
        return query

    @staticmethod
    def get_institution_kpis(filters=None):
        """Aggregated KPIs for Dashboard."""
        base_q = AnalyticsService._get_base_query(filters)
        # Student pool
        student_pool = db.session.query(func.count(User.id)).filter(User.role == 'student', User.is_active == True, User.is_deleted == False)
        if filters and filters.get('department'):
            student_pool = student_pool.filter(User.department == filters['department'])
        total_students = student_pool.scalar() or 0
        
        # Counts
        total_events = base_q.with_entities(func.count(distinct(AnalyticsService._get_event_identity_expr()))).scalar() or 0
        total_participations = base_q.with_entities(func.count(StudentActivity.id)).scalar() or 0
        unique_students = base_q.with_entities(func.count(distinct(StudentActivity.student_id))).scalar() or 0
        
        # Status
        status_counts = base_q.with_entities(
            func.sum(case((StudentActivity.status.in_(['faculty_verified', 'auto_verified', 'hod_approved']), 1), else_=0)).label('verified'),
            func.sum(case((StudentActivity.status == 'pending', 1), else_=0)).label('pending')
        ).first()
        
        verified_count = int((status_counts and status_counts.verified) or 0)
        pending_count = int((status_counts and status_counts.pending) or 0)
        
        return {
            "total_students": total_students,
            "total_events": total_events,
            "total_participations": total_participations,
            "unique_students": unique_students,
            "engagement_rate": round(unique_students / total_students * 100, 1) if total_students > 0 else 0,
            "verified_count": verified_count,
            "pending_count": pending_count,
            "verified_rate": round(verified_count / total_participations * 100, 1) if total_participations > 0 else 0
        }

    @staticmethod
    def get_event_distribution(filters=None):
        base_q = AnalyticsService._get_base_query(filters).outerjoin(ActivityType, StudentActivity.activity_type_id == ActivityType.id)
        cat_name = func.coalesce(ActivityType.name, 'Other / Custom')
        results = base_q.with_entities(cat_name, func.count(distinct(AnalyticsService._get_event_identity_expr()))).group_by(cat_name).all()
        return [{"category": r[0], "count": r[1]} for r in results]

    @staticmethod
    def get_department_participation(filters=None):
        base_q = AnalyticsService._get_base_query(filters)
        results = base_q.with_entities(User.department, func.count(distinct(StudentActivity.student_id))).group_by(User.department).all()
        # Normalize by total students in dept
        all_counts = db.session.query(User.department, func.count(User.id)).filter(User.role == 'student', User.is_active == True).group_by(User.department).all()
        dept_total = {r[0]: r[1] for r in all_counts if r[0]}
        
        data = []
        for r in results:
            if not r[0]: continue
            total = dept_total.get(r[0], 0)
            data.append({
                "department": r[0],
                "unique": r[1],
                "total": total,
                "engagement_percent": round(r[1]/total*100, 1) if total > 0 else 0
            })
        return sorted(data, key=lambda x: x['engagement_percent'], reverse=True)

    @staticmethod
    def get_yearly_trend(filters=None):
        base_q = AnalyticsService._get_base_query(filters)
        year_expr = extract('year', AnalyticsService._get_event_date_expr())
        results = base_q.with_entities(year_expr, func.count(StudentActivity.id)).group_by(year_expr).order_by(year_expr).all()
        return [{"year": int(r[0]) if r[0] else "Unknown", "total_participations": r[1]} for r in results]

    @staticmethod
    def _serialize_student_item(item, include_certificate=False):
        row = {
            "id": item.id,
            "student_name": item.student.full_name,
            "roll_number": item.student.institution_id,
            "department": item.student.department,
            "title": item.title,
            "status": item.status,
            "category": item.activity_type.name if item.activity_type else (item.custom_category or 'Other'),
            "date": str(item.start_date or item.created_at.date()),
            "attendance_uploaded_by": item.attendance_uploaded_by
        }
        if include_certificate and item.certificate_file:
            try:
                row["certificate_url"] = url_for('public.serve_public_certificate', filename=item.certificate_file, _external=True)
            except: pass
        return row

    @staticmethod
    def get_student_list(category_name=None, department=None, page=1, per_page=20, filters=None, search=None, status=None, paginate=True):
        base_q = AnalyticsService._get_base_query(filters)
        if department and department != 'All': base_q = base_q.filter(User.department == department)
        if status and status != 'All': base_q = base_q.filter(StudentActivity.status == status)
        if category_name and category_name != 'All':
            if category_name == 'Other / Custom':
                base_q = base_q.outerjoin(ActivityType).filter(ActivityType.id.is_(None))
            else:
                base_q = base_q.join(ActivityType).filter(ActivityType.name == category_name)
        if search:
            s_term = f"%{search}%"
            base_q = base_q.filter(or_(User.full_name.ilike(s_term), User.institution_id.ilike(s_term), StudentActivity.title.ilike(s_term)))
        
        query = base_q.order_by(AnalyticsService._get_event_date_expr().desc())
        if not paginate: return query.all()
        
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        return {
            "students": [AnalyticsService._serialize_student_item(i, True) for i in pagination.items],
            "total_pages": pagination.pages,
            "total_records": pagination.total
        }

    @staticmethod
    def _get_event_summary_list(filters=None):
        """Internal grouping for event list."""
        base_q = AnalyticsService._get_base_query(filters).outerjoin(ActivityType)
        identity_expr = AnalyticsService._get_event_identity_expr()
        q = base_q.with_entities(
            identity_expr.label('id'),
            func.max(func.coalesce(ActivityType.name, StudentActivity.custom_category)).label('category'),
            func.max(StudentActivity.title).label('title'),
            func.max(AnalyticsService._get_event_date_expr()).label('date'),
            func.count(StudentActivity.id).label('participations'),
            func.count(distinct(StudentActivity.student_id)).label('unique')
        ).group_by(identity_expr)
        return q.all()

    @staticmethod
    def get_event_summary_list(filters=None):
        results = AnalyticsService._get_event_summary_list(filters)
        return [{
            "id": r.id, "title": r.title, "category": r.category,
            "start_date": r.date.isoformat() if r.date else None,
            "participation_count": r.participations, "unique_students": r.unique
        } for r in results]

    @staticmethod
    def get_events_by_category(category, filters=None):
        base_q = AnalyticsService._get_base_query(filters).outerjoin(ActivityType)
        if category == 'Other / Custom':
            base_q = base_q.filter(ActivityType.id.is_(None))
        else:
            base_q = base_q.filter(func.coalesce(ActivityType.name, StudentActivity.custom_category) == category)
        
        identity_expr = AnalyticsService._get_event_identity_expr()
        results = base_q.with_entities(
            identity_expr.label('id'),
            func.max(StudentActivity.title).label('title'),
            func.max(AnalyticsService._get_event_date_expr()).label('date'),
            func.count(StudentActivity.id).label('participations'),
            func.count(distinct(StudentActivity.student_id)).label('unique')
        ).group_by(identity_expr).all()
        
        return [{
            "id": r.id, "title": r.title, "start_date": r.date.isoformat() if r.date else None,
            "participation_count": r.participations, "unique_students": r.unique
        } for r in results]

    @staticmethod
    def get_students_for_event(event_identity, filters=None):
        return [AnalyticsService._serialize_student_item(i, True) 
                for i in AnalyticsService._get_base_query(filters).filter(AnalyticsService._get_event_identity_expr() == event_identity).all()]

    @staticmethod
    def get_dashboard_composite(filters=None):
        kpis = AnalyticsService.get_institution_kpis(filters)
        return {
            "kpis": kpis,
            "insights": AnalyticsService.get_admin_insights(filters, kpis),
            "distribution": AnalyticsService.get_event_distribution(filters),
            "participation": AnalyticsService.get_department_participation(filters),
            "trend": AnalyticsService.get_yearly_trend(filters)
        }

    @staticmethod
    def get_admin_insights(filters=None, kpis=None):
        # Simplified insights to prevent excessive complexity/runtime
        dept_stats = AnalyticsService.get_department_participation(filters)
        return {
            "top_dept": dept_stats[0]['department'] if dept_stats else "N/A",
            "top_dept_val": dept_stats[0]['engagement_percent'] if dept_stats else 0,
            "verification_efficiency": kpis['verified_rate'] if kpis else 0,
            "risk_events": [] # Placeholder for future logic
        }

    @staticmethod
    def generate_naac_excel(filters=None, export_type='full'):
        # Keep basic export for compatibility
        output = io.BytesIO()
        writer = pd.ExcelWriter(output, engine='openpyxl')
        kpis = AnalyticsService.get_institution_kpis(filters)
        pd.DataFrame([kpis]).to_excel(writer, sheet_name='Summary', index=False)
        writer.close(); output.seek(0)
        return output

    @staticmethod
    def get_dashboard_meta():
        departments = [r[0] for r in db.session.query(User.department).distinct().filter(User.department.isnot(None), User.department != '').all()]
        years = [r[0] for r in db.session.query(func.extract('year', StudentActivity.start_date)).distinct().filter(StudentActivity.start_date.isnot(None)).all()]
        return {"departments": departments, "years": sorted([int(y) for y in years], reverse=True)}

    @staticmethod
    def get_verification_summary(filters=None):
        base_q = AnalyticsService._get_base_query(filters)
        row = base_q.with_entities(
            func.sum(case((StudentActivity.status.in_(['faculty_verified', 'auto_verified', 'hod_approved']), 1), else_=0)),
            func.sum(case((StudentActivity.status == 'pending', 1), else_=0)),
            func.sum(case((StudentActivity.status == 'rejected', 1), else_=0))
        ).first()
        if not row or not any(row): return {"verified": 0, "not_verified": 0, "details": {"pending": 0, "rejected": 0}}
        v, p, r = [int(i or 0) for i in row]
        return {"verified": v, "not_verified": p + r, "details": {"pending": p, "rejected": r}}

    @staticmethod
    def get_data_health_summary():
        base_q = AnalyticsService._get_base_query()
        total = base_q.count()
        if total == 0: return {}
        return {
            "total_records": total,
            "null_dates": base_q.filter(StudentActivity.start_date.is_(None)).count(),
            "missing_dept": base_q.filter(User.department.is_(None)).count(),
            "missing_category": base_q.filter(StudentActivity.activity_type_id.is_(None), or_(StudentActivity.custom_category.is_(None), StudentActivity.custom_category == '')).count()
        }

    @staticmethod
    def get_comparative_stats(filters=None):
        if not filters or not filters.get('year'): return None
        try:
            curr_yr = int(filters['year'])
            prev_yr = curr_yr - 1
            cur = AnalyticsService.get_institution_kpis({**filters, 'year': curr_yr})
            prev = AnalyticsService.get_institution_kpis({**filters, 'year': prev_yr})
            def growth(c, p):
                return {"current": c, "previous": p, "growth_pct": round((c - p) / p * 100, 1) if p > 0 else None}
            return {
                "current_year": curr_yr, "previous_year": prev_yr,
                "total_events": growth(cur['total_events'], prev['total_events']),
                "total_participations": growth(cur['total_participations'], prev['total_participations']),
                "verified_rate": growth(cur['verified_rate'], prev['verified_rate'])
            }
        except: return None
