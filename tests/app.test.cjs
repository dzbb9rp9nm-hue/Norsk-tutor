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
 const context=vm.createContext({console,crypto:webcrypto,AbortController,Blob,URL,Date,JSON,Object,window:{scrollTo(){},addEventListener(){},SpeechRecognition:Recognition,SpeechSynthesisUtterance:function(t){this.text=t},speechSynthesis:{cancel(){},getVoices(){return []},speak(u){spoken.push(u)}}},SpeechSynthesisUtterance:function(t){this.text=t},document:{getElementById:get,createElement:()=>new Element(),querySelectorAll:()=>[],querySelector:()=>get('brand'),body:new Element(),addEventListener(){},hidden:false},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},setTimeout:(fn,delay)=>{timers.set(++timerId,{fn,delay});return timerId},clearTimeout:id=>timers.delete(id),fetch:async()=>{throw Error('Unexpected request')}});
 vm.runInContext(fs.readFileSync('tutor-prompt.js','utf8')+'\n'+fs.readFileSync('app.js','utf8')+'\nthis.testing={startSession,newSession,runJob,parseReply,startListening,stopAudio,showView,validData,sanitizeImport,exportBackup,get state(){return {active,data,busy,retryJob,prefs}}, get recognition(){return recognition}};',context);
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
 backup.sessions[0].scenario='__proto__';assert.equal(a.api.validData(backup),false);assert.equal(a.api.validData({version:1,sessions:null}),false);
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
