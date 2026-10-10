// Supabase's free plan pauses a project after about a week without activity.
// This runs once a day (see netlify/functions/keepalive.mjs) and makes one tiny
// database request so the project stays awake even when nobody practises.
// It reads nothing: anonymous access to learning is blocked, and a "permission
// denied" answer from the database still proves the database is awake.
export async function keepAlive(env=process.env,transport=fetch){
 if(!env.SUPABASE_URL||!env.SUPABASE_PUBLISHABLE_KEY)return {ok:false,reason:'Supabase is not configured.'};
 let response;
 try{response=await transport(env.SUPABASE_URL+'/rest/v1/learning_records?select=record_id&limit=1',{headers:{apikey:env.SUPABASE_PUBLISHABLE_KEY},signal:AbortSignal.timeout(15000)});}
 catch(e){return {ok:false,reason:'Supabase could not be reached ('+(e.name||'error')+'). If the project is paused, restore it in the Supabase dashboard.'};}
 // 200 = allowed and empty; 401/403 = the database answered and refused anonymous access. Both mean awake.
 if([200,401,403].includes(response.status))return {ok:true,status:response.status};
 return {ok:false,status:response.status,reason:'Supabase answered with an unexpected status.'};
}
