# monitor-integrations

Detect drift between a Make/n8n app's published modules and your live OpenAPI spec.

## Setup

```bash
bun install
cp .env.example .env
# put your Make Developer API token in .env
```

Get the token from Make → Profile → API. Read-only is enough.

## Run

```bash
bun run scan --make --app <make-app-slug> --version <n> --openapi <path-or-url>
```

Flags:
- `--make` — Scan a Make app
- `--n8n <path>` — Scan a local n8n node package
- `--n8n-repo <owner/repo[#ref]>` — Scan an n8n node from GitHub
- `--openapi <path>` — Path or URL to your OpenAPI spec (YAML or JSON)
- `--region` — `eu1` (default), `eu2`, `us1`, `us2` (Make only)
- `--json` — Emit machine-readable JSON instead of pretty text

Exits `1` if any BREAKING drift is found, `0` otherwise. Use in CI.

## What it detects

- `endpoint_removed` — Make module calls a path/method not in the spec
- `method_mismatch` — same path exists in spec but with different HTTP method
- `missing_required_param` — spec requires a param the module doesn't declare
- `unknown_param` — module declares a param the spec doesn't know about (possibly deprecated)
- `auth_mismatch` — module's connection auth type differs from spec's security scheme

Path placeholders are matched positionally (`/users/{id}` and `/users/{userId}` are equivalent).

## Development

```bash
bun install
bun run typecheck    # TypeScript check
bun run test-fixtures/smoke.ts  # Run smoke test
```

## Web UI

```bash
bun run --filter web dev
```

## License

MIT