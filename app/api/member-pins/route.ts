import { NextRequest,NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generatePin,hashPin } from '@/lib/member-pin';
export const dynamic='force-dynamic';
export async function POST(request:NextRequest){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!anon||!key)return NextResponse.json({error:'Not configured.'},{status:503});
  const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if(!token)return NextResponse.json({error:'Sign in required.'},{status:401});
  const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user}}=await auth.auth.getUser(token);
  if(user?.app_metadata?.role!=='super_admin')return NextResponse.json({error:'Only Super Admins can assign PINs.'},{status:403});
  let body:{contactId?:string};
  try{body=await request.json();}catch{return NextResponse.json({error:'Invalid request.'},{status:400});}
  if(!body.contactId||!/^[0-9a-f-]{36}$/i.test(body.contactId))return NextResponse.json({error:'Invalid member.'},{status:400});
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:contact,error:lookupError}=await db.from('contacts').select('id,full_name,phone_number').eq('id',body.contactId).maybeSingle();
  if(lookupError||!contact)return NextResponse.json({error:'Member not found.'},{status:404});
  if(!contact.phone_number)return NextResponse.json({error:'Add a phone number to this member before assigning a PIN.'},{status:400});
  const pin=generatePin();
  let pinHash:string;
  try{pinHash=hashPin(pin);}catch{return NextResponse.json({error:'PIN security is not configured.'},{status:503});}
  const {error}=await db.from('member_checkin_pins').upsert({contact_id:contact.id,pin_hash:pinHash,updated_at:new Date().toISOString()},{onConflict:'contact_id'});
  if(error)return NextResponse.json({error:'Could not assign PIN.'},{status:500});
  return NextResponse.json({name:contact.full_name,pin},{headers:{'Cache-Control':'no-store'}});
}
