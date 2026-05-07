import { prisma } from '../config/database.js';
import { hashPassword } from '../lib/hash.js';
import { AppError } from '../lib/errors.js';

/** Fields returned for user records (never includes password or timestamps). */
export const userPublicSelect = {
  id: true,
  name: true,
  email: true,
  isActive: true,
} as const;

export interface CreateUserInput {
  name?: string;
  email: string;
  password: string;
  isActive?: boolean;
}

/**
 * Lists users that are active (paginated).
 */
export async function listUsers({
  skip,
  limit,
}: {
  skip: number;
  limit: number;
}): Promise<{ users: object[]; total: number }> {
  const where = { isActive: true };

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: userPublicSelect,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total };
}

/**
 * Creates one or more users with partial success support.
 * Returns both successful creations and failures.
 */
export async function createUsers(
  users: CreateUserInput[],
  creatorId: string,
): Promise<{
  created: Array<{ index: number; user: object }>;
  failed: Array<{ index: number; email: string; name?: string; reason: string }>;
}> {
  const created: Array<{ index: number; user: object }> = [];
  const failed: Array<{ index: number; email: string; name?: string; reason: string }> = [];
  const seenEmails = new Set<string>();

  const emailList = users.map((u) => u.email.toLowerCase());
  const existingUsers = await prisma.user.findMany({
    where: { email: { in: emailList } },
    select: { email: true },
  });
  const existingEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));

  for (const [index, user] of users.entries()) {
    const emailLower = user.email.toLowerCase();

    if (seenEmails.has(emailLower)) {
      failed.push({ index, email: user.email, name: user.name, reason: 'Duplicate email in request' });
      continue;
    }

    if (existingEmails.has(emailLower)) {
      failed.push({ index, email: user.email, name: user.name, reason: 'Email already registered' });
      continue;
    }

    seenEmails.add(emailLower);

    try {
      const hashedPassword = await hashPassword(user.password);
      const createdUser = await prisma.user.create({
        data: {
          name: user.name,
          email: user.email,
          password: hashedPassword,
          isActive: user.isActive !== undefined ? user.isActive : true,
          createdBy: creatorId,
          updatedBy: creatorId,
        },
        select: userPublicSelect,
      });
      created.push({ index, user: createdUser });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create user';
      failed.push({ index, email: user.email, name: user.name, reason: message });
    }
  }

  return { created, failed };
}

/**
 * Returns one active user by id, or null if missing or inactive.
 */
export async function getUserById(id: string) {
  return prisma.user.findFirst({
    where: { id, isActive: true },
    select: userPublicSelect,
  });
}

/**
 * Partial update; omit password to leave unchanged.
 */
export async function updateUser(
  id: string,
  { name, email, password }: { name?: string; email?: string; password?: string },
  updaterId: string,
) {
  const existing = await prisma.user.findFirst({
    where: { id, isActive: true },
  });
  if (!existing) {
    throw new AppError('User not found', 404);
  }

  if (email !== undefined && email !== existing.email) {
    const taken = await prisma.user.findFirst({
      where: { email, NOT: { id } },
    });
    if (taken) {
      throw new AppError('Email already in use', 409);
    }
  }

  const data: Record<string, unknown> = { updatedBy: updaterId };
  if (name !== undefined) data.name = name;
  if (email !== undefined) data.email = email;
  if (password !== undefined && password.length > 0) {
    data.password = await hashPassword(password);
  }

  return prisma.user.update({
    where: { id },
    data,
    select: userPublicSelect,
  });
}

/**
 * Soft-delete: sets deletedAt to now, isActive to false, and tracks who deleted.
 */
export async function softDeleteUser(id: string, deleterId: string) {
  const row = await prisma.user.findFirst({
    where: { id, isActive: true },
  });
  if (!row) {
    throw new AppError('User not found', 404);
  }

  return prisma.user.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedBy: deleterId,
      isActive: false,
    },
    select: userPublicSelect,
  });
}
