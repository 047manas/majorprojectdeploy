from flask import Blueprint, request, jsonify, send_file
from flask_login import login_required, current_user
from app.services.analytics_service import AnalyticsService
from app.utils.api_response import success_response, error_response
from app.utils.decorators import role_required
from datetime import datetime
from app.models import db, User, StudentActivity
from sqlalchemy import func

analytics_bp = Blueprint('analytics', __name__)

# --- Helper ---
def get_filters():
    return {
        "year": request.args.get('year', type=int),
        "department": request.args.get('department'),
        "event_type_id": request.args.get('event_type_id', type=int),
        "verified_only": request.args.get('verified_only') == 'true',
        "batch": request.args.get('batch', type=int),
        "start_date": request.args.get('start_date'),
        "end_date": request.args.get('end_date'),
        "campus_type": request.args.get('campus_type')
    }

# --- JSON API Endpoints ---

@analytics_bp.route('/meta')
@login_required
def get_dashboard_meta():
    """Returns metadata for dropdowns (Departments, Academic Years)."""
    # Fix #1: func and StudentActivity now imported at top
    departments = [r[0] for r in db.session.query(User.department).distinct().filter(User.department.isnot(None), User.department != '').all()]
    
    years = [r[0] for r in db.session.query(func.extract('year', StudentActivity.start_date)).distinct().filter(StudentActivity.start_date.isnot(None)).all()]
    years = sorted([int(y) for y in years], reverse=True)
    
    return success_response({
        "departments": departments,
        "years": years
    })

@analytics_bp.route('/kpis')
@login_required
def get_kpi_summary():
    filters = get_filters()
    data = AnalyticsService.get_institution_kpis(filters)
    return success_response(data)

@analytics_bp.route('/distribution')
@login_required
def get_event_distribution():
    filters = get_filters()
    data = AnalyticsService.get_event_distribution(filters)
    return success_response(data)

@analytics_bp.route('/department-participation')
@login_required
def get_department_participation():
    filters = get_filters()
    data = AnalyticsService.get_department_participation(filters)
    return success_response(data)

@analytics_bp.route('/yearly-trend')
@login_required
def get_yearly_trend():
    filters = get_filters()
    data = AnalyticsService.get_yearly_trend(filters)
    return success_response(data)

@analytics_bp.route('/verification-summary')
@login_required
def get_verification_summary():
    filters = get_filters()
    data = AnalyticsService.get_verification_summary(filters)
    return success_response(data)

@analytics_bp.route('/student-list')
@login_required
def get_student_list():
    filters = get_filters()
    category = request.args.get('category_name') 
    department = request.args.get('department')
    search = request.args.get('search')
    status = request.args.get('status')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    data = AnalyticsService.get_student_list(
        category_name=category, 
        department=department, 
        page=page, 
        per_page=per_page, 
        filters=filters,
        search=search,
        status=status
    )
    return success_response(data)

@analytics_bp.route('/insights')
@login_required
def get_admin_insights():
    filters = get_filters()
    data = AnalyticsService.get_admin_insights(filters)
    return success_response(data)

@analytics_bp.route('/dashboard-composite')
@login_required
def get_dashboard_composite():
    """Single-trip endpoint for all dashboard metrics to prevent timeouts."""
    filters = get_filters()
    data = AnalyticsService.get_dashboard_composite(filters)
    return success_response(data)

@analytics_bp.route('/health')
@login_required
def get_data_health():
    data = AnalyticsService.get_data_health_summary()
    return success_response(data)

@analytics_bp.route('/comparison')
@login_required
def get_comparison():
    filters = get_filters()
    data = AnalyticsService.get_comparative_stats(filters)
    if data is None:
        return success_response({"status": "disabled", "reason": "Select Academic Year"})
    return success_response(data)

@analytics_bp.route('/events-by-category')
@login_required
def get_events_by_category():
    filters = get_filters()
    category = request.args.get('category')
    if not category:
        return error_response("Category is required", 400)
        
    data = AnalyticsService.get_events_by_category(category, filters)
    return success_response(data)

@analytics_bp.route('/events-summary')
@login_required
def get_event_summary():
    filters = get_filters()
    data = AnalyticsService.get_event_summary_list(filters)
    return success_response(data)

@analytics_bp.route('/event/<path:event_id>/students')
@login_required
def get_event_students(event_id):
    filters = get_filters()
    data = AnalyticsService.get_students_for_event(event_id, filters)
    return success_response(data)

@analytics_bp.route('/test-students/<int:id>')
def test_students(id):
    return success_response(AnalyticsService.get_test_student_list(id))

# --- Export Endpoints ---

@analytics_bp.route('/export-naac')
@role_required('admin', 'faculty')
def export_naac():
    filters = get_filters()
    export_type = request.args.get('type', 'full')
    
    excel_file = AnalyticsService.generate_naac_excel(filters, export_type=export_type)
    
    filename = f'NAAC_Analytics_{export_type}_{datetime.now().strftime("%Y%m%d")}.xlsx'
    
    return send_file(
        excel_file,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=filename
    )

@analytics_bp.route('/export-students-table')
@role_required('admin', 'faculty')
def export_students_table():
    """Export the currently filtered student table view."""
    filters = get_filters()
    excel_file = AnalyticsService.generate_filtered_student_export(
        category_name=request.args.get('category_name'),
        department=request.args.get('department'),
        search=request.args.get('search'),
        status=request.args.get('status'),
        filters=filters
    )
    
    filename = f'Filtered_Students_{datetime.now().strftime("%Y%m%d_%H%M")}.xlsx'
    return send_file(excel_file, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                     as_attachment=True, download_name=filename)

@analytics_bp.route('/export-snapshot')
@role_required('admin', 'faculty')
def export_snapshot():
    """Lightweight KPI + Insights + Comparison export for meetings."""
    filters = get_filters()
    excel_file = AnalyticsService.generate_snapshot_export(filters=filters)
    
    filename = f'NAAC_Snapshot_{datetime.now().strftime("%Y%m%d_%H%M")}.xlsx'
    return send_file(excel_file, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                     as_attachment=True, download_name=filename)

@analytics_bp.route('/export-event-instance')
@role_required('admin', 'faculty')
def export_event_instance():
    """Export students for a specific event identity (drilldown)."""
    event_identity = request.args.get('identity')
    if not event_identity:
        return error_response("Missing 'identity' parameter", 400)
    
    filters = get_filters()
    excel_file = AnalyticsService.generate_event_instance_export(event_identity, filters=filters)
    
    filename = f'Event_Report_{datetime.now().strftime("%Y%m%d_%H%M")}.xlsx'
    return send_file(excel_file, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                     as_attachment=True, download_name=filename)
