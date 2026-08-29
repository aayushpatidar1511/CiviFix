# Deployment

Development: copy `.env.example` to `.env`, then run `docker compose up --build`. The compose stack contains PostGIS, Redis, Django, Celery, Celery Beat and Next.js.

Production hardening still requires managed secrets, HTTPS, object storage, a reverse proxy, database backups, observability, rate limiting and an evaluated ML model.
