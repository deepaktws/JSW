import { prisma } from '../config/database.js';

/**
 * Returns all users without password fields (for admin-style listings).
 */
export async function listUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}
