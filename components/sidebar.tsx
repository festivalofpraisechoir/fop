'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';

const items = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Contacts', href: '/contacts' },
  { label: 'Attendance', href: '/attendance' },
  { label: 'Church letters', href: '/letters' },
  { label: 'Badge collection', href: '/badges' },
  { label: 'Email communications', href: '/emails', emailAccess: true },
  { label: 'Reports', href: '/reports', superAdmin: true },
  { label: 'Manage admins', href: '/admins', superAdmin: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState('admin');
  const [email, setEmail] = useState('');
  const [canSendEmails, setCanSendEmails] = useState(false);
  useEffect(() => {
    const supabase = createSupabaseClient();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email || '');
      setCanSendEmails(data.user?.app_metadata?.role === 'super_admin' || data.user?.app_metadata?.can_send_emails === true);
      setRole(data.user?.app_metadata?.role === 'super_admin' ? 'super_admin' : 'admin');
    });
  }, []);
  async function signOut() {
    const supabase = createSupabaseClient();
    if (supabase) await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }
  return (
    <aside className="sidebar">
      <Link href="/dashboard" className="brand-wrap">
        <div className="brand-mark small">FOP</div>
        <div><span className="brand-name">Festival of Praise</span><small>Attendance management</small></div>
      </Link>
      <div className="convener-portrait"><img src="https://www.jubileechurchmanchester.org/img/pk.png" alt="Pastor Abimbola Komolafe, Festival of Praise convener" /><div className="convener-caption"><span>THE CONVENER</span><strong>Pastor Abimbola Komolafe</strong></div></div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {items.filter(item => (!item.superAdmin || role === 'super_admin') && (!item.emailAccess || canSendEmails)).map(item => (
          <Link key={item.href} href={item.href} className={`nav-item ${pathname === item.href ? 'active' : ''}`} aria-current={pathname === item.href ? 'page' : undefined}>{item.label}</Link>
        ))}
      </nav>
      <div className="sidebar-footer">
        <span className="role-label">{role === 'super_admin' ? 'Super Admin' : 'Admin'}</span>
        <strong title={email}>{email || 'Authorised team member'}</strong>
        <button type="button" className="signout-button" onClick={signOut}>Sign out</button>
      </div>
    </aside>
  );
}
