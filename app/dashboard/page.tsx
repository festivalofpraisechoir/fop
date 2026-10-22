'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import { londonDate } from '@/lib/london-date';

type Session = { id:string; title:string; event_date:string; status:string; present:number; late:number; absent:number; permission:number; total:number };
export default function DashboardPage() {
  const [stats,setStats]=useState({contacts:0,events:0,present:0,late:0,total:0,closed:0});
  const [sessions,setSessions]=useState<Session[]>([]);
  const [message,setMessage]=useState('');
  const [loading,setLoading]=useState(false);
  const load=useCallback(async()=>{
    const supabase=createSupabaseClient();
    if(!supabase){setMessage('Connect Supabase to load attendance data.');return;}
    setLoading(true);setMessage('');
    const [contacts,events,records]=await Promise.all([
      supabase.from('contacts').select('id',{count:'exact',head:true}),
      supabase.from('attendance_events').select('id,event_date,title,status').order('event_date',{ascending:false}),
      supabase.from('attendance_records').select('event_id,status')
    ]);
    setLoading(false);
    if(contacts.error||events.error||records.error){setMessage('Could not load dashboard data. Please refresh and check access permissions.');return;}
    const all=(events.data||[]).map(e=>{
      const rs=(records.data||[]).filter(r=>r.event_id===e.id);
      return {id:e.id,title:e.title,event_date:e.event_date,status:e.status,present:rs.filter(r=>r.status==='Present').length,late:rs.filter(r=>r.status==='Late').length,absent:rs.filter(r=>r.status==='Absent').length,permission:rs.filter(r=>r.status==='Permission').length,total:rs.length};
    });
    const today=londonDate();
    const todays=all.filter(e=>e.event_date===today);
    setSessions(all);
    setStats({contacts:contacts.count||0,events:todays.length,present:todays.reduce((n,e)=>n+e.present,0),late:todays.reduce((n,e)=>n+e.late,0),total:all.reduce((n,e)=>n+e.total,0),closed:all.filter(e=>e.status==='closed').length});
  },[]);
  useEffect(()=>{void load();const onFocus=()=>void load();const onVisible=()=>{if(document.visibilityState==='visible')void load();};window.addEventListener('focus',onFocus);document.addEventListener('visibilitychange',onVisible);return()=>{window.removeEventListener('focus',onFocus);document.removeEventListener('visibilitychange',onVisible);};},[load]);
  const recent=sessions.slice(0,8);
  return <div className="page-shell">
    <header className="page-header"><div><p className="eyebrow">Festival of Praise / Operations</p><h1>Dashboard</h1><p className="page-description">Today&apos;s activity and attendance history, including completed sessions.</p></div><div className="inline-actions"><button className="secondary-button" onClick={()=>void load()} disabled={loading}>{loading?'Refreshing…':'Refresh figures'}</button><Link className="primary-button" href="/attendance">Open attendance</Link></div></header>
    {message&&<p className="notice" role="alert">{message}</p>}
    <section className="stats-grid">
      {[{title:'Registered contacts',value:stats.contacts,meta:'People in the directory'},{title:'Present today',value:stats.present,meta:'Today’s sessions only'},{title:'Late today',value:stats.late,meta:'Today’s sessions only'},{title:'Sessions today',value:stats.events,meta:'Open and closed sessions today'}].map(card=><article key={card.title} className="stat-card"><span>{card.title}</span><strong>{card.value}</strong><small>{card.meta}</small></article>)}
    </section>
    <section className="stats-grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))'}}>
      <article className="stat-card"><span>All recorded attendance</span><strong>{stats.total}</strong><small>Across all sessions</small></article>
      <article className="stat-card"><span>Completed sessions</span><strong>{stats.closed}</strong><small>Closed sessions retained in history</small></article>
      <article className="stat-card"><span>Total sessions</span><strong>{sessions.length}</strong><small>Open and closed</small></article>
    </section>
    <section className="panel-card"><div className="panel-header"><div><p className="eyebrow">Attendance history</p><h2>Recent sessions</h2></div><Link className="text-link" href="/reports">View reports</Link></div>
      <p className="muted">Closed sessions remain visible here. Present, Late, Absent and Permission count only records actually saved.</p>
      <div className="table-wrap"><table><thead><tr><th>Date</th><th>Session</th><th>Status</th><th>Present</th><th>Late</th><th>Absent</th><th>Permission</th><th>Total recorded</th></tr></thead><tbody>{recent.map(s=><tr key={s.id}><td>{s.event_date}</td><td><strong>{s.title}</strong></td><td><span className={`status-pill ${s.status==='closed'?'neutral':'success'}`}>{s.status==='closed'?'Closed':'Open'}</span></td><td>{s.present}</td><td>{s.late}</td><td>{s.absent}</td><td>{s.permission}</td><td>{s.total}</td></tr>)}</tbody></table>{!recent.length&&<div className="empty-state">No attendance sessions have been created yet.</div>}</div>
    </section>
    <section className="panel-grid two-col">
      <article className="panel-card"><p className="eyebrow">Daily workflow</p><h2>Take attendance</h2><p className="muted">Choose a session, find a registered singer or musician, and record their attendance. Closed sessions are retained in the history above.</p><Link href="/attendance" className="text-link">Open attendance register</Link></article>
      <article className="panel-card"><p className="eyebrow">Member directory</p><h2>Keep records up to date</h2><p className="muted">Find contacts by name, email, phone number, role or church, and add new members when needed.</p><Link href="/contacts" className="text-link">Open contacts</Link></article>
    </section>
  </div>;
}
