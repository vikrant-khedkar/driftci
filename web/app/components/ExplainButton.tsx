'use client';

import { useState } from 'react';
import { explainScan } from '../dashboard/actions';

export function ExplainButton({ scanId, cached }: { scanId: string; cached?: string | null }) {
  const [guidance, setGuidance] = useState<string | null>(cached ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function run() {
    setError('');
    setLoading(true);
    const res = await explainScan(scanId);
    setLoading(false);
    if (res.ok && res.guidance) setGuidance(res.guidance);
    else setError(res.error ?? 'Failed to generate guidance');
  }

  return (
    <div className="mt-6">
      {!guidance && (
        <button
          onClick={run}
          disabled={loading}
          className="rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50"
          style={{ borderColor: 'var(--border-strong)' }}
        >
          {loading ? 'Generating migration guide…' : '✦ Explain migration (AI)'}
        </button>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {guidance && (
        <div className="rounded-xl border p-5" style={{ borderColor: 'var(--line)', background: 'var(--bg-2)' }}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--ink-mute)' }}>
              ✦ AI migration guide
            </span>
            <button onClick={run} disabled={loading} className="text-xs underline disabled:opacity-50" style={{ color: 'var(--ink-mute)' }}>
              {loading ? 'regenerating…' : 'regenerate'}
            </button>
          </div>
          <Markdown text={guidance} />
        </div>
      )}
    </div>
  );
}

// Minimal GFM-ish renderer: headings, bullets, inline code, bold.
function Markdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  let list: React.ReactNode[] = [];

  const flush = () => {
    if (list.length) {
      out.push(
        <ul key={`ul-${out.length}`} className="my-2 list-disc space-y-1 pl-5 text-sm">
          {list}
        </ul>,
      );
      list = [];
    }
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      return;
    }
    if (line.startsWith('### ')) {
      flush();
      out.push(<h4 key={i} className="mt-3 mb-1 text-sm font-semibold">{inline(line.slice(4))}</h4>);
    } else if (line.startsWith('## ')) {
      flush();
      out.push(<h3 key={i} className="mt-4 mb-2 text-base font-semibold">{inline(line.slice(3))}</h3>);
    } else if (line.startsWith('# ')) {
      flush();
      out.push(<h2 key={i} className="mt-4 mb-2 text-lg font-semibold">{inline(line.slice(2))}</h2>);
    } else if (/^[-*]\s/.test(line)) {
      list.push(<li key={i}>{inline(line.replace(/^[-*]\s/, ''))}</li>);
    } else {
      flush();
      out.push(<p key={i} className="my-2 text-sm leading-relaxed">{inline(line)}</p>);
    }
  });
  flush();
  return <div>{out}</div>;
}

function inline(s: string): React.ReactNode[] {
  // split on `code` and **bold**
  const parts = s.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('`') && p.endsWith('`')) {
      return (
        <code key={i} className="rounded bg-black/[0.06] px-1 py-0.5 font-mono text-[0.85em]">
          {p.slice(1, -1)}
        </code>
      );
    }
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    return <span key={i}>{p}</span>;
  });
}
