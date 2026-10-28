import {NextRequest,NextResponse} from 'next/server';
import {access} from '@/lib/gmail-server';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 try{
  const {c}=await access(req);
  const subject=(req.nextUrl.searchParams.get('subject')||'').trim();
  if(subject.length>180)return NextResponse.json({error:'Subject too long'},{status:400});
  const [{data:contacts,error:contactsError},{data:logs,error:logsError}]=await Promise.all([
   c.admin.from('contacts').select('email').not('email','is',null).limit(5000),
   c.admin.from('gmail_send_log').select('recipient_email,subject,status,created_at,error').order('created_at',{ascending:false}).limit(5000)
  ]);
  if(contactsError||logsError)throw Error('Could not load email log');
  const valid=(s:string)=>/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(s);
  const members=Array.from(new Set((contacts||[]).map(x=>String(x.email||'').trim().toLowerCase()).filter(valid))).sort();
  const allLogs=logs||[];
  const subjects=Array.from(new Set(allLogs.map(x=>String(x.subject||'')).filter(Boolean)));
  const chosen=subject||subjects[0]||'';
  const byEmail=new Map<string,{status:string;created_at:string;error:string|null}>();
  for(const log of allLogs){
   if(log.subject!==chosen)continue;
   const email=String(log.recipient_email||'').trim().toLowerCase();
   if(!byEmail.has(email))byEmail.set(email,{status:log.status,created_at:log.created_at,error:log.error||null});
  }
  const rows=members.map(email=>({email,...(byEmail.get(email)||{status:'not_sent',created_at:null,error:null})}));
  return NextResponse.json({subject:chosen,subjects,rows,counts:{sent:rows.filter(r=>r.status==='sent').length,failed:rows.filter(r=>r.status==='failed').length,not_sent:rows.filter(r=>r.status==='not_sent').length,total:rows.length}}, {headers:{'Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unavailable'},{status:403});}
}