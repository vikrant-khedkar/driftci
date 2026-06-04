'use client';

import { useRouter } from 'next/navigation';
import { logoutAction } from '../auth-actions';

export function DashboardHeader({ email }: { email: string }) {
  const router = useRouter();
  return (
    <header
      className="flex items-center justify-between border-b px-6 py-3"
      style={{ borderColor: 'var(--line)' }}
    >
      <a href="/dashboard" className="text-lg font-semibold">
        drift<span style={{ color: 'var(--accent)' }}>/</span>ci
      </a>
      <div className="flex items-center gap-3 text-sm">
        <a href="/dashboard/settings" className="font-medium" style={{ color: 'var(--ink-mute)' }}>
          Settings
        </a>
        <span style={{ color: 'var(--ink-mute)' }}>{email}</span>
        <button
          onClick={async () => {
            await logoutAction();
            router.push('/login');
          }}
          className="rounded-lg border px-3 py-1.5 font-medium"
          style={{ borderColor: 'var(--border-strong)' }}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
