// The streaming tutor route, written to run as a Netlify Edge Function.
// Why this exists: regular Netlify Functions cut streaming replies off after ten seconds,
// which is not enough for long explanations. Edge functions have no such ceiling.
// This module must not import anything: the build script (scripts/build.cjs) stitches it
// together with the shared prompt files into netlify/edge-functions/tutor-stream.mjs,
// because the edge runtime cannot load the browser-style shared files directly.
// It is deliberately read-only: it never renews or sets cookies. When the sign-in cookie
// is missing or about to run out it answers 401, and the app falls back to the classic
// /api/account/tutor route, which renews cookies and still works as before.

export function validTutor(body,scenarios){
 const {job,scenario,messages}=body,corrections=body.corrections,level=body.level??'normal';
 return !(!job||!['message','hint','recap'].includes(job.kind)||typeof job.text!=='string'||!job.text.trim()||job.text.length>2000||!Object.hasOwn(scenarios,scenario)||!['gentle','immediate','recap'].includes(corrections)||!['easier','normal','stretch'].includes(level)||body.memory!==undefined&&(typeof body.memory!=='object'||body.memory===null||JSON.stringify(body.memory).length>8000)||!Array.isArray(messages)||messages.length>40||messages.length%2!==0||!messages.every((m,i)=>m&&m.role===(i%2?'assistant':'user')&&typeof m.content==='string'&&m.content.length<=20000)||job.kind==='hint'&&![1,2,3].includes(job.level));
}

export function createTutorStream({tutorPrompt,scenarios,systemPrompt},getEnv,transport=fetch){
 const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
 const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
 const fromB64url=(s)=>{const bin=atob(s.replace(/-/g,'+').replace(/_/g,'/'));const out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out;};
 const fromHex=(s)=>{const out=new Uint8Array(s.length/2);for(let i=0;i<out.length;i++)out[i]=parseInt(s.slice(i*2,i*2+2),16);return out;};
 // The session cookie is sealed by server/api.mjs with AES-256-GCM as iv | tag | ciphertext.
 // WebCrypto expects ciphertext followed by tag, so the pieces are reordered before decrypting.
 async function readSession(req){
  try{
   const name='__Host-nt_session=';
   const raw=(req.headers.get('cookie')||'').split('; ').find(c=>c.startsWith(name))?.slice(name.length);
   if(!raw)return null;
   const b=fromB64url(raw);
   const key=await crypto.subtle.importKey('raw',fromHex(getEnv('SESSION_SECRET')),'AES-GCM',false,['decrypt']);
   const data=new Uint8Array(b.length-12);
   data.set(b.subarray(28),0);
   data.set(b.subarray(12,28),b.length-28);
   const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:b.subarray(0,12)},key,data);
   const value=JSON.parse(new TextDecoder().decode(plain));
   return (value.refresh?value.until>Date.now():value.exp>Date.now())?value:null;
  }catch{return null;}
 }
 async function upstream(path,{token,body,method='GET'}={}){
  const response=await transport(getEnv('SUPABASE_URL')+path,{method,headers:{apikey:getEnv('SUPABASE_PUBLISHABLE_KEY'),...(token?{authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)});
  if(!response.ok)fail(response.status===401||response.status===403?401:response.status===429?429:502,response.status===429?'Please wait a moment before trying again.':'The account service could not complete this request.');
  return response.status===204?null:response.json();
 }
 return async function handle(req){try{
  if(req.method!=='POST')fail(405,'Use POST.');
  if(req.headers.get('origin')!==getEnv('APP_ORIGIN')||req.headers.get('x-norsk-request')!=='1'||!(req.headers.get('content-type')||'').startsWith('application/json'))fail(403,'Please use the app to make this request.');
  if(getEnv('CLOUD_ENABLED')!=='true'||!getEnv('SUPABASE_URL')||!getEnv('SUPABASE_PUBLISHABLE_KEY')||!/^[a-f0-9]{64}$/i.test(getEnv('SESSION_SECRET')||'')||!getEnv('APP_ORIGIN')||!getEnv('ANTHROPIC_API_KEY'))fail(503,'The account tutor is not configured yet.');
  const session=await readSession(req);
  // A session about to run out needs renewing, which only the classic route does.
  if(!session||session.refresh&&session.exp-Date.now()<60000)fail(401,'Sign in again. Your pending learning is kept on this device.');
  const raw=await req.text();if(raw.length>1100000)fail(413,'Request is too large.');
  let body;try{body=JSON.parse(raw);}catch{fail(400,'Invalid request.');}
  if(!body||typeof body!=='object'||Array.isArray(body)||body.stream!==true)fail(400,'Invalid request.');
  if(!validTutor(body,scenarios))fail(400,'Invalid tutor request.');
  if(JSON.stringify(body.messages).length>100000)fail(413,'This conversation is too long for one request.');
  const user=await upstream('/auth/v1/user',{token:session.token});
  if(!UUID.test(user?.id))fail(401,'Please sign in again.');
  if(body.owner!==user.id)fail(409,'The signed-in account changed. Reload before continuing.');
  const allowed=await upstream('/rest/v1/rpc/claim_tutor_request',{method:'POST',token:session.token,body:{}});
  if(allowed!==true)fail(429,'You have reached the practice limit. Please try again later.');
  const {job,scenario,corrections}=body,level=body.level??'normal';
  const request=tutorPrompt.cachedRequest(systemPrompt({scenario},{corrections,level,memory:body.memory}),tutorPrompt.jobRules(job),[...body.messages,{role:'user',content:job.text}]);
  const response=await transport('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':getEnv('ANTHROPIC_API_KEY'),'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-sonnet-5-5',max_tokens:job.kind==='recap'?1400:job.kind==='hint'?850:2500,...request,stream:true}),signal:AbortSignal.timeout(120000)});
  if(!response.ok)fail(response.status===429?429:502,'The tutor could not respond. Please try again.');
  return new Response(response.body,{status:200,headers:{'content-type':'text/event-stream','cache-control':'no-store','x-content-type-options':'nosniff'}});
 }catch(e){return json({error:e.status?e.message:'The connection was interrupted. Your learning is kept on this device.'},e.status||502);}};
}
