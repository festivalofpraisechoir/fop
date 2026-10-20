import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { currentQr } from '@/lib/attendance-qr';

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Not configured.' }, { status: 503 });
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user || !['admin', 'super_admin'].includes(String(user.app_metadata?.role))) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });
  const eventId = request.nextUrl.searchParams.get('eventId') || '';
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) return NextResponse.json({ error: 'Invalid session.' }, { status: 400 });
  const { data: event } = await supabase.from('attendance_events').select('id,event_date,status').eq('id', eventId).maybeSingle();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  if (!event || event.status !== 'open' || event.event_date !== today) return NextResponse.json({ error: 'Only an open session scheduled for today can show a QR code.' }, { status: 400 });
  try { return NextResponse.json(currentQr(eventId), { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return NextResponse.json({ error: 'QR signing secret is not configured.' }, { status: 503 }); }
}
