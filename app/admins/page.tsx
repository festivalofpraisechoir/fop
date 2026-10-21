'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';

type Admin = { id: string; email: string; role: 'admin' | 'super_admin'; created_at: string };

export default function AdminManagementPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [removeTarget,setRemoveTarget]=useState<Admin|null>(null);
  const [activation,setActivation]=useState<{email:string;code:string}|null>(null);
  const [copyStatus,setCopyStatus]=useState('');

  const token = useCallback(async () => {
    const supabase = createSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const accessToken = await token();
      if (!accessToken) throw new Error('Sign in again to manage administrators.');
      const response = await fetch('/api/admins', { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not load administrators.');
      setAdmins(body.admins);
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load administrators.'); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      const accessToken = await token();
      if (!accessToken) throw new Error('Sign in again to invite an administrator.');
      const response = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ email }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not invite administrator.');
      setEmail('');
      if(body.activationCode){setActivation({email:body.admin.email,code:body.activationCode});setCopyStatus('');}
      setSuccess(body.message || (body.restored ? 'Administrator access restored. They can sign in using their existing password.' : 'Invitation sent. The new administrator must accept the email invitation and set their password before signing in.'));
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not invite administrator.'); }
    finally { setSaving(false); }
  }

  async function generateCode(a:Admin){
    setSaving(true);setError('');setSuccess('');setActivation(null);
    try{const accessToken=await token();if(!accessToken)throw new Error('Sign in again.');
      const response=await fetch('/api/admins',{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:'Bearer '+accessToken},body:JSON.stringify({id:a.id})});
      const body=await response.json();if(!response.ok)throw new Error(body.error||'Could not generate code.');
      setActivation({email:a.email,code:body.activationCode});setCopyStatus('');
    }catch(e){setError(e instanceof Error?e.message:'Could not generate code.');}finally{setSaving(false);}
  }

  async function copyActivation() {
    if (!activation) return;
    const details = ['FOP Admin Activation', 'https://fop-festival-of-praise.vercel.app/activate-admin', 'Email: ' + activation.email, 'Activation code: ' + activation.code, 'Expires 15 minutes after generation.'].join('\\n');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(details);
      setCopyStatus('Copied! Paste into WhatsApp.');
    } catch {
      // Some browsers deny clipboard access. Provide a selectable field for manual copy.
      setCopyStatus('Automatic copying is blocked. Select the details below and copy them manually.');
    }
  }

  async function removeAdmin() {
    if(!removeTarget)return;
    setSaving(true);setError('');setSuccess('');
    try {
      const accessToken=await token();
      if(!accessToken)throw new Error('Sign in again to manage administrators.');
      const response=await fetch('/api/admins',{method:'DELETE',headers:{'Content-Type':'application/json',Authorization:'Bearer '+accessToken},body:JSON.stringify({id:removeTarget.id,confirmation:'REMOVE ADMIN'})});
      const body=await response.json();
      if(!response.ok)throw new Error(body.error||'Could not remove admin.');
      setRemoveTarget(null);await load();setSuccess('Administrator access removed. Their user account was not deleted.');
    }catch(e){setError(e instanceof Error?e.message:'Could not remove admin.');}
    finally{setSaving(false);}
  }

  return <div className="page-shell">
    <header className="page-header"><div><p className="eyebrow">Festival of Praise / Administration</p><h1>Manage admins</h1><p className="page-description">Add administrators and securely share their activation codes.</p></div></header>
    <section className="panel-card">
      <div className="panel-header"><h2>Add or restore an administrator</h2></div>
      <p className="muted">Add or restore an administrator without email. Share the one-time activation code privately. This grants the Admin role only.</p>
      <form onSubmit={invite} className="contact-form">
        <div className="field-group"><label htmlFor="admin-email">Email address</label><input id="admin-email" type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@example.com" /></div>
        <div className="form-actions"><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add / restore admin'}</button></div>
      </form>
      {activation&&<div className="notice" role="status"><strong>One-time activation code for {activation.email}</strong><p style={{overflowWrap:'anywhere',fontFamily:'monospace'}}>{activation.code}</p><p>Expires in 15 minutes. Share privately with this administrator along with <a href="/activate-admin">the activation page</a>. The code is shown here only until you dismiss it.</p><button type="button" className="secondary-button" onClick={()=>void copyActivation()}>Copy activation details</button>{copyStatus&&<p role="status">{copyStatus}</p>}<textarea readOnly aria-label="Activation details for manual copying" rows={5} style={{width:'100%',marginTop:8}} value={['FOP Admin Activation','https://fop-festival-of-praise.vercel.app/activate-admin','Email: '+activation.email,'Activation code: '+activation.code,'Expires 15 minutes after generation.'].join('\\n')} onClick={e=>e.currentTarget.select()} /> <button type="button" className="secondary-button" onClick={()=>setActivation(null)}>Dismiss</button></div>}
      {error && <p className="notice error-notice" role="alert">{error}</p>}
      {success && <p className="notice" role="status">{success}</p>}
    </section>
    {removeTarget&&<section className="panel-card"><h2>Remove administrator access?</h2><p>Remove <strong>{removeTarget.email}</strong> as an administrator? They will no longer be able to manage FOP data. Their user account and attendance records will be retained.</p><div className="inline-actions"><button className="secondary-button" disabled={saving} onClick={()=>setRemoveTarget(null)}>Cancel</button><button className="primary-button" disabled={saving} onClick={()=>void removeAdmin()}>{saving?'Removing…':'Confirm remove admin'}</button></div></section>}
    <section className="panel-card">
      <div className="panel-header"><h2>Authorised administrators <span className="count-label">{admins.length}</span></h2><button type="button" className="secondary-button" onClick={()=>void load()} disabled={loading}>Refresh</button></div>
      {loading ? <p className="muted">Loading administrators…</p> : admins.length ? <div className="table-wrap"><table><thead><tr><th>Email</th><th>Role</th><th>Added</th><th>Actions</th></tr></thead><tbody>{admins.map(a=><tr key={a.id}><td><strong>{a.email}</strong></td><td><span className="status-pill neutral">{a.role === 'super_admin' ? 'Super Admin' : 'Admin'}</span></td><td>{new Date(a.created_at).toLocaleDateString('en-GB')}</td><td>{a.role==='admin'?<><button className="table-action" disabled={saving} onClick={()=>void generateCode(a)}>Generate activation code</button> <button className="table-action" disabled={saving} onClick={()=>setRemoveTarget(a)}>Remove admin</button></>:<span className="muted">Protected</span>}</td></tr>)}</tbody></table></div> : <p className="empty-state">No administrators found.</p>}
    </section>
  </div>;
}
