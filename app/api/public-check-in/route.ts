import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !secret) return NextResponse.json({ error: 'Check-in is not configured.' }, { status: 503 });
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return NextResponse.json({ error: 'Verify your email before checking in.' }, { status: 401 });
  const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authError } = await auth.auth.getUser(token);
  if (authError || !user?.email || !user.email_confirmed_at) return NextResponse.json({ error: 'Your email could not be verified.' }, { status: 401 });
  let body: { eventId?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  if (!body.eventId || !/^[0-9a-f-]{36}$/i.test(body.eventId)) return NextResponse.json({ error: 'Invalid session.' }, { status: 400 });
  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: event } = await admin.from('attendance_events').select('id,title,event_date,status').eq('id',body.eventId).maybeSingle();
  if (!event || event.status !== 'open') return NextResponse.json({ error: 'This attendance session is not open.' }, { status: 400 });
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  if (event.event_date !== today) return NextResponse.json({ error: 'This QR code is not for today’s session.' }, { status: 400 });
  const { data: contacts, error: contactError } = await admin.from('contacts').select('id,full_name').ilike('email',user.email.trim()).limit(2);
  if (contactError) return NextResponse.json({ error: 'Could not find your registration.' }, { status: 500 });
  if (!contacts || contacts.length !== 1) return NextResponse.json({ error: 'We could not match this email to one registered attendee. Please ask an administrator for assistance.' }, { status: 404 });
  const contact = contacts[0];
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

