import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const dynamic='force-dynamic';
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!secret)return fail('Server is not configured.',503);
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];if(!token)return fail('Sign in required.',401);
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await auth.auth.getUser(token);
 if(authError||!user)return fail('Sign in again.',401);
 if(!['admin','super_admin'].includes(user.app_metadata?.role))return fail('Only authorised admins can record attendance.',403);
 let body:{eventId?:string;contactId?:string;status?:string};
 try{body=await request.json();}catch{return fail('Invalid request.',400);}
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 if(!uuid.test(body.eventId||'')||!uuid.test(body.contactId||'')||!['Present','Late','Absent','Permission'].includes(body.status||''))return fail('Invalid attendance details.',400);
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:event,error:eventError}=await db.from('attendance_events').select('id,status').eq('id',body.eventId).maybeSingle();
 if(eventError)return fail('Could not verify the session. Please retry.',503);
 if(!event)return fail('Session not found.',404);
 if(event.status!=='open')return fail('This session is closed. Attendance was not changed.',409);
 const {data:inserted,error}=await db.from('attendance_records').upsert({contact_id:body.contactId,event_id:body.eventId,status:body.status,check_in_time:['Absent','Permission'].includes(body.status!)?null:new Date().toISOString(),checked_by:user.id},{onConflict:'contact_id,event_id',ignoreDuplicates:true}).select('id,status').maybeSingle();
 if(error)return fail('Attendance could not be saved. Please retry or refresh to verify.',503);
 if(!inserted){
   const {data:existing}=await db.from('attendance_records').select('status').eq('contact_id',body.contactId).eq('event_id',body.eventId).maybeSingle();
   return NextResponse.json({saved:false,duplicate:true,status:existing?.status||'already recorded'},{headers:{'Cache-Control':'no-store'}});
 }
 return NextResponse.json({saved:true,duplicate:false,status:inserted.status},{headers:{'Cache-Control':'no-store'}});
}
