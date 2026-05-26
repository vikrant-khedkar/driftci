import stripJsonComments from 'strip-json-comments';

const BASE_URL_BY_REGION: Record<string, string> = {
  eu1: 'https://eu1.make.com',
  eu2: 'https://eu2.make.com',
  us1: 'https://us1.make.com',
  us2: 'https://us2.make.com',
};

const CONCURRENCY_LIMIT = 10;

async function withConcurrencyLimit<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  const worker = async (): Promise<void> => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i] as T);
    }
  };

  const workers = Array.from(
    { length: Math.min(CONCURRENCY_LIMIT, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

export interface MakeFetchOptions {
  app: string;
  version: string;
  token: string;
  region?: string;
}

export interface MakeModuleMeta {
  name: string;
  label?: string;
  description?: string;
  typeId?: number;
  crud?: string;
  public?: boolean;
  approved?: boolean;
  archived?: boolean;
}

export interface MakeModuleApi {
  url?: string;
  method?: string;
  qs?: Record<string, unknown> | unknown[];
  body?: Record<string, unknown> | unknown[];
  headers?: Record<string, unknown>;
  response?: Record<string, unknown>;
  [k: string]: unknown;
}

export interface MakeAppBase {
  baseUrl?: string;
  base?: Record<string, unknown>;
  [k: string]: unknown;
}

export interface MakeConnectionMeta {
  name: string;
  type?: string;
  label?: string;
}

export interface MakeRaw {
  app: MakeAppBase;
  modules: { meta: MakeModuleMeta; api: MakeModuleApi; parameters: unknown[]; expect: unknown[] }[];
  connections: MakeConnectionMeta[];
}

async function makeGet<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Token ${token}`, Accept: 'application/json' },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Make API ${res.status} ${res.statusText} on ${url}\n${text.slice(0, 500)}`);
  }
  try {
    return JSON.parse(stripJsonComments(text, { trailingCommas: true })) as T;
  } catch (e) {
    throw new Error(`Failed to parse Make response from ${url}: ${(e as Error).message}`);
  }
}

export async function fetchMakeApp(opts: MakeFetchOptions): Promise<MakeRaw> {
  const { app, version, token } = opts;
  const region = opts.region ?? 'eu1';
  const root = BASE_URL_BY_REGION[region];
  if (!root) throw new Error(`Unknown Make region: ${region}`);

  const base = `${root}/api/v2/sdk/apps/${encodeURIComponent(app)}/${encodeURIComponent(version)}`;

  const appDetail = await makeGet<{ app: MakeAppBase }>(
    `${base}?cols[]=base&cols[]=name&cols[]=label`,
    token,
  );
  const normalizedApp: MakeAppBase = appDetail.app ?? {};
  if (
    typeof (normalizedApp as any).base === 'object' &&
    (normalizedApp as any).base?.baseUrl
  ) {
    (normalizedApp as any).baseUrl = (normalizedApp as any).base.baseUrl;
  }

  const modulesList = await makeGet<{ appModules: MakeModuleMeta[] } | MakeModuleMeta[]>(
    `${base}/modules`,
    token,
  );
  const modulesMeta: MakeModuleMeta[] = Array.isArray(modulesList)
    ? modulesList
    : modulesList.appModules ?? [];

  const modules = await withConcurrencyLimit(modulesMeta, async (meta) => {
    try {
      const detail = await makeGet<{
        appModule: {
          api?: MakeModuleApi | MakeModuleApi[];
          parameters?: unknown[];
          expect?: unknown[];
        };
      }>(
        `${base}/modules/${encodeURIComponent(meta.name)}?cols[]=api&cols[]=parameters&cols[]=expect`,
        token,
      );
      const m = detail.appModule ?? {};
      const api: MakeModuleApi = Array.isArray(m.api) ? (m.api[0] ?? {}) : (m.api ?? {});
      return {
        meta,
        api,
        parameters: Array.isArray(m.parameters) ? m.parameters : [],
        expect: Array.isArray(m.expect) ? m.expect : [],
      };
    } catch {
      return { meta, api: {} as MakeModuleApi, parameters: [], expect: [] };
    }
  });

  const connectionsList = await makeGet<
    { appConnections: MakeConnectionMeta[] } | MakeConnectionMeta[]
  >(`${base}/connections`, token).catch(() => [] as MakeConnectionMeta[]);
  const connections: MakeConnectionMeta[] = Array.isArray(connectionsList)
    ? connectionsList
    : connectionsList.appConnections ?? [];

  return { app: normalizedApp, modules, connections };
}
