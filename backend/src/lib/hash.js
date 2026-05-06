import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export const hashPassword = (plain) => bcrypt.hash(plain, SALT_ROUNDS);
export const verifyPassword = (plain, hashed) => bcrypt.compare(plain, hashed);
