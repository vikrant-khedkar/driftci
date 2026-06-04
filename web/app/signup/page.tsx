'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signupAction } from '../auth-actions';
import { AuthShell, AuthInput, AuthButton } from '../components/Auth';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await signupAction(name, email, password);
    setLoading(false);
    if (!res.ok) setError(res.error);
    else router.push('/dashboard');
  }

  return (
    <AuthShell
      title="Create your account"
      footer={{ text: 'Already have one?', href: '/login', label: 'Sign in' }}
    >
      <form onSubmit={submit} className="space-y-3">
        <AuthInput type="text" placeholder="Name" value={name} onChange={setName} />
        <AuthInput type="email" placeholder="you@company.com" value={email} onChange={setEmail} />
        <AuthInput
          type="password"
          placeholder="Password (min 8 chars)"
          value={password}
          onChange={setPassword}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <AuthButton loading={loading}>Create account</AuthButton>
      </form>
    </AuthShell>
  );
}
