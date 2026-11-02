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
 const [selected,setSelected]=useState<string[]>([]);
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
 const singers=members.filter(c=>c.singer_or_musician==='Singer').length;
 const musicians=members.filter(c=>c.singer_or_musician==='Musician').length;
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
 async function markSelected(){if(!selected.length){setNotice('Select members first.');return;}const s=createSupabaseClient();if(!s)return;setSaving('bulk');setNotice('');const {error}=await s.from('whatsapp_invitations').upsert(selected.map(id=>({contact_id:id,status:'invited' as Status,updated_at:new Date().toISOString()})),{onConflict:'contact_id'});if(error)setNotice('Could not save bulk invitation status: '+error.message);else{setStatuses(prev=>({...prev,...Object.fromEntries(selected.map(id=>[id,'invited' as Status]))}));setNotice(selected.length+' members marked as invited. No WhatsApp messages were sent.');setSelected([]);}setSaving(null);}
 const panel:React.CSSProperties={background:'#fff',border:'1px solid #e8e1ed',borderRadius:18,padding:22,boxShadow:'0 4px 18px rgba(43,12,65,.045)'};
 const btn:React.CSSProperties={border:'1px solid #652884',borderRadius:10,padding:'11px 15px',background:'#fff',color:'#55206f',fontWeight:700,cursor:'pointer'};
 const field:React.CSSProperties={border:'1px solid #dcd4e3',borderRadius:10,padding:'11px 12px',background:'#fff',minWidth:0};
 return <div style={{maxWidth:1360,margin:'0 auto',padding:'clamp(16px,3vw,36px)',color:'#24142e'}}>
 <style>{`@media(max-width:800px){.wa-two{grid-template-columns:1fr!important}.wa-stats{grid-template-columns:repeat(2,minmax(0,1fr))!important}.wa-table{min-width:820px}} .wa-tab:hover{background:#f7effb!important} .wa-action:hover{background:#f5eafa!important}`}</style>
 <header style={{display:'flex',alignItems:'center',gap:15,marginBottom:22,flexWrap:'wrap'}}>
 <div style={{height:56,width:56,borderRadius:17,background:'#e1f8e9',color:'#16833b',display:'grid',placeItems:'center',fontSize:30}}>✆</div>
 <div><h1 style={{fontSize:'clamp(26px,3vw,36px)',margin:0,fontWeight:800}}>WhatsApp Community</h1><p style={{margin:'5px 0 0',color:'#6a5972'}}>Manage invitations to the Festival of Praise WhatsApp Community</p></div></header>
 <section style={{borderRadius:18,background:'linear-gradient(105deg,#341047,#60247c 70%,#81469b)',color:'#fff',padding:'clamp(22px,4vw,38px)',marginBottom:20,position:'relative',overflow:'hidden'}}>
 <div style={{position:'absolute',right:24,top:-30,fontSize:180,opacity:.12,pointerEvents:'none'}}>♫</div>
 <h2 style={{fontSize:'clamp(24px,3vw,34px)',margin:'0 0 10px',maxWidth:500}}>Festival of Praise<br/>WhatsApp Community</h2>
 <p style={{margin:0,maxWidth:550,lineHeight:1.6,color:'#f5e8ff'}}>Keep our singers and musicians connected with rehearsal updates, announcements and key information.</p>
 </section>
 {notice&&<p role="status" style={{background:'#fff7e8',padding:13,borderRadius:10,marginBottom:16}}>{notice}</p>}
 <section className="wa-stats" style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:12,marginBottom:20}}>
 {([{label:'Eligible Members',value:members.length,icon:'♙',bg:'#f1e5fb',color:'#62258a'},{label:'Singers',value:singers,icon:'🎤',bg:'#fbe6f3',color:'#9b236b'},{label:'Musicians',value:musicians,icon:'♫',bg:'#e5efff',color:'#1b5eb6'},{label:'Invited',value:members.filter(c=>statuses[c.id]==='invited').length,icon:'➤',bg:'#fff2df',color:'#b77c17'},{label:'Joined',value:members.filter(c=>statuses[c.id]==='joined').length,icon:'✓',bg:'#e3f6e8',color:'#168139'}] as const).map(item=><div key={item.label} style={{background:item.bg,borderRadius:15,padding:'19px 12px',display:'flex',alignItems:'center',gap:12,minWidth:0}}><span style={{fontSize:27,color:item.color}}>{item.icon}</span><div><strong style={{fontSize:29,display:'block',lineHeight:1.1}}>{busy?'…':item.value}</strong><span style={{fontSize:12,fontWeight:650}}>{item.label}</span></div></div>)}
 </section>
 <section className="wa-two" style={{display:'grid',gridTemplateColumns:'1.15fr 1fr',gap:18,marginBottom:24}}>
 <div style={panel}><h2 style={{fontSize:20,margin:'0 0 6px'}}>🔗 Community Invitation Link</h2><p style={{color:'#71667b',margin:'0 0 17px'}}>Share this link with eligible members to join the Community.</p>
 <input aria-label="WhatsApp Community invitation link" type="url" value={inviteLink} onChange={e=>setInviteLink(e.target.value)} placeholder="https://chat.whatsapp.com/..." style={{...field,width:'100%',boxSizing:'border-box',marginBottom:12}}/>
 <div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button style={{...btn,background:'#662889',color:'#fff'}} onClick={()=>void navigator.clipboard.writeText(inviteLink).then(()=>setNotice('Invitation link copied.')).catch(()=>setNotice('Could not copy link.'))} disabled={!inviteLink.startsWith('https://chat.whatsapp.com/')}>Copy Link</button>
 {inviteLink.startsWith('https://chat.whatsapp.com/')&&<a href={inviteLink} target="_blank" rel="noopener noreferrer" style={{...btn,textDecoration:'none'}}>Open in WhatsApp ↗</a>}</div>
 </div>
 <div style={panel}><h2 style={{fontSize:20,margin:'0 0 6px'}}>▤ Bulk Actions</h2><p style={{color:'#71667b',margin:'0 0 17px'}}>Manage contacts for invitations.</p>
 <div style={{display:'grid',gap:9}}><button className="wa-action" style={btn} onClick={()=>void copyNumbers()}>Copy Phone Numbers</button><button className="wa-action" style={btn} onClick={exportCsv}>Export Contacts (CSV)</button><button className="wa-action" style={btn} onClick={()=>void markSelected()} disabled={!selected.length||saving==='bulk'}>Mark Selected as Invited {selected.length? '('+selected.length+')':''}</button></div></div>
 </section>
 <section style={panel}>
 <div style={{display:'flex',borderBottom:'1px solid #e8e1ed',gap:8,flexWrap:'wrap',marginBottom:16}}>
 {([{id:'All',label:'All Eligible',count:members.length},{id:'Singer',label:'Singers',count:singers},{id:'Musician',label:'Musicians',count:musicians}] as const).map(tab=><button className="wa-tab" key={tab.id} onClick={()=>{setKind(tab.id);setSubgroup('All');setSelected([]);}} style={{border:'none',borderBottom:kind===tab.id?'3px solid #652884':'3px solid transparent',background:'transparent',color:kind===tab.id?'#5b217b':'#51445a',fontWeight:kind===tab.id?800:600,padding:'12px 16px',cursor:'pointer'}}>{tab.label} ({busy?'…':tab.count})</button>)}
 </div>
 <div style={{display:'flex',flexWrap:'wrap',gap:10,marginBottom:15}}>
 <input aria-label="Search members" placeholder="⌕ Search by name or phone…" value={search} onChange={e=>setSearch(e.target.value)} style={{...field,flex:'2 1 200px'}}/>
 <select aria-label="Voice part or instrument" value={subgroup} onChange={e=>setSubgroup(e.target.value)} style={{...field,flex:'1 1 160px'}}><option value="All">All {kind==='Musician'?'Instruments':kind==='Singer'?'Voice Parts':'Parts / Instruments'}</option>{parts.map(p=><option key={p}>{p}</option>)}</select>
 <select aria-label="Invitation status" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{...field,flex:'1 1 160px'}}><option value="All">All Statuses</option><option value="not_invited">Not Invited</option><option value="invited">Invited</option><option value="joined">Joined</option></select>
 <button style={btn} onClick={()=>void load()}>Refresh</button>
 </div>
 <p style={{fontSize:13,color:'#786c80',margin:'0 0 12px'}}>Showing {filtered.length} eligible members · Only members marked Present or Permission at a rehearsal qualify. Export and copy use current filters.</p>
 <div style={{overflowX:'auto'}}><table className="wa-table" style={{width:'100%',borderCollapse:'collapse',textAlign:'left',fontSize:14}}>
 <thead style={{background:'#f6f1f8'}}><tr><th style={{padding:12}}><input type="checkbox" aria-label="Select all visible members" checked={filtered.length>0&&filtered.every(c=>selected.includes(c.id))} onChange={e=>setSelected(e.target.checked?Array.from(new Set([...selected,...filtered.map(c=>c.id)])):selected.filter(id=>!filtered.some(c=>c.id===id)))}/></th><th>Name</th><th>Role</th><th>Detail</th><th>Phone Number</th><th>Invitation Status</th></tr></thead>
 <tbody>{filtered.map(c=><tr key={c.id} style={{borderBottom:'1px solid #eee8f1'}}><td style={{padding:12}}><input type="checkbox" aria-label={'Select '+c.full_name} checked={selected.includes(c.id)} onChange={e=>setSelected(prev=>e.target.checked?[...prev,c.id]:prev.filter(id=>id!==c.id))}/></td><td style={{fontWeight:650,padding:'14px 6px'}}>{c.full_name}</td><td><span style={{padding:'5px 11px',borderRadius:20,background:c.singer_or_musician==='Singer'?'#fbe3f0':'#e1eeff',color:c.singer_or_musician==='Singer'?'#91235f':'#1c57a1',fontWeight:700,fontSize:12}}>{c.singer_or_musician}</span></td><td>{c.part_or_instrument||'—'}</td><td>{c.phone_number||'—'}</td><td><select aria-label={'Invitation status for '+c.full_name} disabled={saving===c.id} value={statuses[c.id]||'not_invited'} onChange={e=>void updateStatus(c.id,e.target.value as Status)} style={{...field,padding:'7px 9px',fontSize:12,fontWeight:700,background:statuses[c.id]==='joined'?'#dff6e5':statuses[c.id]==='invited'?'#f0e1ff':'#f0edf3'}}><option value="not_invited">Not Invited</option><option value="invited">Invited</option><option value="joined">Joined</option></select></td></tr>)}</tbody></table>
 {filtered.length===0&&<p style={{textAlign:'center',padding:30,color:'#71667b'}}>{busy?'Loading eligible members…':'No members match the selected filters.'}</p>}
 </div></section>
 <p style={{color:'#786c80',fontSize:12,marginTop:18}}>Invitation statuses are saved in FOP. Pasting a Community link does not automatically send invitations or add anyone to WhatsApp.</p>
 </div>;
}
