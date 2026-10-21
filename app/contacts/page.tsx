'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { createSupabaseClient, type ContactRecord } from '@/lib/supabase';

type ContactDraft = { full_name: string; email: string; phone_number: string; singer_or_musician: 'Singer'|'Musician'; part_or_instrument: string; church_name: string; church_letter_submitted: boolean; registered_at: string };
const blank: ContactDraft = { full_name:'', email:'', phone_number:'', singer_or_musician:'Singer', part_or_instrument:'', church_name:'', church_letter_submitted:false, registered_at:'' };

export default function ContactsPage() {
  const [contacts,setContacts] = useState<ContactRecord[]>([]);
  const [search,setSearch] = useState('');
  const [memberType,setMemberType]=useState<'All'|'Singer'|'Musician'>('All');
  const [draft,setDraft] = useState<ContactDraft>(blank);
  const [editing,setEditing] = useState<string|null>(null);
  const [showForm,setShowForm] = useState(false);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  const [csvRows,setCsvRows] = useState<ContactDraft[]|null>(null);
  const [csvName,setCsvName] = useState('');
  const [importOpen,setImportOpen] = useState(false);
  const [superAdmin,setSuperAdmin] = useState(false);
  const [deleteTarget,setDeleteTarget] = useState<ContactRecord|null>(null);
  const [deleteAllOpen,setDeleteAllOpen] = useState(false);
  const [deleteConfirm,setDeleteConfirm] = useState('');
  useEffect(()=>{const s=createSupabaseClient();if(!s)return;void s.auth.getUser().then(({data})=>setSuperAdmin(data.user?.app_metadata?.role==='super_admin'));},[]);
  async function deleteContacts(mode:'single'|'all'){
    const s=createSupabaseClient();if(!s)return;
    const {data}=await s.auth.getSession();if(!data.session){setMessage('Please sign in again.');return;}
    setBusy(true);setMessage('');
    try{
      const response=await fetch('/api/contacts/delete',{method:'DELETE',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},body:JSON.stringify(mode==='single'?{mode,id:deleteTarget?.id,confirmation:'DELETE'}:{mode,confirmation:deleteConfirm,expectedCount:contacts.length})});
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||'Could not delete contacts.');
      setDeleteTarget(null);setDeleteAllOpen(false);setDeleteConfirm('');
      await load();
      setMessage(mode==='all'?`Deleted ${body.deleted} contacts. Their linked attendance records were also removed.`:'Contact deleted. Linked attendance records were also removed.');
    }catch(e){setMessage(e instanceof Error?e.message:'Deletion failed.');}
    finally{setBusy(false);}
  }

  async function load() {
    const supabase=createSupabaseClient();
    if(!supabase){setMessage('Supabase is not configured.');return;}
    const {data,error}=await supabase.from('contacts').select('*').order('full_name');
    if(error){setMessage('Could not load contacts. Apply the Supabase migration and confirm access permissions.');return;}
    setContacts((data||[]) as ContactRecord[]);
  }
  useEffect(()=>{load();},[]);
  const filtered=useMemo(()=>contacts.filter(c=>(memberType==='All'||c.singer_or_musician===memberType)&&[c.full_name,c.email,c.phone_number,c.church_name,c.part_or_instrument,c.singer_or_musician].some(v=>v?.toLowerCase().includes(search.toLowerCase()))),[contacts,search,memberType]);

  function startAdd(){setDraft(blank);setEditing(null);setShowForm(true);setMessage('');}
  function startEdit(c:ContactRecord){setDraft({full_name:c.full_name,email:c.email||'',phone_number:c.phone_number||'',singer_or_musician:c.singer_or_musician,part_or_instrument:c.part_or_instrument||'',church_name:c.church_name||'',church_letter_submitted:c.church_letter_submitted, registered_at:c.registered_at||''});setEditing(c.id);setShowForm(true);setMessage('');}
  async function saveContact(e:FormEvent<HTMLFormElement>){
    e.preventDefault();const supabase=createSupabaseClient();if(!supabase)return setMessage('Supabase is not configured.');
    setBusy(true);setMessage('');
    const payload={...draft,full_name:draft.full_name.trim(),email:draft.email.trim()||null,phone_number:draft.phone_number.trim()||null,part_or_instrument:draft.part_or_instrument.trim()||null,church_name:draft.church_name.trim()||null,registered_at:draft.registered_at.trim()||null};
    const result=editing?await supabase.from('contacts').update(payload).eq('id',editing):await supabase.from('contacts').insert({...payload,source:'manual'});
    setBusy(false);
    if(result.error){setMessage(result.error.code==='23505'?'A contact with this email or barcode already exists. Check the directory before saving.':result.error.message);return;}
    setShowForm(false);setDraft(blank);setEditing(null);setMessage(editing?'Contact updated.':'Contact added.');await load();
  }
  function parseCsv(text:string):ContactDraft[]{
    const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(line=>line.trim());
    const parse=(line:string)=>{const out:string[]=[];let cur='',quoted=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'&&line[i+1]==='"'&&quoted){cur+='"';i++;}else if(ch==='"')quoted=!quoted;else if(ch===','&&!quoted){out.push(cur.trim());cur='';}else cur+=ch;}out.push(cur.trim());return out;};
    if(lines.length<2)return [];
    const headers=parse(lines[0]).map(h=>h.toLowerCase());
    const index=(...terms:string[])=>headers.findIndex(h=>terms.some(t=>h.includes(t)));
    const timestampI=index('timestamp'),nameI=index('name'),emailI=index('email'),phoneI=index('phone'),typeI=index('singer or musician','type','role'),partI=index('what part','voice part','part'),instrumentI=index('instrument'),churchI=index('church'),letterI=index('letter');
    return lines.slice(1).map(line=>{const r=parse(line);const type: ContactDraft['singer_or_musician']=r[typeI]?.toLowerCase().includes('musician')?'Musician':'Singer';return {registered_at:r[timestampI]||'',full_name:r[nameI]||'',email:r[emailI]||'',phone_number:r[phoneI]||'',singer_or_musician:type,part_or_instrument:(type==='Musician'?r[instrumentI]:r[partI])||'',church_name:r[churchI]||'',church_letter_submitted:/^(yes|true|submitted)$/i.test(r[letterI]||'')};}).filter(r=>r.full_name);
  }
  async function handleFile(e:ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];if(!file)return;setCsvName(file.name);setMessage('');
    if(!file.name.toLowerCase().endsWith('.csv')){setMessage('For this import screen, upload a CSV file. Save an Excel workbook as CSV first. PDF extraction needs a separate review workflow.');setCsvRows(null);return;}
    setCsvRows(parseCsv(await file.text()));
  }
  async function importCsv(){
    if(!csvRows?.length)return;const supabase=createSupabaseClient();if(!supabase)return;
    const existingEmails=new Set(contacts.map(c=>c.email?.trim().toLowerCase()).filter(Boolean));
    const existingPhones=new Set(contacts.map(c=>c.phone_number?.replace(/\s/g,'')).filter(Boolean));
    const unique=csvRows.filter(r=>{
      const email=r.email.trim().toLowerCase();
      const phone=r.phone_number.replace(/\s/g,'');
      if((email&&existingEmails.has(email))||(phone&&existingPhones.has(phone)))return false;
      if(email)existingEmails.add(email);
      if(phone)existingPhones.add(phone);
      return true;
    });
    const valid=unique.filter(r=>r.full_name.trim()).map(r=>({...r,full_name:r.full_name.trim(),email:r.email.trim()||null,phone_number:r.phone_number.trim()||null,part_or_instrument:r.part_or_instrument||null,church_name:r.church_name||null,source:'csv'}));
    if(!valid.length){setMessage('No new contacts to import. Existing email addresses or phone numbers were skipped.');return;}
    setBusy(true);const {error}=await supabase.from('contacts').insert(valid);setBusy(false);
    if(error){setMessage('Import was not saved: '+error.message);return;}
    setMessage(`Imported ${valid.length} contacts; skipped ${csvRows.length-valid.length} possible duplicates.`);setCsvRows(null);setImportOpen(false);await load();
  }
  return <div className="page-shell">
    <header className="page-header"><div><p className="eyebrow">Directory</p><h1>Contacts</h1><p className="page-description">Manage registered singers, musicians and their details.</p></div><div className="inline-actions"><button className="secondary-button" onClick={()=>{setImportOpen(!importOpen);setMessage('');}}>Import CSV</button><button className="primary-button" onClick={startAdd}>Add contact</button>{superAdmin&&<button className="secondary-button" disabled={busy||!contacts.length} onClick={()=>{setDeleteAllOpen(true);setDeleteConfirm('');}}>Delete all contacts</button>}</div></header>
    {message&&<p className="notice" role="status">{message}</p>}
    <section className="panel-card"><div className="inline-actions">{(['All','Singer','Musician'] as const).map(t=><button key={t} type="button" className={memberType===t?'primary-button':'secondary-button'} onClick={()=>setMemberType(t)}>{t==='All'?'All contacts':t==='Singer'?'Singers':'Musicians'} ({t==='All'?contacts.length:contacts.filter(c=>c.singer_or_musician===t).length})</button>)}</div></section>
    {deleteTarget&&<section className="panel-card"><h2>Delete {deleteTarget.full_name}?</h2><p className="muted">This permanently deletes the contact and their linked attendance history. This cannot be undone.</p><div className="inline-actions"><button className="secondary-button" disabled={busy} onClick={()=>setDeleteTarget(null)}>Cancel</button><button className="primary-button" disabled={busy} onClick={()=>void deleteContacts('single')}>{busy?'Deleting…':'Permanently delete contact'}</button></div></section>}
    {deleteAllOpen&&<section className="panel-card"><h2>Delete all {contacts.length} contacts?</h2><p className="notice" role="alert">This permanently deletes every contact and all attendance records linked to those contacts. Existing sessions and administrator accounts will remain. This action cannot be undone. Export your data before proceeding.</p><div className="field-group"><label htmlFor="delete-all-confirm">Type DELETE ALL CONTACTS to confirm</label><input id="delete-all-confirm" autoComplete="off" value={deleteConfirm} onChange={e=>setDeleteConfirm(e.target.value)}/></div><div className="inline-actions"><button className="secondary-button" disabled={busy} onClick={()=>{setDeleteAllOpen(false);setDeleteConfirm('');}}>Cancel</button><button className="primary-button" disabled={busy||deleteConfirm!=='DELETE ALL CONTACTS'} onClick={()=>void deleteContacts('all')}>{busy?'Deleting…':`Permanently delete ${contacts.length} contacts`}</button></div></section>}
    {showForm&&<section className="panel-card"><div className="panel-header"><div><p className="eyebrow">{editing?'Update record':'New record'}</p><h2>{editing?'Edit contact':'Add a contact'}</h2></div><button className="secondary-button" onClick={()=>setShowForm(false)}>Cancel</button></div>
      <form onSubmit={saveContact} className="contact-form">
        <div className="field-group"><label htmlFor="full_name">Full name *</label><input id="full_name" required value={draft.full_name} onChange={e=>setDraft({...draft,full_name:e.target.value})}/></div>
        <div className="field-group"><label htmlFor="contact_email">Email address</label><input id="contact_email" type="email" value={draft.email} onChange={e=>setDraft({...draft,email:e.target.value})}/></div>
        <div className="field-group"><label htmlFor="contact_phone">Phone number</label><input id="contact_phone" type="tel" value={draft.phone_number} onChange={e=>setDraft({...draft,phone_number:e.target.value})}/></div>
        <div className="field-group"><label htmlFor="contact_type">Member type *</label><select id="contact_type" value={draft.singer_or_musician} onChange={e=>setDraft({...draft,singer_or_musician:e.target.value as 'Singer'|'Musician'})}><option>Singer</option><option>Musician</option></select></div>
        <div className="field-group"><label htmlFor="contact_part">{draft.singer_or_musician==='Singer'?'Voice part':'Instrument'}</label><input id="contact_part" value={draft.part_or_instrument} onChange={e=>setDraft({...draft,part_or_instrument:e.target.value})} placeholder={draft.singer_or_musician==='Singer'?'e.g. Alto':'e.g. Keyboard'}/></div>
        <div className="field-group"><label htmlFor="contact_church">Church</label><input id="contact_church" value={draft.church_name} onChange={e=>setDraft({...draft,church_name:e.target.value})}/></div>
        <label className="checkbox-row form-checkbox"><input type="checkbox" checked={draft.church_letter_submitted} onChange={e=>setDraft({...draft,church_letter_submitted:e.target.checked})}/> Church letter submitted</label>
        <div className="form-actions"><button className="primary-button" disabled={busy}>{busy?'Saving…':editing?'Save changes':'Save contact'}</button></div>
      </form>
    </section>}
    {importOpen&&<section className="panel-card"><div className="panel-header"><div><p className="eyebrow">Bulk import</p><h2>Import registered contacts</h2></div><button className="secondary-button" onClick={()=>{setImportOpen(false);setCsvRows(null);}}>Close</button></div><p className="muted">Upload a CSV with column headings such as Name, Email, Phone number, Singer or Musician, Voice part / Instrument, Church and Church letter submitted. Review the detected rows before saving.</p><div className="field-group"><label htmlFor="csv-file">CSV file</label><input id="csv-file" type="file" accept=".csv,text/csv" onChange={handleFile}/></div>{csvRows&&<><p className="notice">{csvName}: {csvRows.length} rows detected. {csvRows.filter(r=>r.full_name).length} rows have a name. Potential duplicates are checked against existing email addresses and phone numbers.</p><div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Type</th><th>Part / instrument</th><th>Church</th></tr></thead><tbody>{csvRows.slice(0,8).map((r,i)=><tr key={i}><td>{r.full_name}</td><td>{r.email}</td><td>{r.singer_or_musician}</td><td>{r.part_or_instrument}</td><td>{r.church_name}</td></tr>)}</tbody></table></div>{csvRows.length>8&&<p className="muted">Showing the first 8 rows for review.</p>}<div className="form-actions"><button className="primary-button" disabled={busy||!csvRows.length} onClick={importCsv}>{busy?'Importing…':`Import ${csvRows.length} reviewed rows`}</button></div></>}</section>}
    <section className="panel-card"><div className="toolbar-row"><div><h2>Registered contacts <span className="count-label">{filtered.length}</span></h2><p className="muted">Search the directory to find a member.</p></div><input className="search-input" aria-label="Search contacts" placeholder="Search name, email, phone or church" value={search} onChange={e=>setSearch(e.target.value)}/></div>
      <div className="table-wrap"><table><thead><tr><th>Name</th><th>Registered</th><th>Email / phone</th><th>Type</th><th>Voice part / instrument</th><th>Church</th><th>Church letter</th><th></th></tr></thead><tbody>{filtered.map(c=><tr key={c.id}><td><strong>{c.full_name}</strong></td><td>{c.registered_at||'—'}</td><td><span>{c.email||'—'}</span><small className="table-subtext">{c.phone_number||'—'}</small></td><td>{c.singer_or_musician}</td><td>{c.part_or_instrument||'—'}</td><td>{c.church_name||'—'}</td><td><span className={`status-pill ${c.church_letter_submitted?'success':'neutral'}`}>{c.church_letter_submitted?'Submitted':'Outstanding'}</span></td><td><button className="table-action" onClick={()=>startEdit(c)}>Edit</button>{superAdmin&&<button className="table-action" disabled={busy} onClick={()=>setDeleteTarget(c)}>Delete</button>}</td></tr>)}</tbody></table>{!filtered.length&&<div className="empty-state">{search?'No contacts match your search.':'No contacts have been added yet. Add a contact or import a CSV roster.'}</div>}</div>
    </section>
  </div>;
}
