import bcrypt from "bcryptjs";

export function isBcryptHash(value: string) {
  return /^\$2[aby]\$\d{2}\$/.test(value);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, stored: string) {
  if (isBcryptHash(stored)) {
    return bcrypt.compare(password, stored);
  }
  return password === stored;
}
