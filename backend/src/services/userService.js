import { prisma } from '../config/database.js';
import { hashPassword } from '../lib/hash.js';

/** Fields returned for user records (never includes password or timestamps). */
export const userPublicSelect = {
  id: true,
  name: true,
  email: true,
  isActive: true,
};

/**
 * Lists users that are active (paginated).
 *
 * @param {{ skip: number, limit: number }} args
 * @returns {Promise<{ users: object[], total: number }>}
 */
export async function listUsers({ skip, limit }) {
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
 * @param {Array<{name: string, email: string, password: string}>} users
 * @param {string} creatorId - UUID of the authenticated user creating these users
 * @returns {Promise<{created: Array, failed: Array}>} Created users and failures with reasons
 */
export async function createUsers(users, creatorId) {
  const created = [];
  const failed = [];
  const seenEmails = new Set();

  // Batch check all emails against DB upfront
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
      failed.push({ index, email: user.email, name: user.name, reason: err.message || 'Failed to create user' });
    }
  }

  return { created, failed };
}

/**
 * Returns one active user by id, or null if missing or inactive.
 */
export async function getUserById(id) {
  return prisma.user.findFirst({
    where: { id, isActive: true },
    select: userPublicSelect,
  });
}

/**
 * Partial update; omit password to leave unchanged.
 */
export async function updateUser(id, { name, email, password }, updaterId) {
  const existing = await prisma.user.findFirst({
    where: { id, isActive: true },
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

  const data = { updatedBy: updaterId };
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
export async function softDeleteUser(id, deleterId) {
  const row = await prisma.user.findFirst({
    where: { id, isActive: true },
  });
  if (!row) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
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
