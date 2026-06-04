import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { user } from '@/db/schema';

export function newApiKey(): string {
  return 'dci_' + randomBytes(24).toString('base64url');
}

export async function getUserByApiKey(key: string) {
  if (!key) return null;
  const rows = await db
    .select({ id: user.id, email: user.email, name: user.name })
    .from(user)
    .where(eq(user.apiKey, key))
    .limit(1);
  return rows[0] ?? null;
}
