'use server';

import { createUser, login as doLogin, logout as doLogout } from '@/lib/auth';

export async function signupAction(name: string, email: string, password: string) {
  try {
    await createUser(name, email, password);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export async function loginAction(email: string, password: string) {
  try {
    await doLogin(email, password);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export async function logoutAction() {
  await doLogout();
}
