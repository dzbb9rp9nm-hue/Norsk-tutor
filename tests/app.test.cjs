const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const {webcrypto}=require('node:crypto');
class Element{
 constructor(){this.value='';this.textContent='';this.children=[];this.hidden=false;this.disabled=false;this.open=false;this.events={};this.dataset={};this.classList={toggle(){}};}
 append(...nodes){this.children.push(...nodes)} replaceChildren(...nodes){this.children=nodes} setAttribute(){} removeAttribute(){} focus(){} remove(){} click(){} addEventListener(name,fn){this.events[name]=fn} showModal(){this.open=true}close(){this.open=false} }
function app(stored={}){
 const elements=new Map(),store=new Map(Object.entries(stored));const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id)};
 const timers=new Map();let timerId=0;const spoken=[];let latestRecognition;
 class Recognition {constructor(){latestRecognition=this}start(){}stop(){this.onend?.()}abort(){this.onend?.()}}
 const context=vm.createContext({console,crypto:webcrypto,AbortController,AbortSignal,Blob,URL,Date,JSON,Object,window:{scrollTo(){},addEventListener(){},SpeechRecognition:Recognition,SpeechSynthesisUtterance:function(t){this.text=t},speechSynthesis:{cancel(){},getVoices(){return []},speak(u){spoken.push(u)}}},SpeechSynthesisUtterance:function(t){this.text=t},document:{getElementById:get,createElement:()=>new Element(),querySelectorAll:()=>[],querySelector:()=>get('brand'),body:new Element(),addEventListener(){},hidden:false},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},setTimeout:(fn,delay)=>{timers.set(++timerId,{fn,delay});return timerId},clearTimeout:id=>timers.delete(id),fetch:async()=>{throw Error('Unexpected request')}});
 vm.runInContext(fs.readFileSync('scenarios.js','utf8')+'\n'+fs.readFileSync('tutor-prompt.js','utf8')+'\n'+fs.readFileSync('learning.js','utf8')+'\n'+fs.readFileSync('sync.js','utf8')+'\n'+fs.readFileSync('app.js','utf8')+'\nthis.testing={SCENARIOS,renderScenarios,startSession,newSession,runJob,parseReply,save,importLearning,startListening,stopAudio,showView,validData,sanitizeImport,exportBackup,enterAccount,syncAccount,validateRemote,get state(){return {active,data,busy,retryJob,prefs,account,cloudBase,cloudConflicts,cloudBusy,cloudPaused}}, get recognition(){return recognition}};',context);
 return {context,api:context.testing,get,store,timers,spoken,recognition:()=>latestRecognition};
}
const reply={parts:[{t:'Vil du ha melk?',lang:'nb'}],trans:'Would you like milk?',heard:'I would like a coffee.',listen:'nb'};
function response(value=reply){return {ok:true,json:async()=>({content:[{type:'text',text:JSON.stringify(value)}],stop_reason:'end_turn'})}}
function draft(a,text='Jeg vil ha en kaffe.'){a.get('draft').value=text;a.get('draft').events.input();}
const job={kind:'message',text:'Jeg vil ha en kaffe.',lang:'nb'};

