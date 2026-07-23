#!/bin/bash
set -euo pipefail

# Le rôle superutilisateur du conteneur est POSTGRES_USER (cf. compose.yaml),
# pas `postgres` : l'image ne crée pas ce rôle quand POSTGRES_USER est défini.
cd "$(dirname "$0")"
[ -f .env ] && set -a && . ./.env && set +a

user="${POSTGRES_USER:-gachapon}"
container="${APP_IMAGE_NAME:-gachapon}-postgres"
db="${POSTGRES_DB:-gachapon}"

echo "Creating ${db}_test database in $container (user: $user)..."

exists=$(docker exec "$container" psql -U "$user" -d "$db" -tAc \
  "SELECT 1 FROM pg_database WHERE datname = '${db}_test';")

if [ "$exists" = "1" ]; then
  echo "Database ${db}_test already exists, nothing to do."
else
  # Pas de `|| echo …` ici : une vraie erreur (conteneur arrêté, mauvais rôle)
  # doit faire échouer le script au lieu de se déguiser en succès.
  docker exec "$container" psql -U "$user" -d "$db" -c "CREATE DATABASE ${db}_test;"
fi

echo "Done."
