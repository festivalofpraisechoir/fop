import {NextRequest,NextResponse} from 'next/server';
import {access} from '@/lib/gmail-server';
export const dynamic='force-dynamic';
export const revalidate=0;
const headers={'Cache-Control':'private, no-store, max-age=0'};
export async function GET(req:NextRequest){
 try{
  const {c}=await access(req);
  const {data,error}=await c.admin.from('gmail_connections').select('id,email,connected_at').eq('id','official').maybeSingle();
  if(error)throw Error('Gmail connection lookup failed: '+error.message);
  const projectHost=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname;
  return NextResponse.json({connected:!!data,email:data?.email||null,connectedAt:data?.connected_at||null,diagnostics:{projectHost,recordFound:!!data}},{headers});
 }catch(e){
  return NextResponse.json({error:e instanceof Error?e.message:'Unavailable'},{status:403,headers});
 }
}