test('successful turn persists and reload restores session and notebook',async()=>{
 const a=app({'nt_key':'sk-ant-test'});a.api.startSession('cafe');draft(a);a.context.fetch=async()=>response();await a.api.runJob(job);
 assert.equal(a.api.state.active.messages.length,3);assert.equal(a.api.state.active.draft,'');
 const b=app(Object.fromEntries(a.store));assert.equal(b.api.state.active.messages.length,3);assert.equal(b.api.state.active.scenario,'cafe');
});
test('failed and malformed replies preserve draft and do not commit duplicate turns',async()=>{
 const a=app({'nt_key':'sk-ant-test'});a.api.startSession('cafe');draft(a);a.context.fetch=async()=>({ok:false,status:429});await a.api.runJob(job);
 assert.equal(a.api.state.active.messages.length,1);assert.equal(a.api.state.active.draft,job.text);assert.ok(a.api.state.retryJob);
 a.context.fetch=async()=>response({parts:[]});await a.api.runJob(job);assert.equal(a.api.state.active.api.length,2);
 a.context.fetch=async()=>response();await a.api.runJob(job);assert.equal(a.api.state.active.api.length,4);assert.equal(a.api.state.active.messages.filter(m=>m.kind==='user').length,1);
});
test('late response cannot enter a new session even if transport ignores abort',async()=>{
 const a=app({'nt_key':'sk-ant-test'});a.api.startSession('cafe');let resolve;a.context.fetch=()=>new Promise(r=>resolve=r);const pending=a.api.runJob(job);
 a.api.startSession('shop');resolve(response());await pending;assert.equal(a.api.state.active.scenario,'shop');assert.equal(a.api.state.active.messages.length,1);assert.equal(a.api.state.busy,false);
});
test('timeout preserves words and offers a retry',async()=>{
 const a=app({'nt_key':'sk-ant-test'});a.api.startSession('cafe');draft(a);a.context.fetch=(_,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Object.assign(new Error('timeout'),{name:'AbortError'}))));
 const pending=a.api.runJob(job);[...a.timers.values()].find(t=>t.delay===30000).fn();await pending;assert.equal(a.api.state.active.draft,job.text);assert.ok(a.api.state.retryJob);assert.equal(a.api.state.busy,false);
});
test('speech retains provisional sentence ending and does not duplicate repeated results',()=>{
 const a=app();a.api.startSession('cafe');a.api.startListening();const r=a.recognition();const final=Object.assign([{transcript:'Jeg vil ha'}],{isFinal:true});const provisional=Object.assign([{transcript:'en kaffe'}],{isFinal:false});const event={results:[final,provisional]};r.onresult(event);r.onresult(event);assert.equal(a.get('draft').value,'Jeg vil ha en kaffe');r.finish();assert.equal(a.get('draft').value,'Jeg vil ha en kaffe');assert.equal(a.api.state.active.messages.length,1);
});
test('new session ignores late recognition callbacks and cancels scheduled speech',()=>{
 const a=app();a.api.startSession('cafe');a.api.startListening();const callback=a.recognition().onresult;a.api.newSession();callback({results:[Object.assign([{transcript:'late words'}],{isFinal:true})]});assert.equal(a.api.state.active,null);assert.equal(a.get('draft').value,'');
});
test('recap cannot corrupt conversation and valid recap is saved as complete',async()=>{
 const a=app({'nt_key':'sk-ant-test'});a.api.startSession('cafe');a.context.fetch=async()=>response();await a.api.runJob(job);
 a.context.fetch=async()=>response({recap:{good:'You ordered a drink.',corrections:[],next:'Ask the price next time.'}});await a.api.runJob({kind:'recap',text:'[SESSION_RECAP]'});
 assert.equal(a.api.state.active.completed,true);assert.equal(a.api.state.active.messages.at(-1).kind,'recap');assert.ok(a.api.validData(a.api.state.data));
});
test('missing key preserves draft and opens connection settings without a request',async()=>{
 const a=app();a.api.startSession('cafe');draft(a);await a.api.runJob(job);assert.equal(a.get('settings-dialog').open,true);assert.equal(a.api.state.active.draft,job.text);
});
test('hint levels preserve unsent draft and do not count as learner replies',async()=>{
 const a=app({'nt_key':'sk-ant-test'});a.api.startSession('cafe');draft(a,'Jeg vil');a.context.fetch=async()=>response();await a.api.runJob({kind:'hint',level:2,text:'[HELP_ANSWERING_LEVEL_2]'});
 assert.equal(a.api.state.active.hintLevel,2);assert.equal(a.api.state.active.draft,'Jeg vil');assert.equal(a.api.state.active.messages.filter(m=>m.kind==='user').length,0);
});
test('untrusted backup structures are rejected and unknown fields removed',()=>{
 const a=app();a.api.startSession('cafe');const backup=JSON.parse(a.store.get('nt_learning_v1'));backup.apiKey='secret';backup.sessions[0].apiKey='secret';assert.ok(a.api.validData(backup));assert.ok(!JSON.stringify(a.api.sanitizeImport(backup)).includes('secret'));
 backup.sessions[0].scenario='__proto__';assert.equal(a.api.sanitizeImport(backup).sessions[0].scenario,'free');backup.sessions[0].scenario=42;assert.equal(a.api.validData(backup),false);assert.equal(a.api.validData({version:1,sessions:null}),false);
});
test('background navigation prevents automatic microphone restart after delayed reply',async()=>{
 const a=app({'nt_key':'sk-ant-test'});a.api.state.prefs.handsFree=true;a.api.startSession('cafe');let resolve;a.context.fetch=()=>new Promise(r=>resolve=r);const pending=a.api.runJob(job);a.api.showView('history');resolve(response());await pending;assert.equal(a.spoken.filter(u=>u.volume!==0).length,0);assert.equal(a.api.state.active.messages.length,3);
});

