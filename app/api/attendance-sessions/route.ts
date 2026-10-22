import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

async function context(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !secret) return { error: fail('Server is not configured.', 503) };
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return { error: fail('Sign in required.', 401) };
  const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await auth.auth.getUser(token);
  if (error || !user) return { error: fail('Sign in again.', 401) };
  if (user.app_metadata?.role !== 'super_admin') return { error: fail('Only Super Admins can manage sessions.', 403) };
  return { admin: createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } }), user };
}

export async function PATCH(request: NextRequest) {
  const ctx = await context(request);
  if (ctx.error) return ctx.error;
  let body: { eventId?: string; status?: string; title?: string };
  try { body = await request.json(); } catch { return fail('Invalid request.', 400); }
  if (!body.eventId || !/^[0-9a-f-]{36}$/i.test(body.eventId)) return fail('Invalid session.', 400);
  if (body.status === undefined && body.title === undefined) return fail('Provide a session name or status.', 400);
  if (body.status !== undefined && !['open','closed'].includes(body.status)) return fail('Invalid session status.', 400);
  if (body.title !== undefined && (typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 120)) return fail('Session name must be 1–120 characters.', 400);
  const updates: {status?:string;title?:string} = {};
  if (body.status !== undefined) updates.status = body.status;
  if (body.title !== undefined) updates.title = body.title.trim();
  const { data, error } = await ctx.admin!.from('attendance_events').update(updates).eq('id', body.eventId).select('id,status,title').maybeSingle();
  if (error) return fail(error.code === '23505' ? 'A session with this name already exists on that date.' : 'Could not update session: ' + error.message, error.code === '23505' ? 409 : 500);
  if (!data) return fail('Session not found.', 404);
  return NextResponse.json({ session: data }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE(request: NextRequest) {
  const ctx = await context(request);
  if (ctx.error) return ctx.error;
  let body: { eventId?: string; confirmation?: string; expectedRecordCount?: number };
  try { body = await request.json(); } catch { return fail('Invalid request.', 400); }
  if (!body.eventId || !/^[0-9a-f-]{36}$/i.test(body.eventId) || body.confirmation !== 'DELETE SESSION' || !Number.isSafeInteger(body.expectedRecordCount) || (body.expectedRecordCount ?? -1) < 0) return fail('Invalid deletion confirmation.', 400);
  const { data: session, error: sessionError } = await ctx.admin!.from('attendance_events').select('id,title,event_date').eq('id', body.eventId).maybeSingle();
  if (sessionError) return fail('Could not verify session.', 500);
  if (!session) return fail('Session not found.', 404);
  const { count, error: countError } = await ctx.admin!.from('attendance_records').select('id', { count: 'exact', head: true }).eq('event_id', body.eventId);
  if (countError || count === null) return fail('Could not verify attendance records.', 500);
  if (count !== body.expectedRecordCount) return fail('Attendance count changed. Refresh and confirm again.', 409);
  const { data: deleted, error } = await ctx.admin!.from('attendance_events').delete().eq('id', body.eventId).select('id');
  if (error) return fail('Could not delete session: ' + error.message, 500);
  if (!deleted?.length) return fail('Session was not deleted.', 404);
  return NextResponse.json({ deleted: true, attendanceRecordsRemoved: count }, { headers: { 'Cache-Control': 'no-store' } });
}
