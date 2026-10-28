import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';
const response=(error:string,status:number)=>NextResponse.json({error},{status,headers:{'Cache-Control':'no-store'}});
export async function PATCH(request:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!secret)return response('Server not configured.',503);
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
 if(!token)return response('Sign in required.',401);
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user}}=await auth.auth.getUser(token);
 if(user?.app_metadata?.role!=='super_admin')return response('Only a Super Admin can change email permissions.',403);
 let body:{id?:string;enabled?:boolean};
 try{body=await request.json()}catch{return response('Invalid request.',400)}
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(body.id||'')||typeof body.enabled!=='boolean')return response('Invalid permission change.',400);
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:targetData,error:lookupError}=await db.auth.admin.getUserById(body.id!);
 const target=targetData.user;
 if(lookupError||!target)return response('Admin not found.',404);
 if(target.app_metadata?.role!=='admin')return response('Only regular admins can have this permission changed.',403);
 const {error}=await db.auth.admin.updateUserById(target.id,{app_metadata:{can_send_emails:body.enabled}});
 if(error)return response('Could not update email permission.',500);
 const {data:verified}=await db.auth.admin.getUserById(target.id);
 if(verified.user?.app_metadata?.can_send_emails!==body.enabled)return response('Could not verify permission update.',500);
 return NextResponse.json({success:true,enabled:body.enabled},{headers:{'Cache-Control':'no-store'}});
}
