import OpenAI from 'openai';
import type { ScanResult, Drift } from '@cli/types.ts';

const MODEL = 'gpt-4o';

export function llmAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

// Compact the drifts into a token-cheap brief the model can reason over.
function brief(result: ScanResult): string {
  const lines: string[] = [];
  lines.push(`Platform: ${result.platform}`);
  lines.push(`Integration: ${result.target} (v${result.version})`);
  lines.push(`Drifts: ${result.drifts.length}`);
  lines.push('');
  for (const d of dedupe(result.drifts)) {
    const sm = d.specMatch ? ` | closest spec: ${d.specMatch.method} ${d.specMatch.pathTemplate}` : '';
    const p = d.param ? ` | param: ${d.param.location}:${d.param.name}` : '';
    lines.push(
      `- [${d.severity}/${d.kind}] ${d.nodeCall.operationName}: ${d.nodeCall.method} ${d.nodeCall.pathTemplate}${sm}${p}`,
    );
  }
  return lines.join('\n');
}

function dedupe(drifts: Drift[]): Drift[] {
  const seen = new Set<string>();
  const out: Drift[] = [];
  for (const d of drifts) {
    const k = `${d.kind}|${d.nodeCall.operationName}|${d.nodeCall.method} ${d.nodeCall.pathTemplate}|${d.param?.name ?? ''}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(d);
  }
  return out;
}

const SYSTEM = `You are an API integration migration assistant. Given a drift report between an integration (Make or n8n) and the API's OpenAPI spec, write a concise, practical migration guide.

Rules:
- Group fixes by the module/operation that breaks.
- For each, say exactly what to change and why, in plain language a busy engineer can act on in under a minute.
- Distinguish confident mechanical fixes (path/method/param rename) from judgement calls (endpoint removed with no clear replacement, undocumented params).
- NEVER invent endpoints or parameters that aren't in the drift data. If the right fix is unknown, say so and tell them what to check.
- Output GitHub-flavored markdown. Lead with a one-line summary, then a "## Fixes" section. Keep it tight — no preamble, no restating the obvious.`;

export async function generateMigrationGuidance(result: ScanResult): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not set');

  const client = new OpenAI({ apiKey: key });
  const res = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 1500,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `Here is the drift report. Write the migration guide.\n\n${brief(result)}` },
    ],
  });

  return res.choices[0]?.message?.content?.trim() ?? '';
}
