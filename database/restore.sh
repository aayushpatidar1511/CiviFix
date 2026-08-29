#!/usr/bin/env sh
set -eu
if [ "${1:-}" = "" ]; then echo "Usage: ./database/restore.sh database/backups/file.dump"; exit 1; fi
docker compose exec -T postgres pg_restore -U "${POSTGRES_USER:-civifix}" -d "${POSTGRES_DB:-civifix}" --clean --if-exists < "$1"
echo "Restore completed."
