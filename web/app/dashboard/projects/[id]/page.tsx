import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { getProjectWithScans } from '../../actions';
import { DashboardHeader } from '../../../components/DashboardHeader';
import { DriftReport } from '../../../components/DriftReport';
import { RunScanButton } from '../../../components/RunScanButton';
import { DeleteProjectButton } from '../../../components/DeleteProjectButton';
import { ExplainButton } from '../../../components/ExplainButton';
import type { ScanResult } from '@cli/types.ts';

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const data = await getProjectWithScans(id);
  if (!data) notFound();

  const { project: p, scans } = data;
  const latest = scans[0];
  const latestResult = latest?.status === 'ok' ? (latest.result as ScanResult | null) : null;

  return (
    <div className="min-h-screen">
      <DashboardHeader email={user.email} />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <a href="/dashboard" className="text-sm" style={{ color: 'var(--ink-mute)' }}>
          ← Projects
        </a>

        <div className="mt-3 mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{p.name}</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--ink-mute)' }}>
              {p.platform === 'make'
                ? `Make · ${p.makeApp} v${p.makeVersion} · ${p.makeRegion}`
                : `n8n · ${p.n8nRepo ?? p.n8nPath}`}
            </p>
            <p className="mt-0.5 font-mono text-xs" style={{ color: 'var(--muted-2)' }}>
              {p.openapiSource}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/dashboard/projects/${p.id}/edit`}
              className="rounded-lg border px-3 py-2 text-sm font-medium"
              style={{ borderColor: 'var(--border-strong)' }}
            >
              Edit
            </a>
            <DeleteProjectButton projectId={p.id} />
            <RunScanButton projectId={p.id} />
          </div>
        </div>

        {/* Latest scan result */}
        {latest ? (
          latest.status === 'error' ? (
            <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
              <div className="font-medium">Last scan failed</div>
              <pre className="mt-2 whitespace-pre-wrap font-mono text-xs">{latest.error}</pre>
            </div>
          ) : latestResult ? (
            <div className="rounded-xl border p-5" style={{ borderColor: 'var(--line)' }}>
              <DriftReport result={latestResult} />
              {latestResult.drifts.length > 0 && latest && (
                <ExplainButton scanId={latest.id} cached={latest.guidance} />
              )}
            </div>
          ) : null
        ) : (
          <div
            className="rounded-xl border p-10 text-center text-sm"
            style={{ borderColor: 'var(--line)', color: 'var(--ink-mute)' }}
          >
            No scans yet. Hit “Run scan” to check this integration against your spec.
          </div>
        )}

        {/* History */}
        {scans.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
              History
            </h2>
            <ul className="space-y-1">
              {scans.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm"
                  style={{ borderColor: 'var(--line)' }}
                >
                  <span style={{ color: 'var(--ink-mute)' }}>
                    {new Date(s.createdAt).toLocaleString()}
                  </span>
                  {s.status === 'error' ? (
                    <span className="text-red-600">error</span>
                  ) : (
                    <span className="flex gap-2 font-mono text-xs">
                      {s.breakingCount > 0 && (
                        <span style={{ color: 'var(--breaking)' }}>{s.breakingCount} BREAKING</span>
                      )}
                      {s.warningCount > 0 && (
                        <span style={{ color: 'var(--warning)' }}>{s.warningCount} WARNING</span>
                      )}
                      {s.breakingCount === 0 && s.warningCount === 0 && (
                        <span style={{ color: 'var(--ok)' }}>aligned</span>
                      )}
                      <span style={{ color: 'var(--muted-2)' }}>· {s.durationMs}ms</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
