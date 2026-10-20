'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { createSupabaseClient } from '@/lib/supabase';

export default function ResetPasswordPage(){
 const [email,setEmail]=useState('');const [message,setMessage]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setError('');setMessage('');const s=createSupabaseClient();if(!s){setError('Supabase is not configured yet.');return;}setBusy(true);const {error}=await s.auth.resetPasswordForEmail(email.trim(),{redirectTo:`${window.location.origin}/reset-password/update`});setBusy(false);if(error){setError('We could not send a reset email. Check the address and Supabase Auth email settings.');return;}setMessage('If this address belongs to an authorised account, a password reset email will be sent. Check your inbox.');}
 return <main className="auth-shell"><section className="auth-card"><div className="auth-brand"><div className="brand-mark">FOP</div><div><p className="eyebrow">Festival of Praise</p><h1>Reset password</h1></div></div><p className="auth-intro">Enter the email address associated with your authorised team account.</p>{error&&<p className="notice error-notice" role="alert">{error}</p>}{message&&<p className="notice" role="status">{message}</p>}<form className="auth-form" onSubmit={submit}><div className="field-group"><label htmlFor="reset-email">Email address</label><input id="reset-email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></div><button className="primary-button full-width" disabled={busy}>{busy?'Sending…':'Send reset link'}</button></form><p className="auth-footnote"><Link href="/login">Return to sign in</Link></p></section></main>;
}
