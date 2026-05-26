'use client';

import { useState } from 'react';
import { ScanForm } from './components/ScanForm';
import { DriftReport } from './components/DriftReport';
import type { ScanResponse } from './actions';

export default function Page() {
  const [response, setResponse] = useState<ScanResponse | null>(null);
  const [scanning, setScanning] = useState(false);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">monitor-integrations</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Detect drift between your integration nodes and your live OpenAPI spec.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <ScanForm onResult={setResponse} onPending={setScanning} />

        <section className="rounded border border-neutral-800 bg-neutral-900/30 p-5">
          {scanning ? (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 text-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-700 border-t-blue-500" />
              <div className="text-sm text-neutral-400">Scanning…</div>
            </div>
          ) : !response ? (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center text-sm text-neutral-500">
              <div className="text-base text-neutral-400">No scan yet</div>
              <div className="mt-1">Configure a platform on the left and run a scan.</div>
            </div>
          ) : !response.ok ? (
            <div className="rounded border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
              <div className="font-medium">Scan failed</div>
              <pre className="mt-2 whitespace-pre-wrap font-mono text-xs">{response.error}</pre>
            </div>
          ) : response.result ? (
            <>
              <div className="mb-4 flex items-center justify-between text-xs text-neutral-500">
                <span>Scanned in {response.durationMs}ms</span>
              </div>
              <DriftReport result={response.result} />
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}
