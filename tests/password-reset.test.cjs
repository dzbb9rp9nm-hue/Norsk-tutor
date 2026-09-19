const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function setup(hash){
 const elements=new Map(),events={},windowEvents={},history=[];
 const get=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',hidden:false,disabled:false,events:{},addEventListener(name,fn){this.events[name]=fn;},showModal(){this.open=true;}});return elements.get(id);};
 const context=vm.createContext({URLSearchParams,AbortSignal,window:{location:{hash,pathname:'/',search:'',replace(){}},history:{replaceState(...args){history.push(args);}},addEventListener(name,fn){windowEvents[name]=fn;}},document:{getElementById:get,addEventListener(name,fn){events[name]=fn;}},fetch:async()=>{throw Error('Unexpected request');}});
 vm.runInContext(fs.readFileSync('password-reset.js','utf8'),context);events.DOMContentLoaded();
 return {get,context,history,windowEvents,submit:()=>get('password-reset-form').events.submit({preventDefault(){}})};
}
test('recovery URL is scrubbed before the form opens, and refresh tokens are never sent',async()=>{
 const a=setup('#access_token=access-test&refresh_token=refresh-test&type=recovery');assert.equal(a.history[0][2],'/');assert.equal(a.get('password-reset-dialog').open,true);
 let sent;a.context.fetch=async(_url,options)=>{sent=JSON.parse(options.body);return {ok:true,json:async()=>({changed:true})};};
 a.get('new-password').value=a.get('repeat-password').value='twelve-plus-characters';await a.submit();
 assert.equal(sent.accessToken,'access-test');assert.ok(!JSON.stringify(sent).includes('refresh-test'));assert.equal(a.get('new-password').value,'');assert.equal(a.get('password-reset-form').hidden,true);assert.match(a.get('password-reset-status').textContent,/password is saved/);
});
test('mismatched passwords and invalid recovery links do not send requests',async()=>{
 const a=setup('#access_token=access-test&type=recovery');a.get('new-password').value='twelve-plus-characters';a.get('repeat-password').value='different-password';await a.submit();assert.match(a.get('password-reset-status').textContent,/don't match/);
 const b=setup('#error=access_denied&error_description=untrusted');assert.equal(b.get('password-reset-form').hidden,true);assert.ok(!b.get('password-reset-status').textContent.includes('untrusted'));
});
test('ordinary app visits are unaffected and closing recovery clears its token',async()=>{
 const a=setup('#practice');assert.equal(a.history.length,0);assert.equal(a.get('password-reset-dialog').open,undefined);
 const b=setup('#access_token=access-test&type=recovery');b.windowEvents.pagehide();b.get('new-password').value=b.get('repeat-password').value='twelve-plus-characters';await b.submit();assert.match(b.get('password-reset-status').textContent,/Open a new/);
});
test('interrupted save reports uncertainty and preserves the recovery form for retry',async()=>{
 const a=setup('#access_token=access-test&type=recovery');a.get('new-password').value=a.get('repeat-password').value='twelve-plus-characters';a.context.fetch=async()=>{throw Object.assign(Error('timeout'),{name:'TimeoutError'});};await a.submit();assert.match(a.get('password-reset-status').textContent,/may have changed/);assert.equal(a.get('password-reset-form').hidden,false);assert.equal(a.get('save-password').disabled,false);
});
