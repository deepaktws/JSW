import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { prisma } from '../config/database.js';
import { userPublicSelect } from './userService.js';
import { verifyPassword } from '../lib/hash.js';

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn },
  );
}

export async function getUserProfile(userId) {
  return prisma.user.findFirst({
    where: { id: userId, isActive: true },
    select: userPublicSelect,
  });
}

export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      password: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }

  const match = await verifyPassword(password, user.password);
  if (!match) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }

  // eslint-disable-next-line no-unused-vars
  const { password: _pwd, ...safeUser } = user;

  const token = signToken(safeUser);
  return { user: safeUser, token };
}
