import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

export interface N8nSourceFile {
  path: string;
  content: string;
}

export interface N8nRaw {
  root: string;
  baseUrl?: string;
  credentialType?: string;
  files: N8nSourceFile[];
}

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'build', 'out']);

export async function fetchN8nNode(root: string): Promise<N8nRaw> {
  const files: N8nSourceFile[] = [];
  await walk(root, root, files);

  const baseUrl = inferBaseUrl(files);
  const credentialType = inferCredentialType(files);

  return { root, baseUrl, credentialType, files };
}

async function walk(start: string, base: string, out: N8nSourceFile[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(start);
  } catch {
    return;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(start, name);
    let info;
    try {
      info = await stat(full);
    } catch {
      continue;
    }
    if (info.isDirectory()) {
      await walk(full, base, out);
    } else if (info.isFile() && name.endsWith('.ts') && !name.endsWith('.d.ts')) {
      const content = await readFile(full, 'utf8');
      out.push({ path: relative(base, full), content });
    }
  }
}

function inferBaseUrl(files: N8nSourceFile[]): string | undefined {
  for (const f of files) {
    const m = f.content.match(/(?:API_BASE_URL|BASE_URL|baseURL)\s*[:=]\s*['"`]([^'"`]+)['"`]/);
    if (m && m[1]) return m[1];
  }
  return undefined;
}

function inferCredentialType(files: N8nSourceFile[]): string | undefined {
  for (const f of files) {
    if (!f.path.toLowerCase().includes('credentials')) continue;
    if (/genericAuth|httpHeaderAuth/i.test(f.content)) return 'apikey';
    if (/oauth2|OAuth2/i.test(f.content)) return 'oauth2';
    if (/['"`]Bearer/i.test(f.content)) return 'http';
    return 'apikey';
  }
  return undefined;
}
