import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'postgresql://postgres:root%40123@localhost:5432/smarthub')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Upload limits
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5 MB hard limit
    MAX_UPLOAD_SIZE = 5 * 1024 * 1024     # 5 MB for application-level checks

    # Upload folder
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'app', 'uploads')

    # CORS
    _raw_origins = os.getenv('CORS_ALLOWED_ORIGINS', os.getenv('ALLOWED_ORIGINS', 'https://majorprojectdeploy.vercel.app,http://localhost:5173,http://127.0.0.1:5173'))
    ALLOWED_ORIGINS = [o.strip().rstrip('/') for o in _raw_origins.split(',') if o.strip()]
    FRONTEND_URL = ALLOWED_ORIGINS[0] if ALLOWED_ORIGINS else 'http://localhost:5173'

    # Session/Cookie Settings
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SECURE = os.getenv('FLASK_ENV') == 'production'
    SESSION_COOKIE_SAMESITE = 'None' if SESSION_COOKIE_SECURE else 'Lax'
    REMEMBER_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_SECURE = SESSION_COOKIE_SECURE
    REMEMBER_COOKIE_SAMESITE = SESSION_COOKIE_SAMESITE
