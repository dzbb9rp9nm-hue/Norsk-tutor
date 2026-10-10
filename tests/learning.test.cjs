const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validData,normalizeData,partitionData}=require('../learning.js');
const id=n=>`${n}${n}${n}${n}${n}${n}${n}${n}-${n}${n}${n}${n}-4${n}${n}${n}-8${n}${n}${n}-${n.repeat(12)}`;
const now=new Date().toISOString();
const session=(n,scenario='cafe')=>({id:id(n),scenario,createdAt:now,updatedAt:now,completed:false,draft:'',messages:[],api:[]});
const phrase=n=>({id:id(n),nb:'Hei',en:'Hi',origin:'Test'});
test('a renamed or removed scenario keeps the session and reopens it as free conversation',()=>{const d={version:1,sessions:[session('1','gone')],phrases:[]};assert.ok(validData(d));assert.equal(normalizeData(d).sessions[0].scenario,'free');assert.equal(normalizeData({version:1,sessions:[session('2')],phrases:[]}).sessions[0].scenario,'cafe');});
test('unreadable items are separated from readable learning',()=>{
 const broken={...session('3'),messages:'not a list'};const d={version:1,activeId:id('1'),sessions:[session('1'),broken],phrases:[phrase('2'),{id:id('5'),nb:7}]};
 assert.equal(validData(d),false);const p=partitionData(d);assert.ok(validData(p.data));assert.equal(p.data.sessions.length,1);assert.equal(p.data.phrases.length,1);assert.equal(p.data.activeId,id('1'));
 assert.deepEqual(p.rejected.map(r=>r.kind),['session','phrase']);assert.equal(p.rejected[0].item,broken);
});
test('a duplicate ID is set aside rather than overwriting the first copy',()=>{const a=phrase('1'),b={...phrase('1'),nb:'Hallo'};const p=partitionData({version:1,sessions:[],phrases:[a,b]});assert.equal(p.data.phrases[0].nb,'Hei');assert.equal(p.rejected.length,1);});
test('an unusable overall shape is left for the existing recovery path',()=>{assert.equal(partitionData(null),null);assert.equal(partitionData({version:2,sessions:[],phrases:[]}),null);assert.equal(partitionData({version:1,sessions:{},phrases:[]}),null);});
const {validAudio,mergeAudio}=require('../learning.js');
test('lesson progress has strict, small shapes',()=>{assert.ok(validAudio({progress:{a:{v:0,at:0}},ratings:{'a:1':{v:'comfortable',at:1}}}));assert.equal(validAudio({progress:{a:{v:1.5,at:0}},ratings:{}}),false);assert.equal(validAudio({progress:{},ratings:{a:{v:'great',at:0}}}),false);assert.equal(validAudio({progress:{a:{v:1}},ratings:{}}),false);
 assert.ok(validData({version:1,sessions:[],phrases:[]}),'older saved data without progress is still valid');assert.deepEqual(normalizeData({version:1,sessions:[],phrases:[]}).audio,{progress:{},ratings:{}});});
test('merging keeps the most recently touched value for each entry',()=>{assert.deepEqual(mergeAudio({progress:{a:{v:1,at:5}},ratings:{}},{progress:{a:{v:9,at:4},b:{v:2,at:1}},ratings:{}}).progress,{a:{v:1,at:5},b:{v:2,at:1}});});
