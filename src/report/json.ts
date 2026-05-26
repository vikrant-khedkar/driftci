import type { ScanResult } from '../types.ts';
import { detectSpecMismatch } from '../diff/mismatch.ts';

export function renderJson(result: ScanResult): string {
  const specMismatch = detectSpecMismatch(result.drifts, result.scanned, result.spec);
  return JSON.stringify({ ...result, specMismatch: specMismatch ?? null }, null, 2);
}