test('opening settings during a request suppresses automatic reply playback',async()=>{
 const a=app({'nt_key':'sk-ant-test'});a.api.startSession('cafe');let resolve;a.context.fetch=()=>new Promise(r=>resolve=r);const pending=a.api.runJob(job);a.get('settings-dialog').showModal();resolve(response());await pending;
 assert.equal(a.spoken.filter(u=>u.volume!==0).length,0);assert.equal(a.api.state.active.messages.length,3);
});
test('stop playback cancels queued segments and hands-free continuation',async()=>{
 const a=app({'nt_key':'sk-ant-test'});a.api.startSession('cafe');a.api.state.prefs.handsFree=true;a.context.fetch=async()=>response({...reply,parts:[{t:'Hei.',lang:'nb'},{t:'Hi.',lang:'en'}]});await a.api.runJob(job);const first=a.spoken.at(-1);a.api.stopAudio();first.onend();assert.equal(a.spoken.filter(u=>u.volume!==0).length,1);assert.equal([...a.timers.values()].filter(t=>t.delay===500).length,0);
});
test('learning export contains sessions and phrases but excludes saved credentials',async()=>{
 const a=app({'nt_key':'sk-ant-private-test-value'});a.api.startSession('cafe');let exported;a.context.URL={createObjectURL:blob=>{exported=blob;return 'blob:test'},revokeObjectURL(){}};a.api.exportBackup();const content=await exported.text();assert.ok(content.includes('cafe'));assert.ok(!content.includes('sk-ant-private-test-value'));assert.ok(a.api.validData(JSON.parse(content)));
});

