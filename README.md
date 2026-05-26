# monitor-integrations

Catch breaking changes between your Make / n8n integration and your live OpenAPI spec — before your customers do.

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)

```bash
bun run scan --n8n-repo owner/repo --openapi https://api.example.com/openapi.json
```

Exits `1` on breaking drift. Drop it in CI.

## Why this exists

The same story, on repeat:

- **Todoist** killed REST v2 → n8n's Todoist node started returning `410 Gone` ([issue](https://github.com/n8n-io/n8n/issues/28441))
- **LinkedIn** sunset API version `20250401` → every n8n LinkedIn call returns `426 NONEXISTENT_VERSION` ([issue](https://github.com/n8n-io/n8n/issues/28600))
- **Google Ads** deprecated `v12` → Make's Google Ads modules `404` for weeks ([thread](https://community.make.com/t/google-ads-google-ads-lead-forms-modules-broken-api-v12-deprecated-404-error/107743))
- **Airtable** killed API keys overnight → n8n shipped an emergency commit to disable the node
- **Stripe** EOL'd the Sources API → still wired into the n8n Stripe node ([issue](https://github.com/n8n-io/n8n/issues/18101))

In every case the API provider knew the change was coming. The integration didn't. End-users found out by watching their workflows break.

`monitor-integrations` parses what your integration *actually calls* and diffs it against your OpenAPI spec. Run it in CI alongside your spec — every breaking change shows up the moment the spec ships, not the moment a customer files a ticket.

## What it detects

| Kind | Severity | Meaning |
|---|---|---|
| `endpoint_removed` | BREAKING | Module calls a path/method missing from the spec |
| `method_mismatch` | BREAKING | Same path in spec, different HTTP method |
| `missing_required_param` | BREAKING | Spec requires a param the module doesn't declare |
| `auth_mismatch` | BREAKING | Module auth type differs from spec security scheme |
| `unknown_param` | WARNING | Module declares a param the spec doesn't know about |
| `unparseable` | INFO | URL has dynamic templating — skipped, not failed |

Path placeholders are matched positionally — `/users/{id}` and `/users/{userId}` are treated as equivalent.

## Install & run

```bash
bun install
cp .env.example .env   # only needed for --make scans
```

### Scan a Make app

```bash
bun run scan --make --app <slug> --version <n> --openapi <path-or-url>
```

Requires `MAKE_API_TOKEN` in `.env`. Get one at Make → Profile → API. Read-only is enough.

### Scan an n8n node (local package)

```bash
bun run scan --n8n /path/to/node-pkg --openapi <path-or-url>
```

### Scan an n8n node (GitHub)

```bash
bun run scan --n8n-repo owner/repo[#ref] --openapi <path-or-url> [--subdir packages/n8n-node]
```

### Flags

- `--openapi <path>` — path or URL to your OpenAPI spec (YAML or JSON). **Required.**
- `--region <eu1|eu2|us1|us2>` — Make region. Default `eu1`.
- `--json` — emit machine-readable JSON instead of pretty text.

## Web UI

```bash
bun run --filter web dev
```

Runs at <http://localhost:3000>. Same scan engine, browseable report.

## Development

```bash
bun install
bun run typecheck                  # TypeScript check
bun run test-fixtures/smoke.ts     # smoke test
```

## What it doesn't do (yet)

- **Zapier** — not supported. Coming.
- **n8n nodes that build URLs dynamically** — the parser flags these as `unparseable` rather than guessing. You'll see them in the warnings.
- **Body schema structural diff** — only top-level body field presence is compared, not nested types.

PRs welcome on any of these.

## License

MIT. See [LICENSE](LICENSE).
