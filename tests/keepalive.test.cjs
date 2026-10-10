const {test}=require('node:test');
const assert=require('node:assert/strict');
const env={SUPABASE_URL:'https://db.test',SUPABASE_PUBLISHABLE_KEY:'public-test'};
test('keep-alive makes one harmless database request with the public key only',async()=>{
 const {keepAlive}=await import('../server/keepalive.mjs');const calls=[];
 const result=await keepAlive({...env,ANTHROPIC_API_KEY:'private',SESSION_SECRET:'x'},async(url,options)=>{calls.push({url,options});return new Response('{"code":"42501"}',{status:401});});
 assert.deepEqual(result,{ok:true,status:401});assert.equal(calls.length,1);assert.match(calls[0].url,/^https:\/\/db\.test\/rest\/v1\/learning_records\?select=record_id&limit=1$/);
 assert.deepEqual(Object.keys(calls[0].options.headers),['apikey']);assert.ok(!JSON.stringify(calls[0].options).includes('private'));
});
test('a paused or unreachable project is reported, not hidden',async()=>{
 const {keepAlive}=await import('../server/keepalive.mjs');
 assert.equal((await keepAlive(env,async()=>{throw new TypeError('fetch failed');})).ok,false);
 assert.equal((await keepAlive(env,async()=>new Response('',{status:540}))).ok,false);
 assert.equal((await keepAlive({},async()=>{throw Error('should not call');})).ok,false);
});
test('the schedule runs once a day and is not a public endpoint',async()=>{
 const src=require('node:fs').readFileSync('netlify/functions/keepalive.mjs','utf8');
 assert.match(src,/schedule:'17 6 \* \* \*'/);assert.doesNotMatch(src,/path:/);
});
