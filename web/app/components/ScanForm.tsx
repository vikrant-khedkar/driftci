'use client';

import { useState, useTransition } from 'react';
import { runScan, type ScanInput, type ScanResponse } from '../actions';

interface Props {
  onResult: (resp: ScanResponse | null) => void;
  onPending: (pending: boolean) => void;
}

const DEFAULT_OPENAPI = '/Users/vikrant/Desktop/ScrapeGraphAI/sgai-stack/apps/api/openapi.yaml';

export function ScanForm({ onResult, onPending }: Props) {
  const [platform, setPlatform] = useState<'make' | 'n8n'>('make');
  const [openapi, setOpenapi] = useState(DEFAULT_OPENAPI);

  const [makeApp, setMakeApp] = useState('scrapegraphai');
  const [makeVersion, setMakeVersion] = useState('1');
  const [makeRegion, setMakeRegion] = useState('eu1');

  const [n8nMode, setN8nMode] = useState<'local' | 'repo'>('repo');
  const [n8nPath, setN8nPath] = useState('');
  const [n8nRepo, setN8nRepo] = useState('ScrapeGraphAI/n8n-nodes-scrapegraphai');
  const [n8nSubdir, setN8nSubdir] = useState('');

  const [isPending, startTransition] = useTransition();

  const submit = () => {
    const input: ScanInput = {
      platform,
      openapi,
      ...(platform === 'make'
        ? { app: makeApp, version: makeVersion, region: makeRegion }
        : {
            n8nMode,
            n8nPath: n8nMode === 'local' ? n8nPath : undefined,
            n8nRepo: n8nMode === 'repo' ? n8nRepo : undefined,
            n8nSubdir: n8nMode === 'repo' && n8nSubdir ? n8nSubdir : undefined,
          }),
    };
    onResult(null);
    onPending(true);
    startTransition(async () => {
      const resp = await runScan(input);
      onResult(resp);
      onPending(false);
    });
  };

  return (
    <div className="space-y-4 rounded border border-neutral-800 bg-neutral-900/50 p-5">
      <div className="flex gap-2">
        <PlatformPill active={platform === 'make'} onClick={() => setPlatform('make')}>
          Make
        </PlatformPill>
        <PlatformPill active={platform === 'n8n'} onClick={() => setPlatform('n8n')}>
          n8n
        </PlatformPill>
        <span
          className="ml-auto self-center rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-500"
          title="Zapier coming next"
        >
          Zapier (soon)
        </span>
      </div>

      <Field label="OpenAPI spec (URL or absolute path)">
        <Input value={openapi} onChange={setOpenapi} placeholder="/path/to/openapi.yaml" />
      </Field>

      {platform === 'make' ? (
        <>
          <Field label="App slug">
            <Input value={makeApp} onChange={setMakeApp} placeholder="scrapegraphai" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Version">
              <Input value={makeVersion} onChange={setMakeVersion} placeholder="1" />
            </Field>
            <Field label="Region">
              <select
                value={makeRegion}
                onChange={(e) => setMakeRegion(e.target.value)}
                className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-blue-500"
              >
                <option value="eu1">eu1</option>
                <option value="eu2">eu2</option>
                <option value="us1">us1</option>
                <option value="us2">us2</option>
              </select>
            </Field>
          </div>
          <div className="text-xs text-neutral-500">
            <code className="rounded bg-neutral-800 px-1.5 py-0.5">MAKE_API_TOKEN</code> read from
            server <code className="rounded bg-neutral-800 px-1.5 py-0.5">.env</code>
          </div>
        </>
      ) : (
        <>
          <div className="flex gap-2">
            <PlatformPill active={n8nMode === 'repo'} onClick={() => setN8nMode('repo')} small>
              GitHub repo
            </PlatformPill>
            <PlatformPill active={n8nMode === 'local'} onClick={() => setN8nMode('local')} small>
              Local path
            </PlatformPill>
          </div>
          {n8nMode === 'repo' ? (
            <>
              <Field label="Repo (owner/repo[#ref])">
                <Input
                  value={n8nRepo}
                  onChange={setN8nRepo}
                  placeholder="ScrapeGraphAI/n8n-nodes-scrapegraphai"
                />
              </Field>
              <Field label="Subdir (optional, for monorepos)">
                <Input value={n8nSubdir} onChange={setN8nSubdir} placeholder="packages/n8n-node" />
              </Field>
            </>
          ) : (
            <Field label="Local path to n8n node package">
              <Input value={n8nPath} onChange={setN8nPath} placeholder="/path/to/node-pkg" />
            </Field>
          )}
        </>
      )}

      <button
        onClick={submit}
        disabled={isPending}
        className="w-full rounded bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:bg-neutral-800 disabled:text-neutral-500"
      >
        {isPending ? 'Scanning…' : 'Run scan'}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wide text-neutral-500">{label}</span>
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 font-mono text-sm text-neutral-100 outline-none focus:border-blue-500"
    />
  );
}

function PlatformPill({
  active,
  onClick,
  children,
  small = false,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded border px-3 ${small ? 'py-1 text-xs' : 'py-1.5 text-sm'} font-medium ${
        active
          ? 'border-blue-500 bg-blue-500/15 text-blue-300'
          : 'border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-neutral-600'
      }`}
    >
      {children}
    </button>
  );
}
