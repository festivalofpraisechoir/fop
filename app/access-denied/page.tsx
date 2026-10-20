'use client';

import { createSupabaseClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AccessDeniedPage(){
  const router=useRouter();
  async function signOut(){const s=createSupabaseClient();if(s)await s.auth.signOut();router.replace('/login');router.refresh();}
  return <main className="auth-shell"><section className="auth-card"><div className="auth-brand"><div className="brand-mark">FOP</div><div><p className="eyebrow">Festival of Praise</p><h1>Access not assigned</h1></div></div><p className="auth-intro">Your account is signed in, but it has not been assigned an authorised FOP role. Ask the Super Admin to assign your role before using the attendance portal.</p><button className="primary-button full-width" onClick={signOut}>Sign out</button></section></main>;
}
