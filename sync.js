"use strict";
// Pure reconciliation. The account cache persists learning + acknowledged revisions atomically.
const LearningSync=(()=>{
 const AUDIO_ID=typeof AUDIO_RECORD_ID!=="undefined"?AUDIO_RECORD_ID:require("./learning.js").AUDIO_RECORD_ID;
 const merge=typeof mergeAudio!=="undefined"?mergeAudio:require("./learning.js").mergeAudio;
 const empty=()=>({version:1,sessions:[],phrases:[],activeId:null});
 const copy=x=>JSON.parse(JSON.stringify(x));
 const field=kind=>kind==='session'?'sessions':'phrases';
 // Lesson progress is one record per account. It is never "deleted": an empty one simply has no entries.
 const audioRecord=data=>({record_id:AUDIO_ID,kind:'audio',body:data.audio||{progress:{},ratings:{}},deleted:false});
 const hasAudio=data=>!!data.audio&&['progress','ratings','review','days'].some(g=>Object.keys(data.audio[g]||{}).length>0);
 const records=data=>[...(hasAudio(data)?[audioRecord(data)]:[]),...data.sessions.map(body=>({record_id:body.id,kind:'session',body,deleted:false})),...data.phrases.map(body=>({record_id:body.id,kind:'phrase',body,deleted:false}))];
 const canonical=value=>JSON.stringify(value,(_key,v)=>v&&typeof v==="object"&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
 const equal=(a,b)=>!!a?.deleted===!!b?.deleted&&(a?.deleted||canonical(a?.body??null)===canonical(b?.body??null));
 function localRecord(data,id,base){if(id===AUDIO_ID)return audioRecord(data);return records(data).find(r=>r.record_id===id)||{record_id:id,kind:base?.kind,deleted:true,body:{}};}
 function put(data,record){if(record.kind==='audio'){data.audio=record.deleted?{progress:{},ratings:{}}:copy(record.body);return;}const key=field(record.kind);data[key]=data[key].filter(r=>r.id!==record.record_id);if(!record.deleted)data[key].push(copy(record.body));if(data.activeId&&!data.sessions.some(s=>s.id===data.activeId))data.activeId=null;}
 function pending(data,base){const ids=new Set([...Object.keys(base),...records(data).map(r=>r.record_id)]);return [...ids].map(id=>({...localRecord(data,id,base[id]),revision:base[id]?.revision||0})).filter(r=>!equal(r,base[r.record_id]||{deleted:true})).map(copy);}
 function reconcile(data,base,incoming){data=copy(data);base=copy(base);const conflicts=[];
  for(const remote of incoming){const id=remote.record_id,prior=base[id],local=localRecord(data,id,remote);const dirty=!equal(local,prior||{deleted:true});
   if(prior&&remote.revision<prior.revision)throw Error('An older online revision was received. Try syncing again.');
   if(dirty&&!equal(local,remote)&&(!prior||remote.revision!==prior.revision)){
    // Lesson progress merges itself (newest entry wins) instead of asking the learner to choose.
    if(remote.kind==='audio'){data.audio=merge(local.body,remote.deleted?{}:remote.body);base[id]=copy(remote);continue;}
    conflicts.push({local:copy(local),remote:copy(remote)});continue;}
   if(!dirty)put(data,remote);
   base[id]=copy(remote);
  }
  return {data,base,conflicts};
 }
 return {empty,copy,records,equal,put,pending,reconcile,merge,AUDIO_ID};
})();
if(typeof module!=="undefined")module.exports=LearningSync;
