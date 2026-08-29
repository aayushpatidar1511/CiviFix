# CiviFix Project Audit

## Baseline
The supplied repository was a Vercel v0-generated Next.js frontend with a minimal Django configuration. The original dashboard used hard-coded issue records and statistics and its report form did not persist to a backend.

## Preserved UI
The original CiviFix visual language, dashboard shell, sidebar, cards, table, report modal and responsive CSS are retained. The dashboard now reads live Django endpoints and submits real complaints.

## Backend additions
The backend now contains a real `apps.core` domain with users, departments, complaints, workflows, assignments, SLA, escalation, evidence, community verification, infrastructure, incidents, notifications, audit and AI/risk records.

## APIs
- `/api/auth/login/`
- `/api/auth/refresh/`
- `/api/v1/auth/register/`
- `/api/v1/complaints/`
- `/api/v1/complaints/{id}/transition/`
- `/api/v1/complaints/{id}/support/`
- `/api/v1/complaints/{id}/comment/`
- `/api/v1/complaints/{id}/similar/`
- `/api/v1/complaints/{id}/history/`
- `/api/v1/departments/`
- `/api/v1/infrastructure/`
- `/api/v1/notifications/`
- `/api/v1/analytics/dashboard/`
- `/api/v1/analytics/`
- `/api/v1/map/`
- `/api/docs/`

## Database
PostgreSQL/PostGIS is configured. Reproducible migration SQL creates the civic domain tables; `seed_demo` creates demo accounts and realistic complaints.
