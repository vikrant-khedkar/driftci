import pc from 'picocolors';
import type { ScanResult, Severity } from '../types.ts';
import { groupDrifts, summarizeGroup, type DriftGroup } from './group.ts';
import { detectSpecMismatch } from '../diff/mismatch.ts';

const SEVERITY_BADGE: Record<Severity, (s: string) => string> = {
  BREAKING: (s) => pc.bgRed(pc.white(pc.bold(` ${s} `))),
  WARNING: (s) => pc.bgYellow(pc.black(pc.bold(` ${s} `))),
  INFO: (s) => pc.bgBlue(pc.white(pc.bold(` ${s} `))),
};

export function renderText(result: ScanResult): string {
  const lines: string[] = [];
  const unit = result.platform === 'make' ? 'modules' : 'operations';
  lines.push(
    pc.bold(
      `Scanning ${result.platform} ${pc.cyan(result.target)} v${result.version} (${result.scanned.length} ${unit}) against spec (${result.spec.length} operations)`,
    ),
  );
  lines.push('');

  if (result.warnings.length) {
    lines.push(pc.dim(`Warnings (${result.warnings.length}):`));
    for (const w of result.warnings) lines.push(pc.dim(`  - ${w}`));
    lines.push('');
  }

  if (result.drifts.length === 0) {
    lines.push(
      pc.green(pc.bold(`No drift detected. All ${result.platform} ${unit} align with spec.`)),
    );
    return lines.join('\n');
  }

  const mismatch = detectSpecMismatch(result.drifts, result.scanned, result.spec);
  if (mismatch) {
    const pct = Math.round(mismatch.removedRatio * 100);
    lines.push(pc.bgYellow(pc.black(pc.bold(' LIKELY WRONG SPEC '))));
    lines.push(
      pc.yellow(
        `  ${pct}% of drifts are missing endpoints, and ${result.platform} calls live under ` +
          `${pc.bold(mismatch.nodePrefix + '/*')} while the spec defines ${pc.bold(mismatch.specPrefix + '/*')}.`,
      ),
    );
    lines.push(
      pc.yellow(
        `  Did you point --openapi at the wrong file? (Common causes: v1 vs v2 API, staging vs prod spec.)`,
      ),
    );
    lines.push('');
  }

  const byKind = countBy(result.drifts, (d) => d.severity);
  lines.push(
    pc.bold(
      `Drift detected: ${result.drifts.length} issue${result.drifts.length === 1 ? '' : 's'}  ` +
        Object.entries(byKind)
          .map(([k, v]) => `${k}=${v}`)
          .join('  '),
    ),
  );
  lines.push('');

  const groups = groupDrifts(result.drifts);
  for (const group of groups) {
    lines.push(renderGroup(group));
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}



function renderGroup(g: DriftGroup): string {
  const badge = SEVERITY_BADGE[g.severity](g.severity);
  const count = g.drifts.length > 1 ? pc.dim(` ×${g.drifts.length}`) : '';
  const header = `${badge}  ${pc.bold(g.kind)}${count}`;
  const moduleLine = `  ${pc.dim('Module:')}   ${g.module}`;
  const callLine = `  ${pc.dim('Calls:')}    ${g.call.method} ${g.call.pathTemplate}`;
  const specLine = g.spec
    ? `  ${pc.dim('Spec:')}     ${g.spec.method} ${g.spec.pathTemplate}`
    : `  ${pc.dim('Spec:')}     ${pc.italic('no match')}`;
  const issueLine = `  ${pc.dim('Issue:')}    ${summarizeGroup(g)}`;
  return [header, moduleLine, callLine, specLine, issueLine].join('\n');
}

function countBy<T, K extends string>(arr: T[], fn: (t: T) => K): Record<string, number> {
  const out: Record<string, number> = {};
  for (const x of arr) {
    const k = fn(x);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}
