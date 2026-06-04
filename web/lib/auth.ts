import { randomUUID, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { user, session } from '../db/schema.ts';

const COOKIE = 'driftci_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const hash = scryptSync(password, Buffer.from(saltHex, 'hex'), 64);
  const expected = Buffer.from(hashHex, 'hex');
  return hash.length === expected.length && timingSafeEqual(hash, expected);
}

export async function createUser(name: string, email: string, password: string) {
  const existing = await db.select().from(user).where(eq(user.email, email)).limit(1);
  if (existing.length) throw new Error('An account with that email already exists');
  const id = randomUUID();
  await db.insert(user).values({ id, name, email, passwordHash: hashPassword(password) });
  await startSession(id);
  return { id };
}

export async function login(email: string, password: string) {
  const rows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = rows[0];
  if (!u || !verifyPassword(password, u.passwordHash)) {
    throw new Error('Invalid email or password');
  }
  await startSession(u.id);
  return { id: u.id };
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await db.delete(session).where(eq(session.id, token));
    jar.delete(COOKIE);
  }
}

async function startSession(userId: string) {
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(session).values({ id, userId, expiresAt });
  const jar = await cookies();
  jar.set(COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

export async function getCurrentUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ id: user.id, email: user.email, name: user.name, expiresAt: session.expiresAt })
    .from(session)
    .innerJoin(user, eq(session.userId, user.id))
    .where(eq(session.id, token))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    await db.delete(session).where(eq(session.id, token));
    return null;
  }
  return { id: row.id, email: row.email, name: row.name };
}
