/**
 * Seed script — creates sample users with bcrypt-hashed passwords.
 * Run: npm run prisma:seed
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, '..');

function loadDatabaseUrl(): void {
  const candidates = [
    path.join(backendRoot, '.env'),
    path.join(process.cwd(), '.env'),
    path.join(backendRoot, '.env.example'),
  ];
  for (const filePath of candidates) {
    dotenv.config({ path: filePath });
    if (process.env.DATABASE_URL) return;
  }
}

loadDatabaseUrl();

if (!process.env.DATABASE_URL) {
  console.error(
    'DATABASE_URL is missing. Create backend/.env (copy .env.example) or ensure .env.example defines DATABASE_URL.',
  );
  process.exit(1);
}

const prisma = new PrismaClient();

const SYSTEM_UUID = '00000000-0000-0000-0000-000000000000';

async function main(): Promise<void> {
  const password = await bcrypt.hash('password123', 12);

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@example.com',
      password,
      createdBy: SYSTEM_UUID,
      updatedBy: SYSTEM_UUID,
    },
  });

  await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'user@example.com',
      password,
      createdBy: SYSTEM_UUID,
      updatedBy: SYSTEM_UUID,
    },
  });

  console.log('Seed completed: admin@example.com / password123, user@example.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
