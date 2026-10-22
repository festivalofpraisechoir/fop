'use client';
import {useEffect,useMemo,useState} from 'react';
import {createSupabaseClient,type ContactRecord} from '@/lib/supabase';

export default function DistributionPage({kind}:{kind:'badge'|'letter'}){
 const badge=kind==='badge',field=badge?'badge_collected':'church_letter_submitted';
 const [contacts,setContacts]=useState<ContactRecord[]>([]);
 const [search,setSearch]=useState('');
 const [filter,setFilter]=useState<'All'|'Done'|'Pending'>('All');
 const [busy,setBusy]=useState<string|null>(null);
 const [message,setMessage]=useState('');
 const [loading,setLoading]=useState(true);
 async function load(){
  const s=createSupabaseClient();if(!s){setMessage('Database unavailable.');setLoading(false);return;}
  const {data,error}=await s.from('contacts').select('*').order('full_name');
  if(error)setMessage('Could not load members: '+error.message);
  else setContacts((data||[]) as ContactRecord[]);
  setLoading(false);
 }
 useEffect(()=>{void load();const id=setInterval(()=>{void load();},10000);return()=>clearInterval(id);},[]);
 const done=contacts.filter(c=>Boolean(c[field])).length;
 const filtered=useMemo(()=>contacts.filter(c=>(filter==='All'||(filter==='Done'?Boolean(c[field]):!c[field]))&&[c.full_name,c.email,c.phone_number,c.part_or_instrument,c.church_name].some(v=>v?.toLowerCase().includes(search.toLowerCase()))),[contacts,filter,search,field]);
 async function mark(c:ContactRecord){
  if(busy||c[field])return;
  const s=createSupabaseClient();if(!s)return;
  setBusy(c.id);setMessage('');
  try{
   const {data,error}=await s.from('contacts').update({[field]:true}).eq('id',c.id).eq(field,false).select('id').maybeSingle();
   if(error)throw new Error(error.message);
   await load();
   setMessage(data?c.full_name+(badge?' — badge collected.':' — letter received.'):'Already recorded by another admin. List refreshed.');
  }catch(e){setMessage(e instanceof Error?e.message:'Save failed. Please retry.');}
  finally{setBusy(null);}
 }
 return <div className="page-shell">
  <header className="page-header"><div><p className="eyebrow">Member distribution</p><h1>{badge?'Badge collection':'Church letters'}</h1><p className="page-description">{badge?'Record who has received their badge.':'Record whose church letter has been received.'} Changes are shared between admins.</p></div><button className="secondary-button" onClick={()=>void load()}>Refresh</button></header>
  {message&&<p className="notice" role="status">{message}</p>}
  <section className="panel-card"><div className="inline-actions">
  {(['All','Done','Pending'] as const).map(f=><button key={f} type="button" className={filter===f?'primary-button':'secondary-button'} onClick={()=>setFilter(f)}>{f==='All'?'All members':f==='Done'?(badge?'Collected':'Received'):(badge?'Not collected':'Outstanding')} ({f==='All'?contacts.length:f==='Done'?done:contacts.length-done})</button>)}
  </div></section>
  <section className="panel-card"><div className="toolbar-row"><div><h2>Members <span className="count-label">{filtered.length}</span></h2><p className="muted">Search by name, email, phone, church or part.</p></div><input className="search-input" aria-label="Search members" placeholder="Search members" value={search} onChange={e=>setSearch(e.target.value)}/></div>
  <div className="table-wrap"><table><thead><tr><th>Name</th><th>Type</th><th>Part / instrument</th><th>Church</th><th>Status</th><th>Action</th></tr></thead><tbody>{filtered.map(c=><tr key={c.id}><td><strong>{c.full_name}</strong><small className="table-subtext">{c.email||c.phone_number||''}</small></td><td>{c.singer_or_musician}</td><td>{c.part_or_instrument||'—'}</td><td>{c.church_name||'—'}</td><td><span className={`status-pill ${c[field]?'success':'neutral'}`}>{c[field]?(badge?'Collected':'Received'):(badge?'Not collected':'Outstanding')}</span></td><td>{!c[field]&&<button className="table-action" disabled={busy!==null} onClick={()=>void mark(c)}>{busy===c.id?'Saving…':badge?'Mark collected':'Mark received'}</button>}</td></tr>)}</tbody></table>{!filtered.length&&<div className="empty-state">{loading?'Loading…':'No matching members.'}</div>}</div></section>
 </div>;
}
