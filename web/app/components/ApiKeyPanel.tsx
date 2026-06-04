'use client';

import { useState } from 'react';
import { regenerateApiKey } from '../dashboard/actions';

export function ApiKeyPanel({ initialKey, mcpUrl }: { initialKey: string | null; mcpUrl: string }) {
  const [key, setKey] = useState<string | null>(initialKey);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState('');

  async function regen() {
    if (key && !confirm('Regenerate? Your old key stops working immediately.')) return;
    setLoading(true);
    const { apiKey } = await regenerateApiKey();
    setKey(apiKey);
    setLoading(false);
  }

  const connectCmd = key
    ? `claude mcp add --transport http driftci ${mcpUrl} --header "Authorization: Bearer ${key}"`
    : '';

  function copy(text: string, what: string) {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(what);
    setTimeout(() => setCopied(''), 1400);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border p-5" style={{ borderColor: 'var(--line)' }}>
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--ink-mute)' }}>
          API key
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-mute)' }}>
          Used by coding agents (Claude Code, Cursor, Codex) to read your drift over MCP.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <code
            className="flex-1 overflow-x-auto rounded-lg border px-3 py-2 font-mono text-sm"
            style={{ borderColor: 'var(--border-strong)', background: 'var(--bg-2)' }}
          >
            {key ?? 'No key yet — generate one.'}
          </code>
          {key && (
            <button
              onClick={() => copy(key, 'key')}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--border-strong)' }}
            >
              {copied === 'key' ? 'copied' : 'copy'}
            </button>
          )}
          <button
            onClick={regen}
            disabled={loading}
            className="rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--ink)' }}
          >
            {loading ? '…' : key ? 'Regenerate' : 'Generate'}
          </button>
        </div>
      </section>

      {key && (
        <section className="rounded-xl border p-5" style={{ borderColor: 'var(--line)' }}>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--ink-mute)' }}>
            Connect your coding agent
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-mute)' }}>
            Run this once. Then ask your agent: <i>“scan my driftci project and fix the drift.”</i>
          </p>
          <div className="mt-3 flex items-start gap-2">
            <code
              className="flex-1 overflow-x-auto rounded-lg border px-3 py-2 font-mono text-xs leading-relaxed"
              style={{ borderColor: 'var(--border-strong)', background: 'var(--bg-2)' }}
            >
              {connectCmd}
            </code>
            <button
              onClick={() => copy(connectCmd, 'cmd')}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--border-strong)' }}
            >
              {copied === 'cmd' ? 'copied' : 'copy'}
            </button>
          </div>
          <p className="mt-3 text-xs" style={{ color: 'var(--muted-2)' }}>
            MCP endpoint: <code className="font-mono">{mcpUrl}</code> · tools: list_projects,
            scan_project, get_latest_drift
          </p>
        </section>
      )}
    </div>
  );
}