test('all 24 guided situations have valid beginner openings and survive reload',()=>{
 const a=app();const guided=Object.keys(a.api.SCENARIOS).filter(k=>k!=='free');assert.equal(guided.length,24);
 for(const key of guided){const s=a.api.SCENARIOS[key];assert.ok(s.category);assert.equal(s.phrases.length,3);assert.ok(s.phrases.every(p=>p.length===2&&p.every(t=>typeof t==='string'&&t.length>0)));a.api.startSession(key);assert.ok(a.api.validData(a.api.state.data));}
 const b=app(Object.fromEntries(a.store));assert.equal(b.api.state.data.sessions.length,24);assert.equal(b.api.state.active.scenario,'haircut');
});
test('scenario search and category filters compose and show empty results',()=>{
 const a=app();a.get('scenario-category').value='Travel';a.get('scenario-search').value='train';a.api.renderScenarios();assert.equal(a.get('scenario-grid').children.length,1);
 a.get('scenario-search').value='no-such-situation';a.api.renderScenarios();assert.equal(a.get('scenario-grid').children.length,0);assert.equal(a.get('scenario-empty').hidden,false);
});
test('corrupt learning is retained instead of overwritten by a new session',()=>{
 const raw='{broken';const a=app({'nt_learning_v1':raw});a.api.startSession('cafe');assert.equal(a.store.get('nt_learning_v1'),raw);assert.equal(a.api.save(),false);assert.equal(a.get('export-recovery').hidden,false);
});
test('structurally invalid saved learning is protected and recovery remains available',()=>{
 const raw=JSON.stringify({version:1,sessions:'invalid'});const a=app({'nt_learning_v1':raw});a.api.startSession('cafe');assert.equal(a.store.get('nt_learning_v1'),raw);assert.equal(a.get('save-status').textContent,'Not saved · export a backup');
});
test('a newer copy saved by another tab cannot be silently overwritten',()=>{
 const a=app();a.api.startSession('cafe');const other=JSON.parse(a.store.get('nt_learning_v1'));other.sessions[0].draft='Saved in another tab';const raw=JSON.stringify(other);a.store.set('nt_learning_v1',raw);draft(a,'My independent draft');assert.equal(a.store.get('nt_learning_v1'),raw);assert.equal(a.api.state.active.draft,'My independent draft');assert.equal(a.api.save(),false);
});
test('storage quota errors keep the current draft and display an unsaved warning',()=>{
 const a=app();a.api.startSession('cafe');a.context.localStorage.setItem=()=>{throw Error('quota')};draft(a);assert.equal(a.api.state.active.draft,job.text);assert.equal(a.get('save-status').textContent,'Not saved · export a backup');
});
test('duplicate IDs, invalid hints and malformed role histories are rejected',()=>{
 const a=app();a.api.startSession('cafe');const valid=JSON.parse(a.store.get('nt_learning_v1'));
 const duplicate=structuredClone(valid);duplicate.sessions.push(duplicate.sessions[0]);assert.equal(a.api.validData(duplicate),false);
 const badHint=structuredClone(valid);badHint.sessions[0].hintLevel='NaN';assert.equal(a.api.validData(badHint),false);
 const badRole=structuredClone(valid);badRole.sessions[0].api[0].role='system';assert.equal(a.api.validData(badRole),false);
});
test('imports reject invalid data before mutating current learning',()=>{
 const a=app();a.api.startSession('cafe');const before=JSON.stringify(a.api.state.data);assert.throws(()=>a.api.importLearning({version:1,sessions:[],phrases:[{id:'bad'}]}));assert.equal(JSON.stringify(a.api.state.data),before);
});
test('null and oversized model replies fail safely without rendering raw output',()=>{
 const a=app();assert.throws(()=>a.api.parseReply('null'),/incomplete/);assert.throws(()=>a.api.parseReply('x'.repeat(60001)),/too large/);assert.throws(()=>a.api.parseReply(JSON.stringify({parts:[{t:'x'.repeat(5001),lang:'nb'}]})),/incomplete/);
});
test('offline sends and oversized inputs never contact the tutor',async()=>{
 const a=app({'nt_key':'sk-ant-test'});a.api.startSession('cafe');draft(a);a.context.navigator={onLine:false};await a.api.runJob(job);assert.equal(a.api.state.active.messages.length,1);assert.equal(a.api.state.active.draft,job.text);a.context.navigator.onLine=true;await a.api.runJob({...job,text:'x'.repeat(2001)});assert.equal(a.api.state.active.messages.length,1);
});

const ownerA={id:'11111111-1111-4111-8111-111111111111',email:'a@example.test'};
const ownerB={id:'22222222-2222-4222-8222-222222222222',email:'b@example.test'};
const cloudPhrase={record_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',kind:'phrase',revision:1,deleted:false,body:{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',nb:'Hei',en:'Hi',origin:'Test'}};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function cloudTransport(a,handler){a.context.fetch=async(url,options)=>({ok:true,json:async()=>{const route=url.split('/').pop(),body=JSON.parse(options.body),result=handler(route,body);
 // A plain records-style answer to a save means "accept it", so older tests need not model every save.
 return route==='save'&&result&&!('saved' in result)&&!('conflict' in result)&&!('deferred' in result)?{saved:true,conflict:false,record:{...body.record,revision:(body.record.revision||0)+1}}:result;}});}
