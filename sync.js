"use strict";
// Pure reconciliation. The account cache persists learning + acknowledged revisions atomically.
const LearningSync=(()=>{
 const empty=()=>({version:1,sessions:[],phrases:[],activeId:null});
 const copy=x=>JSON.parse(JSON.stringify(x));
 const field=kind=>kind==='session'?'sessions':'phrases';
 const records=data=>[...data.sessions.map(body=>({record_id:body.id,kind:'session',body,deleted:false})),...data.phrases.map(body=>({record_id:body.id,kind:'phrase',body,deleted:false}))];
 const canonical=value=>JSON.stringify(value,(_key,v)=>v&&typeof v==="object"&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
 const equal=(a,b)=>!!a?.deleted===!!b?.deleted&&(a?.deleted||canonical(a?.body??null)===canonical(b?.body??null));
 function localRecord(data,id,base){return records(data).find(r=>r.record_id===id)||{record_id:id,kind:base?.kind,deleted:true,body:{}};}
 function put(data,record){const key=field(record.kind);data[key]=data[key].filter(r=>r.id!==record.record_id);if(!record.deleted)data[key].push(copy(record.body));if(data.activeId&&!data.sessions.some(s=>s.id===data.activeId))data.activeId=null;}
 function pending(data,base){const ids=new Set([...Object.keys(base),...records(data).map(r=>r.record_id)]);return [...ids].map(id=>({...localRecord(data,id,base[id]),revision:base[id]?.revision||0})).filter(r=>!equal(r,base[r.record_id]||{deleted:true})).map(copy);}
 function reconcile(data,base,incoming){data=copy(data);base=copy(base);const conflicts=[];
  for(const remote of incoming){const id=remote.record_id,prior=base[id],local=localRecord(data,id,remote);const dirty=!equal(local,prior||{deleted:true});
   if(prior&&remote.revision<prior.revision)throw Error('An older online revision was received. Try syncing again.');
   if(dirty&&!equal(local,remote)&&(!prior||remote.revision!==prior.revision)){conflicts.push({local:copy(local),remote:copy(remote)});continue;}
   if(!dirty)put(data,remote);
   base[id]=copy(remote);
  }
  return {data,base,conflicts};
 }
 return {empty,copy,records,equal,put,pending,reconcile};
})();
if(typeof module!=="undefined")module.exports=LearningSync;
