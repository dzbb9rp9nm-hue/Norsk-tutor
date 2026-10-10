// Isolated PostgreSQL validation. Auth roles/UID are simulated; no live account or data is used.
// Run with PGLITE_MODULE pointing to the installed @electric-sql/pglite module.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('database setup enforces owner isolation, validated writes and revision conflicts', {skip:!process.env.PGLITE_MODULE},async()=>{
  const {PGlite}=require(process.env.PGLITE_MODULE);
  const db=await PGlite.create();
  const ownerA='11111111-1111-4111-8111-111111111111';
  const ownerB='22222222-2222-4222-8222-222222222222';
  const record='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  try{
    await db.exec(`create role anon nologin; create role authenticated nologin;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated,anon;
      grant execute on function auth.uid() to authenticated,anon;`);
    await db.query('insert into auth.users(id) values ($1),($2)',[ownerA,ownerB]);
    await db.exec(fs.readFileSync('database/001_learning.sql','utf8'));
    await db.exec(fs.readFileSync('database/002_tutor_limits.sql','utf8'));
    const asUser=async uid=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);await db.exec('set role authenticated');};
    const save=async(body,revision=0,deleted=false,kind='phrase')=>(await db.query('select public.save_learning_record($1,$2,$3::jsonb,$4,$5) as result',[record,kind,JSON.stringify(body),revision,deleted])).rows[0].result;
    const body={id:record,nb:'Hei!',en:'Hi!',origin:'Test'};
    await asUser(ownerA);
    assert.equal((await db.query('select public.claim_tutor_request() as allowed')).rows[0].allowed,true);
    assert.equal((await db.query('select public.claim_tutor_request() as allowed')).rows[0].allowed,false);
    await assert.rejects(db.query('select * from public.tutor_usage'),/permission denied/);
    await db.exec('reset role');
    await db.query("update public.tutor_usage set requests=150,last_request=now()-interval '10 seconds' where owner_id=$1",[ownerA]);
    await asUser(ownerA);
    assert.equal((await db.query('select public.claim_tutor_request() as allowed')).rows[0].allowed,false);
    await asUser(ownerB);
    assert.equal((await db.query('select public.claim_tutor_request() as allowed')).rows[0].allowed,true);
    await asUser(ownerA);
    let r=await save(body);assert.equal(r.saved,true);assert.equal(r.record.owner_id,ownerA);assert.equal(r.record.revision,1);
    assert.equal((await db.query('select * from public.learning_records')).rows.length,1);
    await assert.rejects(db.query("insert into public.learning_records(owner_id,record_id,kind,body) values($1,$2,'phrase','{}')",[ownerB,record]),/permission denied/);
    await assert.rejects(db.query("update public.learning_records set revision=99"),/permission denied/);
    await assert.rejects(db.query('delete from public.learning_records'),/permission denied/);
    r=await save({...body,nb:'God dag!'},1);assert.equal(r.record.revision,2);
    r=await save(body,1);assert.equal(r.saved,false);assert.equal(r.conflict,true);assert.equal(r.record.body.nb,'God dag!');
    await assert.rejects(save({...body,api_key:'not-a-real-secret'},2),/Credentials/);
    await assert.rejects(save({...body,nb:'x'.repeat(1000001)},2),/Invalid learning record/);
    await assert.rejects(save({...body,id:ownerA},2),/Record ID mismatch/);
    await asUser(ownerB);
    assert.equal((await db.query('select * from public.learning_records')).rows.length,0);
    r=await save(body,2);assert.equal(r.saved,false);assert.equal(r.record,null); // Cannot infer A's contents by guessing its ID.
    r=await save({...body,nb:'Owner B'},0);assert.equal(r.saved,true);assert.equal(r.record.owner_id,ownerB);
    await asUser(ownerA);
    assert.equal((await db.query('select * from public.learning_records')).rows[0].body.nb,'God dag!');
    r=await save({},2,true);assert.equal(r.saved,true);assert.equal(r.record.deleted,true);assert.deepEqual(r.record.body,{});
    r=await save(body,2);assert.equal(r.conflict,true); // Stale device cannot resurrect a deletion.
    r=await save(body,3);assert.equal(r.saved,true);assert.equal(r.record.revision,4);assert.equal(r.record.body.nb,body.nb); // Explicit backup restoration against the acknowledged tombstone.
    await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub','',false)");await db.exec('set role authenticated');
    await assert.rejects(save(body),/Sign-in required/);
    await db.exec('reset role; set role anon');
    await assert.rejects(db.query('select * from public.learning_records'),/permission denied/);
    await assert.rejects(save(body),/permission denied/);
    await db.exec('reset role');
    await db.query('delete from auth.users where id=$1',[ownerA]);
    assert.equal((await db.query('select * from public.learning_records where owner_id=$1',[ownerA])).rows.length,0);
    assert.equal((await db.query('select * from public.learning_records where owner_id=$1',[ownerB])).rows.length,1);
  }finally{await db.close();}
});

