#!/usr/bin/env sh
# Starts PostgreSQL for local dev (matches DATABASE_URL in .env.example).
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CONTAINER_NAME="jssl-postgres"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed or not on PATH."
  echo "Install Docker Desktop (https://www.docker.com/products/docker-desktop/) or run PostgreSQL yourself and set DATABASE_URL in backend/.env."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not running. Start Docker Desktop, then run this script again."
  exit 1
fi

if [ -f "$ROOT/docker-compose.yml" ]; then
  echo "Starting Postgres via docker compose..."
  docker compose -f "$ROOT/docker-compose.yml" up -d postgres
  echo "Waiting for Postgres to accept connections..."
  i=0
  while [ "$i" -lt 60 ]; do
    if docker compose -f "$ROOT/docker-compose.yml" exec -T postgres pg_isready -U app -d appdb >/dev/null 2>&1; then
      echo "Postgres is ready on localhost:5432 (database appdb, user app)."
      exit 0
    fi
    i=$((i + 1))
    sleep 1
  done
  echo "Postgres container started but did not become ready in time. Check: docker compose -f $ROOT/docker-compose.yml logs postgres"
  exit 1
fi

echo "No docker-compose.yml at $ROOT — starting standalone container..."
if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  docker start "$CONTAINER_NAME"
else
  docker run -d --name "$CONTAINER_NAME" \
    -e POSTGRES_USER=app \
    -e POSTGRES_PASSWORD=app \
    -e POSTGRES_DB=appdb \
    -p 5432:5432 \
    postgres:16-alpine
fi
echo "Waiting for Postgres..."
i=0
while [ "$i" -lt 60 ]; do
  if docker exec "$CONTAINER_NAME" pg_isready -U app -d appdb >/dev/null 2>&1; then
    echo "Postgres is ready on localhost:5432."
    exit 0
  fi
  i=$((i + 1))
  sleep 1
done
echo "Postgres did not become ready in time. Check: docker logs $CONTAINER_NAME"
exit 1
