import Link from 'next/link';
import { requireUser } from '@/lib/session';
import { listProjects } from './actions';
import { DashboardHeader } from '../components/DashboardHeader';

export default async function DashboardPage() {
  const user = await requireUser();
  const projects = await listProjects();

  return (
    <div className="min-h-screen">
      <DashboardHeader email={user.email} />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
          <Link
            href="/dashboard/new"
            className="rounded-lg px-3 py-2 text-sm font-medium text-white"
            style={{ background: 'var(--ink)' }}
          >
            + New project
          </Link>
        </div>

        {projects.length === 0 ? (
          <div
            className="rounded-xl border p-10 text-center"
            style={{ borderColor: 'var(--line)' }}
          >
            <p className="text-base" style={{ color: 'var(--ink-2)' }}>
              No projects yet.
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--ink-mute)' }}>
              Add your first Make app or n8n node to start monitoring drift.
            </p>
            <Link
              href="/dashboard/new"
              className="mt-4 inline-block rounded-lg px-4 py-2 text-sm font-medium text-white"
              style={{ background: 'var(--ink)' }}
            >
              + New project
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/dashboard/projects/${p.id}`}
                  className="flex items-center justify-between rounded-xl border p-4 transition hover:bg-black/[0.02]"
                  style={{ borderColor: 'var(--line)' }}
                >
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="mt-0.5 text-xs" style={{ color: 'var(--ink-mute)' }}>
                      {p.platform === 'make'
                        ? `Make · ${p.makeApp} v${p.makeVersion}`
                        : `n8n · ${p.n8nRepo ?? p.n8nPath}`}
                    </div>
                  </div>
                  <span
                    className="rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase"
                    style={{ borderColor: 'var(--border-strong)', color: 'var(--ink-mute)' }}
                  >
                    {p.platform}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
