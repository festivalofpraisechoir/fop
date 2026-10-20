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
      setSuccess('Invitation sent. The new administrator must accept the email invitation and set their password before signing in.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not invite administrator.'); }
    finally { setSaving(false); }
  }

  return <div className="page-shell">
    <header className="page-header"><div><p className="eyebrow">Festival of Praise / Administration</p><h1>Manage admins</h1><p className="page-description">Invite authorised team members to help manage contacts and attendance.</p></div></header>
    <section className="panel-card">
      <div className="panel-header"><h2>Invite an administrator</h2></div>
      <p className="muted">An invitation email will be sent to the new admin. This grants the Admin role only, not Super Admin access.</p>
      <form onSubmit={invite} className="contact-form">
        <div className="field-group"><label htmlFor="admin-email">Email address</label><input id="admin-email" type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@example.com" /></div>
        <div className="form-actions"><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Sending invitation…' : 'Invite admin'}</button></div>
      </form>
      {error && <p className="notice error-notice" role="alert">{error}</p>}
      {success && <p className="notice" role="status">{success}</p>}
    </section>
    <section className="panel-card">
      <div className="panel-header"><h2>Authorised administrators <span className="count-label">{admins.length}</span></h2><button type="button" className="secondary-button" onClick={()=>void load()} disabled={loading}>Refresh</button></div>
      {loading ? <p className="muted">Loading administrators…</p> : admins.length ? <div className="table-wrap"><table><thead><tr><th>Email</th><th>Role</th><th>Added</th></tr></thead><tbody>{admins.map(a=><tr key={a.id}><td><strong>{a.email}</strong></td><td><span className="status-pill neutral">{a.role === 'super_admin' ? 'Super Admin' : 'Admin'}</span></td><td>{new Date(a.created_at).toLocaleDateString('en-GB')}</td></tr>)}</tbody></table></div> : <p className="empty-state">No administrators found.</p>}
    </section>
  </div>;
}
