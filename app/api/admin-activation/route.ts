import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return NextResponse.json({error:'Activation is unavailable.'},{status:503});
  let body:{email?:string;code?:string;password?:string};
  try{body=await request.json();}catch{return NextResponse.json({error:'Invalid request.'},{status:400});}
  const email=body.email?.trim().toLowerCase()||'';
  const code=body.code?.trim().toLowerCase()||'';
  const password=body.password||'';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!/^[a-f0-9]{32}$/.test(code)||password.length<12||password.length>128)return NextResponse.json({error:'Enter your email, 32-character activation code and a password of at least 12 characters.'},{status:400});
  const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const hash=createHash('sha256').update(code).digest('hex');
  const {data:record}=await admin.from('admin_activation_codes').select('id,user_id').eq('code_hash',hash).is('used_at',null).gt('expires_at',new Date().toISOString()).maybeSingle();
  if(!record)return NextResponse.json({error:'Code invalid or expired. Ask your Super Admin for a new code.'},{status:400});
  const {data:userData,error:userError}=await admin.auth.admin.getUserById(record.user_id);
  if(userError||userData.user?.email?.toLowerCase()!==email||userData.user?.app_metadata?.role!=='admin')return NextResponse.json({error:'Code invalid or expired.'},{status:400});
  // Claim the code exactly once before changing the password.
  const {data:claimed,error:claimError}=await admin.from('admin_activation_codes').update({used_at:new Date().toISOString()}).eq('id',record.id).is('used_at',null).gt('expires_at',new Date().toISOString()).select('id');
  if(claimError||!claimed?.length)return NextResponse.json({error:'This code was already used or expired.'},{status:400});
  const {error:updateError}=await admin.auth.admin.updateUserById(record.user_id,{password});
  if(updateError)return NextResponse.json({error:'Could not set password. Ask the Super Admin to generate a new code.'},{status:500});
  return NextResponse.json({success:true},{headers:{'Cache-Control':'no-store'}});
}
