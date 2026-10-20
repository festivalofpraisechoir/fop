'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseClient } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [nextPath, setNextPath] = useState('/dashboard');
  const [setupMissing, setSetupMissing] = useState(false);
  useEffect(() => { const query = new URLSearchParams(window.location.search); setNextPath(query.get('next') || '/dashboard'); setSetupMissing(query.get('setup') === 'supabase'); }, []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const supabase = createSupabaseClient();
    if (!supabase) {
      setError('The app is not connected to Supabase yet. Add the public Supabase URL and anon key to the deployment environment.');
      return;
    }
    setBusy(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (signInError) {
      setError('We could not sign you in with those details. Check your email and password or contact the Super Admin.');
      return;
    }
    router.replace(nextPath);
    router.refresh();
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-brand">
          <div className="brand-mark">FOP</div>
          <div><p className="eyebrow">Festival of Praise</p><h1 id="login-title">Attendance portal</h1></div>
        </div>
        <p className="auth-intro">Sign in with your authorised team account to continue.</p>
        {setupMissing && <p className="notice error-notice">Supabase environment variables are missing. Configure them in Vercel before signing in.</p>}
        {error && <p className="notice error-notice" role="alert">{error}</p>}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field-group"><label htmlFor="email">Email address</label><input id="email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required /></div>
          <div className="field-group"><label htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
          <div className="auth-meta"><span>Restricted access</span><Link href="/reset-password">Forgot password?</Link></div>
          <button className="primary-button full-width" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in securely'}</button>
        </form>
        <p className="auth-footnote">Access is limited to authorised Festival of Praise team members.</p>
      </section>
    </main>
  );
}
