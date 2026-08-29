# CiviFix Database

CiviFix uses PostgreSQL 16 + PostGIS 3.4. The repository intentionally does not ship a binary PostgreSQL data directory. The database is reproducible from Django migrations and the `seed_demo` command.

## Automatic setup

With Docker Compose:

```bash
docker compose up --build
```

The backend container runs migrations and `seed_demo` automatically after PostgreSQL is available.

## Manual setup

```bash
cd backend
python manage.py migrate
python manage.py seed_demo
```

## Backup

After the stack is running:

```bash
./database/backup.sh
```

This creates `database/backups/civifix-<timestamp>.dump` using `pg_dump` from the PostgreSQL container.

## Restore

```bash
./database/restore.sh database/backups/civifix-YYYYMMDD-HHMMSS.dump
```

Restore is destructive for the target database. Use only for development/backup recovery.
