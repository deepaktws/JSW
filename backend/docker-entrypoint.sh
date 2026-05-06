#!/bin/sh
set -e
# Apply pending migrations, then seed demo users (upserts — safe to re-run).
npx prisma migrate deploy
npx prisma db seed
exec node src/index.js
