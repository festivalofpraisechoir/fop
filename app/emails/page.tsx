'use client';
import {useEffect,useMemo,useState} from 'react';
import {createSupabaseClient} from '@/lib/supabase';
type Recipient={email:string;group:string;part:string};
export default function EmailsPage(){
 const [recipients,setRecipients]=useState<Recipient[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [filter,setFilter]=useState('All');
 const [subject,setSubject]=useState('');
 const [message,setMessage]=useState('');
 const [preview,setPreview]=useState(false);
 const groups=useMemo(()=>['All','Singer','Musician',...Array.from(new Set(recipients.map(r=>r.part).filter(Boolean))).sort()], [recipients]);
 const selected=useMemo(()=>recipients.filter(r=>filter==='All'||r.group===filter||r.part===filter),[recipients,filter]);
 useEffect(()=>{let active=true;(async()=>{try{const supabase=createSupabaseClient();if(!supabase)throw Error('Sign in required.');const {data}=await supabase.auth.getSession();const token=data.session?.access_token;if(!token)throw Error('Sign in required.');const response=await fetch('/api/emails/recipients',{headers:{Authorization:'Bearer '+token},cache:'no-store'});const body=await response.json();if(!response.ok)throw Error(body.error||'Could not load recipients.');if(active)setRecipients(body.recipients);}catch(e){if(active)setError(e instanceof Error?e.message:'Could not load recipients.');}finally{if(active)setLoading(false);}})();return()=>{active=false};},[]);
 return <div className="page-shell">
 <header className="page-header"><div><p className="eyebrow">Festival of Praise / Communications</p><h1>Email communications</h1><p className="page-description">Prepare an email to registered choir members. Sending will be enabled after secure Gmail authorisation is configured.</p></div></header>
 <section className="panel-card"><div className="panel-header"><h2>Compose email</h2></div>
 {error&&<p className="notice error-notice" role="alert">{error}</p>}
 <p className="muted"><strong>From:</strong> festivalofpraisechoir@gmail.com</p>
 <div className="contact-form">
 <div className="field-group"><label htmlFor="recipient-filter">Recipients</label><select id="recipient-filter" value={filter} onChange={e=>setFilter(e.target.value)}>{groups.map(g=><option key={g} value={g}>{g==='All'?'All registered members':g}</option>)}</select><p className="muted">{loading?'Loading recipients…':selected.length+' unique valid email addresses selected. Duplicate addresses are excluded.'}</p></div>
 <div className="field-group"><label htmlFor="email-subject">Subject</label><input id="email-subject" value={subject} maxLength={180} onChange={e=>setSubject(e.target.value)} placeholder="Festival of Praise announcement"/></div>
 <div className="field-group"><label htmlFor="email-body">Message</label><textarea id="email-body" rows={12} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Dear FOP Choir Member, ..."/></div>
 <div className="form-actions"><button type="button" className="secondary-button" onClick={()=>setPreview(!preview)} disabled={!subject.trim()||!message.trim()}>{preview?'Hide preview':'Preview email'}</button><button type="button" className="primary-button" disabled title="Secure Gmail connection must be configured first">Sending not yet connected</button></div>
 </div></section>
 {preview&&<section className="panel-card"><h2>Email preview</h2><p className="muted">To: {selected.length} individual recipients (addresses hidden from each other)</p><h3>{subject}</h3><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{message}</p><p className="muted">This is a preview only. No email has been sent.</p></section>}
 <section className="panel-card"><h2>Connection required</h2><p>To send from <strong>festivalofpraisechoir@gmail.com</strong>, the account owner must authorise the Gmail connection. We will not request or store the Gmail password. Mass sending will remain disabled until the connection and delivery safeguards are configured and tested.</p></section>
 </div>;
}
