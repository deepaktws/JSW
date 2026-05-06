#!/bin/sh
set -e
# Keep generated client in sync with prisma/schema.prisma (needed after schema changes without image rebuild).
npx prisma generate
# Apply pending migrations, then seed demo users (upserts — safe to re-run).
npx prisma migrate deploy
npx prisma db seed
exec node src/index.js
