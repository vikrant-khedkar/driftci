import type { ScanResult } from '../types.ts';

export function renderJson(result: ScanResult): string {
  return JSON.stringify(result, null, 2);
}
