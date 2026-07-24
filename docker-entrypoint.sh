#!/bin/sh
# Applies the Prisma schema (retrying until the DB is reachable), optionally seeds
# the admin user + demo content, then execs the container command.
set -e

echo "[entrypoint] Applying database schema (prisma db push)..."
n=0
until ./node_modules/.bin/prisma db push --skip-generate; do
  n=$((n + 1))
  if [ "$n" -ge 15 ]; then
    echo "[entrypoint] Database not reachable after $n attempts, giving up." >&2
    exit 1
  fi
  echo "[entrypoint] Database not ready yet; retrying in 3s ($n/15)..."
  sleep 3
done

if [ "${SEED_ON_START:-true}" = "true" ]; then
  echo "[entrypoint] Seeding (idempotent: ensures the admin user exists)..."
  ./node_modules/.bin/tsx prisma/seed.ts || echo "[entrypoint] Seed step failed; continuing." >&2
fi

echo "[entrypoint] Starting: $*"
exec "$@"
