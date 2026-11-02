'use client';
import {useEffect,useMemo,useState} from 'react';
import {createSupabaseClient,type ContactRecord} from '@/lib/supabase';

type Status='not_invited'|'invited'|'joined';
type Entry={contact_id:string;status:Status};
const csvEscape=(value:string)=>'"'+value.replace(/"/g,'""')+'"';
export default function WhatsAppPage(){
 const [contacts,setContacts]=useState<ContactRecord[]>([]);
 const [eligible,setEligible]=useState<Set<string>>(new Set());
 const [statuses,setStatuses]=useState<Record<string,Status>>({});
 const [kind,setKind]=useState('All');
 const [subgroup,setSubgroup]=useState('All');
 const [search,setSearch]=useState('');
 const [statusFilter,setStatusFilter]=useState('All');
 const [busy,setBusy]=useState(true);
 const [saving,setSaving]=useState<string|null>(null);
 const [notice,setNotice]=useState('');
 const [inviteLink,setInviteLink]=useState('');
 useEffect(()=>{void load();},[]);
 async function load(){
  const s=createSupabaseClient();if(!s){setNotice('Supabase is not configured.');setBusy(false);return;}
  setBusy(true);
  const [people,events,attendance,invites]=await Promise.all([
   s.from('contacts').select('*').order('full_name').limit(3000),
   s.from('attendance_events').select('id').eq('type','Rehearsal').limit(3000),
   s.from('attendance_records').select('contact_id,event_id,status').in('status',['Present','Permission']).limit(10000),
   s.from('whatsapp_invitations').select('contact_id,status').limit(3000)
  ]);
  if(people.error||events.error||attendance.error||invites.error){setNotice([people.error?.message,events.error?.message,attendance.error?.message,invites.error?.message].filter(Boolean).join('; '));setBusy(false);return;}
  const ids=new Set((events.data||[]).map(e=>e.id));
  setEligible(new Set((attendance.data||[]).filter(r=>ids.has(r.event_id)).map(r=>r.contact_id)));
  setContacts((people.data||[]) as ContactRecord[]);
  setStatuses(Object.fromEntries(((invites.data||[]) as Entry[]).map(r=>[r.contact_id,r.status])));
  setBusy(false);
 }
 const members=useMemo(()=>contacts.filter(c=>eligible.has(c.id)),[contacts,eligible]);
 const parts=useMemo(()=>Array.from(new Set(members.filter(c=>kind==='All'||c.singer_or_musician===kind).map(c=>c.part_or_instrument).filter((p):p is string=>!!p))).sort(),[members,kind]);
 const filtered=useMemo(()=>members.filter(c=>(kind==='All'||c.singer_or_musician===kind)&&(subgroup==='All'||c.part_or_instrument===subgroup)&&(statusFilter==='All'||(statuses[c.id]||'not_invited')===statusFilter)&&[c.full_name,c.phone_number,c.part_or_instrument].some(v=>(v||'').toLowerCase().includes(search.toLowerCase()))),[members,kind,subgroup,statusFilter,statuses,search]);
 async function updateStatus(id:string,status:Status){
  const s=createSupabaseClient();if(!s)return;setSaving(id);setNotice('');
  const {error}=await s.from('whatsapp_invitations').upsert({contact_id:id,status,updated_at:new Date().toISOString()},{onConflict:'contact_id'});
  if(error)setNotice('Could not save invitation status: '+error.message);
  else setStatuses(prev=>({...prev,[id]:status}));
  setSaving(null);
 }
 function exportCsv(){
  const rows=[['Name','Phone','Category','Part / Instrument','Invitation Status'],...filtered.map(c=>[c.full_name,c.phone_number||'',c.singer_or_musician,c.part_or_instrument||'',statuses[c.id]||'not_invited'])];
  const csv='\uFEFF'+rows.map(r=>r.map(csvEscape).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='fop-whatsapp-eligible.csv';a.click();URL.revokeObjectURL(url);
 }
 async function copyNumbers(){
  try{await navigator.clipboard.writeText(filtered.map(c=>c.phone_number).filter(Boolean).join('\n'));setNotice('Copied '+filtered.filter(c=>c.phone_number).length+' phone numbers.');}
  catch{setNotice('Clipboard unavailable. Use Export CSV instead.');}
 }
 return <div className="page-content" style={{padding:'24px',maxWidth:1200}}>
  <h1>WhatsApp Community</h1>
  <p>Only members marked <strong>Present</strong> or <strong>Permission</strong> at least once in a rehearsal are eligible. No messages are sent and no one is added automatically.</p>
  {notice&&<p role="status">{notice}</p>}
  <section className="card" style={{padding:20,marginBottom:20}}>
   <h2>Eligible members: {busy?'Loading…':members.length}</h2>
   <p>Singers: {members.filter(c=>c.singer_or_musician==='Singer').length} · Musicians: {members.filter(c=>c.singer_or_musician==='Musician').length} · Invited: {members.filter(c=>statuses[c.id]==='invited').length} · Joined: {members.filter(c=>statuses[c.id]==='joined').length}</p>
   <label htmlFor="community-link">WhatsApp Community invitation link (optional)</label>
   <input id="community-link" type="url" value={inviteLink} onChange={e=>setInviteLink(e.target.value)} placeholder="https://chat.whatsapp.com/..." style={{width:'100%',padding:10,margin:'8px 0'}}/>
   {inviteLink.startsWith('https://chat.whatsapp.com/')&&<button type="button" onClick={()=>void navigator.clipboard.writeText(inviteLink).then(()=>setNotice('Community invitation link copied.')).catch(()=>setNotice('Could not copy link.'))}>Copy invitation link</button>}
  </section>
  <section className="card" style={{padding:20}}>
   <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:16}}>
    <select aria-label="Member category" value={kind} onChange={e=>{setKind(e.target.value);setSubgroup('All');}}><option>All</option><option>Singer</option><option>Musician</option></select>
    <select aria-label="Voice part or instrument" value={subgroup} onChange={e=>setSubgroup(e.target.value)}><option>All</option>{parts.map(p=><option key={p}>{p}</option>)}</select>
    <select aria-label="Invitation status" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>All</option><option value="not_invited">Not invited</option><option value="invited">Invited</option><option value="joined">Joined</option></select>
    <input aria-label="Search members" placeholder="Search name or phone" value={search} onChange={e=>setSearch(e.target.value)}/>
    <button type="button" onClick={copyNumbers}>Copy numbers</button>
    <button type="button" onClick={exportCsv}>Export CSV</button>
    <button type="button" onClick={()=>void load()}>Refresh</button>
   </div>
   <p>Showing {filtered.length} eligible members. Export includes only the filtered members.</p>
   <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',textAlign:'left'}}>
    <thead><tr><th>Name</th><th>Phone</th><th>Category</th><th>Voice part / Instrument</th><th>Invitation status</th></tr></thead>
    <tbody>{filtered.map(c=><tr key={c.id} style={{borderTop:'1px solid #ddd'}}>
     <td style={{padding:'12px 8px'}}>{c.full_name}</td><td>{c.phone_number||'—'}</td><td>{c.singer_or_musician}</td><td>{c.part_or_instrument||'—'}</td>
     <td><select aria-label={'Invitation status for '+c.full_name} disabled={saving===c.id} value={statuses[c.id]||'not_invited'} onChange={e=>void updateStatus(c.id,e.target.value as Status)}><option value="not_invited">Not invited</option><option value="invited">Invited</option><option value="joined">Joined</option></select></td>
    </tr>)}</tbody>
   </table></div>
  </section>
 </div>;
}
