import {NextRequest,NextResponse} from 'next/server';
import {access} from '@/lib/gmail-server';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 try{const {c}=await access(req);
 const subject=req.nextUrl.searchParams.get('subject')?.trim()||'';
 if(!subject||subject.length>180)return NextResponse.json({error:'Subject required'},{status:400});
 const {data,error}=await c.admin.from('gmail_send_log').select('recipient_email,status,created_at').eq('subject',subject).order('created_at',{ascending:false}).limit(1000);
 if(error)throw error;
 const statuses:Record<string,string>={};
 for(const row of data||[]){const email=String(row.recipient_email).toLowerCase();if(!(email in statuses))statuses[email]=row.status;}
 return NextResponse.json({statuses},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unavailable'},{status:403});}
}