'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';

type Session = { id: string; title: string; event_date: string; status: string };
type Confirmation = { name: string; session: string; status: string; alreadyRecorded: boolean };

export default function PublicCheckIn() {
  const params = useParams();
  const eventId = String(params.eventId || '');
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email'|'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Confirmation | null>(null);

  useEffect(() => {
    const supabase = createSupabaseClient();
    if (!supabase) { setError('Attendance check-in is temporarily unavailable.'); return; }
    supabase.from('attendance_events').select('id,title,event_date,status').eq('id',eventId).maybeSingle().then(({ data, error }) => {
      if (error || !data) setError('Session not found. Please ask an administrator for a current QR code.');
      else setSession(data as Session);
    });
  }, [eventId]);

  async function sendCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError('');
    const supabase = createSupabaseClient();
    if (!supabase) { setError('Check-in is unavailable.'); setBusy(false); return; }
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) setError('We could not send a verification code. Please ask an administrator for help.');
    else setStep('code');
  }

  async function verify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError('');
    const supabase = createSupabaseClient();
    if (!supabase) { setBusy(false); setError('Check-in is unavailable.'); return; }
    const { data, error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' });
    if (error || !data.session) { setBusy(false); setError('Invalid or expired code. Check your email and try again.'); return; }
    try {
      const response = await fetch('/api/public-check-in', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ eventId }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to check in.');
      setResult(body as Confirmation);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to check in.'); }
    finally { setBusy(false); await supabase.auth.signOut(); }
  }

  return <main className="auth-shell"><section className="auth-card">
    <div className="auth-brand"><div className="brand-mark">FOP</div><div><p className="eyebrow">Festival of Praise</p><h1>Attendance check-in</h1></div></div>
    {session && <div><h2>{session.title}</h2><p className="auth-intro">{session.event_date} · {session.status === 'open' ? 'Check-in open' : 'Check-in closed'}</p></div>}
    {result ? <div role="status"><h2>{result.alreadyRecorded ? 'Already checked in' : 'You are checked in!'}</h2><p>{result.name}, your attendance for {result.session} is recorded as {result.status}.</p><p className="muted">You can close this page.</p></div> : <>
      <p className="auth-intro">Use the email address you registered with. We will send a one-time verification code to confirm it is you.</p>
      {error && <p className="notice error-notice" role="alert">{error}</p>}
      {step === 'email' ? <form className="auth-form" onSubmit={sendCode}><div className="field-group"><label htmlFor="attendee-email">Registered email address</label><input id="attendee-email" type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} /></div><button className="primary-button full-width" disabled={busy || !session || session.status !== 'open'}>{busy ? 'Sending…' : 'Send verification code'}</button></form>
      : <form className="auth-form" onSubmit={verify}><p className="muted">Enter the code sent to {email}.</p><div className="field-group"><label htmlFor="otp-code">Email verification code</label><input id="otp-code" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={e=>setCode(e.target.value)} /></div><button className="primary-button full-width" disabled={busy}>{busy ? 'Recording…' : 'Confirm attendance'}</button><button className="secondary-button full-width" type="button" onClick={()=>{setStep('email');setCode('');}}>Use a different email</button></form>}
      <p className="auth-footnote">Can't access your registered email? Ask an attendance administrator to check you in.</p>
    </>}
  </section></main>;
}
