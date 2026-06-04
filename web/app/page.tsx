'use client';

import { useEffect, useState } from 'react';
import './landing-components/landing.css';
import { PROVIDERS, CASES, DETECT_ROWS, FAQS, type Provider } from './landing-components/data';

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
            <a className="link" href="#faq">FAQ</a>
            <a className="link" href="/login">Log in</a>
            <a className="pill" href="/signup">
              <span>Sign up</span>
            </a>
          </div>
        </div>
      </div>
    </nav>
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
              <span className="ping" /> Now monitoring Make &amp; n8n
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
              <a className="btn btn-primary" href="/signup">Start monitoring →</a>
              <a className="btn btn-ghost" href="/scan">Try the demo</a>
            </div>

            <div style={{ display: 'flex', gap: 28, marginTop: 36, color: 'var(--ink-mute)', fontSize: 13 }}>
              <div>
                <span className="label ink">5 providers</span>
                <div style={{ marginTop: 4 }}>scanned in &lt; 3s</div>
              </div>
              <div>
                <span className="label ink">0 deps</span>
                <div style={{ marginTop: 4 }}>on your runtime</div>
              </div>
              <div>
                <span className="label ink">CI-native</span>
                <div style={{ marginTop: 4 }}>exit codes, JSON out</div>
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

const STEPS = [
  {
    n: '01',
    title: 'Connect your OpenAPI spec',
    body: 'Point us at your spec — a URL or a file. We read every endpoint, method, and required parameter your API actually exposes.',
  },
  {
    n: '02',
    title: 'Connect your integrations',
    body: 'Add your Make app (read-only token, stored encrypted) or your n8n node repo. We parse what each one actually calls — not version numbers, the real requests.',
  },
  {
    n: '03',
    title: 'See drift the moment it appears',
    body: 'Every removed endpoint, renamed param, or auth change surfaces in your dashboard — deduped, severity-ranked, and tied to the exact module that breaks.',
  },
];

function Install() {
  return (
    <section className="s" id="how" style={{ background: 'var(--bg)' }}>
      <div className="wrap">
        <div className="section-head">
          <div>
            <span className="label accent">§ 03 · how it works</span>
            <h2>Connect once. We watch the seam.</h2>
          </div>
          <p className="lede" style={{ maxWidth: '44ch' }}>
            Your API evolves on one side, your Make and n8n integrations on the other.
            <b> drift/ci sits in the middle</b> and tells you the instant they stop agreeing.
          </p>
        </div>

        <div className="how-grid">
          {STEPS.map((s) => (
            <div className="how-step" key={s.n}>
              <span className="how-num">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 40, display: 'flex', justifyContent: 'center' }}>
          <a className="btn btn-primary" href="/signup">
            Start monitoring your integrations →
          </a>
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
              © 2026 drift/ci. Built for engineers who don&apos;t want to hear about it from a customer first.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 64, flexWrap: 'wrap' }}>
            <div className="col">
              <h5>Product</h5>
              <a href="#why">Why</a>
              <a href="#detects">Detection</a>
              <a href="#faq">FAQ</a>
            </div>
            <div className="col">
              <h5>Account</h5>
              <a href="/login">Log in</a>
              <a href="/signup">Sign up</a>
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
