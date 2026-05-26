import type { Drift, DriftKind, Severity, Visibility } from '../types.ts';

export interface DriftGroup {
  severity: Severity;
  kind: DriftKind;
  module: string;
  call: { method: string; pathTemplate: string };
  spec?: { method: string; pathTemplate: string };
  visibility?: Visibility;
  label?: string;
  drifts: Drift[];
}

const SEVERITY_RANK: Record<Severity, number> = { BREAKING: 0, WARNING: 1, INFO: 2 };

export function groupDrifts(drifts: Drift[]): DriftGroup[] {
  const map = new Map<string, DriftGroup>();
  for (const d of drifts) {
    const key = `${d.severity}|${d.kind}|${d.nodeCall.operationName}|${d.nodeCall.method} ${d.nodeCall.pathTemplate}`;
    let g = map.get(key);
    if (!g) {
      g = {
        severity: d.severity,
        kind: d.kind,
        module: d.nodeCall.operationName,
        call: { method: d.nodeCall.method, pathTemplate: d.nodeCall.pathTemplate },
        spec: d.specMatch
          ? { method: d.specMatch.method, pathTemplate: d.specMatch.pathTemplate }
          : undefined,
        visibility: d.nodeCall.visibility,
        label: d.nodeCall.label,
        drifts: [],
      };
      map.set(key, g);
    }
    g.drifts.push(d);
  }

  return [...map.values()].sort((a, b) => {
    const s = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (s !== 0) return s;
    return a.module.localeCompare(b.module);
  });
}

export function paramNames(drifts: Drift[]): string[] {
  const out: string[] = [];
  for (const d of drifts) {
    const m = d.message.match(/"([^"]+)"/);
    if (m && m[1]) out.push(m[1]);
  }
  return out;
}

export function summarizeGroup(g: DriftGroup): string {
  if (g.drifts.length === 1) return g.drifts[0]?.message ?? '';
  const names = paramNames(g.drifts);
  switch (g.kind) {
    case 'missing_required_param':
      return `Spec requires ${g.drifts.length} params not declared: ${names.join(', ')}`;
    case 'unknown_param':
      return `Declares ${g.drifts.length} params not in spec: ${names.join(', ')}`;
    default:
      return `${g.drifts.length} issues — first: ${g.drifts[0]?.message ?? ''}`;
  }
}