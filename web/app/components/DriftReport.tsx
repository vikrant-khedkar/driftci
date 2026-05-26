import type { ScanResult, Severity, Visibility } from '@cli/types.ts';
import { groupDrifts, summarizeGroup, paramNames, type DriftGroup } from '@cli/report/group.ts';

const SEVERITY_STYLE: Record<Severity, string> = {
  BREAKING: 'bg-red-500/15 text-red-400 border-red-500/40',
  WARNING: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40',
  INFO: 'bg-blue-500/15 text-blue-400 border-blue-500/40',
};

export function DriftReport({ result }: { result: ScanResult }) {
  const groups = groupDrifts(result.drifts);
  const breakingCount = result.drifts.filter((d) => d.severity === 'BREAKING').length;
  const warningCount = result.drifts.filter((d) => d.severity === 'WARNING').length;
  const infoCount = result.drifts.filter((d) => d.severity === 'INFO').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-neutral-400">
          {result.platform} <span className="text-neutral-200">{result.target}</span>
          {result.version && result.version !== 'local' && <> · v{result.version}</>}
        </span>
        <span className="text-neutral-600">·</span>
        <span className="text-neutral-400">
          {result.scanned.length} {result.platform === 'make' ? 'modules' : 'operations'}
        </span>
        <span className="text-neutral-600">·</span>
        <span className="text-neutral-400">{result.spec.length} spec operations</span>

        <span className="ml-auto flex gap-2">
          {breakingCount > 0 && (
            <span className="rounded border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400">
              {breakingCount} BREAKING
            </span>
          )}
          {warningCount > 0 && (
            <span className="rounded border border-yellow-500/40 bg-yellow-500/15 px-2 py-0.5 text-xs font-medium text-yellow-400">
              {warningCount} WARNING
            </span>
          )}
          {infoCount > 0 && (
            <span className="rounded border border-blue-500/40 bg-blue-500/15 px-2 py-0.5 text-xs font-medium text-blue-400">
              {infoCount} INFO
            </span>
          )}
          {result.drifts.length === 0 && (
            <span className="rounded border border-green-500/40 bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-400">
              ALIGNED
            </span>
          )}
        </span>
      </div>

      {result.warnings.length > 0 && (
        <details className="rounded border border-neutral-800 bg-neutral-900/50 p-3 text-xs text-neutral-400">
          <summary className="cursor-pointer">Parser warnings ({result.warnings.length})</summary>
          <ul className="mt-2 space-y-1 pl-4">
            {result.warnings.map((w, i) => (
              <li key={i} className="font-mono">
                {w}
              </li>
            ))}
          </ul>
        </details>
      )}

      {groups.length === 0 ? (
        <div className="rounded border border-green-500/30 bg-green-500/10 p-6 text-center">
          <div className="text-lg font-medium text-green-400">No drift detected</div>
          <div className="mt-1 text-sm text-neutral-400">
            All {result.platform} operations align with your OpenAPI spec.
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {groups.map((g, i) => (
            <li
              key={i}
              className={`rounded border p-4 ${SEVERITY_STYLE[g.severity]} bg-neutral-900/50`}
            >
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="rounded border border-current/40 bg-current/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                  {g.severity}
                </span>
                <span className="font-mono text-sm">{g.kind}</span>
                {g.drifts.length > 1 && (
                  <span className="text-xs text-neutral-500">×{g.drifts.length}</span>
                )}
                <span className="ml-auto flex items-center gap-1.5">
                  <VisibilityBadges v={g.visibility} />
                  <span className="font-mono text-xs text-neutral-500">{g.module}</span>
                </span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-1 font-mono text-xs sm:grid-cols-2">
                <div>
                  <span className="text-neutral-500">Module sends:</span>{' '}
                  <span className="text-neutral-200">
                    {g.call.method} {g.call.pathTemplate}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">Spec has:</span>{' '}
                  {g.kind === 'endpoint_removed' || g.kind === 'method_mismatch' ? (
                    <>
                      <span className="italic text-neutral-500">no match</span>
                      {g.spec && (
                        <span className="ml-1 text-neutral-600">
                          (closest: {g.spec.method} {g.spec.pathTemplate})
                        </span>
                      )}
                    </>
                  ) : g.spec ? (
                    <span className="text-neutral-200">
                      {g.spec.method} {g.spec.pathTemplate}
                    </span>
                  ) : (
                    <span className="italic text-neutral-500">no match</span>
                  )}
                </div>
              </div>
              <div className="mt-2 text-sm text-neutral-300">{summarizeGroup(g)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function VisibilityBadges({ v }: { v?: Visibility }) {
  if (!v) return null;
  const badges: { label: string; cls: string; title: string }[] = [];
  if (v.archived)
    badges.push({
      label: 'ARCHIVED',
      cls: 'border-neutral-600 text-neutral-400',
      title: 'Hidden + cannot be added; existing scenarios may still call this.',
    });
  if (v.deprecated && !v.archived)
    badges.push({
      label: 'DEPRECATED',
      cls: 'border-orange-500/40 text-orange-400',
      title: 'Marked deprecated. Existing customers may still use it.',
    });
  if (!v.public && !v.archived)
    badges.push({
      label: 'HIDDEN',
      cls: 'border-purple-500/40 text-purple-400',
      title: 'Not shown to new users in the Make UI. Existing scenarios still work.',
    });
  if (badges.length === 0) return null;
  return (
    <>
      {badges.map((b) => (
        <span
          key={b.label}
          title={b.title}
          className={`rounded border bg-neutral-900 px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${b.cls}`}
        >
          {b.label}
        </span>
      ))}
    </>
  );
}
