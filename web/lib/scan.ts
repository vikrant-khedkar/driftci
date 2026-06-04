import { randomUUID } from 'node:crypto';
import { db } from '@/db';
import { project, scan } from '@/db/schema';
import { decryptSecret } from '@/lib/crypto';

import { fetchMakeApp } from '@cli/make/fetch.ts';
import { parseMake } from '@cli/make/parse.ts';
import { fetchN8nNode } from '@cli/n8n/fetch.ts';
import { fetchN8nFromGithub } from '@cli/n8n/github.ts';
import { parseN8n } from '@cli/n8n/parse.ts';
import { loadOpenApi } from '@cli/openapi/load.ts';
import { diff } from '@cli/diff/engine.ts';
import { withSuggestions } from '@cli/diff/remediation.ts';
import type { ScanResult } from '@cli/types.ts';

type ProjectRow = typeof project.$inferSelect;

export async function executeScan(p: ProjectRow): Promise<ScanResult> {
  return p.platform === 'make' ? scanMake(p) : scanN8n(p);
}

// Run a scan and persist it. Returns the scan row id + result (or error).
export async function runAndPersistScan(
  p: ProjectRow,
): Promise<{ scanId: string; result?: ScanResult; error?: string }> {
  const t0 = Date.now();
  const scanId = randomUUID();
  try {
    const result = await executeScan(p);
    const breaking = result.drifts.filter((d) => d.severity === 'BREAKING').length;
    const warning = result.drifts.filter((d) => d.severity === 'WARNING').length;
    const info = result.drifts.filter((d) => d.severity === 'INFO').length;
    await db.insert(scan).values({
      id: scanId,
      projectId: p.id,
      status: 'ok',
      durationMs: Date.now() - t0,
      breakingCount: breaking,
      warningCount: warning,
      infoCount: info,
      scannedCount: result.scanned.length,
      specCount: result.spec.length,
      result,
    });
    return { scanId, result };
  } catch (err) {
    const error = (err as Error).message ?? String(err);
    await db.insert(scan).values({
      id: scanId,
      projectId: p.id,
      status: 'error',
      error,
      durationMs: Date.now() - t0,
    });
    return { scanId, error };
  }
}

async function scanMake(p: ProjectRow): Promise<ScanResult> {
  if (!p.makeApp || !p.makeVersion) throw new Error('Make project missing app/version');
  if (!p.makeTokenEnc) throw new Error('Make project missing token');
  const token = decryptSecret(p.makeTokenEnc);

  const raw = await fetchMakeApp({
    app: p.makeApp,
    version: p.makeVersion,
    token,
    region: p.makeRegion ?? 'eu1',
  });
  const { calls, warnings } = parseMake(raw);
  const specCalls = await loadOpenApi(p.openapiSource);
  const drifts = withSuggestions(diff(calls, specCalls));
  return {
    platform: 'make',
    target: p.makeApp,
    version: p.makeVersion,
    scanned: calls,
    spec: specCalls,
    drifts,
    warnings,
  };
}

async function scanN8n(p: ProjectRow): Promise<ScanResult> {
  let raw;
  let cleanup: (() => Promise<void>) | undefined;
  let target: string;

  if (p.n8nMode === 'repo') {
    if (!p.n8nRepo) throw new Error('n8n project missing repo');
    const r = await fetchN8nFromGithub({ repo: p.n8nRepo, subdir: p.n8nSubdir ?? undefined });
    raw = r.raw;
    cleanup = r.cleanup;
    target = p.n8nRepo;
  } else {
    if (!p.n8nPath) throw new Error('n8n project missing path');
    raw = await fetchN8nNode(p.n8nPath);
    target = p.n8nPath;
  }

  try {
    const { calls, warnings } = parseN8n(raw);
    const specCalls = await loadOpenApi(p.openapiSource);
    const drifts = withSuggestions(diff(calls, specCalls));
    return {
      platform: 'n8n',
      target,
      version: 'latest',
      scanned: calls,
      spec: specCalls,
      drifts,
      warnings,
    };
  } finally {
    if (cleanup) await cleanup();
  }
}
