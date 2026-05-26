'use server';

import { fetchMakeApp } from '@cli/make/fetch.ts';
import { parseMake } from '@cli/make/parse.ts';
import { fetchN8nNode } from '@cli/n8n/fetch.ts';
import { fetchN8nFromGithub } from '@cli/n8n/github.ts';
import { parseN8n } from '@cli/n8n/parse.ts';
import { loadOpenApi } from '@cli/openapi/load.ts';
import { diff } from '@cli/diff/engine.ts';
import type { ScanResult } from '@cli/types.ts';

export interface ScanInput {
  platform: 'make' | 'n8n';
  openapi: string;
  // make
  app?: string;
  version?: string;
  region?: string;
  // n8n
  n8nMode?: 'local' | 'repo';
  n8nPath?: string;
  n8nRepo?: string;
  n8nSubdir?: string;
}

export interface ScanResponse {
  ok: boolean;
  result?: ScanResult;
  error?: string;
  durationMs: number;
}

export async function runScan(input: ScanInput): Promise<ScanResponse> {
  const t0 = Date.now();
  try {
    if (input.platform === 'make') return await scanMake(input, t0);
    if (input.platform === 'n8n') return await scanN8n(input, t0);
    return fail('Unknown platform', t0);
  } catch (err) {
    return fail((err as Error).message ?? String(err), t0);
  }
}

async function scanMake(input: ScanInput, t0: number): Promise<ScanResponse> {
  if (!input.app || !input.version) return fail('Make requires app + version', t0);
  const token = process.env.MAKE_API_TOKEN;
  if (!token) return fail('MAKE_API_TOKEN missing on server', t0);

  const raw = await fetchMakeApp({
    app: input.app,
    version: input.version,
    token,
    region: input.region ?? 'eu1',
  });
  const { calls, warnings } = parseMake(raw);
  const specCalls = await loadOpenApi(input.openapi);
  const drifts = diff(calls, specCalls);

  return ok(
    {
      platform: 'make',
      target: input.app,
      version: input.version,
      scanned: calls,
      spec: specCalls,
      drifts,
      warnings,
    },
    t0,
  );
}

async function scanN8n(input: ScanInput, t0: number): Promise<ScanResponse> {
  let raw;
  let cleanup: (() => Promise<void>) | undefined;
  let target: string;

  if (input.n8nMode === 'repo') {
    if (!input.n8nRepo) return fail('n8n repo URL required', t0);
    const r = await fetchN8nFromGithub({ repo: input.n8nRepo, subdir: input.n8nSubdir });
    raw = r.raw;
    cleanup = r.cleanup;
    target = input.n8nRepo;
  } else {
    if (!input.n8nPath) return fail('n8n local path required', t0);
    raw = await fetchN8nNode(input.n8nPath);
    target = input.n8nPath;
  }

  try {
    const { calls, warnings } = parseN8n(raw);
    const specCalls = await loadOpenApi(input.openapi);
    const drifts = diff(calls, specCalls);

    return ok(
      {
        platform: 'n8n',
        target,
        version: input.version ?? 'local',
        scanned: calls,
        spec: specCalls,
        drifts,
        warnings,
      },
      t0,
    );
  } finally {
    if (cleanup) await cleanup();
  }
}

function ok(result: ScanResult, t0: number): ScanResponse {
  return { ok: true, result, durationMs: Date.now() - t0 };
}

function fail(error: string, t0: number): ScanResponse {
  return { ok: false, error, durationMs: Date.now() - t0 };
}
