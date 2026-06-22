'use client';

import { useEffect, useState } from 'react';
import './landing-components/landing.css';
import {
  PROVIDERS,
  CASES,
  DETECT_ROWS,
  INSTALL_TABS,
  FAQS,
  GITHUB_URL,
  type Provider,
  type InstallTab,
} from './landing-components/data';

export default function LandingPage() {
  return (
    <div className="landing">
      <NavBar />
      <main>
        <Hero />
        <Repeat />
        <Detects />
        <Install />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}

function NavBar() {
  return (
    <nav className="top">
      <div className="wrap">
        <div className="row">
          <a className="logo" href="/">
            drift<span className="slash">/</span>ci
          </a>
          <div className="links">
            <a className="link" href="#why">Why</a>
            <a className="link" href="#detects">Detection</a>
            <a className="link" href="#install">Install</a>
            <a className="link" href="#faq">FAQ</a>
            <a className="link" href="/scan">Demo</a>
            <a className="pill" href={GITHUB_URL} target="_blank" rel="noopener">
              <span className="dot" />
              <span>github.com/driftci</span>
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}

function CopyStrip({ cmd }: { cmd: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={'install-strip' + (copied ? ' copied' : '')}>
      <span className="prompt">$</span>
      <span>{cmd}</span>
      <button
        className="copy"
        onClick={() => {
          navigator.clipboard?.writeText(cmd).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        }}
        aria-label="Copy command"
      >
        {copied ? (
          <>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2.5 6L5 8.5L10 3"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            copied
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="3.5" y="3.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
              <path d="M2 8V2.5C2 2.22 2.22 2 2.5 2H8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            copy
          </>
        )}
      </button>
    </div>
  );
}

function DiffPane({ side, data }: { side: 'spec' | 'int'; data: Provider['spec'] }) {
  return (
    <div className="pane">
      <h4>
        <span>{side === 'spec' ? 'openapi spec' : 'integration'}</span>
        <span className="right">{data.sub}</span>
      </h4>
      <div className="code" aria-label={data.title}>
        {data.lines.map((line, i) => (
          <div
            key={i}
            className={'line' + (line.k ? ' ' + line.k : '') + (line.flag ? ' flag' : '')}
          >
            <span className="ln">{i + 1}</span>
            <span className="ct">{line.t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DiffReport({ provider }: { provider: Provider }) {
  return (
    <div className="report">
      <div className="report-head">
        <div className="left">
          <span>$ drift scan --n8n-repo n8n-io/n8n --openapi {provider.id}.yaml</span>
        </div>
        <span className={'exit' + (provider.exit === 0 ? ' ok' : '')}>exit {provider.exit}</span>
      </div>
      <div className="findings">
        {provider.findings.map((f, i) => (
          <div className="finding" key={i}>
            <span className={'sev ' + (f.sev === 'B' ? 'b' : f.sev === 'W' ? 'w' : 'i')}>
              {f.sev === 'B' ? 'BREAKING' : f.sev === 'W' ? 'WARNING' : 'INFO'}
            </span>
            <span className="what">
              <span style={{ color: 'var(--ink-mute)', marginRight: 8 }}>{f.code}</span>
              {f.what}
            </span>
            <span className="where">{f.where}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Hero() {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const provider = PROVIDERS[active]!;

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => {
      setActive((a) => (a + 1) % PROVIDERS.length);
    }, 4800);
    return () => clearInterval(t);
  }, [auto]);

  return (
    <section className="hero">
      <div className="grid-bg" aria-hidden="true" />
      <div className="wrap" style={{ position: 'relative' }}>
        <div className="hero-grid">
          <div>
            <span className="eyebrow">
              <span className="ping" /> v0.1 — CI-ready, MIT
            </span>
            <h1 className="display">
              Catch API drift <em>before</em> your customers do.
            </h1>
            <p className="lede">
              <b>drift/ci</b> diffs what your Make or n8n integration <i>actually calls</i>
              {' '}against your live OpenAPI spec. <b>Exits 1 on breaking drift.</b> Drop it in CI
              {' '}next to your spec — every breaking change shows up the moment the spec ships,
              {' '}not the moment a customer files a ticket.
            </p>
            <div className="cta-row">
              <CopyStrip cmd="bun add -D driftci" />
              <a className="btn btn-ghost" href="/scan">Try the demo →</a>
            </div>

            <div className="stats-row">
              <div className="stat">
                <span className="label ink">5+ providers</span>
                <span className="val">scanned in &lt; 3s</span>
              </div>
              <div className="stat">
                <span className="label ink">0 deps</span>
                <span className="val">on your runtime</span>
              </div>
              <div className="stat">
                <span className="label ink">CI-native</span>
                <span className="val">exit codes, JSON out</span>
              </div>
            </div>
          </div>

          <div>
            <div className="providers" role="tablist" aria-label="Drift examples">
              <span className="label" style={{ marginRight: 4 }}>real drift →</span>
              {PROVIDERS.map((p, i) => (
                <button
                  key={p.id}
                  className={'chip' + (i === active ? ' active' : '')}
                  onClick={() => {
                    setActive(i);
                    setAuto(false);
                  }}
                  role="tab"
                  aria-selected={i === active}
                >
                  <span className="swatch" style={{ background: p.swatch }}>{p.short}</span>
                  {p.name}
                </button>
              ))}
            </div>

            <div className="diff-card">
              <div className="diff-head">
                <div className="left">
                  <span className="traffic" style={{ background: '#ff5f57' }} />
                  <span className="traffic" style={{ background: '#febc2e' }} />
                  <span className="traffic" style={{ background: '#28c840' }} />
                  <span className="title">
                    {provider.spec.title} ⇄ {provider.integration.title}
                  </span>
                </div>
                <span className="label">{provider.blurb}</span>
              </div>
              <div className="diff-body">
                <DiffPane side="spec" data={provider.spec} />
                <DiffPane side="int" data={provider.integration} />
              </div>
            </div>

            <DiffReport provider={provider} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Repeat() {
  return (
    <section className="s" id="why" style={{ background: 'var(--bg)' }}>
      <div className="wrap">
        <div className="section-head">
          <div>
            <span className="label accent">§ 01 · the pattern</span>
            <h2>
              The same story,
              <br />
              on repeat.
            </h2>
          </div>
          <p className="lede" style={{ maxWidth: '44ch' }}>
            In every case the API provider knew the change was coming. The integration didn&apos;t.
            End-users found out by watching their workflows break.
          </p>
        </div>

        <div className="cases">
          {CASES.map((c, i) => (
            <div className="case" key={c.name}>
              <div className="top">
                <div className="vendor">
                  <span className="vlogo" style={{ background: c.color }}>{c.short}</span>
                  {c.name}
                </div>
                <span className="label">case 0{i + 1}</span>
              </div>
              <div className="verb">
                <b>{c.name}</b> {c.sentence}
              </div>
              <div className="err">
                <span className="code">{c.code}</span>
                <span>→ {c.err}</span>
              </div>
              <a className="case-link" href={c.href} target="_blank" rel="noopener">
                ↗ {c.link}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Detects() {
  return (
    <section className="s" id="detects" style={{ background: 'var(--bg-2)' }}>
      <div className="wrap">
        <div className="section-head">
          <div>
            <span className="label accent">§ 02 · what it detects</span>
            <h2>
              Six classes of drift.
              <br />
              Four of them break things.
            </h2>
          </div>
          <p className="lede" style={{ maxWidth: '44ch' }}>
            Path placeholders are matched <i>positionally</i> — <span className="mono">/users/{`{id}`}</span> and{' '}
            <span className="mono">/users/{`{userId}`}</span> are treated as equivalent. No false positives on renamed params.
          </p>
        </div>

        <div className="table-wrap">
          <table className="det">
            <thead>
              <tr>
                <th style={{ width: '26%' }}>kind</th>
                <th style={{ width: '14%' }}>severity</th>
                <th>meaning</th>
              </tr>
            </thead>
            <tbody>
              {DETECT_ROWS.map((r) => (
                <tr key={r.kind}>
                  <td className="kind">{r.kind}</td>
                  <td className="sev-cell">
                    <span className={'sev ' + (r.sev === 'B' ? 'b' : r.sev === 'W' ? 'w' : 'i')}>
                      {r.sev === 'B' ? 'BREAKING' : r.sev === 'W' ? 'WARNING' : 'INFO'}
                    </span>
                  </td>
                  <td className="mean">{r.mean}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Install() {
  const [tab, setTab] = useState(0);
  const cfg: InstallTab = INSTALL_TABS[tab]!;

  return (
    <section className="s" id="install" style={{ background: 'var(--bg)' }}>
      <div className="wrap">
        <div className="section-head">
          <div>
            <span className="label accent">§ 03 · install &amp; run</span>
            <h2>One command. Then CI does it forever.</h2>
          </div>
          <p className="lede" style={{ maxWidth: '44ch' }}>
            <b>drift/ci</b> is a single binary with <b>zero runtime deps</b> on your app. Run it locally,
            run it on every spec commit, run it nightly against prod.
          </p>
        </div>

        <div>
          <div className="tabs" role="tablist">
            {INSTALL_TABS.map((t, i) => (
              <button
                key={t.key}
                className={'tab' + (i === tab ? ' active' : '')}
                role="tab"
                aria-selected={i === tab}
                onClick={() => setTab(i)}
              >
                <span className="num">0{i + 1}</span>
                {t.label}
              </button>
            ))}
          </div>
          <div className="terminal">
            <div className="t-head">
              <span>{cfg.head}</span>
              <span>bash · driftci v0.1</span>
            </div>
            <div className="t-body">
              {cfg.body.map((row, i) => {
                if (row.type === 'blank') return <span className="ln" key={i}>&nbsp;</span>;
                if (row.type === 'cm') return <span className="ln cm" key={i}>{row.text}</span>;
                if (row.type === 'dim') return <span className="ln dim" key={i}>{row.text}</span>;
                if (row.type === 'ok') return <span className="ln ok" key={i}>{row.text}</span>;
                if (row.type === 'bad') return <span className="ln bad" key={i}>{row.text}</span>;
                if (row.type === 'warn') return <span className="ln warn" key={i}>{row.text}</span>;
                if (row.type === 'cmd') {
                  return (
                    <span className="ln" key={i}>
                      {row.parts.map((p, j) => (
                        <span className={p[0]} key={j}>{p[1]}</span>
                      ))}
                    </span>
                  );
                }
                return null;
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  return (
    <section className="s" id="faq" style={{ background: 'var(--bg)' }}>
      <div className="wrap">
        <div className="section-head">
          <div>
            <span className="label accent">§ 04 · faq</span>
            <h2>Answers, before you ask.</h2>
          </div>
        </div>

        <div className="faq">
          {FAQS.map((f, i) => (
            <details className="q" key={i} {...(i === 0 ? { open: true } : {})}>
              <summary>
                <span>{f.q}</span>
                <span className="plus" aria-hidden="true" />
              </summary>
              <div className="a">{f.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="row">
          <div>
            <a className="logo" href="/" style={{ fontSize: 22 }}>
              drift<span className="slash">/</span>ci
            </a>
            <div className="meta" style={{ marginTop: 10 }}>
              MIT — © 2026. Built for engineers who don&apos;t want to hear about it from a customer first.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 64, flexWrap: 'wrap' }}>
            <div className="col">
              <h5>Product</h5>
              <a href="#why">Why</a>
              <a href="#detects">Detection</a>
              <a href="#install">Install</a>
              <a href="#faq">FAQ</a>
            </div>
            <div className="col">
              <h5>Source</h5>
              <a href={GITHUB_URL} target="_blank" rel="noopener">GitHub</a>
              <a href={`${GITHUB_URL}/releases`} target="_blank" rel="noopener">Changelog</a>
              <a href={`${GITHUB_URL}/blob/main/LICENSE`} target="_blank" rel="noopener">License</a>
            </div>
            <div className="col">
              <h5>Try it</h5>
              <a href="/scan">Demo</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