test('sign-in opens a separate workspace without automatically migrating browser learning',async()=>{
 const a=app();a.api.startSession('cafe');const original=a.store.get('nt_learning_v1');cloudTransport(a,()=>({records:[cloudPhrase],more:false}));a.api.enterAccount(ownerA,true);await tick();
 assert.equal(a.api.state.data.sessions.length,0);assert.equal(a.api.state.data.phrases[0].nb,'Hei');assert.equal(a.store.get('nt_learning_v1'),original);assert.equal(a.get('save-status').textContent,'Saved online and on this device');
});
test('late sync responses cannot enter another account workspace',async()=>{
 const a=app();let resolve;a.context.fetch=()=>new Promise(r=>resolve=r);a.api.enterAccount(ownerA,true);const finishA=resolve;
 cloudTransport(a,()=>({records:[],more:false}));a.api.enterAccount(ownerB,true);await tick();finishA({ok:true,json:async()=>({records:[cloudPhrase],more:false})});await tick();
 assert.equal(a.api.state.account.id,ownerB.id);assert.equal(a.api.state.data.phrases.length,0);
});
test('edits during an online save keep their draft and remain pending',async()=>{
 const a=app();cloudTransport(a,()=>({records:[],more:false}));a.api.enterAccount(ownerA,true);await tick();a.api.startSession('cafe');draft(a,'first');let resolve,sent;
 a.context.fetch=async(url,options)=>{const body=JSON.parse(options.body);if(url.endsWith('/records'))return {ok:true,json:async()=>({records:[],more:false})};sent=body.record;return new Promise(r=>resolve=r);};
 const pending=a.api.syncAccount();await tick();draft(a,'second');resolve({ok:true,json:async()=>({saved:true,record:{...sent,revision:1}})});await pending;
 assert.equal(a.api.state.active.draft,'second');assert.equal(a.api.state.data.sessions[0].draft,'second');assert.equal(a.api.state.cloudBase[sent.record_id].body.draft,'first');assert.match(a.get('save-status').textContent,/more changes waiting/);
});
test('expired account sync keeps pending learning and pauses until sign-in',async()=>{
 const a=app();cloudTransport(a,()=>({records:[],more:false}));a.api.enterAccount(ownerA,true);await tick();a.api.startSession('cafe');draft(a,'keep me');a.context.fetch=async()=>({ok:false,status:401,json:async()=>({error:'Sign in again'})});await a.api.syncAccount();
 assert.equal(a.api.state.cloudPaused,true);assert.equal(a.api.state.active.draft,'keep me');assert.match(a.store.get('nt_account_v1_'+ownerA.id),/keep me/);assert.match(a.get('save-status').textContent,/sync pending/);
});
test('a conflict arriving during a tutor request does not detach the active session',async()=>{
 const a=app();cloudTransport(a,()=>({records:[],more:false}));a.api.enterAccount(ownerA,true);await tick();a.api.startSession('cafe');draft(a,'Hei');let finishSave,finishTutor,sent;
 a.context.fetch=async(url,options)=>{if(url.endsWith('/records'))return {ok:true,json:async()=>({records:[],more:false})};if(url.endsWith('/save')){sent=JSON.parse(options.body).record;return new Promise(r=>finishSave=r);}return new Promise(r=>finishTutor=r);};
 const sync=a.api.syncAccount();await tick();const tutor=a.api.runJob(job);const remote={...sent,revision:1,body:{...sent.body,draft:'Other device'}};
 finishSave({ok:true,json:async()=>({conflict:true,record:remote})});await sync;finishTutor(response());await tutor;
 assert.equal(a.api.state.active,a.api.state.data.sessions[0]);assert.equal(a.api.state.data.sessions[0].messages.length,3);assert.equal(a.api.state.cloudConflicts.length,1);
});
const badId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
test('one unreadable saved session is set aside at startup and the rest keeps working',()=>{
 const a=app();a.api.startSession('cafe');const stored=JSON.parse(a.store.get('nt_learning_v1'));
 const broken={...stored.sessions[0],id:badId,messages:'damaged'};stored.sessions.push(broken);
 const b=app({'nt_learning_v1':JSON.stringify(stored)});
 assert.equal(b.api.state.data.sessions.length,1);assert.equal(b.api.state.active.scenario,'cafe');
 const aside=JSON.parse(b.store.get('nt_learning_v1_set_aside'));assert.equal(aside.length,1);assert.equal(aside[0].item.id,badId);
 assert.equal(b.get('export-recovery').hidden,false);assert.doesNotMatch(b.get('save-status').textContent,/needs recovery/);
 assert.ok(b.api.save());assert.equal(JSON.parse(b.store.get('nt_learning_v1')).sessions.length,1);
});
test('a damaged account cache no longer locks the account; readable learning opens and syncs',async()=>{
 const good=cloudPhrase.body,bad={id:badId,nb:7};
 const a=app({['nt_account_v1_'+ownerA.id]:JSON.stringify({learning:{version:1,sessions:[],phrases:[good,bad]},base:{[badId]:{record_id:badId,kind:'phrase',revision:'x'}}})});
 cloudTransport(a,(route,body)=>route==='save'?{saved:true,conflict:false,record:{...body.record,revision:1}}:{records:[],more:false});
 a.api.enterAccount(ownerA,true);await tick();
 assert.equal(a.api.state.data.phrases.length,1);assert.equal(JSON.parse(a.store.get('nt_account_v1_'+ownerA.id+'_set_aside'))[0].item.id,badId);
 assert.equal(a.get('save-status').textContent,'Saved online and on this device');
});
test('unreadable online records are skipped and the rest of the sync completes',async()=>{
 const a=app();const other='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
 cloudTransport(a,()=>({records:[cloudPhrase,{record_id:badId,kind:'phrase',revision:1,deleted:false,body:{id:badId,nb:7}}],unreadable:[other],more:false}));
 a.api.enterAccount(ownerA,true);await tick();
 assert.equal(a.api.state.data.phrases.length,1);assert.equal(a.get('save-status').textContent,'Saved online and on this device');assert.match(a.get('account-error').textContent,/2 online items couldn't be read/);
});
test('a local change is not pushed over an online copy this app cannot read',async()=>{
 const a=app();let saves=0;
 cloudTransport(a,route=>{if(route==='save'){saves++;return {saved:false,conflict:true,record:null,unreadable:true};}return {records:[],unreadable:[cloudPhrase.record_id],more:false};});
 a.api.enterAccount(ownerA,true);await tick();a.api.state.data.phrases.push({...cloudPhrase.body});await a.api.syncAccount();
 assert.equal(saves,0);assert.equal(a.get('save-status').textContent,'Saved online and on this device');
});
test('after the first sync, later syncs ask only for changes since the bookmark; Sync now checks everything',async()=>{
 const a=app();const asked=[];const stamp='2026-10-10T17:05:01.123456+00:00';
 cloudTransport(a,(route,body)=>{if(route==='records'){asked.push(body.after);return {records:asked.length===1?[cloudPhrase]:[],unreadable:[],more:false,last:asked.length===1?{at:stamp,id:cloudPhrase.record_id}:null};}});
 a.api.enterAccount(ownerA,true);await tick();assert.equal(asked[0],null,'first sync downloads everything');
 assert.deepEqual(JSON.parse(a.store.get('nt_account_v1_'+ownerA.id)).cursor,{at:stamp,id:cloudPhrase.record_id},'bookmark survives a reload');
 await a.api.syncAccount();assert.equal(asked[1].at,new Date(Date.parse(stamp)-120000).toISOString(),'starts two minutes early as a safety margin');
 assert.equal(a.api.state.data.phrases.length,1,'nothing is lost when no changes arrive');
 a.get('sync-now').events.click();await tick();assert.equal(asked[2],null,'Sync now does a full check');
});
test('Listen & repeat progress is saved with learning, included in backups and moved over from the old keys',async()=>{
 const a=app({'nt_audio_progress_v1':JSON.stringify({greetings:4}),'nt_audio_ratings_v1':JSON.stringify({'greetings:1':'again'})});
 const store=a.context.window.audioProgressStore;assert.equal(store.position('greetings'),4);assert.equal(store.rating('greetings:1'),'again');
 store.setPosition('greetings',6);store.setRating('greetings:2','comfortable');
 const saved=JSON.parse(a.store.get('nt_learning_v1'));assert.equal(saved.audio.progress.greetings.v,6);assert.ok(saved.audio.progress.greetings.at>0);assert.equal(saved.audio.ratings['greetings:1'].at,0,'old progress is marked as old');
 const b=app(Object.fromEntries(a.store));assert.equal(b.context.window.audioProgressStore.position('greetings'),6,'the new value is not overwritten by the old key');
 store.setPosition('bad',-1);store.setRating('greetings:3','great');assert.equal(store.position('bad'),undefined);assert.equal(store.rating('greetings:3'),undefined);
});
test('signed-in lesson progress syncs to the account',async()=>{
 const a=app();let sent=null;cloudTransport(a,(route,body)=>{if(route==='save'&&body.record.kind==='audio')sent=body.record;return {records:[],more:false};});
 a.api.enterAccount(ownerA,true);await tick();a.context.window.audioProgressStore.setPosition('greetings',3);await a.api.syncAccount();
 assert.equal(sent.record_id,'a0d10000-0000-4000-8000-000000000001');assert.equal(sent.body.progress.greetings.v,3);assert.equal(a.get('save-status').textContent,'Saved online and on this device');
});
test('before the database update, lesson progress waits quietly and everything else still syncs',async()=>{
 const a=app();let phraseSaved=false;cloudTransport(a,(route,body)=>{if(route==='save')return body.record.kind==='audio'?{deferred:true}:(phraseSaved=true,{saved:true,conflict:false,record:{...body.record,revision:1}});return {records:[],more:false};});
 a.api.enterAccount(ownerA,true);await tick();a.context.window.audioProgressStore.setPosition('greetings',3);a.api.state.data.phrases.push({...cloudPhrase.body});await a.api.syncAccount();
 assert.ok(phraseSaved);assert.equal(a.get('account-error').textContent,'');assert.equal(a.get('save-status').textContent,'Saved online and on this device');
});
test('tutor brings back past recap corrections and saved phrases, at the chosen level, with the newer model',async()=>{
 const a=app({'nt_key':'sk-ant-test'});a.api.startSession('cafe');draft(a,'Jeg vil kaffe.');a.context.fetch=async()=>response();await a.api.runJob({kind:'message',text:'Jeg vil kaffe.',lang:'nb'});
 a.context.fetch=async()=>response({recap:{good:'Good.',corrections:[{original:'Jeg vil kaffe.',better:'Jeg vil gjerne ha en kaffe.',why:'Add ha.',english:'I would like a coffee.'}],next:'Order tea.'}});await a.api.runJob({kind:'recap',text:'[SESSION_RECAP]'});
 a.api.state.data.phrases.push({id:webcrypto.randomUUID(),nb:'Takk for sist',en:'Thanks for last time',origin:''});a.api.state.prefs.level='stretch';
 a.api.startSession('free');let sent;a.context.fetch=async(url,options)=>{sent=JSON.parse(options.body);return response();};draft(a,'Hei');await a.api.runJob({kind:'message',text:'Hei',lang:'nb'});
 assert.equal(sent.model,'claude-sonnet-5-5');assert.ok(sent.system.includes('- Jeg vil gjerne ha en kaffe. (I would like a coffee.)'));assert.ok(sent.system.includes('Takk for sist'));assert.ok(sent.system.includes('Difficulty: Stretch'));
});
test('a fresh learner gets no memory block and the default level',async()=>{
 const a=app({'nt_key':'sk-ant-test'});a.api.startSession('cafe');let sent;a.context.fetch=async(url,options)=>{sent=JSON.parse(options.body);return response();};draft(a);await a.api.runJob(job);
 assert.ok(!sent.system.includes("LEARNER'S RECENT LEARNING"));assert.ok(!sent.system.includes('Difficulty:'));assert.equal(a.api.state.prefs.level,'normal');
});
