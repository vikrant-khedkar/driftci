'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { runProjectScan } from '../dashboard/actions';

export function RunScanButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [running, setRunning] = useState(false);

  return (
    <button
      disabled={pending || running}
      onClick={() => {
        setRunning(true);
        start(async () => {
          await runProjectScan(projectId);
          router.refresh();
          setRunning(false);
        });
      }}
      className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      style={{ background: 'var(--ink)' }}
    >
      {pending || running ? 'Scanning…' : 'Run scan'}
    </button>
  );
}
