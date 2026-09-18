import {randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
import learning from '../learning.js';
import scenarios from '../scenarios.js';
import systemPrompt from './prompt.cjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SESSION='__Host-nt_session';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export function createAPI(env=process.env,transport=fetch){
 const enabled=env.CLOUD_ENABLED==='true';
 const ready=enabled&&env.SUPABASE_URL&&env.SUPABASE_PUBLISHABLE_KEY&&/^[a-f0-9]{64}$/i.test(env.SESSION_SECRET||'')&&env.APP_ORIGIN;
 const json=(body,status=200,cookies=[])=>{const headers=new Headers({'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});for(const c of cookies)headers.append('set-cookie',c);return new Response(JSON.stringify(body),{status,headers});};
 const cookie=(name,value,age)=>`${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
 function seal(value){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',Buffer.from(env.SESSION_SECRET,'hex'),iv);const body=Buffer.concat([cipher.update(JSON.stringify(value)),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),body]).toString('base64url');}
 function read(req,name){try{const raw=(req.headers.get('cookie')||'').split('; ').find(c=>c.startsWith(name+'='))?.slice(name.length+1);if(!raw)return null;const b=Buffer.from(raw,'base64url');const decipher=createDecipheriv('aes-256-gcm',Buffer.from(env.SESSION_SECRET,'hex'),b.subarray(0,12));decipher.setAuthTag(b.subarray(12,28));const value=JSON.parse(Buffer.concat([decipher.update(b.subarray(28)),decipher.final()]));return value.exp>Date.now()?value:null;}catch{return null;}}
 async function upstream(path,{token,body,method='GET'}={}){
  const response=await transport(env.SUPABASE_URL+path,{method,headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY,...(token?{authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)});
  if(!response.ok)fail(response.status===401||response.status===403?401:response.status===429?429:502,response.status===429?'Please wait a moment before trying again.':'The account service could not complete this request.');
  return response.status===204?null:response.json();
 }
 async function identity(req){const session=read(req,SESSION);if(!session)fail(401,'Sign in again. Your pending learning is kept on this device.');const user=await upstream('/auth/v1/user',{token:session.token});if(!UUID.test(user.id))fail(401,'Please sign in again.');return {user,token:session.token};}
 function cleanRecord(record){
  if(!record||!UUID.test(record.record_id)||!['session','phrase'].includes(record.kind)||!Number.isSafeInteger(record.revision)||record.revision<0||typeof record.deleted!=='boolean')fail(400,'Invalid learning record.');
  if(record.deleted)return {...record,body:{}};
  const value={version:1,sessions:record.kind==='session'?[record.body]:[],phrases:record.kind==='phrase'?[record.body]:[]};
  if(!learning.validData(value)||record.body.id!==record.record_id)fail(400,'Invalid learning record.');
  return {...record,body:learning.normalizeData(value)[record.kind==='session'?'sessions':'phrases'][0]};
 }
 return async function handle(req){try{
  const route=new URL(req.url).pathname.split('/').pop();
  if(route==='status'&&req.method==='GET'){
   if(!ready)return json({enabled:false});
   try{const {user}=await identity(req);return json({enabled:true,user:{id:user.id,email:user.email},tutor:!!env.ANTHROPIC_API_KEY});}
   catch(e){if(e.status===401)return json({enabled:true,user:null});throw e;}
  }
  if(!ready)fail(503,'Account connection is not enabled yet. Browser practice is still available.');
  if(req.method!=='POST')fail(405,'Use POST.');
  if(req.headers.get('origin')!==env.APP_ORIGIN||req.headers.get('x-norsk-request')!=='1'||!req.headers.get('content-type')?.startsWith('application/json'))fail(403,'Please use the app to make this request.');
  const raw=await req.text();if(Buffer.byteLength(raw)>1100000)fail(413,'Request is too large.');
  let body;try{body=JSON.parse(raw);}catch{fail(400,'Invalid request.');}
  if(!body||typeof body!=='object'||Array.isArray(body))fail(400,'Invalid request.');
  if(route==='sign-in'){
   const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
   const password=typeof body.password==='string'?body.password:'';
   if(email.length>254||!/^\S+@\S+\.\S+$/.test(email)||password.length<8||password.length>256)fail(400,'Enter your email and password.');
   const session=await upstream('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});
   if(!session.access_token||!UUID.test(session.user?.id)||!Number.isFinite(session.expires_in))fail(502,'Sign-in could not be completed.');
   const age=Math.min(session.expires_in,3600);
   return json({user:{id:session.user.id,email:session.user.email},tutor:!!env.ANTHROPIC_API_KEY},200,[cookie(SESSION,seal({token:session.access_token,exp:Date.now()+age*1000}),age)]);
  }
  if(route==='sign-out'){
   const session=read(req,SESSION);
   if(session)await upstream('/auth/v1/logout?scope=local',{method:'POST',token:session.token}).catch(e=>{if(e.status!==401)throw e;});
   return json({signedOut:true},200,[cookie(SESSION,'',0)]);
  }
  const {user,token}=await identity(req);
  // Every client mutation/read is bound to the workspace it came from.
  if(body.owner!==user.id)fail(409,'The signed-in account changed. Reload before continuing.');
  if(route==='records'){
   const offset=body.offset??0;if(!Number.isInteger(offset)||offset<0||offset>6000)fail(400,'Invalid page.');
   const records=await upstream(`/rest/v1/learning_records?select=record_id,kind,body,revision,deleted&kind=in.(session,phrase)&order=record_id&limit=100&offset=${offset}`,{token});
   return json({records:records.map(r=>cleanRecord(r)),more:records.length===100});
  }
  if(route==='save'){
   const r=cleanRecord(body.record);
   const result=await upstream('/rest/v1/rpc/save_learning_record',{method:'POST',token,body:{p_record_id:r.record_id,p_kind:r.kind,p_body:r.body,p_expected_revision:r.revision,p_deleted:r.deleted}});
   return json({saved:result.saved,conflict:result.conflict,record:result.record?cleanRecord(result.record):null});
  }
  if(route==='tutor'){
   if(!env.ANTHROPIC_API_KEY)fail(503,'The account tutor is not configured yet.');
   const {job,scenario,messages,corrections}=body;
   if(!job||!['message','hint','recap'].includes(job.kind)||typeof job.text!=='string'||!job.text.trim()||job.text.length>2000||!Object.hasOwn(scenarios,scenario)||!['gentle','immediate','recap'].includes(corrections)||!Array.isArray(messages)||messages.length>40||messages.length%2!==0||!messages.every((m,i)=>m&&m.role===(i%2?'assistant':'user')&&typeof m.content==='string'&&m.content.length<=20000)||job.kind==='hint'&&![1,2,3].includes(job.level))fail(400,'Invalid tutor request.');
   if(JSON.stringify(messages).length>100000)fail(413,'This conversation is too long for one request.');
   const allowed=await upstream('/rest/v1/rpc/claim_tutor_request',{method:'POST',token,body:{}});
   if(allowed!==true)fail(429,'You have reached the practice limit. Please try again later.');
   const response=await transport('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-haiku-4-5',max_tokens:job.kind==='recap'?1400:850,system:systemPrompt(job,{scenario},{corrections}),messages:[...messages,{role:'user',content:job.text}]}),signal:AbortSignal.timeout(25000)});
   if(!response.ok)fail(response.status===429?429:502,'The tutor could not respond. Please try again.');
   const reply=await response.json();return json({content:reply.content,stop_reason:reply.stop_reason});
  }
  fail(404,'Unknown request.');
 }catch(e){return json({error:e.status?e.message:'The connection was interrupted. Your learning is kept on this device.'},e.status||502);}};
}
