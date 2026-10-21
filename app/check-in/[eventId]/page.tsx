'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';

type Session = { id: string; title: string; event_date: string; status: string };
type Confirmation = { name: string; session: string; status: string; alreadyRecorded: boolean };

export default function PublicCheckIn() {
  const params = useParams();
  const searchParams = useSearchParams();
  const qrToken = searchParams.get('qr') || '';
  const eventId = String(params.eventId || '');
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email'|'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Confirmation | null>(null);
  const [needsFreshQr,setNeedsFreshQr]=useState(false);
  const [returningEmail,setReturningEmail]=useState<string|null>(null);

  useEffect(() => {
    fetch('/api/public-check-in?eventId=' + encodeURIComponent(eventId), { cache: 'no-store' })
      .then(async response => { if (!response.ok) throw new Error('Session not found.'); return response.json(); })
      .then(data => setSession(data as Session))
      .catch(() => setError('Session not found. Please ask an administrator for a current QR code.'));
  }, [eventId]);

  async function completeCheckIn(accessToken: string) {
    const response = await fetch('/api/public-check-in', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ eventId, qrToken }) });
    const body = await response.json();
    if (!response.ok) {
      if (body.error === 'QR_EXPIRED') { setNeedsFreshQr(true); return; }
      throw new Error(body.message || body.error || 'Unable to check in.');
    }
    setNeedsFreshQr(false);
    setResult(body as Confirmation);
    // Keep the verified attendee session on this device for future QR check-ins.
  }

  useEffect(() => {
    if (!qrToken) return;
    const s=createSupabaseClient();
    if (!s) return;
    let cancelled=false;
    void s.auth.getSession().then(async ({data})=>{
      if(cancelled || !data.session) return;
      setReturningEmail(data.session.user.email || null);
      setBusy(true);
      setReturningEmail(data.session.user.email || null);
    try { await completeCheckIn(data.session.access_token); }
      catch(e){ if(!cancelled)setError(e instanceof Error?e.message:'Unable to check in.'); }
      finally { if(!cancelled)setBusy(false); }
    });
    return ()=>{cancelled=true;};
  },[eventId,qrToken]);

  async function sendCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError('');
    if(!qrToken){setBusy(false);setError('Scan the current QR code displayed at the venue.');return;}
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
    try { await completeCheckIn(data.session.access_token); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to check in.'); }
    finally { setBusy(false); }
  }

  return <main className="auth-shell"><section className="auth-card">
    <div className="auth-brand"><div className="brand-mark">FOP</div><div><p className="eyebrow">Festival of Praise</p><h1>Attendance check-in</h1></div></div>
    {session && <div><h2>{session.title}</h2><p className="auth-intro">{session.event_date} · {session.status === 'open' ? 'Check-in open' : 'Check-in closed'}</p></div>}
    {needsFreshQr&&!result&&<div className="notice" role="status"><strong>Scan the live QR code again.</strong> Your email is verified, but the QR code expired while you were checking your email. Scan the code currently displayed at the entrance to finish check-in. You will not need another email code.</div>}
    {result ? <div role="status"><h2>{result.alreadyRecorded ? 'Already checked in' : 'You are checked in!'}</h2><p>{result.name}, your attendance for {result.session} is recorded as {result.status}.</p><p className="muted">You can close this page.</p></div> : <>
      <p className="auth-intro">First visit? Verify your registered email once. On this device, future QR scans can check you in automatically while your secure sign-in remains active.</p>
      {returningEmail&&<p className="muted">Signed in as {returningEmail}. {busy?'Checking you in…':'If this is not your email, switch accounts below.'}</p>}
      {returningEmail&&<button className="secondary-button full-width" type="button" disabled={busy} onClick={async()=>{const s=createSupabaseClient();if(s)await s.auth.signOut();setReturningEmail(null);setStep('email');setNeedsFreshQr(false);setError('');}}>Use a different member account</button>}
      {error && <p className="notice error-notice" role="alert">{error}</p>}
      {needsFreshQr ? <p className="auth-intro">Waiting for a fresh QR scan…</p> : returningEmail ? <p className="auth-intro">{busy?'Verifying your QR code…':'If check-in did not complete, scan the current QR code again.'}</p> : step === 'email' ? <form className="auth-form" onSubmit={sendCode}><div className="field-group"><label htmlFor="attendee-email">Registered email address</label><input id="attendee-email" type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} /></div><button className="primary-button full-width" disabled={busy || !session || session.status !== 'open'}>{busy ? 'Sending…' : 'Send verification code'}</button></form>
      : <form className="auth-form" onSubmit={verify}><p className="muted">Enter the code sent to {email}.</p><div className="field-group"><label htmlFor="otp-code">Email verification code</label><input id="otp-code" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={e=>setCode(e.target.value)} /></div><button className="primary-button full-width" disabled={busy}>{busy ? 'Recording…' : 'Confirm attendance'}</button><button className="secondary-button full-width" type="button" onClick={()=>{setStep('email');setCode('');}}>Use a different email</button></form>}
      <p className="auth-footnote">Use a private device only. If you share your phone, sign out using “Use a different member account” when finished. Can&apos;t access your registered email? Ask an attendance administrator.</p>
    </>}
  </section></main>;
}
