import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { config } from '../config/env.js';
import { prisma } from '../config/database.js';
import { userPublicSelect } from './userService.js';
import { verifyPassword } from '../lib/hash.js';
import { AppError } from '../lib/errors.js';

interface UserTokenPayload {
  id: string;
  email: string;
  name?: string | null;
  isActive: boolean;
}

function signToken(user: UserTokenPayload): string {
  return jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as StringValue,
  });
}

export async function getUserProfile(userId: string) {
  return prisma.user.findFirst({
    where: { id: userId, isActive: true },
    select: userPublicSelect,
  });
}

export async function loginUser({ email, password }: { email: string; password: string }) {
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
    throw new AppError('Invalid email or password', 401);
  }

  const match = await verifyPassword(password, user.password);
  if (!match) {
    throw new AppError('Invalid email or password', 401);
  }

  const { password: _pwd, ...safeUser } = user;

  const token = signToken(safeUser);
  return { user: safeUser, token };
}
