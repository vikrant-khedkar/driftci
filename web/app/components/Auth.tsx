'use client';

export function AuthShell({
  title,
  children,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  footer: { text: string; href: string; label: string };
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <a href="/" className="mb-8 text-xl font-semibold">
        drift<span style={{ color: 'var(--accent)' }}>/</span>ci
      </a>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{title}</h1>
      {children}
      <p className="mt-6 text-sm" style={{ color: 'var(--ink-mute)' }}>
        {footer.text}{' '}
        <a href={footer.href} className="font-medium underline">
          {footer.label}
        </a>
      </p>
    </main>
  );
}

export function AuthInput({
  type,
  placeholder,
  value,
  onChange,
}: {
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
      className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-neutral-900"
      style={{ borderColor: 'var(--border-strong)', background: 'var(--bg)' }}
    />
  );
}

export function AuthButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      style={{ background: 'var(--ink)' }}
    >
      {loading ? 'Working…' : children}
    </button>
  );
}
