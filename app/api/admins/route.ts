import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function clients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !secret) return null;
  return {
    auth: createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } }),
    admin: createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } }),
  };
}

async function authorised(request: NextRequest) {
  const pair = clients();
  if (!pair) return { error: NextResponse.json({ error: 'Admin management is not configured. Ask the site owner to set the server-side Supabase service role key.' }, { status: 503 }) };
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return { error: NextResponse.json({ error: 'Please sign in.' }, { status: 401 }) };
  const { data, error } = await pair.auth.auth.getUser(token);
  if (error || !data.user) return { error: NextResponse.json({ error: 'Your session has expired. Sign in again.' }, { status: 401 }) };
  if (data.user.app_metadata?.role !== 'super_admin') return { error: NextResponse.json({ error: 'Only Super Admins can manage administrators.' }, { status: 403 }) };
  return { pair, user: data.user };
}

export async function GET(request: NextRequest) {
  const access = await authorised(request);
  if ('error' in access) return access.error;
  const admins: { id: string; email: string; role: string; created_at: string }[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await access.pair.admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) return NextResponse.json({ error: 'Could not load administrators.' }, { status: 500 });
    for (const user of data.users) {
      const role = user.app_metadata?.role;
      if (role === 'admin' || role === 'super_admin') admins.push({ id: user.id, email: user.email || '', role, created_at: user.created_at });
    }
    if (data.users.length < 100) break;
  }
  return NextResponse.json({ admins }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const access = await authorised(request);
  if ('error' in access) return access.error;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  const email = typeof body === 'object' && body !== null && 'email' in body && typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  // Only the admin role can be granted from this endpoint. No privilege escalation to Super Admin.
  const { data, error } = await access.pair.admin.auth.admin.inviteUserByEmail(email, { redirectTo: new URL('/reset-password/update', request.url).origin + '/reset-password/update' });
  if (error || !data.user) return NextResponse.json({ error: 'Could not invite this user. They may already have an account or email invitations may not be configured.' }, { status: 400 });
  const updated = await access.pair.admin.auth.admin.updateUserById(data.user.id, { app_metadata: { ...data.user.app_metadata, role: 'admin' } });
  if (updated.error) {
    // Prevent an invited account with no role from being mistaken for a completed admin invite.
    return NextResponse.json({ error: 'Invitation sent, but the admin role could not be assigned. Contact the system owner before trying again.' }, { status: 500 });
  }
  return NextResponse.json({ admin: { id: data.user.id, email, role: 'admin' }, message: 'Admin invitation sent.' }, { status: 201 });
}
