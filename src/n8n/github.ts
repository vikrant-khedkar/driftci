import { mkdtemp, rm, stat, rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fetchN8nNode, type N8nRaw } from './fetch.ts';

export interface N8nRepoOptions {
  repo: string;
  ref?: string;
  subdir?: string;
}

// Simple in-memory cache with TTL for cloned repos
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  path: string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export async function fetchN8nFromGithub(opts: N8nRepoOptions): Promise<{
  raw: N8nRaw;
  cleanup: () => Promise<void>;
}> {
  const url = normalizeRepoUrl(opts.repo);
  const ref = opts.ref ?? extractRef(opts.repo);
  const cacheKey = `${opts.repo}${ref ? `#${ref}` : ''}`;

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    const root = opts.subdir ? join(cached.path, opts.subdir) : cached.path;
    try {
      // Verify cache directory still exists
      await stat(root);
      const raw = await fetchN8nNode(root);
return {
    raw,
    cleanup: async () => {}, // Don't delete cached repos
  };
    } catch {
      // Cache invalid, remove it
      cache.delete(cacheKey);
    }
  }

  const tmp = await mkdtemp(join(tmpdir(), 'monitor-integrations-'));

  const args = ['clone', '--depth=1', '--quiet'];
  if (ref) args.push('--branch', ref);
  args.push(url, tmp);

  const result = spawnSync('git', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.status !== 0) {
    await rm(tmp, { recursive: true, force: true });
    throw new Error(
      `git clone failed (exit ${result.status}):\n${result.stderr?.toString() ?? ''}`,
    );
  }

  // Store in cache
  cache.set(cacheKey, {
    path: tmp,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  const root = opts.subdir ? join(tmp, opts.subdir) : tmp;
  const raw = await fetchN8nNode(root);
  return {
    raw,
    cleanup: async () => {
      // Don't clean up cached repos immediately, just remove from cache
      cache.delete(cacheKey);
    },
  };
}

function normalizeRepoUrl(input: string): string {
  let s = input.trim().replace(/#.+$/, '');
  if (s.startsWith('git@')) return s;
  if (s.startsWith('https://') || s.startsWith('http://')) return s.replace(/\.git$/, '') + '.git';
  if (s.startsWith('github.com/')) return `https://${s.replace(/\.git$/, '')}.git`;
  if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(s)) return `https://github.com/${s}.git`;
  throw new Error(`Cannot parse repo: ${input}`);
}

function extractRef(input: string): string | undefined {
  const m = input.match(/#(.+)$/);
  return m?.[1];
}
