from flask import Flask, jsonify
from flask_login import LoginManager
from config import Config
from app.models import db, User

from flask_wtf.csrf import CSRFProtect
from flask_migrate import Migrate

login_manager = LoginManager()
csrf = CSRFProtect()
migrate = Migrate()

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Fix #3: Return 401 JSON for API requests instead of redirecting to Flask login
@login_manager.unauthorized_handler
def unauthorized_api():
    from flask import request
    if request.path.startswith('/api/'):
        return jsonify({'success': False, 'error': 'Authentication required'}), 401
    # For non-API requests, redirect to frontend login
    from flask import redirect
    return redirect("http://localhost:5173/login")

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    csrf.init_app(app)
    migrate.init_app(app, db)

    # Register Blueprints
    from app.routes.auth_routes import auth_bp
    from app.routes.student_routes import student_bp
    from app.routes.faculty_routes import faculty_bp
    from app.routes.admin_routes import admin_bp
    from app.routes.analytics_routes import analytics_bp
    from app.routes.public_routes import public_bp
    from app.routes.tpo_routes import tpo_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(student_bp, url_prefix='/api/student')
    app.register_blueprint(faculty_bp, url_prefix='/api/faculty')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
    app.register_blueprint(tpo_bp, url_prefix='/api/tpo')
    app.register_blueprint(public_bp)

    # Fix #4: Exempt all API routes from CSRF (frontend sends JSON, not forms)
    csrf.exempt(auth_bp)
    csrf.exempt(student_bp)
    csrf.exempt(faculty_bp)
    csrf.exempt(admin_bp)
    csrf.exempt(analytics_bp)
    csrf.exempt(tpo_bp)

    # Enable CORS for development
    from flask_cors import CORS
    CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173", r"^https://.*\.ngrok-free\.app$"]}}, supports_credentials=True)

    # Global Error Handlers
    from app.utils.api_response import error_response
    from flask import request

    @app.errorhandler(400)
    def bad_request(e):
        if request.path.startswith('/api/'):
            return error_response("Bad Request", 400)
        return e

    @app.errorhandler(401)
    def unauthorized(e):
        if request.path.startswith('/api/'):
            return error_response("Unauthorized", 401)
        return e

    @app.errorhandler(403)
    def forbidden(e):
        if request.path.startswith('/api/'):
            return error_response("Forbidden", 403)
        return e

    @app.errorhandler(404)
    def not_found(e):
        if request.path.startswith('/api/'):
            return error_response("Not Found", 404)
        return e
    
    @app.errorhandler(422)
    def unprocessable_entity(e):
        if request.path.startswith('/api/'):
            return error_response("Validation Error", 422)
        return e

    @app.errorhandler(500)
    def internal_server_error(e):
        if request.path.startswith('/api/'):
            return error_response("Internal Server Error", 500)
        return e

    return app
