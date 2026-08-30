# CiviFix — Smart Municipal Civic Operations Platform

> Connecting citizens, city administration, department officers, and field workers with spatial intelligence and automated dispatch workflows.

### 🌐 Live Deployments
- **Live Web Application:** [https://civi-fix-aayush.vercel.app](https://civi-fix-aayush.vercel.app)
- **Production REST API:** [https://civifix-api.onrender.com](https://civifix-api.onrender.com)
- **Interactive Swagger Docs:** [https://civifix-api.onrender.com/api/docs/](https://civifix-api.onrender.com/api/docs/)


## Stack
- Next.js / React / TypeScript
- Django REST Framework / Simple JWT
- PostgreSQL + PostGIS
- Redis + Celery
- scikit-learn / NumPy / Pandas / OpenCV-ready ML layer
- Docker Compose

## Quick start
```bash
cp .env.example .env
docker compose up --build
```
The backend container runs migrations and `seed_demo` automatically for development.

Frontend: http://localhost:3000  
API: http://localhost:8000  
Swagger: http://localhost:8000/api/docs/

## Demo accounts
| Role | Name | Username | Email |
|---|---|---|---|
| City Admin | Aayush Patidar | `aayush_patidar` (or `admin`) | aayush.admin@civifix.local |
| Department Officer | Department User | `department_user` (or `officer`) | department.user@civifix.local |
| Field Worker | Field Worker | `worker` | worker@civifix.local |
| Citizen | Aayush | `aayush` (or `citizen`) | aayush@civifix.local |

Development password for all demo users: `CiviFix@2026`. Never use it in production.

## Manual setup
```bash
cd backend
python -m venv .venv
# activate venv
pip install -r requirements/base.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```
In another shell, run the frontend with `pnpm install && pnpm dev` and set `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`.

## Features
Real JWT authentication, role-aware complaint access, complaint creation, workflow/status history, comments, issue support, priority scoring, duplicate candidates, departments, SLA monitoring, Celery escalation, notifications, audit logs, infrastructure risk records, incidents, analytics, PostGIS map data and Swagger documentation.

## Limitations
This repository is a strong runnable development baseline, not a claim of completed production operations. Full evidence upload UI, community verification UI, evaluated ML training, weather provider, production rate limiting/observability and end-to-end live-service tests remain hardening work. See `docs/IMPLEMENTATION_STATUS.md`.

## Database note

The repository does not include a binary PostgreSQL data directory. This is intentional: PostgreSQL/PostGIS is created by Docker Compose, the complete schema is created by Django migrations, and realistic demo records are created by `python manage.py seed_demo`. See `database/README.md` for backup and restore commands.
