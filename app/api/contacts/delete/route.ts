import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
function response(error: string, status: number) { return NextResponse.json({ error }, { status }); }

export async function DELETE(request: NextRequest) {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!anon||!secret) return response('Contact management is not configured.',503);
  const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if(!token) return response('Sign in required.',401);
  const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await auth.auth.getUser(token);
  if(authError||!user) return response('Your session has expired.',401);
  if(user.app_metadata?.role!=='super_admin') return response('Only Super Admins can delete contacts.',403);
  let body: { mode?: string; id?: string; confirmation?: string; expectedCount?: number };
  try {body=await request.json();}catch{return response('Invalid request.',400);}
  const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  if(body.mode==='single'){
    if(!body.id||!/^[0-9a-f-]{36}$/i.test(body.id)||body.confirmation!=='DELETE')return response('Invalid deletion confirmation.',400);
    const {data:contact,error:lookupError}=await admin.from('contacts').select('id,full_name').eq('id',body.id).maybeSingle();
    if(lookupError||!contact)return response('Contact not found.',404);
    const {error}=await admin.from('contacts').delete().eq('id',body.id);
    if(error)return response('Could not delete contact: '+error.message,500);
    await admin.from('audit_logs').insert({actor_id:user.id,action:'contact_deleted',entity_type:'contacts',entity_id:body.id,details:{name:contact.full_name}});
    return NextResponse.json({deleted:1},{headers:{'Cache-Control':'no-store'}});
  }
  if(body.mode!=='all'||body.confirmation!=='DELETE ALL CONTACTS'||!Number.isSafeInteger(body.expectedCount)||body.expectedCount<1)return response('Deletion confirmation is invalid.',400);
  const {count,error:countError}=await admin.from('contacts').select('id',{count:'exact',head:true});
  if(countError||count===null)return response('Could not verify the contact count.',500);
  if(count!==body.expectedCount)return response('The contact count has changed. Refresh and confirm again.',409);
  // Delete in bounded batches, ensuring no silent partial success.
  let deleted=0;
  while(true){
    const {data:batch,error:readError}=await admin.from('contacts').select('id').order('id').limit(200);
    if(readError)return response('Deletion stopped after '+deleted+' contacts. '+readError.message,500);
    if(!batch?.length)break;
    const ids=batch.map(c=>c.id);
    const {data:removed,error:deleteError}=await admin.from('contacts').delete().in('id',ids).select('id');
    if(deleteError)return response('Deletion stopped after '+deleted+' contacts. '+deleteError.message,500);
    if(!removed||removed.length!==ids.length)return response('Deletion stopped due to a mismatch. Refresh the contact list.',500);
    deleted+=removed.length;
  }
  await admin.from('audit_logs').insert({actor_id:user.id,action:'all_contacts_deleted',entity_type:'contacts',details:{deleted_count:deleted}});
  return NextResponse.json({deleted},{headers:{'Cache-Control':'no-store'}});
}
