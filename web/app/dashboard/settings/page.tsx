import { headers } from 'next/headers';
import { requireUser } from '@/lib/session';
import { getApiKey } from '../actions';
import { DashboardHeader } from '../../components/DashboardHeader';
import { ApiKeyPanel } from '../../components/ApiKeyPanel';

export default async function SettingsPage() {
  const user = await requireUser();
  const apiKey = await getApiKey();
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const mcpUrl = `${proto}://${host}/api/mcp`;

  return (
    <div className="min-h-screen">
      <DashboardHeader email={user.email} />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <a href="/dashboard" className="text-sm" style={{ color: 'var(--ink-mute)' }}>
          ← Projects
        </a>
        <h1 className="mt-3 mb-6 text-xl font-semibold tracking-tight">Settings</h1>
        <ApiKeyPanel initialKey={apiKey} mcpUrl={mcpUrl} />
      </main>
    </div>
  );
}
