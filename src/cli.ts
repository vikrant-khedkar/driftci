import { fetchMakeApp } from './make/fetch.ts';
import { parseMake } from './make/parse.ts';
import { fetchN8nNode } from './n8n/fetch.ts';
import { fetchN8nFromGithub } from './n8n/github.ts';
import { parseN8n } from './n8n/parse.ts';
import { loadOpenApi } from './openapi/load.ts';
import { diff } from './diff/engine.ts';
import { renderText } from './report/text.ts';
import { renderJson } from './report/json.ts';
import type { ScanResult } from './types.ts';

interface Args {
  platform?: 'make' | 'n8n';
  app?: string;
  version?: string;
  openapi?: string;
  region?: string;
  path?: string;
  repo?: string;
  subdir?: string;
  json?: boolean;
  help?: boolean;
}

function parseArgs(argv: string[]): Args {
  const out: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--make':
        out.platform = 'make';
        break;
      case '--n8n':
        out.platform = 'n8n';
        out.path = argv[++i];
        break;
      case '--n8n-repo':
        out.platform = 'n8n';
        out.repo = argv[++i];
        break;
      case '--subdir':
        out.subdir = argv[++i];
        break;
      case '--app':
        out.app = argv[++i];
        break;
      case '--version':
        out.version = argv[++i];
        break;
      case '--openapi':
        out.openapi = argv[++i];
        break;
      case '--region':
        out.region = argv[++i];
        break;
      case '--json':
        out.json = true;
        break;
      case '-h':
      case '--help':
        out.help = true;
        break;
      default:
        if (a && a.startsWith('--')) {
          console.error(`Unknown flag: ${a}`);
          process.exit(2);
        }
    }
  }
  return out;
}

const USAGE = `monitor-integrations — node ↔ OpenAPI drift detector

Usage:
  Make:
    bun run src/cli.ts --make --app <name> --version <n> --openapi <path> [--region eu1]
  n8n (local):
    bun run src/cli.ts --n8n <path-to-node-pkg> --openapi <path> [--version <n>]
  n8n (GitHub):
    bun run src/cli.ts --n8n-repo <owner/repo[#ref]> --openapi <path> [--subdir <pkg-dir>]

Common flags:
  --openapi <path>    Path or URL to OpenAPI spec (YAML or JSON)
  --json              Emit JSON instead of pretty text

Make flags:
  --app <name>        Make app name (slug)
  --version <n>       Make app version
  --region <region>   Make region: eu1 (default), eu2, us1, us2

Env:
  MAKE_API_TOKEN      Required for --make
`;

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(USAGE);
    return;
  }

  if (!args.openapi) {
    console.error('--openapi is required');
    console.error(USAGE);
    process.exit(2);
  }

  if (args.platform === 'make' || (!args.platform && args.app)) {
    return runMake(args);
  }
  if (args.platform === 'n8n') {
    return runN8n(args);
  }

  console.error('Pick a platform: --make or --n8n <path>');
  console.error(USAGE);
  process.exit(2);
}

async function runMake(args: Args): Promise<void> {
  if (!args.app || !args.version) {
    console.error('--make requires --app and --version');
    process.exit(2);
  }
  const token = process.env.MAKE_API_TOKEN;
  if (!token) {
    console.error('MAKE_API_TOKEN is not set');
    process.exit(2);
  }

  const raw = await fetchMakeApp({
    app: args.app,
    version: args.version,
    token,
    region: args.region ?? 'eu1',
  });
  const { calls, warnings } = parseMake(raw);
  const specCalls = await loadOpenApi(args.openapi!);
  const drifts = diff(calls, specCalls);

  emit(
    {
      platform: 'make',
      target: args.app,
      version: args.version,
      scanned: calls,
      spec: specCalls,
      drifts,
      warnings,
    },
    args.json,
  );
}

async function runN8n(args: Args): Promise<void> {
  let raw;
  let target: string;
  let cleanup: (() => Promise<void>) | undefined;

  if (args.repo) {
    const result = await fetchN8nFromGithub({ repo: args.repo, subdir: args.subdir });
    raw = result.raw;
    cleanup = result.cleanup;
    target = args.repo;
  } else if (args.path) {
    raw = await fetchN8nNode(args.path);
    target = args.path;
  } else {
    console.error('--n8n requires a path, or use --n8n-repo <owner/repo[#ref]>');
    process.exit(2);
  }

  try {
    const { calls, warnings } = parseN8n(raw);
    const specCalls = await loadOpenApi(args.openapi!);
    const drifts = diff(calls, specCalls);

    emit(
      {
        platform: 'n8n',
        target,
        version: args.version ?? 'local',
        scanned: calls,
        spec: specCalls,
        drifts,
        warnings,
      },
      args.json,
    );
  } finally {
    if (cleanup) await cleanup();
  }
}

function emit(result: ScanResult, json: boolean | undefined): void {
  if (json) console.log(renderJson(result));
  else console.log(renderText(result));

  const hasBreaking = result.drifts.some((d) => d.severity === 'BREAKING');
  process.exit(hasBreaking ? 1 : 0);
}

main().catch((err) => {
  console.error((err as Error).message ?? err);
  process.exit(2);
});
