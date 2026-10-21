import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { londonDate } from '@/lib/london-date';
import { validQr } from '@/lib/attendance-qr';
import { normalisePhone,verifyPin } from '@/lib/member-pin';
import { createHash } from 'node:crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) return NextResponse.json({ error: 'Check-in is not configured.' }, { status: 503 });
  let body: { eventId?: string; qrToken?: string; phone?: string; pin?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  if (!body.eventId || !/^[0-9a-f-]{36}$/i.test(body.eventId)) return NextResponse.json({ error: 'Invalid session.' }, { status: 400 });
  if (!body.phone || !body.pin || !/^[0-9]{6}$/.test(body.pin) || body.phone.length>40) return NextResponse.json({ error: 'Enter your registered phone number and six-digit PIN.' }, { status: 400 });
  const phone=normalisePhone(body.phone);
  if(phone.length<9||phone.length>15)return NextResponse.json({error:'Enter a valid phone number.'},{status:400});
  const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const ip=(request.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim();
  const ipKey=createHash('sha256').update(ip).digest('hex');
  const phoneKey=createHash('sha256').update(phone).digest('hex');
  const since=new Date(Date.now()-15*60*1000).toISOString();
  const [{count:phoneAttempts,error:phoneError},{count:ipAttempts,error:ipError}]=await Promise.all([
    admin.from('member_pin_attempts').select('id',{head:true,count:'exact'}).eq('phone_key',phoneKey).gte('attempted_at',since),
    admin.from('member_pin_attempts').select('id',{head:true,count:'exact'}).eq('ip_key',ipKey).gte('attempted_at',since)
  ]);
  if(phoneError||ipError)return NextResponse.json({error:'Check-in is temporarily unavailable.'},{status:503});
  if((phoneAttempts||0)>=5||(ipAttempts||0)>=40)return NextResponse.json({error:'Too many attempts. Please wait 15 minutes or ask an administrator.'},{status:429});
  const {error:attemptError}=await admin.from('member_pin_attempts').insert({phone_key:phoneKey,ip_key:ipKey});
  if(attemptError)return NextResponse.json({error:'Check-in is temporarily unavailable.'},{status:503});
  let valid = false;
  try { valid = validQr(body.eventId, body.qrToken || ''); } catch { return NextResponse.json({ error: 'QR verification is not configured.' }, { status: 503 }); }
  if (!valid) return NextResponse.json({ error: 'QR_EXPIRED', message: 'This QR code has expired. Scan the currently displayed QR code again.' }, { status: 409 });
  const { data: event } = await admin.from('attendance_events').select('id,title,event_date,status').eq('id',body.eventId).maybeSingle();
  if (!event || event.status !== 'open') return NextResponse.json({ error: 'This attendance session is not open.' }, { status: 400 });
  const today = londonDate();
  if (event.event_date !== today) return NextResponse.json({ error: 'This QR code is not for today’s session.' }, { status: 400 });
  const {data:allContacts,error:contactError}=await admin.from('contacts').select('id,full_name,phone_number').not('phone_number','is',null);
  if(contactError)return NextResponse.json({error:'Could not verify member.'},{status:500});
  const matches=(allContacts||[]).filter(contact=>normalisePhone(contact.phone_number||'')===phone);
  if(matches.length!==1)return NextResponse.json({error:'Phone number or PIN not recognised. Ask an administrator for help.'},{status:401});
  const contact=matches[0];
  const {data:credential,error:pinError}=await admin.from('member_checkin_pins').select('pin_hash').eq('contact_id',contact.id).maybeSingle();
  if(pinError)return NextResponse.json({error:'Could not verify PIN.'},{status:500});
  let authenticated=false;
  try{authenticated=Boolean(credential&&verifyPin(body.pin,credential.pin_hash));}catch{return NextResponse.json({error:'PIN verification is not configured.'},{status:503});}
  if(!authenticated)return NextResponse.json({error:'Phone number or PIN not recognised. Ask an administrator to assign or reset your PIN.'},{status:401});
  const { data: existing } = await admin.from('attendance_records').select('id,status').eq('event_id',event.id).eq('contact_id',contact.id).maybeSingle();
  if (existing) return NextResponse.json({ success: true, alreadyRecorded: true, name: contact.full_name, status: existing.status, session: event.title }, { headers: { 'Cache-Control': 'no-store' } });
  const { error: insertError } = await admin.from('attendance_records').insert({ event_id: event.id, contact_id: contact.id, status: 'Present', check_in_time: new Date().toISOString() });
  if (insertError) {
    if (insertError.code === '23505') return NextResponse.json({ success: true, alreadyRecorded: true, name: contact.full_name, status: 'Present', session: event.title });
    return NextResponse.json({ error: 'Could not record attendance. Please ask an administrator.' }, { status: 500 });
  }
  return NextResponse.json({ success: true, alreadyRecorded: false, name: contact.full_name, status: 'Present', session: event.title }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const eventId = request.nextUrl.searchParams.get('eventId') || '';
  if (!url || !secret) return NextResponse.json({ error: 'Check-in is unavailable.' }, { status: 503 });
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) return NextResponse.json({ error: 'Invalid session.' }, { status: 400 });
  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await admin.from('attendance_events').select('id,title,event_date,status').eq('id',eventId).maybeSingle();
  if (!data) return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
}

