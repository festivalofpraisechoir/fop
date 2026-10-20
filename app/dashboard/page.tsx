'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';

export default function DashboardPage() {
  const [stats, setStats] = useState({ contacts: 0, events: 0, present: 0, late: 0 });
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = createSupabaseClient();
      if (!supabase) { setMessage('Connect Supabase to load live attendance data.'); return; }
      const today = new Date().toLocaleDateString('en-CA');
      const [contacts, events] = await Promise.all([
        supabase.from('contacts').select('id', { count: 'exact', head: true }),
        supabase.from('attendance_events').select('id,event_date,title,status').eq('event_date', today).maybeSingle(),
      ]);
      if (contacts.error || events.error) { if(active) setMessage('Could not load dashboard data. Apply the database migration and check your Supabase access settings.'); return; }
      let present = 0, late = 0;
      if (events.data?.id) {
        const records = await supabase.from('attendance_records').select('status').eq('event_id', events.data.id);
        present = records.data?.filter(r => r.status === 'Present').length || 0;
        late = records.data?.filter(r => r.status === 'Late').length || 0;
      }
      if(active) setStats({ contacts: contacts.count || 0, events: events.data ? 1 : 0, present, late });
    }
    load();
    return () => { active = false; };
  }, []);
  return <div className="page-shell">
    <header className="page-header"><div><p className="eyebrow">Festival of Praise / Operations</p><h1>Dashboard</h1><p className="page-description">A clear view of your registered members and today’s attendance.</p></div><Link className="primary-button" href="/attendance">Open attendance</Link></header>
    {message && <p className="notice">{message}</p>}
    <section className="stats-grid">
      {[{title:'Registered contacts',value:stats.contacts,meta:'People in the directory'},{title:'Checked in today',value:stats.present,meta:'Marked present'},{title:'Arrived late',value:stats.late,meta:'Marked late'},{title:'Sessions today',value:stats.events,meta:'Scheduled attendance sessions'}].map(card=><article key={card.title} className="stat-card"><span>{card.title}</span><strong>{card.value}</strong><small>{card.meta}</small></article>)}
    </section>
    <section className="panel-grid two-col">
      <article className="panel-card"><p className="eyebrow">Daily workflow</p><h2>Take attendance</h2><p className="muted">Choose the session, search for a member, and mark them present or late. The system records the time and prevents duplicate check-ins.</p><Link href="/attendance" className="text-link">Go to check-in</Link></article>
      <article className="panel-card"><p className="eyebrow">Member directory</p><h2>Keep records up to date</h2><p className="muted">Find contacts by name, email, phone number, role, or church. Add new members when someone arrives for the first time.</p><Link href="/contacts" className="text-link">Open contacts</Link></article>
    </section>
  </div>;
}
