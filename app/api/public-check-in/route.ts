import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
const disabled = () => NextResponse.json({ error: 'Attendee self-check-in has been retired. Please ask an administrator to record attendance.' }, { status: 410, headers: { 'Cache-Control': 'no-store' } });
export const GET = disabled;
export const POST = disabled;
export const PATCH = disabled;
export const DELETE = disabled;
