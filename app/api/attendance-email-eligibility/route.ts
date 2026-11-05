import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!secret)return NextResponse.json({error:'Server not configured.'},{status:503});
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)return NextResponse.json({error:'Sign in required.'},{status:401});
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await auth.auth.getUser(token);
 if(authError||!user)return NextResponse.json({error:'Sign in again.'},{status:401});
 if(!['admin','super_admin'].includes(user.app_metadata?.role))return NextResponse.json({error:'Admin access required.'},{status:403});
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const today=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const part=(t:string)=>today.find(p=>p.type===t)?.value||'';
 const date=part('year')+'-'+part('month')+'-'+part('day');
 const {data:events,error:eventsError}=await db.from('attendance_events').select('id,event_date').eq('type','Rehearsal').lte('event_date',date).order('event_date',{ascending:false}).limit(100);
 if(eventsError)return NextResponse.json({error:'Could not load rehearsals: '+eventsError.message},{status:500});
 if(!events?.length)return NextResponse.json({error:'No rehearsal sessions found.'},{status:404});
 const {data:attendance,error:attendanceError}=await db.from('attendance_records').select('event_id,contact_id,status').in('event_id',events.map(e=>e.id));
 if(attendanceError)return NextResponse.json({error:'Could not load attendance: '+attendanceError.message},{status:500});
 const sessions=events.filter(e=>(attendance||[]).some(a=>a.event_id===e.id)).slice(0,2);
 if(sessions.length<2)return NextResponse.json({error:'At least two rehearsals with recorded attendance are required.'},{status:422});
 const selected=new Set(sessions.map(e=>e.id));
 const eligibleContactIds=Array.from(new Set((attendance||[]).filter(a=>selected.has(a.event_id)&&(a.status==='Present'||a.status==='Permission')).map(a=>a.contact_id)));
 return NextResponse.json({eligibleContactIds,rehearsalDates:sessions.map(s=>s.event_date)},{headers:{'Cache-Control':'no-store'}});
}
