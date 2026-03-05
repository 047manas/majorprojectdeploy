# CertifyX — Student Activity Verification System

A centralized platform for tracking, verifying, and reporting student extracurricular activities for NAAC accreditation and institutional transparency.

## Features

- **Multi-tier Verification** — Student uploads → Faculty verifies → HOD approves
- **Auto-verification Engine** — Hash-based, QR-based, and URL-based certificate verification
- **Attendance Management** — Faculty uploads CSV rosters, students upload certificates
- **Activity Points System** — Weighted scoring per activity type
- **TPO Dashboard** — Search student by roll number, view verified activity score
- **NAAC Analytics** — KPIs, department-wise participation, Excel exports
- **Clickable Notifications** — Deep-linked notifications with pre-filled actions
- **Public Verification** — Token-based public certificate verification page

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Flask, SQLAlchemy, Alembic |
| Frontend | React, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Auth | Flask-Login with role-based access |

## User Roles

| Role | Access |
|---|---|
| **Student** | Upload certificates, view portfolio, receive notifications |
| **Faculty** | Review queue, approve/reject, manage attendance rosters |
| **HOD** | Department-wide visibility, final approval authority |
| **Admin** | Full access, user management, activity types, analytics |

## Project Structure

```
├── app/
│   ├── __init__.py          # Flask app factory
│   ├── models.py            # Database models
│   ├── routes/              # API endpoints
│   │   ├── admin_routes.py
│   │   ├── analytics_routes.py
│   │   ├── auth_routes.py
│   │   ├── faculty_routes.py
│   │   ├── public_routes.py
│   │   ├── student_routes.py
│   │   └── tpo_routes.py
│   ├── services/            # Business logic
│   │   ├── analytics_service.py
│   │   └── verification/    # Auto-verification engine
│   ├── utils/               # Shared utilities
│   │   ├── api_response.py
│   │   └── decorators.py    # role_required decorator
│   └── verification/        # Hash store & QR reader
├── frontend/
│   └── src/
│       ├── pages/           # Route pages
│       ├── components/      # Reusable UI components
│       ├── context/         # Auth context
│       └── services/        # API client
├── migrations/              # Alembic database migrations
├── scripts/
│   ├── init_db.py           # Database initialization
│   └── maintenance/         # One-off migration scripts
├── tests/                   # Unit tests
├── config.py                # Flask configuration
├── run.py                   # Application entry point
└── requirements.txt         # Python dependencies
```

## Setup

### Backend
```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
python scripts/init_db.py     # Initialize DB + admin user
python run.py                 # Start Flask server
```

### Frontend
```bash
cd frontend
npm install
npm run dev                   # Start Vite dev server
```

### Default Admin
- **Email:** admin@certifyx.com
- **Password:** admin123

## Verification Workflow

```
Student uploads certificate
        ↓
Auto-verification (hash / QR / URL)
        ↓
Faculty reviews → approves (faculty_verified)
        ↓
HOD approves → final status (hod_approved)
        ↓
Points awarded → visible in TPO dashboard
```
