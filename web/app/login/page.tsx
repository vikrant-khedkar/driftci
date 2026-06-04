'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction } from '../auth-actions';
import { AuthShell, AuthInput, AuthButton } from '../components/Auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await loginAction(email, password);
    setLoading(false);
    if (!res.ok) setError(res.error);
    else router.push('/dashboard');
  }

  return (
    <AuthShell title="Sign in to drift/ci" footer={{ text: 'No account?', href: '/signup', label: 'Create one' }}>
      <form onSubmit={submit} className="space-y-3">
        <AuthInput type="email" placeholder="you@company.com" value={email} onChange={setEmail} />
        <AuthInput type="password" placeholder="Password" value={password} onChange={setPassword} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <AuthButton loading={loading}>Sign in</AuthButton>
      </form>
    </AuthShell>
  );
}
