import type { ApiCall, Drift } from '../types.ts';

export interface SpecMismatch {
  nodePrefix: string;
  specPrefix: string;
  removedRatio: number;
}

const REMOVED_RATIO_THRESHOLD = 0.8;
const MIN_DRIFTS = 3;

export function detectSpecMismatch(
  drifts: Drift[],
  nodeCalls: ApiCall[],
  specCalls: ApiCall[],
): SpecMismatch | undefined {
  if (drifts.length < MIN_DRIFTS) return undefined;

  const removed = drifts.filter((d) => d.kind === 'endpoint_removed').length;
  const removedRatio = removed / drifts.length;
  if (removedRatio < REMOVED_RATIO_THRESHOLD) return undefined;

  const nodePrefix = dominantFirstSegment(nodeCalls);
  const specPrefix = dominantFirstSegment(specCalls);
  if (!nodePrefix || !specPrefix || nodePrefix === specPrefix) return undefined;

  return { nodePrefix, specPrefix, removedRatio };
}

function dominantFirstSegment(calls: ApiCall[]): string | undefined {
  if (!calls.length) return undefined;
  const counts = new Map<string, number>();
  for (const c of calls) {
    const seg = firstSegment(c.pathTemplate);
    if (!seg) continue;
    counts.set(seg, (counts.get(seg) ?? 0) + 1);
  }
  let best: { seg: string; n: number } | undefined;
  for (const [seg, n] of counts) {
    if (!best || n > best.n) best = { seg, n };
  }
  if (!best) return undefined;
  return best.n / calls.length >= 0.7 ? best.seg : undefined;
}

function firstSegment(path: string): string | undefined {
  const m = path.match(/^\/([^/]+)/);
  return m?.[1] ? `/${m[1]}` : undefined;
}
