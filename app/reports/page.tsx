'use client';

import { useEffect, useMemo, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase';

type ReportRow={id:string;event_id:string;contact_id:string;status:'Present'|'Late'|'Absent'|'Permission';check_in_time:string|null;event?:{title:string;event_date:string;type:string}|null;contact?:{full_name:string;email:string|null;phone_number:string|null;church_name:string|null;singer_or_musician:string;part_or_instrument:string|null}|null};
export default function ReportsPage(){
 const today=new Date().toLocaleDateString('en-CA');
 const [start,setStart]=useState('2026-01-01');const [end,setEnd]=useState(today);
 const [rows,setRows]=useState<ReportRow[]>([]);
 const [rehearsals,setRehearsals]=useState<{id:string;title:string;event_date:string}[]>([]);
 const [memberType,setMemberType]=useState<'All'|'Singer'|'Musician'>('All');
 const [subgroup,setSubgroup]=useState('All');const [loading,setLoading]=useState(false);const [message,setMessage]=useState('');
 async function load(){
  const s=createSupabaseClient();if(!s)return setMessage('Supabase is not configured.');
  if(start>end)return setMessage('Start date must be on or before end date.');
  setLoading(true);setMessage('');
  try {
   const {data:events,error:eventError}=await s.from('attendance_events').select('id,title,event_date,type').gte('event_date',start).lte('event_date',end).order('event_date',{ascending:false});
   if(eventError)throw eventError;
   const selected=(events||[]).filter(e=>e.type==='Rehearsal');
   const ids=selected.map(e=>e.id);
   const allRecords:ReportRow[]=[];
   // Supabase/PostgREST limits individual responses to 1,000 rows.
   // Fetch every page, scoped to the selected rehearsals, before calculating totals.
   if(ids.length){
    const pageSize=500;
    for(let offset=0;;offset+=pageSize){
     const {data:page,error:recordError}=await s.from('attendance_records')
      .select('id,event_id,contact_id,status,check_in_time,event:attendance_events(title,event_date,type),contact:contacts(full_name,email,phone_number,church_name,singer_or_musician,part_or_instrument)')
      .in('event_id',ids).order('id',{ascending:true}).range(offset,offset+pageSize-1);
     if(recordError)throw recordError;
     allRecords.push(...((page||[]) as unknown as ReportRow[]));
     if(!page||page.length<pageSize)break;
    }
   }
   setRehearsals(selected.map(e=>({id:e.id,title:e.title,event_date:e.event_date})));
   setRows(allRecords);
  }catch(error){
   setMessage('Could not load report data: '+(error instanceof Error?error.message:String(error)));
  }finally{setLoading(false);}
 }
 useEffect(()=>{load();},[]);
 const subgroups=useMemo(()=>Array.from(new Set(rows.filter(r=>memberType==='All'||r.contact?.singer_or_musician===memberType).map(r=>r.contact?.part_or_instrument?.trim()).filter((x):x is string=>!!x))).sort(),[rows,memberType]);
 const visibleRows=useMemo(()=>rows.filter(r=>(memberType==='All'||r.contact?.singer_or_musician===memberType)&&(subgroup==='All'||r.contact?.part_or_instrument===subgroup)),[rows,memberType,subgroup]);
 const breakdown=useMemo(()=>({singers:rows.filter(r=>r.contact?.singer_or_musician==='Singer'),musicians:rows.filter(r=>r.contact?.singer_or_musician==='Musician')}),[rows]);
 const sessionMap=useMemo(()=>rehearsals.map(e=>{
   const matched=visibleRows.filter(r=>r.event_id===e.id);
   return {id:e.id,date:e.event_date,title:e.title,type:'Rehearsal',
     present:matched.filter(r=>r.status==='Present').length,
     late:matched.filter(r=>r.status==='Late').length,
     absent:matched.filter(r=>r.status==='Absent').length,
     permission:matched.filter(r=>r.status==='Permission').length,
     total:matched.length};
 }).sort((a,b)=>b.date.localeCompare(a.date)),[rehearsals,visibleRows]);
 const totalPresent=visibleRows.filter(r=>r.status==='Present').length,totalLate=visibleRows.filter(r=>r.status==='Late').length,totalAbsent=visibleRows.filter(r=>r.status==='Absent').length,totalPermission=visibleRows.filter(r=>r.status==='Permission').length;
 function exportCsv(){const esc=(v:unknown)=>'"'+String(v??'').replace(/"/g,'""')+'"';const lines=[['Date','Session','Type','Member','Email','Phone','Church','Singer or Musician','Part / Instrument','Status','Check-in time'],...visibleRows.map(r=>[r.event?.event_date,r.event?.title,r.event?.type,r.contact?.full_name,r.contact?.email,r.contact?.phone_number,r.contact?.church_name,r.contact?.singer_or_musician,r.contact?.part_or_instrument,r.status,r.check_in_time?new Date(r.check_in_time).toISOString():''])];const blob=new Blob([lines.map(line=>line.map(esc).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`fop-attendance-${memberType.toLowerCase()}-${start}-to-${end}.csv`;a.click();URL.revokeObjectURL(url);}
 return <div className="page-shell"><header className="page-header"><div><p className="eyebrow">Reporting / Super Admin</p><h1>Attendance reports</h1><p className="page-description">Review attendance across one or more dates and export the underlying register.</p></div><button className="primary-button" onClick={exportCsv} disabled={!visibleRows.length}>Export CSV</button></header>{message&&<p className="notice" role="alert">{message}</p>}
 <section className="panel-card"><div className="report-filters"><div className="field-group"><label htmlFor="report-start">Start date</label><input id="report-start" type="date" value={start} max={end} onChange={e=>setStart(e.target.value)}/></div><div className="field-group"><label htmlFor="report-end">End date</label><input id="report-end" type="date" value={end} min={start} onChange={e=>setEnd(e.target.value)}/></div><button className="secondary-button filter-submit" onClick={load} disabled={loading}>{loading?'Loading…':'Apply date range'}</button></div><p className="muted">Attendance is summarised from records actually saved in the system. A member without an attendance record is not automatically counted as absent.</p></section>
 <section className="panel-card"><div className="panel-header"><div><p className="eyebrow">Member category</p><h2>Singers and musicians</h2></div></div><div className="inline-actions">{(['All','Singer','Musician'] as const).map(t=><button type="button" key={t} className={memberType===t?'primary-button':'secondary-button'} onClick={()=>{setMemberType(t);setSubgroup('All');}}>{t==='All'?'All members':t==='Singer'?'Singers':'Musicians'}</button>)}</div>{memberType!=='All'&&<div className="field-group" style={{marginTop:12}}><label htmlFor="report-subgroup">{memberType==='Singer'?'Voice part':'Instrument'}</label><select id="report-subgroup" value={subgroup} onChange={e=>setSubgroup(e.target.value)}><option value="All">All {memberType==='Singer'?'voice parts':'instruments'}</option>{subgroups.map(x=><option key={x} value={x}>{x}</option>)}</select></div>}<div className="stats-grid" style={{gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",marginTop:12}}><article className="stat-card"><span>Singer records</span><strong>{breakdown.singers.length}</strong><small>Across selected dates</small></article><article className="stat-card"><span>Musician records</span><strong>{breakdown.musicians.length}</strong><small>Across selected dates</small></article></div></section>
 <section className="stats-grid four-stats" style={{gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))"}}><article className="stat-card"><span>Present</span><strong>{totalPresent}</strong><small>Across selected dates</small></article><article className="stat-card"><span>Late</span><strong>{totalLate}</strong><small>Across selected dates</small></article><article className="stat-card"><span>Absent</span><strong>{totalAbsent}</strong><small>Explicitly marked absent</small></article><article className="stat-card"><span>Permission</span><strong>{totalPermission}</strong><small>Excused from rehearsal</small></article></section>
 <section className="panel-card"><div className="panel-header"><div><p className="eyebrow">Session summary</p><h2>Attendance by rehearsal</h2></div><span className="count-label">{sessionMap.length} sessions</span></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Session</th><th>Present</th><th>Late</th><th>Absent</th><th>Permission</th><th>Recorded</th></tr></thead><tbody>{sessionMap.map(s=><tr key={s.id}><td>{s.date}</td><td><strong>{s.title}</strong><small className="table-subtext">{s.type}</small></td><td>{s.present}</td><td>{s.late}</td><td>{s.absent}</td><td>{s.permission}</td><td>{s.total}</td></tr>)}</tbody></table>{!sessionMap.length&&<div className="empty-state">No attendance records were found for this date range.</div>}</div></section>
 <section className="panel-card"><div className="panel-header"><div><p className="eyebrow">Detailed register</p><h2>Individual attendance records</h2></div><span className="count-label">{visibleRows.length} records</span></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Member</th><th>Church</th><th>Type / part</th><th>Status</th><th>Time</th></tr></thead><tbody>{visibleRows.map(r=><tr key={r.id}><td>{r.event?.event_date||'—'}<small className="table-subtext">{r.event?.title||''}</small></td><td><strong>{r.contact?.full_name||'—'}</strong><small className="table-subtext">{r.contact?.email||''}</small></td><td>{r.contact?.church_name||'—'}</td><td>{r.contact?.singer_or_musician||'—'} · {r.contact?.part_or_instrument||'—'}</td><td><span className={`status-pill ${r.status==='Present'?'success':r.status==='Late'?'warning':r.status==='Permission'?'success':'neutral'}`}>{r.status}</span></td><td>{r.check_in_time?new Date(r.check_in_time).toLocaleString(): '—'}</td></tr>)}</tbody></table>{!visibleRows.length&&<div className="empty-state">Choose a date range and apply it to see attendance details.</div>}</div></section></div>;
}
