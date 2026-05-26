import type { ApiCall, Method, Param, ParamLocation, Visibility } from '../types.ts';
import type { MakeRaw, MakeModuleApi, MakeModuleMeta } from './fetch.ts';

const IML_PARAM_RE = /\{\{\s*parameters\.([a-zA-Z0-9_]+)\s*\}\}/g;

interface ParseOutput {
  calls: ApiCall[];
  warnings: string[];
}

export function parseMake(raw: MakeRaw): ParseOutput {
  const warnings: string[] = [];
  const baseUrl = extractBaseUrl(raw.app);
  const authMethod = inferAuthMethod(raw);

  const calls: ApiCall[] = [];

  for (const mod of raw.modules) {
    if (!mod.api || typeof mod.api !== 'object') continue;
    const api = mod.api as MakeModuleApi;
    if (!api.url) {
      warnings.push(`module ${mod.meta.name}: no url, skipping`);
      continue;
    }

    const rawUrl = String(api.url);
    const method = normalizeMethod(api.method);
    const { pathTemplate, hasComplexIml } = normalizePath(rawUrl, baseUrl);

    if (hasComplexIml) {
      warnings.push(
        `module ${mod.meta.name}: url contains non-trivial IML, used best-effort literal path "${pathTemplate}"`,
      );
    }

    const locations = detectParamLocations(api, rawUrl);
    const params = extractParams(mod.parameters, mod.expect, locations, method);

    calls.push({
      source: 'make',
      operationName: mod.meta.name,
      method,
      pathTemplate,
      params,
      authMethod,
      visibility: visibilityFrom(mod.meta),
      label: mod.meta.label,
    });
  }

  return { calls, warnings };
}

function visibilityFrom(meta: MakeModuleMeta): Visibility {
  const label = (meta.label ?? '').toLowerCase();
  const deprecated = label.includes('deprecated') || label.includes('legacy');
  return {
    public: meta.public !== false,
    approved: meta.approved !== false,
    archived: meta.archived === true,
    deprecated,
  };
}

function extractBaseUrl(app: MakeRaw['app']): string | undefined {
  if (typeof app.baseUrl === 'string') return app.baseUrl;
  const base = app.base as Record<string, unknown> | undefined;
  if (base && typeof base.baseUrl === 'string') return base.baseUrl;
  return undefined;
}

function inferAuthMethod(raw: MakeRaw): string | undefined {
  if (!raw.connections.length) return undefined;
  const first = raw.connections[0];
  return first?.type ?? undefined;
}

function normalizeMethod(m: unknown): Method {
  const upper = String(m ?? 'GET').toUpperCase();
  const valid: Method[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
  return (valid as string[]).includes(upper) ? (upper as Method) : 'GET';
}

function normalizePath(
  rawUrl: string,
  baseUrl?: string,
): { pathTemplate: string; hasComplexIml: boolean } {
  let url = rawUrl.trim();
  const basePath = extractBasePath(baseUrl);

  if (/^https?:\/\//.test(url)) {
    try {
      const parsed = new URL(url);
      url = parsed.pathname;
    } catch {
      // leave as-is
    }
  } else if (basePath && !url.startsWith(basePath + '/') && url !== basePath) {
    const prefix = url.startsWith('/') ? '' : '/';
    url = basePath + prefix + url;
  }

  if (!url.startsWith('/')) url = '/' + url;

  const beforeReplace = url;
  url = url.replace(IML_PARAM_RE, '{$1}');

  const hasComplexIml = /\{\{[^}]*\}\}/.test(url);
  if (hasComplexIml) {
    url = url.replace(/\{\{[^}]*\}\}/g, '*');
  }

  const qIdx = url.indexOf('?');
  if (qIdx >= 0) url = url.slice(0, qIdx);

  return { pathTemplate: url, hasComplexIml: hasComplexIml && beforeReplace !== url };
}

function extractBasePath(baseUrl?: string): string | undefined {
  if (!baseUrl) return undefined;
  const cleaned = baseUrl.replace(/\{\{[^}]*\}\}/g, '').trim();
  if (!cleaned) return undefined;
  try {
    const parsed = new URL(cleaned);
    const p = parsed.pathname.replace(/\/+$/, '');
    return p && p !== '/' ? p : undefined;
  } catch {
    return undefined;
  }
}

type LocationMap = Map<string, ParamLocation>;

function detectParamLocations(api: MakeModuleApi, rawUrl: string): LocationMap {
  const map: LocationMap = new Map();

  for (const name of findImlParams(rawUrl)) map.set(name, 'path');

  walkForImlParams(api.qs, (name) => {
    if (!map.has(name)) map.set(name, 'query');
  });
  walkForImlParams(api.body, (name) => {
    if (!map.has(name)) map.set(name, 'body');
  });
  walkForImlParams(api.headers, (name) => {
    if (!map.has(name)) map.set(name, 'header');
  });

  return map;
}

function findImlParams(s: string): string[] {
  const out: string[] = [];
  for (const m of s.matchAll(IML_PARAM_RE)) {
    if (m[1]) out.push(m[1]);
  }
  return out;
}

function walkForImlParams(node: unknown, visit: (name: string) => void): void {
  if (node == null) return;
  if (typeof node === 'string') {
    for (const name of findImlParams(node)) visit(name);
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) walkForImlParams(item, visit);
    return;
  }
  if (typeof node === 'object') {
    for (const v of Object.values(node as Record<string, unknown>)) walkForImlParams(v, visit);
  }
}

interface MakeParamDef {
  name?: string;
  required?: boolean;
  type?: string;
}

function extractParams(
  parameters: unknown[],
  expect: unknown[],
  locations: LocationMap,
  method: Method,
): Param[] {
  const out: Param[] = [];
  const seen = new Set<string>();
  const defaultLocation: ParamLocation =
    method === 'GET' || method === 'DELETE' || method === 'HEAD' ? 'query' : 'body';

  const all = [...flattenParams(parameters), ...flattenParams(expect)];
  for (const p of all) {
    if (!p.name || seen.has(p.name)) continue;
    seen.add(p.name);
    out.push({
      name: p.name,
      location: locations.get(p.name) ?? defaultLocation,
      required: Boolean(p.required),
    });
  }
  return out;
}

function flattenParams(input: unknown): MakeParamDef[] {
  const out: MakeParamDef[] = [];
  if (!Array.isArray(input)) return out;
  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    if (typeof obj.name === 'string') {
      out.push({
        name: obj.name,
        required: obj.required === true,
        type: typeof obj.type === 'string' ? obj.type : undefined,
      });
    }
    if (Array.isArray(obj.nested)) out.push(...flattenParams(obj.nested));
    if (Array.isArray(obj.spec)) out.push(...flattenParams(obj.spec));
  }
  return out;
}
