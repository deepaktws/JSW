import { prisma } from '../config/database.js';
import { hashPassword } from '../lib/hash.js';

/** Fields returned for user records (never includes password). */
export const userPublicSelect = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  updatedAt: true,
  isActive: true,
  deletedAt: true,
};

/**
 * Lists users that are not soft-deleted (paginated).
 *
 * @param {{ skip: number, limit: number }} args
 * @returns {Promise<{ users: object[], total: number }>}
 */
export async function listUsers({ skip, limit }) {
  const where = { deletedAt: null };

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
 * Returns one active user by id, or null if missing or soft-deleted.
 */
export async function getUserById(id) {
  return prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: userPublicSelect,
  });
}

/**
 * Partial update; omit password to leave unchanged.
 */
export async function updateUser(id, { name, email, password }) {
  const existing = await prisma.user.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  if (email !== undefined && email !== existing.email) {
    const taken = await prisma.user.findFirst({
      where: { email, NOT: { id } },
    });
    if (taken) {
      const err = new Error('Email already in use');
      err.status = 409;
      throw err;
    }
  }

  const data = {};
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
 * Soft-delete: sets deletedAt to now.
 */
export async function softDeleteUser(id) {
  const row = await prisma.user.findFirst({
    where: { id, deletedAt: null },
  });
  if (!row) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  return prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() },
    select: userPublicSelect,
  });
}
