'use client';
import { FormEvent,useEffect,useState } from 'react';
import { useParams,useSearchParams } from 'next/navigation';
type Session={id:string;title:string;event_date:string;status:string};
type Confirmation={name:string;session:string;status:string;alreadyRecorded:boolean};
export default function PublicCheckIn(){
 const params=useParams(),searchParams=useSearchParams(),eventId=String(params.eventId||''),qrToken=searchParams.get('qr')||'';
 const [session,setSession]=useState<Session|null>(null),[phone,setPhone]=useState(''),[pin,setPin]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<Confirmation|null>(null),[expired,setExpired]=useState(false);
 useEffect(()=>{fetch('/api/public-check-in?eventId='+encodeURIComponent(eventId),{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('Session unavailable.');return r.json();}).then(d=>setSession(d)).catch(()=>setError('Session unavailable. Ask an administrator for a current QR code.'));},[eventId]);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError('');
  try{
   const response=await fetch('/api/public-check-in',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId,qrToken,phone,pin})});
   const data=await response.json();
   if(!response.ok){if(data.error==='QR_EXPIRED'){setExpired(true);throw Error('This QR code has expired. Scan the latest code on the venue screen.');}throw Error(data.message||data.error||'Could not check in.');}
   setPin('');setResult(data);
  }catch(e){setError(e instanceof Error?e.message:'Unable to check in.');}finally{setBusy(false);}
 }
 return <main className="auth-shell"><section className="auth-card">
 <div className="auth-brand"><div className="brand-mark">FOP</div><div><p className="eyebrow">Festival of Praise</p><h1>Attendance check-in</h1></div></div>
 {session&&<div><h2>{session.title}</h2><p className="auth-intro">{session.event_date} · {session.status==='open'?'Check-in open':'Check-in closed'}</p></div>}
 {result?<div role="status"><h2>{result.alreadyRecorded?'Already checked in':'You are checked in!'}</h2><p>{result.name}, your attendance for {result.session} is recorded as {result.status}.</p><p className="muted">You can close this page.</p></div>:<>
 <p className="auth-intro">Enter your registered phone number and the six-digit PIN given to you privately by an FOP administrator. No email or account creation is required.</p>
 {error&&<p className="notice error-notice" role="alert">{error}</p>}
 {expired?<p className="auth-intro">Scan the current QR code at the venue to try again.</p>:<form className="auth-form" onSubmit={submit}>
 <div className="field-group"><label htmlFor="member-phone">Registered phone number</label><input id="member-phone" type="tel" autoComplete="tel" required value={phone} onChange={e=>setPhone(e.target.value)} placeholder="e.g. 07123 456789"/></div>
 <div className="field-group"><label htmlFor="member-pin">Personal six-digit PIN</label><input id="member-pin" type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={pin} onChange={e=>setPin(e.target.value)}/></div>
 <button className="primary-button full-width" disabled={busy||!session||session.status!=='open'||!qrToken}>{busy?'Recording…':'Confirm attendance'}</button>
 </form>}
 <p className="auth-footnote">Do not share your PIN. If you do not have one, or have forgotten it, ask a Super Admin to assign or reset it.</p>
 </>}
 </section></main>;
}
