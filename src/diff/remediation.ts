import type { ApiCall, Drift, Suggestion } from '../types.ts';

const PLACEHOLDER = /\{[^/]+\}/g;

// Rule-based suggested fix (L1) + structured before/after (L3).
// Conservative on confidence: the "closest endpoint" is a guess, never gospel.
export function suggestFix(drift: Drift): Suggestion {
  switch (drift.kind) {
    case 'endpoint_removed':
      return suggestEndpointRemoved(drift);
    case 'method_mismatch':
      return suggestMethodMismatch(drift);
    case 'missing_required_param':
      return suggestMissingParam(drift);
    case 'unknown_param':
      return suggestUnknownParam(drift);
    case 'auth_mismatch':
      return suggestAuthMismatch(drift);
    case 'unparseable':
      return {
        summary: 'Review this call manually — the URL is built dynamically and can’t be parsed.',
        confidence: 'low',
        autofixable: false,
      };
  }
}

export function withSuggestions(drifts: Drift[]): Drift[] {
  return drifts.map((d) => ({ ...d, suggestion: suggestFix(d) }));
}

function call(c: ApiCall): string {
  return `${c.method} ${c.pathTemplate}`;
}

function suggestEndpointRemoved(d: Drift): Suggestion {
  const current = call(d.nodeCall);
  if (!d.specMatch) {
    return {
      summary: 'No replacement endpoint found in the spec.',
      detail:
        'This path was removed and nothing similar exists. Check your API changelog — the module likely needs to be retired or pointed at a different resource.',
      before: current,
      confidence: 'low',
      autofixable: false,
    };
  }
  const target = call(d.specMatch);
  const sim = pathSimilarity(d.nodeCall.pathTemplate, d.specMatch.pathTemplate);
  const sameMethod = d.nodeCall.method === d.specMatch.method;

  // High only when method matches AND paths are structurally close.
  const confidence = sameMethod && sim >= 0.6 ? 'high' : sim >= 0.4 ? 'medium' : 'low';

  return {
    summary:
      confidence === 'low'
        ? `Closest spec endpoint is ${target} — verify before changing; it may be unrelated.`
        : `Point this call at ${target}.`,
    detail:
      confidence === 'low'
        ? 'The matcher only found a weak overlap. Treat this as a hint, not a fix.'
        : undefined,
    before: current,
    after: target,
    confidence,
    autofixable: confidence === 'high',
  };
}

function suggestMethodMismatch(d: Drift): Suggestion {
  if (!d.specMatch) {
    return { summary: 'Method not allowed on this path.', confidence: 'low', autofixable: false };
  }
  return {
    summary: `Change the HTTP method from ${d.nodeCall.method} to ${d.specMatch.method}.`,
    before: call(d.nodeCall),
    after: call(d.specMatch),
    confidence: 'high',
    autofixable: true,
  };
}

function suggestMissingParam(d: Drift): Suggestion {
  const p = d.param;
  if (!p) {
    return { summary: 'Add the required parameter the spec expects.', confidence: 'medium', autofixable: false };
  }
  return {
    summary: `Add required ${p.location} parameter "${p.name}" to this module.`,
    detail: `The API now rejects requests without "${p.name}". Add it to the module’s ${p.location} and map it to a user input or a constant.`,
    before: `(no "${p.name}" in request)`,
    after: `${p.location}: { ${p.name}: … }`,
    confidence: 'medium',
    autofixable: false, // we know the name, but not the value to send
  };
}

function suggestUnknownParam(d: Drift): Suggestion {
  const name = d.param?.name ?? 'this parameter';
  return {
    summary: `"${name}" isn’t in your spec — document it or drop it.`,
    detail:
      'Either the spec is missing this field (add it to your OpenAPI definition) or the API dropped it (remove it from the integration). The direction is ambiguous, so this needs a human call.',
    confidence: 'low',
    autofixable: false,
  };
}

function suggestAuthMismatch(d: Drift): Suggestion {
  const want = d.specMatch?.authMethod ?? 'the spec’s scheme';
  return {
    summary: `Switch the connection auth to ${want}.`,
    before: d.nodeCall.authMethod ?? 'current auth',
    after: want,
    confidence: 'medium',
    autofixable: false,
  };
}

// crude structural similarity on anonymised path segments
function pathSimilarity(a: string, b: string): number {
  const sa = a.replace(PLACEHOLDER, '{}').split('/').filter(Boolean);
  const sb = b.replace(PLACEHOLDER, '{}').split('/').filter(Boolean);
  if (sa.length === 0 && sb.length === 0) return 1;
  const setA = new Set(sa);
  let shared = 0;
  for (const seg of sb) if (setA.has(seg)) shared++;
  return shared / Math.max(sa.length, sb.length);
}
