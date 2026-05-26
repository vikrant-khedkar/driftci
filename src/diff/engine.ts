import type { ApiCall, Drift, Param, Severity } from '../types.ts';

const ANON_PLACEHOLDER = /\{[^/]+\}/g;

export function diff(nodeCalls: ApiCall[], specCalls: ApiCall[]): Drift[] {
  const byMethodPath = new Map<string, ApiCall>();
  const byPath = new Map<string, ApiCall[]>();

  for (const s of specCalls) {
    const normPath = anonPath(s.pathTemplate);
    byMethodPath.set(`${s.method} ${normPath}`, s);
    const list = byPath.get(normPath) ?? [];
    list.push(s);
    byPath.set(normPath, list);
  }

  const drifts: Drift[] = [];

  for (const node of nodeCalls) {
    const normPath = anonPath(node.pathTemplate);

    if (node.pathTemplate.includes('*')) {
      drifts.push({
        severity: 'INFO',
        kind: 'unparseable',
        nodeCall: node,
        message: `Module ${node.operationName}: URL contains dynamic IML, could not fully parse path "${node.pathTemplate}". Skipping diff.`,
      });
      continue;
    }

    const exact = byMethodPath.get(`${node.method} ${normPath}`);

    if (!exact) {
      const samePath = byPath.get(normPath);
      if (samePath && samePath.length > 0 && samePath[0]) {
        drifts.push({
          severity: adjustSeverity('BREAKING', node),
          kind: 'method_mismatch',
          nodeCall: node,
          specMatch: samePath[0],
          message: `Module ${node.operationName} calls ${node.method} ${node.pathTemplate} but spec only defines ${samePath.map((s) => s.method).join(',')} for this path.${visibilityNote(node)}`,
        });
        continue;
      }

      const closest = findClosestPath(normPath, specCalls);
      drifts.push({
        severity: adjustSeverity('BREAKING', node),
        kind: 'endpoint_removed',
        nodeCall: node,
        specMatch: closest,
        message: closest
          ? `Module ${node.operationName} calls ${node.method} ${node.pathTemplate} — no matching endpoint in spec. Closest: ${closest.method} ${closest.pathTemplate}.${visibilityNote(node)}`
          : `Module ${node.operationName} calls ${node.method} ${node.pathTemplate} — no matching endpoint in spec.${visibilityNote(node)}`,
      });
      continue;
    }

    drifts.push(...diffParams(node, exact));
    drifts.push(...diffAuth(node, exact));
  }

  return drifts;
}

function diffParams(node: ApiCall, spec: ApiCall): Drift[] {
  const out: Drift[] = [];

  const pathRename = positionalPathRename(node.pathTemplate, spec.pathTemplate);
  const remap = (name: string): string => pathRename.get(name) ?? name;

  const nodeRemappedNames = new Set(node.params.map((p) => remap(p.name)));
  const specByName = new Map<string, Param>(spec.params.map((p) => [p.name, p]));

  for (const sp of spec.params) {
    if (!sp.required) continue;
    if (!nodeRemappedNames.has(sp.name)) {
      out.push({
        severity: adjustSeverity('BREAKING', node),
        kind: 'missing_required_param',
        nodeCall: node,
        specMatch: spec,
        message: `Module ${node.operationName}: spec requires ${sp.location} param "${sp.name}" but module does not declare it.${visibilityNote(node)}`,
      });
    }
  }

  for (const np of node.params) {
    const effectiveName = remap(np.name);
    if (!specByName.has(effectiveName)) {
      out.push({
        severity: 'WARNING',
        kind: 'unknown_param',
        nodeCall: node,
        specMatch: spec,
        message: `Module ${node.operationName}: declares ${np.location} param "${np.name}" not present in spec (may be deprecated or renamed).`,
      });
    }
  }

  return out;
}

function positionalPathRename(nodePath: string, specPath: string): Map<string, string> {
  const out = new Map<string, string>();
  const nodeNames = extractPathParamNames(nodePath);
  const specNames = extractPathParamNames(specPath);
  if (nodeNames.length !== specNames.length) return out;
  for (let i = 0; i < nodeNames.length; i++) {
    const n = nodeNames[i];
    const s = specNames[i];
    if (n && s && n !== s) out.set(n, s);
  }
  return out;
}

function extractPathParamNames(p: string): string[] {
  const out: string[] = [];
  for (const m of p.matchAll(/\{([^/}]+)\}/g)) {
    if (m[1]) out.push(m[1]);
  }
  return out;
}

function diffAuth(node: ApiCall, spec: ApiCall): Drift[] {
  if (!node.authMethod || !spec.authMethod) return [];
  if (normalizeAuth(node.authMethod) === normalizeAuth(spec.authMethod)) return [];
  return [
    {
      severity: adjustSeverity('BREAKING', node),
      kind: 'auth_mismatch',
      nodeCall: node,
      specMatch: spec,
      message: `Module ${node.operationName}: uses auth "${node.authMethod}" but spec expects "${spec.authMethod}".${visibilityNote(node)}`,
    },
  ];
}

function adjustSeverity(base: Severity, node: ApiCall): Severity {
  const v = node.visibility;
  if (!v) return base;
  if (v.archived) return base === 'BREAKING' ? 'INFO' : base;
  if (!v.public || v.deprecated) return base === 'BREAKING' ? 'WARNING' : base;
  return base;
}

function visibilityNote(node: ApiCall): string {
  const v = node.visibility;
  if (!v) return '';
  if (v.archived) return ' (archived module — no new users; existing scenarios may still call it)';
  if (v.deprecated && !v.public) {
    return ' (deprecated + hidden — existing customers only)';
  }
  if (v.deprecated) return ' (deprecated module)';
  if (!v.public) return ' (hidden from new users)';
  return '';
}

function normalizeAuth(a: string): string {
  const lc = a.toLowerCase();
  if (lc.includes('oauth')) return 'oauth2';
  if (lc.includes('bearer')) return 'http';
  if (lc.includes('apikey') || lc.includes('api_key') || lc.includes('api-key')) return 'apikey';
  return lc;
}

function anonPath(p: string): string {
  return p.replace(ANON_PLACEHOLDER, '{}');
}

function findClosestPath(target: string, spec: ApiCall[]): ApiCall | undefined {
  let best: { call: ApiCall; score: number } | undefined;
  const targetParts = target.split('/').filter(Boolean);
  const minSegments = Math.min(targetParts.length, 2);
  for (const s of spec) {
    const parts = anonPath(s.pathTemplate).split('/').filter(Boolean);
    const score = sharedPrefix(targetParts, parts);
    if (score >= minSegments && (!best || score > best.score)) best = { call: s, score };
  }
  return best?.call;
}

function sharedPrefix(a: string[], b: string[]): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}
