'use client';

import { useState } from 'react';
import { ScanForm } from './components/ScanForm';
import { DriftReport } from './components/DriftReport';
import type { ScanResponse } from './actions';

export default function Page() {
  const [response, setResponse] = useState<ScanResponse | null>(null);
  const [scanning, setScanning] = useState(false);

  return (
    <main className="mx-auto max-w-5xl px-8 py-16">
      <header className="mb-16">
        <div className="flex items-baseline gap-3">
          <div className="h-2 w-2 rounded-full bg-[var(--accent)]" />
          <span className="text-xs uppercase tracking-[0.18em] text-[var(--ink-mute)]">
            Monitor
          </span>
        </div>
        <h1 className="mt-4 text-4xl font-medium tracking-tight">
          Catch integration drift before your customers do.
        </h1>
        <p className="mt-3 max-w-xl text-base text-[var(--ink-soft)]">
          Diff what your Make and n8n nodes actually call against your live OpenAPI spec. Surface
          breaking changes the moment they ship.
        </p>
      </header>

      <div className="grid gap-12 lg:grid-cols-[360px_1fr]">
        <ScanForm onResult={setResponse} onPending={setScanning} />

        <section>
          {scanning ? (
            <Pending />
          ) : !response ? (
            <Empty />
          ) : !response.ok ? (
            <Failure error={response.error ?? 'Unknown error'} />
          ) : response.result ? (
            <>
              <div className="mb-6 flex items-baseline justify-between border-b border-[var(--line)] pb-3">
                <span className="text-xs uppercase tracking-[0.18em] text-[var(--ink-mute)]">
                  Result
                </span>
                <span className="text-xs tabular-nums text-[var(--ink-mute)]">
                  {response.durationMs} ms
                </span>
              </div>
              <DriftReport result={response.result} />
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function Pending() {
  return (
    <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-4 text-center">
      <div className="relative h-1 w-32 overflow-hidden rounded-full bg-[var(--line)]">
        <div className="absolute inset-y-0 left-0 w-1/3 animate-[slide_1.2s_ease-in-out_infinite] rounded-full bg-[var(--ink)]" />
      </div>
      <span className="text-xs uppercase tracking-[0.18em] text-[var(--ink-mute)]">
        Scanning
      </span>
      <style>{`@keyframes slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }`}</style>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex h-full min-h-[360px] flex-col justify-center">
      <span className="text-xs uppercase tracking-[0.18em] text-[var(--ink-mute)]">
        How it works
      </span>
      <ol className="mt-5 space-y-4 text-[var(--ink-soft)]">
        <Step n={1}>
          Point Monitor at a Make app, n8n node, or GitHub repo where your integration lives.
        </Step>
        <Step n={2}>
          We extract every API call the integration makes and diff it against your OpenAPI spec.
        </Step>
        <Step n={3}>
          Breaking drift is flagged in red. Everything else is information you can act on.
        </Step>
      </ol>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--line)] text-xs tabular-nums text-[var(--ink-mute)]">
        {n}
      </span>
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}

function Failure({ error }: { error: string }) {
  return (
    <div className="border-l-2 border-[var(--accent)] pl-5">
      <div className="text-xs uppercase tracking-[0.18em] text-[var(--accent)]">Scan failed</div>
      <pre className="mt-2 whitespace-pre-wrap font-mono text-sm text-[var(--ink-soft)]">
        {error}
      </pre>
    </div>
  );
}
