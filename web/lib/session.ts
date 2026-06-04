import { redirect } from 'next/navigation';
import { getCurrentUser } from './auth.ts';

export async function requireUser() {
  const u = await getCurrentUser();
  if (!u) redirect('/login');
  return u;
}

export { getCurrentUser };
