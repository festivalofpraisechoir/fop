import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!secret)return NextResponse.json({error:'Server not configured.'},{status:503});
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)return NextResponse.json({error:'Sign in required.'},{status:401});
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user}}=await auth.auth.getUser(token);
 if(!user||!['admin','super_admin'].includes(user.app_metadata?.role)||!(user.app_metadata?.role==='super_admin'||user.app_metadata?.can_send_emails===true))return NextResponse.json({error:'Email permission required.'},{status:403});
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.from('contacts').select('email,singer_or_musician,part_or_instrument').not('email','is',null);
 if(error)return NextResponse.json({error:'Could not load recipients.'},{status:503});
 const unique=new Map<string,{email:string;group:string;part:string}>();
 for(const c of data||[]){const email=String(c.email||'').trim().toLowerCase();if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&!unique.has(email))unique.set(email,{email,group:c.singer_or_musician||'',part:c.part_or_instrument||''});}
 return NextResponse.json({recipients:Array.from(unique.values())},{headers:{'Cache-Control':'no-store'}});
}
