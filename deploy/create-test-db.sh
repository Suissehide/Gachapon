#!/bin/bash
set -e
echo "Creating gachapon_test database..."
docker exec gachapon-postgres psql -U postgres -c "CREATE DATABASE gachapon_test;" || echo "Database may already exist, continuing."
echo "Done."
