'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { createSupabaseClient, type ContactRecord } from '@/lib/supabase';

type ContactDraft = { full_name: string; email: string; phone_number: string; singer_or_musician: 'Singer'|'Musician'; part_or_instrument: string; church_name: string; church_letter_submitted: boolean; registered_at: string };
const blank: ContactDraft = { full_name:'', email:'', phone_number:'', singer_or_musician:'Singer', part_or_instrument:'', church_name:'', church_letter_submitted:false, registered_at:'' };

export default function ContactsPage() {
  const [contacts,setContacts] = useState<ContactRecord[]>([]);
  const [search,setSearch] = useState('');
  const [draft,setDraft] = useState<ContactDraft>(blank);
  const [editing,setEditing] = useState<string|null>(null);
  const [showForm,setShowForm] = useState(false);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  const [csvRows,setCsvRows] = useState<ContactDraft[]|null>(null);
  const [csvName,setCsvName] = useState('');
  const [importOpen,setImportOpen] = useState(false);

  async function load() {
    const supabase=createSupabaseClient();
    if(!supabase){setMessage('Supabase is not configured.');return;}
    const {data,error}=await supabase.from('contacts').select('*').order('full_name');
    if(error){setMessage('Could not load contacts. Apply the Supabase migration and confirm access permissions.');return;}
    setContacts((data||[]) as ContactRecord[]);
  }
  useEffect(()=>{load();},[]);
  const filtered=useMemo(()=>contacts.filter(c=>[c.full_name,c.email,c.phone_number,c.church_name,c.part_or_instrument,c.singer_or_musician].some(v=>v?.toLowerCase().includes(search.toLowerCase()))),[contacts,search]);

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
    return lines.slice(1).map(line=>{const r=parse(line);const type=r[typeI]?.toLowerCase().includes('musician')?'Musician':'Singer';return {registered_at:r[timestampI]||'',full_name:r[nameI]||'',email:r[emailI]||'',phone_number:r[phoneI]||'',singer_or_musician:type,part_or_instrument:(type==='Musician'?r[instrumentI]:r[partI])||'',church_name:r[churchI]||'',church_letter_submitted:/^(yes|true|submitted)$/i.test(r[letterI]||'')};}).filter(r=>r.full_name);
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
    const unique=csvRows.filter(r=>!((r.email&&existingEmails.has(r.email.trim().toLowerCase()))||(r.phone_number&&existingPhones.has(r.phone_number.replace(/\s/g,'')))));
    const valid=unique.filter(r=>r.full_name.trim()).map(r=>({...r,full_name:r.full_name.trim(),email:r.email.trim()||null,phone_number:r.phone_number.trim()||null,part_or_instrument:r.part_or_instrument||null,church_name:r.church_name||null,source:'csv'}));
    if(!valid.length){setMessage('No new contacts to import. Existing email addresses or phone numbers were skipped.');return;}
    setBusy(true);const {error}=await supabase.from('contacts').insert(valid);setBusy(false);
    if(error){setMessage('Import was not saved: '+error.message);return;}
    setMessage(`Imported ${valid.length} contacts; skipped ${csvRows.length-valid.length} possible duplicates.`);setCsvRows(null);setImportOpen(false);await load();
  }
  return <div className="page-shell">
    <header className="page-header"><div><p className="eyebrow">Directory</p><h1>Contacts</h1><p className="page-description">Manage registered singers, musicians and their details.</p></div><div className="inline-actions"><button className="secondary-button" onClick={()=>{setImportOpen(!importOpen);setMessage('');}}>Import CSV</button><button className="primary-button" onClick={startAdd}>Add contact</button></div></header>
    {message&&<p className="notice" role="status">{message}</p>}
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
      <div className="table-wrap"><table><thead><tr><th>Name</th><th>Registered</th><th>Email / phone</th><th>Type</th><th>Voice part / instrument</th><th>Church</th><th>Church letter</th><th></th></tr></thead><tbody>{filtered.map(c=><tr key={c.id}><td><strong>{c.full_name}</strong></td><td>{c.registered_at||'—'}</td><td><span>{c.email||'—'}</span><small className="table-subtext">{c.phone_number||'—'}</small></td><td>{c.singer_or_musician}</td><td>{c.part_or_instrument||'—'}</td><td>{c.church_name||'—'}</td><td><span className={`status-pill ${c.church_letter_submitted?'success':'neutral'}`}>{c.church_letter_submitted?'Submitted':'Outstanding'}</span></td><td><button className="table-action" onClick={()=>startEdit(c)}>Edit</button></td></tr>)}</tbody></table>{!filtered.length&&<div className="empty-state">{search?'No contacts match your search.':'No contacts have been added yet. Add a contact or import a CSV roster.'}</div>}</div>
    </section>
  </div>;
}
