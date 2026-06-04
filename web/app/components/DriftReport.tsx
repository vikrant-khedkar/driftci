import type { ScanResult, Visibility } from '@cli/types.ts';
import { groupDrifts, summarizeGroup, type DriftGroup } from '@cli/report/group.ts';

export function DriftReport({ result }: { result: ScanResult }) {
  const groups = groupDrifts(result.drifts);
  const breaking = result.drifts.filter((d) => d.severity === 'BREAKING').length;
  const warning = result.drifts.filter((d) => d.severity === 'WARNING').length;
  const info = result.drifts.filter((d) => d.severity === 'INFO').length;
  const unit = result.platform === 'make' ? 'modules' : 'operations';
  const aligned = result.drifts.length === 0;

  const driftedNames = new Set(result.drifts.map((d) => d.nodeCall.operationName));
  const matched = result.scanned.filter((c) => !driftedNames.has(c.operationName));

  return (
    <div>
      <div className="mb-10">
        <div className="text-xs uppercase tracking-[0.18em] text-[var(--ink-mute)]">
          {result.platform} · {result.target}
          {result.version && result.version !== 'local' && <> · v{result.version}</>}
        </div>
        <div className="mt-4 flex items-baseline gap-6">
          <Stat
            value={breaking}
            label="breaking"
            accent={breaking > 0}
            big
          />
          <Stat value={warning} label="warnings" />
          <Stat value={info} label="info" />
          <div className="ml-auto text-right">
            <div className="text-2xl font-medium tabular-nums">{result.scanned.length}</div>
            <div className="text-xs uppercase tracking-[0.18em] text-[var(--ink-mute)]">
              {unit} scanned
            </div>
          </div>
        </div>
      </div>

      {result.warnings.length > 0 && (
        <details className="mb-8 border-l border-[var(--line)] pl-4 text-xs text-[var(--ink-mute)]">
          <summary className="cursor-pointer select-none uppercase tracking-[0.18em]">
            Parser warnings · {result.warnings.length}
          </summary>
          <ul className="mt-3 space-y-1 font-mono">
            {result.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </details>
      )}

      {!aligned && (
        <ul className="mb-10 divide-y divide-[var(--line)] border-t border-b border-[var(--line)]">
          {groups.map((g, i) => (
            <DriftRow key={i} group={g} />
          ))}
        </ul>
      )}

      {matched.length > 0 && (
        <details open={aligned} className="border-t border-[var(--line)]">
          <summary className="flex cursor-pointer select-none items-baseline justify-between py-4">
            <span className="text-xs uppercase tracking-[0.18em] text-[var(--ink-mute)]">
              {aligned ? 'Aligned' : 'Also matched'} · {matched.length}
            </span>
            <span className="text-xs text-[var(--ink-mute)]">show / hide</span>
          </summary>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-t border-[var(--line)] text-left text-xs uppercase tracking-[0.18em] text-[var(--ink-mute)]">
                <th className="py-3 pr-4 font-normal">{unit === 'modules' ? 'Module' : 'Operation'}</th>
                <th className="py-3 pr-4 font-normal">Method</th>
                <th className="py-3 pr-4 font-normal">Path</th>
                <th className="py-3 pr-0 text-right font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {matched.map((c, i) => (
                <tr key={i} className="border-t border-[var(--line)]">
                  <td className="py-3 pr-4 font-medium">{c.operationName}</td>
                  <td className="py-3 pr-4 font-mono text-xs text-[var(--ink-soft)]">{c.method}</td>
                  <td className="py-3 pr-4 font-mono text-xs text-[var(--ink-soft)]">
                    {c.pathTemplate}
                  </td>
                  <td className="py-3 pr-0 text-right">
                    <span className="text-xs uppercase tracking-[0.18em] text-[var(--ink-mute)]">
                      matched
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}

function Stat({
  value,
  label,
  accent = false,
  big = false,
}: {
  value: number;
  label: string;
  accent?: boolean;
  big?: boolean;
}) {
  const dim = value === 0;
  return (
    <div>
      <div
        className={`tabular-nums ${big ? 'text-4xl' : 'text-2xl'} font-medium ${
          accent ? 'text-[var(--accent)]' : dim ? 'text-[var(--ink-mute)]' : 'text-[var(--ink)]'
        }`}
      >
        {value}
      </div>
      <div className="text-xs uppercase tracking-[0.18em] text-[var(--ink-mute)]">{label}</div>
    </div>
  );
}

function DriftRow({ group: g }: { group: DriftGroup }) {
  const isBreaking = g.severity === 'BREAKING';
  return (
    <li className="group py-5">
      <div className="flex items-baseline gap-4">
        <span
          className={`h-1.5 w-1.5 shrink-0 translate-y-[5px] rounded-full ${
            isBreaking ? 'bg-[var(--accent)]' : 'bg-[var(--ink-mute)]'
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-medium">{g.module}</span>
            <span className="font-mono text-xs text-[var(--ink-mute)]">{formatKind(g.kind)}</span>
            {g.drifts.length > 1 && (
              <span className="text-xs text-[var(--ink-mute)]">×{g.drifts.length}</span>
            )}
            <span className="ml-auto flex items-center gap-2">
              <VisibilityBadges v={g.visibility} />
            </span>
          </div>

          <div className="mt-2 grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-[auto_1fr]">
            <Row label="sends">
              <code className="font-mono text-sm">
                {g.call.method} {g.call.pathTemplate}
              </code>
            </Row>
            <Row label="spec">
              {g.kind === 'endpoint_removed' || g.kind === 'method_mismatch' ? (
                <span className="text-[var(--ink-mute)]">
                  no match
                  {g.spec && (
                    <span className="ml-2 italic">
                      (closest: {g.spec.method} {g.spec.pathTemplate})
                    </span>
                  )}
                </span>
              ) : g.spec ? (
                <code className="font-mono text-sm">
                  {g.spec.method} {g.spec.pathTemplate}
                </code>
              ) : (
                <span className="text-[var(--ink-mute)]">no match</span>
              )}
            </Row>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">
            {summarizeGroup(g)}
          </p>

          <SuggestionBlock group={g} />
        </div>
      </div>
    </li>
  );
}

const CONFIDENCE_STYLE: Record<string, string> = {
  high: 'border-[var(--ok)] text-[var(--ok)]',
  medium: 'border-[var(--warning)] text-[var(--warning)]',
  low: 'border-[var(--line)] text-[var(--ink-mute)]',
};

function SuggestionBlock({ group }: { group: DriftGroup }) {
  const s = group.drifts[0]?.suggestion;
  if (!s) return null;
  return (
    <div className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--bg-2)] p-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-mute)]">
          Suggested fix
        </span>
        <span
          className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${CONFIDENCE_STYLE[s.confidence]}`}
        >
          {s.confidence} confidence
        </span>
        {s.autofixable && (
          <span className="rounded border border-[var(--accent)] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--accent)]">
            auto-fixable
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-[var(--ink)]">{s.summary}</p>
      {s.detail && <p className="mt-1 text-xs text-[var(--ink-mute)]">{s.detail}</p>}
      {(s.before || s.after) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-xs">
          {s.before && (
            <code className="rounded bg-[var(--breaking-tint)] px-2 py-1 text-[var(--breaking)] line-through">
              {s.before}
            </code>
          )}
          {s.before && s.after && <span className="text-[var(--ink-mute)]">→</span>}
          {s.after && (
            <code className="rounded bg-[var(--accent-tint)] px-2 py-1 text-[var(--ink)]">
              {s.after}
            </code>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <span className="text-xs uppercase tracking-[0.18em] text-[var(--ink-mute)]">{label}</span>
      <span className="min-w-0">{children}</span>
    </>
  );
}

function formatKind(kind: string): string {
  return kind.replace(/_/g, ' ');
}

function VisibilityBadges({ v }: { v?: Visibility }) {
  if (!v) return null;
  const tags: { label: string; title: string }[] = [];
  if (v.archived)
    tags.push({
      label: 'archived',
      title: 'Hidden + cannot be added; existing scenarios may still call this.',
    });
  if (v.deprecated && !v.archived)
    tags.push({
      label: 'deprecated',
      title: 'Marked deprecated. Existing customers may still use it.',
    });
  if (!v.public && !v.archived)
    tags.push({
      label: 'hidden',
      title: 'Not shown to new users. Existing scenarios still work.',
    });
  if (tags.length === 0) return null;
  return (
    <>
      {tags.map((t) => (
        <span
          key={t.label}
          title={t.title}
          className="border border-[var(--line)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--ink-mute)]"
        >
          {t.label}
        </span>
      ))}
    </>
  );
}
