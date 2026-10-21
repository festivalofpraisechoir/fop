import { NextRequest,NextResponse } from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {generatePin,hashPin} from '@/lib/member-pin';
export const dynamic='force-dynamic';
export async function POST(request:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!key)return NextResponse.json({error:'Not configured.'},{status:503});
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)return NextResponse.json({error:'Sign in required.'},{status:401});
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user}}=await auth.auth.getUser(token);
 if(user?.app_metadata?.role!=='super_admin')return NextResponse.json({error:'Only Super Admins can manage the shared PIN.'},{status:403});
 const pin=generatePin();let pinHash:string;
 try{pinHash=hashPin(pin);}catch{return NextResponse.json({error:'PIN security is not configured.'},{status:503});}
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {error}=await db.from('shared_checkin_pin').upsert({id:1,pin_hash:pinHash,updated_at:new Date().toISOString()},{onConflict:'id'});
 if(error)return NextResponse.json({error:'Could not save shared PIN.'},{status:500});
 return NextResponse.json({pin},{headers:{'Cache-Control':'no-store'}});
}
