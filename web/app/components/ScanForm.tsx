'use client';

import { useTransition, useState } from 'react';
import { runScan, type ScanInput, type ScanResponse } from '../actions';

interface Props {
  onResult: (resp: ScanResponse | null) => void;
  onPending: (pending: boolean) => void;
}

export function ScanForm({ onResult, onPending }: Props) {
  const [platform, setPlatform] = useState<'make' | 'n8n'>('make');
  const [openapi, setOpenapi] = useState('');

  const [makeApp, setMakeApp] = useState('');
  const [makeVersion, setMakeVersion] = useState('1');
  const [makeRegion, setMakeRegion] = useState('eu1');

  const [n8nMode, setN8nMode] = useState<'local' | 'repo'>('repo');
  const [n8nPath, setN8nPath] = useState('');
  const [n8nRepo, setN8nRepo] = useState('');
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
    <div className="space-y-7">
      <div>
        <Label>Platform</Label>
        <div className="mt-2 flex border-b border-[var(--line)]">
          <Tab active={platform === 'make'} onClick={() => setPlatform('make')}>
            Make
          </Tab>
          <Tab active={platform === 'n8n'} onClick={() => setPlatform('n8n')}>
            n8n
          </Tab>
          <span className="ml-auto self-end pb-3 text-xs text-[var(--ink-mute)]">
            Zapier — soon
          </span>
        </div>
      </div>

      <Field label="OpenAPI spec">
        <Input value={openapi} onChange={setOpenapi} placeholder="URL or absolute path" />
      </Field>

      {platform === 'make' ? (
        <>
          <Field label="App slug">
            <Input value={makeApp} onChange={setMakeApp} placeholder="scrapegraphai" />
          </Field>
          <div className="grid grid-cols-[1fr_auto] gap-5">
            <Field label="Version">
              <Input value={makeVersion} onChange={setMakeVersion} placeholder="1" />
            </Field>
            <Field label="Region">
              <select
                value={makeRegion}
                onChange={(e) => setMakeRegion(e.target.value)}
                className="h-[34px] border-b border-[var(--line)] bg-transparent pr-6 text-sm focus:border-[var(--ink)] focus:outline-none"
              >
                <option value="eu1">eu1</option>
                <option value="eu2">eu2</option>
                <option value="us1">us1</option>
                <option value="us2">us2</option>
              </select>
            </Field>
          </div>
          <Hint>
            <code>MAKE_API_TOKEN</code> read from server <code>.env</code>
          </Hint>
        </>
      ) : (
        <>
          <div>
            <Label>Source</Label>
            <div className="mt-2 flex gap-5 text-sm">
              <RadioTab active={n8nMode === 'repo'} onClick={() => setN8nMode('repo')}>
                GitHub
              </RadioTab>
              <RadioTab active={n8nMode === 'local'} onClick={() => setN8nMode('local')}>
                Local
              </RadioTab>
            </div>
          </div>
          {n8nMode === 'repo' ? (
            <>
              <Field label="Repository">
                <Input
                  value={n8nRepo}
                  onChange={setN8nRepo}
                  placeholder="owner/repo or owner/repo#ref"
                />
              </Field>
              <Field label="Subdirectory">
                <Input
                  value={n8nSubdir}
                  onChange={setN8nSubdir}
                  placeholder="optional, for monorepos"
                />
              </Field>
            </>
          ) : (
            <Field label="Path">
              <Input value={n8nPath} onChange={setN8nPath} placeholder="/path/to/node-pkg" />
            </Field>
          )}
        </>
      )}

      <button
        onClick={submit}
        disabled={isPending}
        className="group flex w-full items-center justify-between bg-[var(--ink)] px-5 py-3.5 text-sm font-medium text-[var(--bg)] transition hover:bg-[var(--accent)] disabled:opacity-40"
      >
        <span>{isPending ? 'Scanning' : 'Run scan'}</span>
        <span className="transition group-hover:translate-x-1">→</span>
      </button>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs uppercase tracking-[0.18em] text-[var(--ink-mute)]">{children}</span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <div className="mt-2">{children}</div>
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
      spellCheck={false}
      className="w-full border-b border-[var(--line)] bg-transparent pb-2 font-mono text-sm text-[var(--ink)] placeholder:text-[var(--ink-mute)] focus:border-[var(--ink)] focus:outline-none"
    />
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 pb-3 pr-6 text-sm transition ${
        active
          ? 'border-[var(--ink)] text-[var(--ink)]'
          : 'border-transparent text-[var(--ink-mute)] hover:text-[var(--ink-soft)]'
      }`}
    >
      {children}
    </button>
  );
}

function RadioTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 transition ${
        active ? 'text-[var(--ink)]' : 'text-[var(--ink-mute)] hover:text-[var(--ink-soft)]'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-[var(--ink)]' : 'bg-[var(--line)]'}`}
      />
      {children}
    </button>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-[var(--ink-mute)] [&_code]:rounded [&_code]:bg-[var(--line-soft)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[11px]">
      {children}
    </p>
  );
}
