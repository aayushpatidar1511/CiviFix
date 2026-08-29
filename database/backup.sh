#!/usr/bin/env sh
set -eu
mkdir -p "$(dirname "$0")/backups"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$(dirname "$0")/backups/civifix-$STAMP.dump"
docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-civifix}" -d "${POSTGRES_DB:-civifix}" -Fc > "$FILE"
echo "Backup created: $FILE"
