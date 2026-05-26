import SwaggerParser from '@apidevtools/swagger-parser';
import type { ApiCall, Method, Param, ParamLocation } from '../types.ts';

const METHODS: Method[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

interface OpenAPIDoc {
  paths?: Record<string, Record<string, unknown> | undefined>;
  components?: { securitySchemes?: Record<string, { type?: string }> };
  security?: Array<Record<string, unknown>>;
}

export async function loadOpenApi(pathOrUrl: string): Promise<ApiCall[]> {
  const dereferenced = (await SwaggerParser.dereference(pathOrUrl)) as OpenAPIDoc;
  const out: ApiCall[] = [];
  const globalAuth = inferGlobalAuth(dereferenced);

  const paths = dereferenced.paths ?? {};
  for (const [rawPath, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;
    const pathLevelParams = ensureArray((pathItem as any).parameters);

    for (const m of METHODS) {
      const op = (pathItem as any)[m.toLowerCase()];
      if (!op || typeof op !== 'object') continue;

      const opParams = ensureArray(op.parameters);
      const merged = mergeParams(pathLevelParams, opParams);
      const params: Param[] = merged.map(paramFromSpec);

      const bodyParams = extractBodyParams(op.requestBody);
      params.push(...bodyParams);

      out.push({
        source: 'openapi',
        operationName: typeof op.operationId === 'string' ? op.operationId : `${m} ${rawPath}`,
        method: m,
        pathTemplate: normalizePath(rawPath),
        params,
        authMethod: globalAuth,
      });
    }
  }

  return out;
}

function normalizePath(p: string): string {
  return p.startsWith('/') ? p : '/' + p;
}

function ensureArray<T>(v: T | T[] | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function mergeParams(pathLevel: any[], opLevel: any[]): any[] {
  const key = (p: any) => `${p?.in}:${p?.name}`;
  const map = new Map<string, any>();
  for (const p of pathLevel) if (p?.name) map.set(key(p), p);
  for (const p of opLevel) if (p?.name) map.set(key(p), p);
  return [...map.values()];
}

function paramFromSpec(p: any): Param {
  const loc = p.in as string | undefined;
  const location: ParamLocation =
    loc === 'path' || loc === 'query' || loc === 'header' || loc === 'cookie'
      ? loc === 'cookie'
        ? 'header'
        : (loc as ParamLocation)
      : 'query';
  return {
    name: String(p.name),
    location,
    required: location === 'path' ? true : Boolean(p.required),
  };
}

function extractBodyParams(requestBody: any): Param[] {
  if (!requestBody || typeof requestBody !== 'object') return [];
  const content = requestBody.content;
  if (!content || typeof content !== 'object') return [];

  const preferred =
    content['application/json'] ??
    content['application/x-www-form-urlencoded'] ??
    Object.values(content)[0];
  if (!preferred || typeof preferred !== 'object') return [];

  const schema = (preferred as any).schema;
  if (!schema || typeof schema !== 'object') return [];

  const required = new Set<string>(Array.isArray(schema.required) ? schema.required : []);
  const props = schema.properties;
  if (!props || typeof props !== 'object') return [];

  const out: Param[] = [];
  for (const name of Object.keys(props)) {
    out.push({ name, location: 'body', required: required.has(name) });
  }
  return out;
}

function inferGlobalAuth(doc: OpenAPIDoc): string | undefined {
  const schemes = doc.components?.securitySchemes;
  if (!schemes) return undefined;
  const security = doc.security ?? [];
  if (security.length === 0) {
    const first = Object.values(schemes)[0];
    return first?.type;
  }
  const firstKey = Object.keys(security[0] ?? {})[0];
  if (!firstKey) return undefined;
  return schemes[firstKey]?.type;
}
