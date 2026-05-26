import type { ApiCall, Method, Param, ParamLocation } from '../types.ts';
import type { N8nRaw, N8nSourceFile } from './fetch.ts';

interface ParseOutput {
  calls: ApiCall[];
  warnings: string[];
}

const REQUEST_CALL_RE =
  /\b(?:safe|api)Request\.call\s*\(\s*this\s*,(?:\s*\w+\s*,)?\s*['"`](GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)['"`]\s*,\s*(`[^`]+`|'[^']+'|"[^"]+"|[A-Za-z_$][\w$]*)\s*(?:,\s*([A-Za-z_$][\w$]*))?\s*\)/g;

const TEMPLATE_VAR_RE = /\$\{([^}]+)\}/g;

export function parseN8n(raw: N8nRaw): ParseOutput {
  const warnings: string[] = [];
  const calls: ApiCall[] = [];
  const basePath = extractBasePath(raw.baseUrl);
  const authMethod = raw.credentialType;

  for (const file of raw.files) {
    if (file.path.includes('transport/request')) continue;

    for (const match of file.content.matchAll(REQUEST_CALL_RE)) {
      const method = match[1] as Method;
      const rawPath = match[2] ?? '';
      const bodyVar = match[3];

      const pathInfo = normalizePath(rawPath, basePath, file.path, warnings);
      if (!pathInfo) continue;

      const operationName = deriveOperationName(file.path);
      const params = collectParams(file, bodyVar, method, pathInfo.pathParams);

      calls.push({
        source: 'n8n',
        operationName,
        method,
        pathTemplate: pathInfo.pathTemplate,
        params,
        authMethod,
      });
    }
  }

  return { calls: dedupeBySignature(calls), warnings };
}

function deriveOperationName(filePath: string): string {
  const parts = filePath.split('/');
  const fileName = parts[parts.length - 1] ?? filePath;
  const stem = fileName.replace(/\.operation\.ts$|\.ts$/, '');
  const parentIdx = parts.indexOf('actions');
  if (parentIdx >= 0 && parts.length > parentIdx + 1) {
    return `${parts[parentIdx + 1]}.${stem}`;
  }
  return stem;
}

function normalizePath(
  rawArg: string,
  basePath: string | undefined,
  filePath: string,
  warnings: string[],
): { pathTemplate: string; pathParams: string[] } | undefined {
  if (!rawArg.startsWith('`') && !rawArg.startsWith("'") && !rawArg.startsWith('"')) {
    warnings.push(`${filePath}: path argument is a variable (${rawArg}), skipping`);
    return undefined;
  }
  let raw = rawArg.slice(1, -1);
  const pathParams: string[] = [];

  raw = raw.replace(TEMPLATE_VAR_RE, (_, inner) => {
    const ident = String(inner).trim().match(/^[A-Za-z_$][\w$]*/)?.[0];
    const name = ident ?? 'var';
    pathParams.push(name);
    return `{${name}}`;
  });

  if (!raw.startsWith('/')) raw = '/' + raw;
  const qIdx = raw.indexOf('?');
  if (qIdx >= 0) raw = raw.slice(0, qIdx);

  if (basePath && !raw.startsWith(basePath + '/') && raw !== basePath) {
    raw = basePath + (raw.startsWith('/') ? '' : '/') + raw;
  }

  return { pathTemplate: raw, pathParams };
}

function extractBasePath(baseUrl?: string): string | undefined {
  if (!baseUrl) return undefined;
  try {
    const u = new URL(baseUrl);
    const p = u.pathname.replace(/\/+$/, '');
    return p && p !== '/' ? p : undefined;
  } catch {
    return undefined;
  }
}

function collectParams(
  file: N8nSourceFile,
  bodyVar: string | undefined,
  method: Method,
  pathParams: string[],
): Param[] {
  const out: Param[] = [];
  const seen = new Set<string>();

  for (const name of pathParams) {
    if (seen.has(name)) continue;
    seen.add(name);
    out.push({ name, location: 'path', required: true });
  }

  const bodyLocation: ParamLocation =
    method === 'GET' || method === 'DELETE' || method === 'HEAD' ? 'query' : 'body';

  if (bodyVar) {
    for (const name of extractBodyKeys(file.content, bodyVar)) {
      if (seen.has(name)) continue;
      seen.add(name);
      out.push({ name, location: bodyLocation, required: false });
    }
  }

  return out;
}

function extractBodyKeys(content: string, bodyVar: string): string[] {
  const declRe = new RegExp(`(?:const|let|var)\\s+${bodyVar}\\b[^=]*=\\s*\\{`, 'g');
  const out: string[] = [];

  for (const m of content.matchAll(declRe)) {
    const start = m.index! + m[0].length - 1;
    const block = readBalancedBlock(content, start);
    if (!block) continue;
    const inner = block.slice(1, -1);
    for (const key of topLevelKeys(inner)) out.push(key);
  }

  const assignRe = new RegExp(`\\b${bodyVar}\\.([A-Za-z_$][\\w$]*)\\s*=`, 'g');
  for (const m of content.matchAll(assignRe)) {
    if (m[1]) out.push(m[1]);
  }
  return out;
}

function readBalancedBlock(content: string, start: number): string | undefined {
  if (content[start] !== '{') return undefined;
  let depth = 0;
  let inStr: string | undefined;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = start; i < content.length; i++) {
    const c = content[i];
    const next = content[i + 1];

    if (inLineComment) {
      if (c === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (c === '*' && next === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inStr) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === inStr) inStr = undefined;
      continue;
    }
    if (inTemplate) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === '`') inTemplate = false;
      continue;
    }

    if (c === '/' && next === '/') {
      inLineComment = true;
      i++;
      continue;
    }
    if (c === '/' && next === '*') {
      inBlockComment = true;
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = c;
      continue;
    }
    if (c === '`') {
      inTemplate = true;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return content.slice(start, i + 1);
    }
  }
  return undefined;
}

function topLevelKeys(inner: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let inStr: string | undefined;
  let inTemplate = false;
  let start = 0;
  const pieces: string[] = [];

  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (inStr) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === inStr) inStr = undefined;
      continue;
    }
    if (inTemplate) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === '`') inTemplate = false;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = c;
      continue;
    }
    if (c === '`') {
      inTemplate = true;
      continue;
    }
    if (c === '{' || c === '[' || c === '(') depth++;
    else if (c === '}' || c === ']' || c === ')') depth--;
    else if (c === ',' && depth === 0) {
      pieces.push(inner.slice(start, i));
      start = i + 1;
    }
  }
  pieces.push(inner.slice(start));

  for (const piece of pieces) {
    const trimmed = piece.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^([A-Za-z_$][\w$]*)\s*[:,]?/);
    if (m && m[1]) out.push(m[1]);
  }
  return out;
}

function dedupeBySignature(calls: ApiCall[]): ApiCall[] {
  const seen = new Set<string>();
  const out: ApiCall[] = [];
  for (const c of calls) {
    const sig = `${c.operationName}|${c.method}|${c.pathTemplate}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(c);
  }
  return out;
}
