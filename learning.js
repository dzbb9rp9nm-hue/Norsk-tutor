"use strict";
const LEARNING_SCENARIOS=typeof module!=="undefined"?require("./scenarios.js"):SCENARIOS;
function validData(value){
  const str=(x,max=20000)=>typeof x==="string"&&x.length<=max;
  const uuid=x=>typeof x==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
  const date=x=>str(x,40)&&Number.isFinite(Date.parse(x));
  const unique=xs=>new Set(xs.map(x=>x.id)).size===xs.length;
  const parts=x=>Array.isArray(x)&&x.length>0&&x.length<=20&&x.every(p=>p&&str(p.t,5000)&&p.t.trim()&&["nb","en"].includes(p.lang));
  const message=m=>m&&((m.kind==="user"&&str(m.text,2000)&&m.text.trim()&&(m.heard===undefined||str(m.heard,5000))&&(m.lang===undefined||["nb","en"].includes(m.lang)))||(["tutor","hint"].includes(m.kind)&&parts(m.parts)&&str(m.trans,5000))||(m.kind==="recap"&&m.recap&&str(m.recap.good,5000)&&str(m.recap.next,5000)&&Array.isArray(m.recap.corrections)&&m.recap.corrections.length<=4&&m.recap.corrections.every(c=>c&&["original","better","why","english"].every(k=>str(c[k],5000)))));
  return value?.version===1&&Array.isArray(value.sessions)&&value.sessions.length<=1000&&Array.isArray(value.phrases)&&value.phrases.length<=5000&&
    value.sessions.every(s=>s&&uuid(s.id)&&Object.hasOwn(LEARNING_SCENARIOS,s.scenario)&&date(s.createdAt)&&date(s.updatedAt)&&typeof s.completed==="boolean"&&str(s.draft,2000)&&
      (s.hintLevel===undefined||Number.isInteger(s.hintLevel)&&s.hintLevel>=0&&s.hintLevel<=3)&&
      (s.inputLanguage===undefined||["nb-NO","en-GB"].includes(s.inputLanguage))&&
      Array.isArray(s.messages)&&s.messages.length<=2000&&s.messages.every(message)&&Array.isArray(s.api)&&s.api.length<=2000&&s.api.length%2===0&&s.api.every((m,i)=>m&&m.role===(i%2===0?"user":"assistant")&&str(m.content)))&&
    value.phrases.every(p=>p&&uuid(p.id)&&str(p.nb,500)&&p.nb.trim()&&str(p.en,500)&&str(p.origin,200))&&unique(value.sessions)&&unique(value.phrases)&&unique([...value.sessions,...value.phrases]);
}
function normalizeData(value){
  // Strip all unknown fields, including imported objects named like credentials.
  return {version:1,activeId:value.sessions.some(s=>s.id===value.activeId)?value.activeId:null,
    phrases:value.phrases.map(p=>({id:p.id,nb:p.nb,en:p.en,origin:p.origin})),
    sessions:value.sessions.map(s=>({id:s.id,scenario:s.scenario,createdAt:s.createdAt,updatedAt:s.updatedAt,completed:s.completed,draft:s.draft,hintLevel:s.hintLevel||0,inputLanguage:s.inputLanguage==="en-GB"?"en-GB":"nb-NO",
      api:s.api.map(m=>({role:m.role,content:m.content})),messages:s.messages.map(m=>m.kind==="user"?{kind:"user",text:m.text,heard:m.heard||"",lang:m.lang==="en"?"en":"nb"}:m.kind==="recap"?{kind:"recap",recap:{good:m.recap.good,next:m.recap.next,corrections:m.recap.corrections.map(c=>({original:c.original,better:c.better,why:c.why,english:c.english}))}}:{kind:m.kind,parts:m.parts.map(p=>({t:p.t,lang:p.lang})),trans:m.trans,heard:typeof m.heard==="string"?m.heard.slice(0,5000):"",listen:m.listen==="en"?"en":"nb"})}))};
}

if(typeof module!=="undefined")module.exports={validData,normalizeData};
