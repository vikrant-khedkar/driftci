'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CreateProjectInput, ProjectFormValues } from '../dashboard/actions';

interface Props {
  mode: 'new' | 'edit';
  initial?: ProjectFormValues;
  submitLabel: string;
  action: (input: CreateProjectInput) => Promise<{ id: string }>;
}

export function ProjectForm({ mode, initial, submitLabel, action }: Props) {
  const router = useRouter();
  const [platform, setPlatform] = useState<'make' | 'n8n'>(initial?.platform ?? 'make');
  const [name, setName] = useState(initial?.name ?? '');
  const [openapi, setOpenapi] = useState(initial?.openapiSource ?? '');

  const [makeApp, setMakeApp] = useState(initial?.makeApp ?? '');
  const [makeVersion, setMakeVersion] = useState(initial?.makeVersion ?? '1');
  const [makeRegion, setMakeRegion] = useState(initial?.makeRegion ?? 'eu1');
  const [makeToken, setMakeToken] = useState('');

  const [n8nMode, setN8nMode] = useState<'local' | 'repo'>(initial?.n8nMode ?? 'repo');
  const [n8nRepo, setN8nRepo] = useState(initial?.n8nRepo ?? '');
  const [n8nSubdir, setN8nSubdir] = useState(initial?.n8nSubdir ?? '');
  const [n8nPath, setN8nPath] = useState(initial?.n8nPath ?? '');

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const hasExistingToken = mode === 'edit' && initial?.hasToken;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim()) return setError('Project name is required');
    if (!openapi.trim()) return setError('OpenAPI spec URL or path is required');
    if (platform === 'make') {
      if (!makeApp.trim()) return setError('App slug is required');
      if (!makeVersion.trim()) return setError('Version is required');
      if (!makeToken.trim() && !hasExistingToken) return setError('Make API token is required');
    } else {
      if (n8nMode === 'repo' && !n8nRepo.trim()) return setError('GitHub repo is required');
      if (n8nMode === 'local' && !n8nPath.trim()) return setError('Local path is required');
    }

    setSaving(true);
    const input: CreateProjectInput = {
      name: name.trim(),
      platform,
      openapiSource: openapi.trim(),
      ...(platform === 'make'
        ? {
            makeApp: makeApp.trim(),
            makeVersion: makeVersion.trim(),
            makeRegion,
            // blank token on edit = keep existing
            makeToken: makeToken.trim() || undefined,
          }
        : {
            n8nMode,
            n8nRepo: n8nMode === 'repo' ? n8nRepo.trim() : undefined,
            n8nSubdir: n8nMode === 'repo' && n8nSubdir ? n8nSubdir.trim() : undefined,
            n8nPath: n8nMode === 'local' ? n8nPath.trim() : undefined,
          }),
    };
    try {
      const { id } = await action(input);
      router.push(`/dashboard/projects/${id}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message ?? 'Failed to save project');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Project name">
        <Input value={name} onChange={setName} placeholder="ScrapeGraphAI Make app" />
      </Field>

      <div className="flex gap-2">
        <Pill active={platform === 'make'} onClick={() => setPlatform('make')}>
          Make
        </Pill>
        <Pill active={platform === 'n8n'} onClick={() => setPlatform('n8n')}>
          n8n
        </Pill>
      </div>

      <Field label="OpenAPI spec (URL or absolute path)">
        <Input value={openapi} onChange={setOpenapi} placeholder="https://api.example.com/openapi.json" />
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
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
                style={{ borderColor: 'var(--border-strong)', background: 'var(--bg)' }}
              >
                <option value="eu1">eu1</option>
                <option value="eu2">eu2</option>
                <option value="us1">us1</option>
                <option value="us2">us2</option>
              </select>
            </Field>
          </div>
          <Field
            label={
              hasExistingToken
                ? 'Make API token (leave blank to keep current)'
                : 'Make API token (stored encrypted)'
            }
          >
            <Input
              value={makeToken}
              onChange={setMakeToken}
              placeholder={hasExistingToken ? '•••••••• (unchanged)' : 'token'}
              type="password"
            />
          </Field>
        </>
      ) : (
        <>
          <div className="flex gap-2">
            <Pill active={n8nMode === 'repo'} onClick={() => setN8nMode('repo')} small>
              GitHub repo
            </Pill>
            <Pill active={n8nMode === 'local'} onClick={() => setN8nMode('local')} small>
              Local path
            </Pill>
          </div>
          {n8nMode === 'repo' ? (
            <>
              <Field label="Repo (owner/repo[#ref])">
                <Input value={n8nRepo} onChange={setN8nRepo} placeholder="ScrapeGraphAI/n8n-nodes-scrapegraphai" />
              </Field>
              <Field label="Subdir (optional)">
                <Input value={n8nSubdir} onChange={setN8nSubdir} placeholder="packages/n8n-node" />
              </Field>
            </>
          ) : (
            <Field label="Local path">
              <Input value={n8nPath} onChange={setN8nPath} placeholder="/path/to/node-pkg" />
            </Field>
          )}
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        style={{ background: 'var(--ink)' }}
      >
        {saving ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wide" style={{ color: 'var(--ink-mute)' }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border px-3 py-2.5 font-mono text-sm outline-none"
      style={{ borderColor: 'var(--border-strong)', background: 'var(--bg)' }}
    />
  );
}

function Pill({
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
      type="button"
      onClick={onClick}
      className={`rounded-lg border font-medium ${small ? 'px-3 py-1 text-xs' : 'px-3 py-1.5 text-sm'}`}
      style={
        active
          ? { borderColor: 'var(--ink)', background: 'var(--accent-tint)', color: 'var(--ink)' }
          : { borderColor: 'var(--border-strong)', color: 'var(--ink-mute)' }
      }
    >
      {children}
    </button>
  );
}
