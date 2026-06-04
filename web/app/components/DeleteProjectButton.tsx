'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteProject } from '../dashboard/actions';

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (!confirm('Delete this project and all its scans?')) return;
        start(async () => {
          await deleteProject(projectId);
          router.push('/dashboard');
        });
      }}
      className="rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50"
      style={{ borderColor: 'var(--border-strong)', color: 'var(--breaking)' }}
    >
      {pending ? 'Deleting…' : 'Delete'}
    </button>
  );
}
