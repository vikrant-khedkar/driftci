import type { ReactNode } from 'react';

export interface DiffLine {
  k?: 'add' | 'del' | '';
  t: ReactNode;
  flag?: boolean;
}

export interface Finding {
  sev: 'B' | 'W' | 'I';
  code: string;
  what: ReactNode;
  where: string;
}

export interface Provider {
  id: string;
  name: string;
  short: string;
  swatch: string;
  blurb: string;
  spec: { title: string; sub: string; lines: DiffLine[] };
  integration: { title: string; sub: string; lines: DiffLine[] };
  findings: Finding[];
  exit: number;
}

export const PROVIDERS: Provider[] = [
  {
    id: 'todoist',
    name: 'Todoist',
    short: 'T',
    swatch: '#E44232',
    blurb: 'REST v2 → 410 Gone',
    spec: {
      title: 'openapi.yaml',
      sub: 'todoist · v2024-09',
      lines: [
        { t: <><span className="tok-k">openapi</span>: <span className="tok-s">"3.1.0"</span></> },
        { t: <><span className="tok-k">info</span>:</> },
        { t: <>  <span className="tok-k">title</span>: <span className="tok-s">Todoist Sync v9</span></> },
        { t: <><span className="tok-k">paths</span>:</> },
        { k: 'del', flag: true, t: <>  <span className="tok-k">/rest/v2/tasks</span>:</> },
        { k: 'del', t: <>    <span className="tok-k">get</span>: ...</> },
        { k: 'del', t: <>    <span className="tok-k">post</span>: ...</> },
        { k: 'add', t: <>  <span className="tok-k">/sync/v9/sync</span>:</> },
        { k: 'add', t: <>    <span className="tok-k">post</span>:</> },
        { k: 'add', t: <>      <span className="tok-k">summary</span>: <span className="tok-s">Sync resources</span></> },
        { t: <>  <span className="tok-k">/sync/v9/projects/get_data</span>: ...</> },
        { t: <>  <span className="tok-k">/sync/v9/labels</span>: ...</> },
      ],
    },
    integration: {
      title: 'Todoist.node.ts',
      sub: 'n8n-nodes-base',
      lines: [
        { t: <><span className="tok-c">{`// Todoist node`}</span></> },
        { t: <><span className="tok-k">const</span> baseURL = <span className="tok-s">{`'https://api.todoist.com'`}</span>,</> },
        { t: <><span className="tok-k">routing</span>: {'{'}</> },
        { t: <>  <span className="tok-k">request</span>: {'{'}</> },
        { k: '', flag: true, t: <>    <span className="tok-k">method</span>: <span className="tok-s">{`'GET'`}</span>,</> },
        { k: '', flag: true, t: <>    <span className="tok-k">url</span>: <span className="tok-s">{`'/rest/v2/tasks'`}</span>,</> },
        { k: '', flag: true, t: <>    <span className="tok-k">qs</span>: {`{ project_id: '={{ $value }}' }`}</> },
        { t: <>  {'},'}</> },
        { t: <>  <span className="tok-k">output</span>: {`{ ... }`},</> },
        { t: <>{'}'}</> },
        { t: <> </> },
        { t: <><span className="tok-c">{`// returns:  410 Gone — endpoint retired`}</span></> },
      ],
    },
    findings: [
      {
        sev: 'B',
        code: 'endpoint_removed',
        what: <><b>GET /rest/v2/tasks</b> — not in spec. Replaced by <b>POST /sync/v9/sync</b>.</>,
        where: 'Todoist.node.ts:142',
      },
      {
        sev: 'B',
        code: 'endpoint_removed',
        what: <><b>POST /rest/v2/tasks</b> — not in spec.</>,
        where: 'Todoist.node.ts:198',
      },
      {
        sev: 'W',
        code: 'auth_mismatch',
        what: <>Node uses <b>Bearer</b>; spec requires <b>X-Request-Id</b> for v9 sync.</>,
        where: 'credentials/TodoistApi.ts:8',
      },
    ],
    exit: 1,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    short: 'Li',
    swatch: '#0A66C2',
    blurb: 'API version 20250401 sunset → 426',
    spec: {
      title: 'openapi.json',
      sub: 'linkedin · marketing',
      lines: [
        { t: <><span className="tok-k">servers</span>:</> },
        { t: <>  - <span className="tok-k">url</span>: <span className="tok-s">https://api.linkedin.com/rest</span></> },
        { t: <>    <span className="tok-k">x-required-headers</span>:</> },
        { k: 'del', flag: true, t: <>      <span className="tok-k">LinkedIn-Version</span>: <span className="tok-s">"20250401"</span></> },
        { k: 'add', t: <>      <span className="tok-k">LinkedIn-Version</span>: <span className="tok-s">"20251101"</span></> },
        { t: <><span className="tok-k">paths</span>:</> },
        { t: <>  <span className="tok-k">/rest/posts</span>:</> },
        { t: <>    <span className="tok-k">post</span>:</> },
        { t: <>      <span className="tok-k">parameters</span>:</> },
        { t: <>        - <span className="tok-k">$ref</span>: <span className="tok-s">{`'#/headers/LinkedInVersion'`}</span></> },
        { t: <>  <span className="tok-k">/rest/socialActions</span>: ...</> },
        { t: <>  <span className="tok-k">/rest/conversations</span>: ...</> },
      ],
    },
    integration: {
      title: 'LinkedIn.node.ts',
      sub: 'n8n-nodes-base',
      lines: [
        { t: <><span className="tok-k">requestDefaults</span>: {'{'}</> },
        { t: <>  <span className="tok-k">baseURL</span>: <span className="tok-s">{`'https://api.linkedin.com/rest'`}</span>,</> },
        { t: <>  <span className="tok-k">headers</span>: {'{'}</> },
        { k: '', flag: true, t: <>    <span className="tok-s">{`'LinkedIn-Version'`}</span>: <span className="tok-s">{`'20250401'`}</span>,</> },
        { t: <>    <span className="tok-s">{`'X-Restli-Protocol-Version'`}</span>: <span className="tok-s">{`'2.0.0'`}</span>,</> },
        { t: <>  {'},'}</> },
        { t: <>{'}'}</> },
        { t: <> </> },
        { t: <><span className="tok-c">{`// → 426 NONEXISTENT_VERSION`}</span></> },
        { t: <><span className="tok-c">{`//   { message: 'API version 20250401 is no longer supported' }`}</span></> },
      ],
    },
    findings: [
      {
        sev: 'B',
        code: 'missing_required_param',
        what: <>Spec requires header <b>LinkedIn-Version: 20251101</b> — node sends <b>20250401</b>.</>,
        where: 'LinkedIn.node.ts:24',
      },
      {
        sev: 'W',
        code: 'unknown_param',
        what: <>Node sends <b>X-Restli-Protocol-Version</b> — not declared in spec.</>,
        where: 'LinkedIn.node.ts:26',
      },
    ],
    exit: 1,
  },
  {
    id: 'stripe',
    name: 'Stripe',
    short: 'S',
    swatch: '#635BFF',
    blurb: "Sources API EOL'd",
    spec: {
      title: 'stripe.openapi.yaml',
      sub: 'stripe · 2025-10-29',
      lines: [
        { t: <><span className="tok-k">paths</span>:</> },
        { k: 'del', flag: true, t: <>  <span className="tok-k">/v1/sources</span>:</> },
        { k: 'del', t: <>    <span className="tok-k">post</span>: ...</> },
        { k: 'del', t: <>  <span className="tok-k">/v1/sources/{`{source}`}</span>:</> },
        { k: 'del', t: <>    <span className="tok-k">get</span>: ...</> },
        { t: <>  <span className="tok-k">/v1/payment_methods</span>:</> },
        { t: <>    <span className="tok-k">post</span>:</> },
        { t: <>      <span className="tok-k">summary</span>: <span className="tok-s">Create a PaymentMethod</span></> },
        { t: <>  <span className="tok-k">/v1/payment_intents</span>: ...</> },
        { t: <>  <span className="tok-k">/v1/customers</span>: ...</> },
        { t: <>  <span className="tok-k">/v1/charges</span>: ...</> },
      ],
    },
    integration: {
      title: 'Stripe.node.ts',
      sub: 'n8n-nodes-base',
      lines: [
        { t: <><span className="tok-k">resources</span>: [</> },
        { t: <>  {'{'} <span className="tok-k">name</span>: <span className="tok-s">{`'Charge'`}</span>, <span className="tok-k">value</span>: <span className="tok-s">{`'charge'`}</span> {'},'}</> },
        { t: <>  {'{'} <span className="tok-k">name</span>: <span className="tok-s">{`'Customer'`}</span>, <span className="tok-k">value</span>: <span className="tok-s">{`'customer'`}</span> {'},'}</> },
        { k: '', flag: true, t: <>  {'{'} <span className="tok-k">name</span>: <span className="tok-s">{`'Source'`}</span>, <span className="tok-k">value</span>: <span className="tok-s">{`'source'`}</span> {'},'}</> },
        { t: <>],</> },
        { t: <> </> },
        { k: '', flag: true, t: <><span className="tok-c">{`// case 'source': url = '/v1/sources/' + id`}</span></> },
        { t: <> </> },
        { t: <><span className="tok-c">{`// → "source" parameter on a customer ref`}</span></> },
        { t: <><span className="tok-c">{`//   returns 400 invalid_request_error`}</span></> },
      ],
    },
    findings: [
      {
        sev: 'B',
        code: 'endpoint_removed',
        what: <><b>POST /v1/sources</b> — retired. Use <b>/v1/payment_methods</b>.</>,
        where: 'Stripe.node.ts:301',
      },
      {
        sev: 'B',
        code: 'endpoint_removed',
        what: <><b>GET /v1/sources/{`{id}`}</b> — retired.</>,
        where: 'Stripe.node.ts:347',
      },
      {
        sev: 'I',
        code: 'unparseable',
        what: <>Dynamic URL <b>{`'/v1/' + resource + 's'`}</b> — skipped, not failed.</>,
        where: 'Stripe.node.ts:412',
      },
    ],
    exit: 1,
  },
  {
    id: 'googleads',
    name: 'Google Ads',
    short: 'G',
    swatch: '#1A73E8',
    blurb: 'v12 deprecated → 404',
    spec: {
      title: 'googleads.openapi.json',
      sub: 'google-ads · v17',
      lines: [
        { t: <><span className="tok-k">servers</span>:</> },
        { k: 'del', flag: true, t: <>  - <span className="tok-k">url</span>: <span className="tok-s">https://googleads.googleapis.com/v12</span></> },
        { k: 'add', t: <>  - <span className="tok-k">url</span>: <span className="tok-s">https://googleads.googleapis.com/v17</span></> },
        { t: <><span className="tok-k">paths</span>:</> },
        { t: <>  <span className="tok-k">/customers/{`{customerId}`}/googleAds:search</span>: ...</> },
        { t: <>  <span className="tok-k">/customers/{`{customerId}`}/leadFormSubmissions</span>: ...</> },
        { t: <>  <span className="tok-k">/customers/{`{customerId}`}/campaigns</span>: ...</> },
        { t: <>  <span className="tok-k">/customers/{`{customerId}`}/conversions</span>: ...</> },
        { t: <>  <span className="tok-k">/customers/{`{customerId}`}/keywordPlans</span>: ...</> },
      ],
    },
    integration: {
      title: 'google-ads.imljson',
      sub: 'make · app v3.2',
      lines: [
        { t: <>{'{'}</> },
        { t: <>  <span className="tok-s">"name"</span>: <span className="tok-s">"leadForms"</span>,</> },
        { t: <>  <span className="tok-s">"label"</span>: <span className="tok-s">"List Lead Form Submissions"</span>,</> },
        { t: <>  <span className="tok-s">"communication"</span>: {'{'}</> },
        { k: '', flag: true, t: <>    <span className="tok-s">"url"</span>: <span className="tok-s">"/v12/customers/...</span></> },
        { k: '', flag: true, t: <>             <span className="tok-s">.../leadFormSubmissions"</span>,</> },
        { t: <>    <span className="tok-s">"method"</span>: <span className="tok-s">"GET"</span></> },
        { t: <>  {'}'}</> },
        { t: <>{'}'}</> },
        { t: <> </> },
        { t: <><span className="tok-c">{`// → 404 NOT_FOUND`}</span></> },
        { t: <><span className="tok-c">{`//   Version v12 deprecated since 2024-06`}</span></> },
      ],
    },
    findings: [
      {
        sev: 'B',
        code: 'endpoint_removed',
        what: <>All <b>/v12/*</b> paths — server retired in spec.</>,
        where: 'google-ads.imljson · 4 modules',
      },
      {
        sev: 'B',
        code: 'method_mismatch',
        what: <>Module <b>getConversions</b> uses <b>POST</b>; spec defines <b>GET</b>.</>,
        where: 'modules/conversions.imljson:11',
      },
    ],
    exit: 1,
  },
  {
    id: 'airtable',
    name: 'Airtable',
    short: 'A',
    swatch: '#FCB400',
    blurb: 'API keys killed overnight',
    spec: {
      title: 'airtable.openapi.yaml',
      sub: 'airtable · 2024-02',
      lines: [
        { t: <><span className="tok-k">components</span>:</> },
        { t: <>  <span className="tok-k">securitySchemes</span>:</> },
        { k: 'del', flag: true, t: <>    <span className="tok-k">apiKey</span>:</> },
        { k: 'del', t: <>      <span className="tok-k">type</span>: <span className="tok-s">apiKey</span></> },
        { k: 'del', t: <>      <span className="tok-k">in</span>: <span className="tok-s">header</span></> },
        { k: 'del', t: <>      <span className="tok-k">name</span>: <span className="tok-s">Authorization</span></> },
        { k: 'add', t: <>    <span className="tok-k">oauth2</span>:</> },
        { k: 'add', t: <>      <span className="tok-k">type</span>: <span className="tok-s">oauth2</span></> },
        { k: 'add', t: <>      <span className="tok-k">flows</span>: {`{ ... }`}</> },
        { t: <><span className="tok-k">security</span>:</> },
        { t: <>  - <span className="tok-k">oauth2</span>: [<span className="tok-s">data.records:read</span>]</> },
      ],
    },
    integration: {
      title: 'Airtable.node.ts',
      sub: 'n8n-nodes-base',
      lines: [
        { t: <><span className="tok-k">credentials</span>: [</> },
        { k: '', flag: true, t: <>  {'{'} <span className="tok-k">name</span>: <span className="tok-s">{`'airtableApi'`}</span>, <span className="tok-k">required</span>: <span className="tok-n">true</span> {'}'}</> },
        { t: <>],</> },
        { t: <><span className="tok-k">authenticate</span>: {'{'}</> },
        { t: <>  <span className="tok-k">type</span>: <span className="tok-s">{`'generic'`}</span>,</> },
        { t: <>  <span className="tok-k">properties</span>: {'{'}</> },
        { k: '', flag: true, t: <>    <span className="tok-k">headers</span>: {`{ Authorization: 'Bearer ' + apiKey }`}</> },
        { t: <>  {'},'}</> },
        { t: <>{'}'}</> },
        { t: <> </> },
        { t: <><span className="tok-c">{`// → 401 — personal access tokens required`}</span></> },
      ],
    },
    findings: [
      {
        sev: 'B',
        code: 'auth_mismatch',
        what: <>Spec requires <b>oauth2</b>; node uses <b>apiKey</b>.</>,
        where: 'Airtable.node.ts:18',
      },
      {
        sev: 'W',
        code: 'unknown_param',
        what: <>Node sends header <b>X-Airtable-User-Agent</b> — not declared.</>,
        where: 'Airtable.node.ts:54',
      },
    ],
    exit: 1,
  },
];

export const CASES = [
  {
    name: 'Todoist',
    short: 'T',
    color: '#E44232',
    sentence: <>killed REST v2 → n8n&apos;s Todoist node started returning <b>410 Gone</b>.</>,
    code: 'GET /rest/v2/tasks',
    err: '410 Gone',
    link: 'n8n-io/n8n#28441',
    href: 'https://github.com/n8n-io/n8n/issues/28441',
  },
  {
    name: 'LinkedIn',
    short: 'Li',
    color: '#0A66C2',
    sentence: <>sunset API version <b>20250401</b> → every LinkedIn call returns <b>426 NONEXISTENT_VERSION</b>.</>,
    code: 'POST /rest/posts',
    err: '426 NONEXISTENT_VERSION',
    link: 'n8n-io/n8n#28600',
    href: 'https://github.com/n8n-io/n8n/issues/28600',
  },
  {
    name: 'Google Ads',
    short: 'G',
    color: '#1A73E8',
    sentence: <>deprecated <b>v12</b> → Make&apos;s Google Ads modules <b>404</b> for weeks.</>,
    code: 'GET /v12/customers/…/leadForms',
    err: '404 NOT_FOUND',
    link: 'community.make.com/t/107743',
    href: 'https://community.make.com/t/google-ads-google-ads-lead-forms-modules-broken-api-v12-deprecated-404-error/107743',
  },
  {
    name: 'Airtable',
    short: 'A',
    color: '#FCB400',
    sentence: <>killed API keys overnight → n8n shipped an emergency commit to disable the node.</>,
    code: 'Authorization: Bearer <key>',
    err: '401 unauthorized',
    link: 'n8n-io/n8n emergency disable',
    href: 'https://github.com/n8n-io/n8n',
  },
  {
    name: 'Stripe',
    short: 'S',
    color: '#635BFF',
    sentence: <>EOL&apos;d the <b>Sources</b> API → still wired into the n8n Stripe node.</>,
    code: 'POST /v1/sources',
    err: 'invalid_request_error',
    link: 'n8n-io/n8n#18101',
    href: 'https://github.com/n8n-io/n8n/issues/18101',
  },
];

export const DETECT_ROWS = [
  { kind: 'endpoint_removed', sev: 'B', mean: 'Module calls a path/method missing from the spec.' },
  { kind: 'method_mismatch', sev: 'B', mean: 'Same path is in the spec, but with a different HTTP method.' },
  { kind: 'missing_required_param', sev: 'B', mean: 'Spec requires a parameter (header, query, body field) the module never declares.' },
  { kind: 'auth_mismatch', sev: 'B', mean: "Module's auth type differs from the spec's security scheme." },
  { kind: 'unknown_param', sev: 'W', mean: "Module declares a parameter the spec doesn't know about. Probably harmless, probably a hint." },
  { kind: 'unparseable', sev: 'I', mean: 'URL has dynamic templating — skipped, not failed. Surfaced as a warning so you can review by eye.' },
];

export interface InstallTab {
  key: string;
  label: string;
  head: string;
  body: Array<
    | { type: 'cm' | 'dim' | 'ok' | 'bad' | 'warn'; text: string }
    | { type: 'blank' }
    | { type: 'cmd'; parts: [string, string][] }
  >;
}

export const INSTALL_TABS: InstallTab[] = [
  {
    key: 'make',
    label: 'Scan a Make app',
    head: '~/your-make-app',
    body: [
      { type: 'cm', text: '# 1. install once' },
      { type: 'cmd', parts: [['prm', '$ '], ['cmd', 'bun add -D driftci']] },
      { type: 'blank' },
      { type: 'cm', text: '# 2. set MAKE_API_TOKEN in .env (Profile → API)' },
      { type: 'cmd', parts: [['prm', '$ '], ['cmd', 'cp .env.example .env']] },
      { type: 'blank' },
      { type: 'cm', text: '# 3. scan against your live spec' },
      {
        type: 'cmd',
        parts: [
          ['prm', '$ '],
          ['cmd', 'bun run scan'],
          ['flag', ' --make'],
          ['flag', ' --app'],
          ['val', ' linear'],
          ['flag', ' --version'],
          ['val', ' 4'],
          ['flag', ' --openapi'],
          ['val', ' https://api.linear.app/openapi.json'],
        ],
      },
      { type: 'blank' },
      { type: 'dim', text: '→ scanning 23 modules…' },
      { type: 'ok', text: '✓ 21 modules clean' },
      { type: 'bad', text: '✗ 2 BREAKING' },
      { type: 'warn', text: '! 1 WARNING' },
      { type: 'dim', text: 'exit 1' },
    ],
  },
  {
    key: 'n8n-local',
    label: 'Scan an n8n node (local)',
    head: '~/n8n-nodes-mything',
    body: [
      { type: 'cm', text: '# point at any local n8n node package' },
      {
        type: 'cmd',
        parts: [
          ['prm', '$ '],
          ['cmd', 'bun run scan'],
          ['flag', ' --n8n'],
          ['val', ' ../n8n-nodes-mything'],
          ['flag', ' --openapi'],
          ['val', ' ./openapi.yaml'],
        ],
      },
      { type: 'blank' },
      { type: 'dim', text: 'Parsing 11 .node.ts files…' },
      { type: 'dim', text: 'Resolving 47 routing entries…' },
      { type: 'ok', text: '✓ no drift' },
      { type: 'dim', text: 'exit 0' },
    ],
  },
  {
    key: 'n8n-gh',
    label: 'Scan an n8n node (GitHub)',
    head: '.github/workflows/drift.yml',
    body: [
      { type: 'cm', text: '# pin a ref, or omit for default branch' },
      {
        type: 'cmd',
        parts: [
          ['prm', '$ '],
          ['cmd', 'bun run scan'],
          ['flag', ' --n8n-repo'],
          ['val', ' n8n-io/n8n#master'],
          ['flag', ' --subdir'],
          ['val', ' packages/nodes-base/nodes/Todoist'],
          ['flag', ' --openapi'],
          ['val', ' https://todoist.com/api/v9/openapi.json'],
          ['flag', ' --json'],
        ],
      },
      { type: 'blank' },
      { type: 'dim', text: 'Cloning n8n-io/n8n@master (shallow)…' },
      { type: 'dim', text: '{ "findings": [ … ], "exitCode": 1 }' },
      { type: 'bad', text: '✗ 3 BREAKING — Todoist node calls retired /rest/v2/* paths' },
      { type: 'dim', text: 'exit 1' },
    ],
  },
];

export const FAQS = [
  {
    q: 'How is this different from openapi-diff or prism?',
    a: <>Those compare a spec to itself across versions. <b>drift/ci</b> compares the spec to what an actual integration <i>calls</i> — n8n nodes, Make modules. Different artifact, different parser, different findings.</>,
  },
  {
    q: 'Will it work with my custom n8n node?',
    a: <>Yes, as long as it&apos;s a standard <code>n8n-nodes-*</code> package and uses <code>routing</code> / <code>requestDefaults</code> for HTTP. Dynamic URLs (template strings, computed paths) are flagged as <code>unparseable</code> and surfaced as warnings rather than guessed at.</>,
  },
  {
    q: 'Does it need API access to my Make account?',
    a: <>Only for <code>--make</code> scans. Generate a read-only token at Make → Profile → API and drop it in <code>.env</code>. We never call the live API, just the app-definition endpoint.</>,
  },
  {
    q: 'What about Zapier?',
    a: <>Not yet. Zapier&apos;s CLI app format is well-documented, so it&apos;s coming. PRs welcome.</>,
  },
  {
    q: 'Can I run this on a schedule against prod?',
    a: <>Yes — that&apos;s the recommended setup for integrations you don&apos;t control. Nightly cron, <code>--json</code> output, ship to your monitoring of choice. Exit codes plug into alerting cleanly.</>,
  },
  {
    q: "What does it not catch?",
    a: <>Nested body-schema changes. We compare top-level body field presence, not deep structural diffs. If a provider tightens a sub-field enum, we won&apos;t catch it (yet).</>,
  },
];

export const GITHUB_URL = 'https://github.com/Vikrant-Khedkar/driftci';