test('lesson-progress update: safe to rerun, stores progress, refuses bad shapes, stamps each save in order', {skip:!process.env.PGLITE_MODULE},async()=>{
  const {PGlite}=require(process.env.PGLITE_MODULE);
  const db=await PGlite.create();
  const owner='11111111-1111-4111-8111-111111111111',audio='a0d10000-0000-4000-8000-000000000001',phrase='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  try{
    await db.exec(`create role anon nologin; create role authenticated nologin;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated,anon;
      grant execute on function auth.uid() to authenticated,anon;`);
    await db.query('insert into auth.users(id) values ($1)',[owner]);
    for(const f of ['001_learning.sql','002_tutor_limits.sql'])await db.exec(fs.readFileSync('database/'+f,'utf8'));
    const migration=fs.readFileSync('database/003_audio_and_change_times.sql','utf8');
    await db.exec(migration);await db.exec(migration); // Running it twice must be harmless.
    const check=(await db.query("select pg_catalog.pg_get_constraintdef(oid) like '%audio%' as ok from pg_catalog.pg_constraint where conname='learning_records_kind_check'")).rows[0].ok;assert.equal(check,true);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);await db.exec('set role authenticated');
    const save=async(id,kind,body,revision=0)=>(await db.query('select public.save_learning_record($1,$2,$3::jsonb,$4,false) as result',[id,kind,JSON.stringify(body),revision])).rows[0].result;
    let r=await save(phrase,'phrase',{id:phrase,nb:'Hei',en:'Hi',origin:'Test'});assert.equal(r.saved,true,'existing kinds still save');
    const first=r.record.updated_at;
    r=await save(audio,'audio',{progress:{greetings:{v:3,at:1}},ratings:{}});assert.equal(r.saved,true);assert.equal(r.record.kind,'audio');
    assert.ok(new Date(r.record.updated_at)>=new Date(first),'later saves get later stamps');
    r=await save(audio,'audio',{progress:{greetings:{v:5,at:2}},ratings:{}},1);assert.equal(r.record.revision,2);
    await assert.rejects(save(phrase.replace('a','b'),'audio',{progress:{},ratings:{}}),/Invalid lesson progress/);
    await assert.rejects(save(audio,'audio',{progress:[],ratings:{}},2),/Invalid lesson progress/);
    await assert.rejects(save(audio,'audio',{progress:{},ratings:{},extra:1},2),/Invalid lesson progress/);
    await assert.rejects(save(phrase,'mystery',{},1),/Invalid learning record/);
    const rows=(await db.query('select record_id,updated_at from public.learning_records order by updated_at,record_id')).rows;
    assert.deepEqual(rows.map(x=>x.record_id),[phrase,audio],'change order matches save order');
  }finally{await db.close();}
});
