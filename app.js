"use strict";

const $ = id => document.getElementById(id);
const DEFAULT_PREFS = {speed:0.9, corrections:"gentle", handsFree:false, pause:5000};
const DATA_KEY = "nt_learning_v1";
const PREFS_KEY = "nt_preferences_v1";
let storageWarning = "";
let recoveryRaw = null;
let storageBlocked = false;
let lastStored = null;
let unsaved = false;
const supportsWriteLock=typeof navigator!=="undefined"&&!!navigator.locks;
let writeReady=!supportsWriteLock;
let releaseWriteLock=null;
let acquiringWriteLock=false;
function readStored(key, fallback){
  let raw=null;
  try {
    raw=localStorage.getItem(key);
    if(key===DATA_KEY)lastStored=raw;
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    if(key===DATA_KEY){storageBlocked=true;recoveryRaw=raw;}
    storageWarning="Saved data couldn't be read. Your original data is protected; download a recovery copy from the notebook.";
    return fallback;
  }
}
function safePrefs(value){
  return {speed:[0.75,0.9,1].includes(value?.speed)?value.speed:0.9, corrections:["gentle","immediate","recap"].includes(value?.corrections)?value.corrections:"gentle",handsFree:value?.handsFree===true,pause:[3000,5000,8000].includes(value?.pause)?value.pause:5000};
}
const prefs = safePrefs(readStored(PREFS_KEY, DEFAULT_PREFS));
let data = readStored(DATA_KEY,{version:1,sessions:[],phrases:[],activeId:null});
if(!validData(data)){storageBlocked=true;recoveryRaw=lastStored;storageWarning = "The saved learning format couldn't be read. The original browser data has not been changed."; data={version:1,sessions:[],phrases:[],activeId:null};}
else data=normalizeData(data);
let active = data.sessions.find(s => s.id === data.activeId) || null;
let epoch = 0, busy = false, controller = null, retryJob = null, view = "practice";
let recognition = null, listening = false, recognitionId = 0, silenceTimer = null, autoTimer = null;
let speechId = 0, speaking = false;
let phraseOrigin = "";

function id(){return crypto.randomUUID();}
function notice(message){$("notice").textContent=message;$("notice").hidden=!message;}
function saveStatus(message,error=false){
  $("save-status").textContent=message;
  $("save-status").classList.toggle("save-error",error);
  $("export-recovery").hidden=recoveryRaw===null;
}
function save(){
  if(!writeReady&&!storageBlocked){unsaved=true;saveStatus("Waiting for this browser's save lock");return false;}
  if(storageBlocked){
    unsaved=true;saveStatus("Not saved · export a backup",true);
    notice("Saving is paused to protect an existing copy. Export your current learning from the notebook before reloading. A recovery download is also available if an older copy was found.");
    return false;
  }
  try {
    // Compare immediately before writing. The storage event also stops writes when another tab saves.
    const existing=localStorage.getItem(DATA_KEY);
    if(existing!==lastStored){storageBlocked=true;recoveryRaw=existing;return save();}
    const serialized=JSON.stringify(data);
    if(serialized.length>4500000)throw new Error("Storage limit");
    localStorage.setItem(DATA_KEY,serialized);lastStored=serialized;unsaved=false;
    saveStatus("Saved in this browser · not yet synced");return true;
  } catch {
    unsaved=true;saveStatus("Not saved · export a backup",true);
    notice("Your latest work is still on this page, but this browser couldn't save it. Export a learning backup before closing the page.");return false;
  }
}
function getKey(){try{return localStorage.getItem("nt_key")||"";}catch{return "";}}
function touch(){if(active)active.updatedAt=new Date().toISOString();save();}
function el(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
function button(text,action,className="subtle"){const b=el("button",text,className);b.type="button";b.addEventListener("click",action);return b;}
function setStatus(text){$("status").textContent=text;}
function controls(){
  const closed=!active||active.completed;
  $("send-button").disabled=busy||listening||closed||!$("draft").value.trim();
  $("mic-button").disabled=busy||closed;
  $("hint-button").disabled=busy||listening||closed||(active?.hintLevel||0)>=3;
  $("hint-button").textContent=["I'm stuck · get a hint","Show a sentence starter","Show a full answer","Hint shown · try a reply"][Math.min(3,active?.hintLevel||0)];
  $("finish-button").disabled=busy||listening||closed||!!$("draft").value.trim()||!active?.messages.some(m=>m.kind==="user");
  $("draft").disabled=busy||listening||closed;
  $("input-language").disabled=busy||listening;
  $("mic-button").classList.toggle("listening",listening);
  $("mic-button").textContent=listening?"■  Done speaking":"●  Speak";
  $("mic-button").setAttribute("aria-label",listening?"Stop microphone and review words":"Start microphone");
  $("stop-audio").hidden=!speaking;
  $("retry-box").hidden=!retryJob;
}
function stopAudio(){speechId++;clearTimeout(autoTimer);autoTimer=null;speaking=false;if(window.speechSynthesis)window.speechSynthesis.cancel();controls();}
function stopRecognition(){
  recognitionId++;clearTimeout(silenceTimer);silenceTimer=null;
  const old=recognition;recognition=null;listening=false;
  if(old){old.onresult=old.onend=old.onerror=null;try{old.abort();}catch{}}
  controls();
}
function cancelWork(){epoch++;controller?.abort();controller=null;busy=false;retryJob=null;stopRecognition();stopAudio();controls();}
function showView(next){
  if(next!=="practice"){stopRecognition();stopAudio();}
  view=next;
  ["practice","notebook","history"].forEach(name=>{$(name+"-view").hidden=name!==next;});
  document.querySelectorAll("[data-view]").forEach(b=>{const chosen=b.dataset.view===next;b.classList.toggle("selected",chosen);if(chosen)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");});
  $("page-title").textContent={practice:"Let's practise.",notebook:"Your phrase notebook.",history:"Your learning, saved."}[next];
  if(next==="notebook")renderNotebook();
  if(next==="history")renderHistory();
  window.scrollTo({top:0});
}
function renderScenarios(){
  const query=$("scenario-search").value.trim().toLocaleLowerCase();
  const category=$("scenario-category").value||"all";
  const all=Object.entries(SCENARIOS).filter(([key])=>key!=="free");
  const matches=all.filter(([,s])=>(category==="all"||s.category===category)&&[s.title,s.goal,s.category].join(" ").toLocaleLowerCase().includes(query));
  $("scenario-grid").replaceChildren();
  for(const [key,s] of matches){
    const card=button("",()=>startSession(key),"scenario"+(key==="cafe"?" featured":""));
    const icon=el("span",{"Food & drink":"☕",Travel:"↗","Daily life":"⌂","People & leisure":"☀"}[s.category],"scenario-icon");icon.setAttribute("aria-hidden","true");
    card.append(icon,el("span",s.category.toUpperCase()+" · BEGINNER","eyebrow"),el("strong",s.title),el("span",s.goal),el("span","Start practice →","scenario-link"));
    $("scenario-grid").append(card);
  }
  $("scenario-count").textContent=`${matches.length} of ${all.length} guided situations · short, everyday conversations`;
  $("scenario-empty").hidden=matches.length>0;
}
function startSession(scenario){
  if(!Object.hasOwn(SCENARIOS,scenario))return;
  cancelWork();
  const config=SCENARIOS[scenario];
  const now=new Date().toISOString();
  const opening={parts:[{t:config.opening,lang:"nb"}],trans:config.translation,heard:"",listen:"nb"};
  active={id:id(),scenario,createdAt:now,updatedAt:now,completed:false,messages:[{kind:"tutor",...opening}],api:[{role:"user",content:"Begin the role play with a short greeting."},{role:"assistant",content:JSON.stringify(opening)}],draft:"",hintLevel:0,inputLanguage:"nb-NO"};
  data.sessions.unshift(active);data.activeId=active.id;save();renderLesson();showView("practice");
  setStatus("Speak or type a reply. Open the phrase card if you need a hand.");
}
function newSession(){cancelWork();if(active)touch();active=null;data.activeId=null;save();renderLesson();showView("practice");}
function renderLesson(){
  $("welcome").hidden=!!active;$("lesson").hidden=!active;
  $("chat").replaceChildren();$("starter-phrases").replaceChildren();
  $("draft").value=active?.draft||"";
  if(!active){controls();return;}
  const config=SCENARIOS[active.scenario];
  $("lesson-title").textContent=config.title;$("lesson-goal").textContent=config.goal;
  $("input-language").value=active.inputLanguage||"nb-NO";
  $("composer").hidden=active.completed;$("finished-actions").hidden=!active.completed;
  for(const [nb,en] of config.phrases){const row=el("div",undefined,"starter");const p=el("p",nb);p.lang="nb";const meaning=el("small",en);meaning.lang="en";p.append(meaning);row.append(p,button("Listen",()=>speakParts([{t:nb,lang:"nb"}])),button("Save",()=>openPhrase(nb,en,config.title)));$("starter-phrases").append(row);}
  active.messages.forEach(renderMessage);controls();
}
function renderMessage(message){
  if(message.kind==="recap"){renderRecap(message);return;}
  const mine=message.kind==="user";
  const wrapper=el("article",undefined,"message"+(mine?" me":""));
  wrapper.append(el("span",mine?"YOU":message.kind==="hint"?"A LITTLE HELP":"YOUR TUTOR","speaker"));
  const bubble=el("div",undefined,"bubble");
  if(mine){const p=el("p",message.text);p.lang=message.lang||"nb";bubble.append(p);}
  else {for(const part of message.parts){const span=el("span",part.t+" ");span.lang=part.lang;bubble.append(span);}}
  wrapper.append(bubble);
  const actions=el("div",undefined,"message-actions");
  const translation=mine?message.heard:message.trans;
  if(translation){const trans=el("p",translation,"translation");trans.lang="en";trans.hidden=true;bubble.append(trans);const toggle=button(mine?"What it understood":"English",()=>{trans.hidden=!trans.hidden;toggle.setAttribute("aria-expanded",String(!trans.hidden));},"");toggle.setAttribute("aria-expanded","false");actions.append(toggle);}
  if(!mine){
    actions.append(button("↻ Listen again",()=>speakParts(message.parts),""),button("Slower",()=>speakParts(message.parts,null,Math.max(.55,prefs.speed-.2)),""));
    const norwegian=message.parts.filter(p=>p.lang==="nb").map(p=>p.t).join(" ");
    if(norwegian)actions.append(button("＋ Save phrase",()=>openPhrase(norwegian,message.trans,SCENARIOS[active.scenario].title),""));
  }
  wrapper.append(actions);$("chat").append(wrapper);
}
function renderRecap(message){
  const card=el("article",undefined,"recap-card");card.append(el("span","PRACTICE COMPLETE","eyebrow"),el("h3","A little further than before."));
  const recap=message.recap;
  const section=(title,text)=>{const block=el("div",undefined,"recap-section");block.append(el("h4",title),el("p",text));card.append(block);return block;};
  section("What went well",recap.good);
  if(!recap.corrections.length)section("A note on corrections","No clear language mistakes to highlight this time.");
  for(const c of recap.corrections){const block=section("Try saying this instead",`You said: ${c.original}\nTry: ${c.better}\n${c.why}`);const actions=el("div",undefined,"message-actions");actions.append(button("Hear the phrase",()=>speakParts([{t:c.better,lang:"nb"}]),""),button("Save phrase",()=>openPhrase(c.better,c.english,SCENARIOS[active.scenario].title),""));block.append(actions);}
  section("Practise next",recap.next);
  $("chat").append(card);
}
function speakParts(parts,onDone=null,rate=prefs.speed){
  stopRecognition();stopAudio();
  if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){notice("This browser can't play spoken replies. You can still read and type.");return;}
  const current=speechId;let i=0;
  speaking=true;controls();setStatus("Tutor is speaking. Use Stop playback to pause.");
  const next=()=>{
    if(current!==speechId)return;
    if(i===parts.length){speaking=false;controls();setStatus("Your turn. Take your time.");if(onDone)onDone();return;}
    const part=parts[i++],u=new SpeechSynthesisUtterance(part.t);
    u.lang=part.lang==="en"?"en-GB":"nb-NO";u.rate=rate;
    const voices=window.speechSynthesis.getVoices();
    const voice=voices.find(v=>part.lang==="en"?/^en-GB/i.test(v.lang):/^(nb|no)/i.test(v.lang))||voices.find(v=>part.lang==="en"?/^en/i.test(v.lang):false);
    if(voice)u.voice=voice;
    u.onend=next;
    u.onerror=()=>{if(current!==speechId)return;stopAudio();setStatus("Playback stopped. Try Listen again, or continue by typing.");};
    window.speechSynthesis.speak(u);
  };
  next();
}
function warmSpeech(){
  // Called directly by send/mic/hint/finish gestures for iOS playback support.
  if(window.speechSynthesis&&window.SpeechSynthesisUtterance){
    const warm=new SpeechSynthesisUtterance(" ");warm.volume=0;
    try{window.speechSynthesis.speak(warm);}catch{}
  }
}
function startListening(){
  if(busy||listening||!active||active.completed)return;
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){notice("Speech recognition isn't available in this browser. You can type your reply below.");$("draft").focus();return;}
  stopAudio();stopRecognition();warmSpeech();
  const current=recognitionId,lessonId=active.id;
  let base=$("draft").value.trim(),bank="",interim="",requested=false,autoSend=false;
  const r=new SR();recognition=r;r.lang=$("input-language").value;r.continuous=true;r.interimResults=true;
  const alive=()=>current===recognitionId&&active?.id===lessonId;
  const update=()=>{const text=[base,bank,interim].filter(Boolean).join(" ").trim().slice(0,2000);$("draft").value=text;active.draft=text;touch();controls();};
  const end=()=>{if(!alive())return;clearTimeout(silenceTimer);recognition=null;listening=false;controls();setStatus("Check the words above, then tap Send when you're ready.");if(autoSend&&active.draft.trim())sendDraft();};
  r.onresult=e=>{
    if(!alive())return;
    const finals=[],temporary=[];
    // Rebuild this recognition run from indexed results, so repeated events cannot duplicate words.
    for(let i=0;i<e.results.length;i++)(e.results[i].isFinal?finals:temporary).push(e.results[i][0].transcript.trim());
    bank=finals.join(" ");interim=temporary.join(" ");update();
    clearTimeout(silenceTimer);
    if(prefs.handsFree&&(bank||interim))silenceTimer=setTimeout(()=>{if(!alive())return;requested=true;autoSend=true;try{r.stop();}catch{end();}},prefs.pause);
  };
  r.onend=()=>{
    if(!alive())return;
    if(!requested&&listening){base=[base,bank,interim].filter(Boolean).join(" ");bank="";interim="";try{r.start();return;}catch{}}
    end();
  };
  r.onerror=e=>{
    if(!alive())return;
    if(e.error==="no-speech")return;
    requested=true;autoSend=false;
    notice(e.error==="not-allowed"||e.error==="service-not-allowed"?"Microphone access was blocked. Check this site's microphone permission, or type your reply.":"The microphone stopped. Your recognised words are kept below; you can edit them or type.");
    end();recognitionId++;try{r.abort();}catch{}
  };
  r.finish=()=>{requested=true;autoSend=false;try{r.stop();}catch{end();}};
  try{r.start();listening=true;controls();setStatus(prefs.handsFree?`Listening. Sends after a ${prefs.pause/1000}-second pause.`:"Listening. Take your time, then tap Done speaking to review.");}
  catch{stopRecognition();notice("The microphone couldn't start. Try again, or type your reply.");}
}

function parseReply(raw,recap=false){
  if(typeof raw!=="string"||raw.length>60000)throw new Error("The reply was too large. Please try again.");
  let value;
  try{value=JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/, ""));}catch{throw new Error("The tutor's reply didn't arrive in a usable format. Please try again.");}
  if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("The reply was incomplete. Please try again.");
  if(recap){
    const r=value.recap;
    if(!r||typeof r.good!=="string"||!r.good.trim()||typeof r.next!=="string"||!r.next.trim()||!Array.isArray(r.corrections)||r.corrections.length>4||!r.corrections.every(c=>c&&["original","better","why","english"].every(k=>typeof c[k]==="string")))throw new Error("The recap was incomplete. Please try again.");
    return {recap:{good:r.good,next:r.next,corrections:r.corrections.map(c=>({original:c.original,better:c.better,why:c.why,english:c.english}))}};
  }
  if(!Array.isArray(value.parts)||!value.parts.length||value.parts.length>20||!value.parts.every(p=>p&&typeof p.t==="string"&&p.t.length<=5000&&p.t.trim()&&["nb","en"].includes(p.lang)))throw new Error("The tutor's reply was incomplete. Please try again.");
  return {parts:value.parts.map(p=>({t:p.t,lang:p.lang})),trans:typeof value.trans==="string"?value.trans:"",heard:typeof value.heard==="string"?value.heard:"",listen:value.listen==="en"?"en":"nb"};
}
function systemPrompt(job){
  const correction={gentle:"Naturally model correct wording without interrupting the conversation.",immediate:"Briefly explain clear language errors as they occur. Match the learner's language and keep it beginner-friendly.",recap:"Do not correct mid-conversation. Save clear language corrections for the final recap."}[prefs.corrections];
  return SYSTEM_PROMPT+`\n\nCURRENT SESSION RULES (override conflicting defaults above):\n${SCENARIOS[active.scenario].role}\nCorrection preference: ${correction}\nYou receive text only, not audio. Never assess pronunciation or claim to hear sounds. Treat odd transcriptions as uncertain; do not count uncertain recognition mistakes as learner errors.\nUse beginner Bokmål. The learner can change the topic or ask for English help.\nThe app may supply the most recent 40 conversation messages; base feedback only on the examples actually present.\n`+(job.kind==="hint"?`The learner wants help answering your last question. This is hint level ${job.level} of 3. Level 1: give a small clue in English without the full answer. Level 2: give a Norwegian sentence starter and a short English explanation. Level 3: give one complete, simple Norwegian answer with its English meaning. Split Norwegian examples into nb parts. Return the usual parts/trans/heard/listen JSON, with heard empty and listen nb.\n`:"")+(job.kind==="recap"?`Return ONLY this JSON shape instead of the usual reply: {"recap":{"good":"One specific thing that went well, in English","corrections":[{"original":"Exact learner text","better":"Corrected Norwegian","why":"Short explanation in English","english":"English meaning of the corrected phrase"}],"next":"One concrete next practice step, in English"}}. Include zero to four corrections supported by learner messages. Never invent mistakes to fill the list.\n`:"");
}
async function runJob(job){
  if(busy||!active||active.completed)return;
  if(!["message","hint","recap"].includes(job?.kind)||typeof job.text!=="string"||!job.text.trim()||job.text.length>2000){notice("Please send a message of 2,000 characters or fewer.");return;}
  if(typeof navigator!=="undefined"&&navigator.onLine===false){notice("You appear to be offline. Your draft is kept; reconnect before sending.");return;}
  if(!getKey()){notice("Add your Claude API key in Settings to talk with the tutor. Your draft is kept.");openSettings();return;}
  stopRecognition();stopAudio();retryJob=null;warmSpeech();
  const current=epoch,sessionId=active.id;
  controller=new AbortController();const request=controller;busy=true;controls();
  setStatus(job.kind==="recap"?"Preparing your recap…":job.kind==="hint"?"Finding a little help…":"Tutor is thinking…");
  const timeout=setTimeout(()=>request.abort(),30000);
  const alive=()=>current===epoch&&active?.id===sessionId;
  try{
    const body={model:"claude-haiku-4-5",max_tokens:job.kind==="recap"?1400:850,system:systemPrompt(job),messages:[...active.api.slice(-40),{role:"user",content:job.text}]};
    const response=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","x-api-key":getKey(),"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify(body),signal:request.signal});
    if(!alive())return;
    if(!response.ok)throw new Error(response.status===401?"Your API key was rejected. Update it in Settings.":response.status===429?"The tutor is receiving too many requests. Wait a moment and try again.":"The tutor couldn't respond right now. Please try again.");
    const payload=await response.json();
    if(!alive())return;
    if(payload.stop_reason==="max_tokens")throw new Error("The reply was cut short. Please try again.");
    const raw=(payload.content||[]).filter(c=>c.type==="text").map(c=>c.text).join("");
    const result=parseReply(raw,job.kind==="recap");
    // Only commit a turn after a complete, validated reply. Retries do not duplicate the conversation.
    active.api.push({role:"user",content:job.text},{role:"assistant",content:JSON.stringify(result)});
    if(job.kind==="message"){
      active.messages.push({kind:"user",text:job.text,lang:job.lang,heard:result.heard});
      active.draft="";active.hintLevel=0;
    }
    if(job.kind==="hint")active.hintLevel=job.level;
    active.messages.push({kind:job.kind==="recap"?"recap":job.kind==="hint"?"hint":"tutor",...result});
    if(job.kind==="recap")active.completed=true;
    else active.inputLanguage=result.listen==="en"?"en-GB":"nb-NO";
    busy=false;controller=null;touch();renderLesson();
    if(view==="history")renderHistory();
    if(job.kind!=="recap"&&view==="practice"&&!document.hidden&&!$("settings-dialog").open&&!$("phrase-dialog").open)speakParts(result.parts,()=>{
      if(prefs.handsFree&&job.kind==="message"&&alive()&&view==="practice"&&!document.hidden&&!$("settings-dialog").open&&!$("phrase-dialog").open)autoTimer=setTimeout(()=>{if(alive()&&view==="practice")startListening();},500);
    });
    else setStatus(job.kind==="recap"?"Your recap is ready.":"Your reply is ready. Tap Listen again when you want to hear it.");
  }catch(error){
    if(!alive())return;
    retryJob=job;$("retry-message").textContent=error.name==="AbortError"?"The tutor took too long. Your words are safe; try again.":error instanceof TypeError?"Couldn't reach the tutor. Check your connection and try again.":error.message;
    setStatus("Your words are kept. You can retry or edit your message.");
  }finally{clearTimeout(timeout);if(alive()){busy=false;controller=null;controls();}}
}
function sendDraft(){const text=$("draft").value.trim();if(text&&!listening)runJob({kind:"message",text,lang:$("input-language").value.startsWith("en")?"en":"nb"});}
function getHint(){const level=Math.min(3,(active?.hintLevel||0)+1);runJob({kind:"hint",level,text:`[HELP_ANSWERING_LEVEL_${level}]`});}
function finishSession(){if($("draft").value.trim()){setStatus("Send your draft first, or clear it before finishing.");return;}runJob({kind:"recap",text:"[SESSION_RECAP]"});}

function openPhrase(nb="",en="",origin=""){
  stopRecognition();stopAudio();phraseOrigin=origin;
  $("phrase-nb").value=nb.slice(0,500);$("phrase-en").value=en.slice(0,500);$("phrase-dialog").showModal();
}
function renderNotebook(){
  $("phrase-count").textContent=String(data.phrases.length);const list=$("phrase-list");list.replaceChildren();
  if(!data.phrases.length){const empty=el("div",undefined,"empty-state");empty.append(el("strong","Keep the words that matter."),el("p","Save a phrase from a conversation, or add one yourself. You'll find it here next time."));list.append(empty);return;}
  for(const phrase of [...data.phrases].reverse()){
    const card=el("article",undefined,"saved-card");const title=el("h3",phrase.nb);title.lang="nb";card.append(title,el("p",phrase.en));
    if(phrase.origin)card.append(el("span",phrase.origin,"eyebrow"));
    const actions=el("div",undefined,"message-actions");actions.append(button("Listen",()=>speakParts([{t:phrase.nb,lang:"nb"}]),""),button("Slower",()=>speakParts([{t:phrase.nb,lang:"nb"}],null,.65),""));card.append(actions);list.append(card);
  }
}
function renderHistory(){
  const list=$("session-list");list.replaceChildren();
  if(!data.sessions.length){const empty=el("div",undefined,"empty-state");empty.append(el("strong","Your story starts with hei."),el("p","Conversations and recaps will be saved here automatically."));list.append(empty);return;}
  for(const session of [...data.sessions].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))){
    const card=el("article",undefined,"saved-card"),count=session.messages.filter(m=>m.kind==="user").length;
    card.append(el("h3",SCENARIOS[session.scenario].title),el("p",`${new Date(session.updatedAt).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})} · ${count} ${count===1?"reply":"replies"} · ${session.completed?"Recap saved":"Ready to continue"}`));
    card.append(button(session.completed?"Read session & recap":"Continue session",()=>{cancelWork();active=session;data.activeId=session.id;save();renderLesson();showView("practice");}));list.append(card);
  }
}
function openSettings(){
  stopRecognition();stopAudio();$("speech-speed").value=String(prefs.speed);$("correction-style").value=prefs.corrections;$("hands-free").checked=prefs.handsFree;$("thinking-time").value=String(prefs.pause);$("api-key").value="";$("api-key").placeholder=getKey()?"Key saved · enter a new one to replace it":"sk-ant-…";$("settings-error").textContent="";
  const hasMic=!!(window.SpeechRecognition||window.webkitSpeechRecognition),hasVoice=!!window.speechSynthesis?.getVoices().some(v=>/^(nb|no)/i.test(v.lang));
  $("connection-status").textContent=`${getKey()?"API key saved (not tested).":"No API key saved yet."} ${hasMic?"Speech recognition is available; microphone permission is checked when you speak.":"Speech recognition isn't available here. Typing still works."} ${hasVoice?"Norwegian playback voice found.":"No Norwegian voice detected yet; available voices depend on your device."}`;
  $("settings-dialog").showModal();
}
function exportBackup(){
  // Build an explicit allowlist. Preferences and credentials are never exported.
  const backup={version:1,sessions:data.sessions,phrases:data.phrases,activeId:data.activeId};
  const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:"application/json"}));const link=el("a");link.href=url;link.download=`norsk-tutor-backup-${new Date().toISOString().slice(0,10)}.json`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function validData(value){
  const str=(x,max=20000)=>typeof x==="string"&&x.length<=max;
  const uuid=x=>typeof x==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
  const date=x=>str(x,40)&&Number.isFinite(Date.parse(x));
  const unique=xs=>new Set(xs.map(x=>x.id)).size===xs.length;
  const parts=x=>Array.isArray(x)&&x.length>0&&x.length<=20&&x.every(p=>p&&str(p.t,5000)&&p.t.trim()&&["nb","en"].includes(p.lang));
  const message=m=>m&&((m.kind==="user"&&str(m.text,2000)&&m.text.trim()&&(m.heard===undefined||str(m.heard,5000))&&(m.lang===undefined||["nb","en"].includes(m.lang)))||(["tutor","hint"].includes(m.kind)&&parts(m.parts)&&str(m.trans,5000))||(m.kind==="recap"&&m.recap&&str(m.recap.good,5000)&&str(m.recap.next,5000)&&Array.isArray(m.recap.corrections)&&m.recap.corrections.length<=4&&m.recap.corrections.every(c=>c&&["original","better","why","english"].every(k=>str(c[k],5000)))));
  return value?.version===1&&Array.isArray(value.sessions)&&value.sessions.length<=1000&&Array.isArray(value.phrases)&&value.phrases.length<=5000&&
    value.sessions.every(s=>s&&uuid(s.id)&&Object.hasOwn(SCENARIOS,s.scenario)&&date(s.createdAt)&&date(s.updatedAt)&&typeof s.completed==="boolean"&&str(s.draft,2000)&&
      (s.hintLevel===undefined||Number.isInteger(s.hintLevel)&&s.hintLevel>=0&&s.hintLevel<=3)&&
      (s.inputLanguage===undefined||["nb-NO","en-GB"].includes(s.inputLanguage))&&
      Array.isArray(s.messages)&&s.messages.length<=2000&&s.messages.every(message)&&Array.isArray(s.api)&&s.api.length<=2000&&s.api.length%2===0&&s.api.every((m,i)=>m&&m.role===(i%2===0?"user":"assistant")&&str(m.content)))&&
    value.phrases.every(p=>p&&uuid(p.id)&&str(p.nb,500)&&p.nb.trim()&&str(p.en,500)&&str(p.origin,200))&&unique(value.sessions)&&unique(value.phrases);
}
function normalizeData(value){
  // Strip all unknown fields, including imported objects named like credentials.
  return {version:1,activeId:value.sessions.some(s=>s.id===value.activeId)?value.activeId:null,
    phrases:value.phrases.map(p=>({id:p.id,nb:p.nb,en:p.en,origin:p.origin})),
    sessions:value.sessions.map(s=>({id:s.id,scenario:s.scenario,createdAt:s.createdAt,updatedAt:s.updatedAt,completed:s.completed,draft:s.draft,hintLevel:s.hintLevel||0,inputLanguage:s.inputLanguage==="en-GB"?"en-GB":"nb-NO",
      api:s.api.map(m=>({role:m.role,content:m.content})),messages:s.messages.map(m=>m.kind==="user"?{kind:"user",text:m.text,heard:m.heard||"",lang:m.lang==="en"?"en":"nb"}:m.kind==="recap"?{kind:"recap",recap:{good:m.recap.good,next:m.recap.next,corrections:m.recap.corrections.map(c=>({original:c.original,better:c.better,why:c.why,english:c.english}))}}:{kind:m.kind,parts:m.parts.map(p=>({t:p.t,lang:p.lang})),trans:m.trans,heard:typeof m.heard==="string"?m.heard.slice(0,5000):"",listen:m.listen==="en"?"en":"nb"})}))};
}
function sanitizeImport(value){return normalizeData({...value,activeId:null});}
function importLearning(parsed){
  if(!validData(parsed))throw new Error("Invalid backup");
  const imported=sanitizeImport(parsed);
  const candidate={...data,sessions:[...data.sessions],phrases:[...data.phrases]};
  for(const s of imported.sessions)if(!candidate.sessions.some(old=>old.id===s.id))candidate.sessions.push(s);
  for(const p of imported.phrases)if(!candidate.phrases.some(old=>old.id===p.id||old.nb.toLocaleLowerCase()===p.nb.toLocaleLowerCase()))candidate.phrases.push(p);
  if(!validData(candidate)||JSON.stringify(candidate).length>4500000)throw new Error("Backup exceeds storage limit");
  data=candidate;return save();
}
function downloadRecovery(){
  if(recoveryRaw===null)return;
  const url=URL.createObjectURL(new Blob([recoveryRaw],{type:"application/json"}));
  const link=el("a");link.href=url;link.download="norsk-tutor-recovery.json";document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

// UI bindings. No inline HTML or user-provided markup is rendered.
document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
document.querySelector(".brand").addEventListener("click",e=>{e.preventDefault();showView("practice");});
$("scenario-search").addEventListener("input",renderScenarios);
$("scenario-category").addEventListener("change",renderScenarios);
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>$(b.dataset.close).close()));
$("free-chat").addEventListener("click",()=>startSession("free"));
$("new-session").addEventListener("click",newSession);$("another-session").addEventListener("click",newSession);
$("settings-button").addEventListener("click",openSettings);
$("send-button").addEventListener("click",sendDraft);
$("draft").addEventListener("input",()=>{if(active){active.draft=$("draft").value;touch();}retryJob=null;controls();});
$("draft").addEventListener("keydown",e=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();sendDraft();}});
$("input-language").addEventListener("change",()=>{if(active){active.inputLanguage=$("input-language").value;touch();}});
$("mic-button").addEventListener("click",()=>{if(listening)recognition?.finish();else startListening();});
$("stop-audio").addEventListener("click",()=>{stopAudio();setStatus("Playback stopped. Your turn when you're ready.");});
$("hint-button").addEventListener("click",getHint);$("finish-button").addEventListener("click",finishSession);
$("retry").addEventListener("click",()=>{if(retryJob)runJob(retryJob);});$("dismiss-retry").addEventListener("click",()=>{retryJob=null;controls();});
$("add-phrase").addEventListener("click",()=>openPhrase());
$("phrase-form").addEventListener("submit",e=>{e.preventDefault();const nb=$("phrase-nb").value.trim(),en=$("phrase-en").value.trim();if(!nb)return;const exists=data.phrases.some(p=>p.nb.toLocaleLowerCase()===nb.toLocaleLowerCase());if(!exists)data.phrases.push({id:id(),nb,en,origin:phraseOrigin});const saved=save();renderNotebook();$("phrase-dialog").close();if(saved)notice(exists?"That phrase is already in your notebook.":"Phrase saved to your notebook.");});
$("settings-form").addEventListener("submit",e=>{
  e.preventDefault();const key=$("api-key").value.trim();if(key&&!key.startsWith("sk-ant-")){$("settings-error").textContent="A Claude API key starts with sk-ant-. Please check it and try again.";return;}
  const next=safePrefs({speed:Number($("speech-speed").value),corrections:$("correction-style").value,handsFree:$("hands-free").checked,pause:Number($("thinking-time").value)});
  try{if(key)localStorage.setItem("nt_key",key);localStorage.setItem(PREFS_KEY,JSON.stringify(next));Object.assign(prefs,next);$("api-key").value="";$("settings-dialog").close();notice("Preferences saved. You're ready to practise.");}
  catch{$("settings-error").textContent="This browser couldn't save your preferences. Check that browser storage is allowed.";}
});
$("settings-dialog").addEventListener("close",()=>{$("api-key").value="";});
$("forget-key").addEventListener("click",()=>{try{localStorage.removeItem("nt_key");$("api-key").value="";$("api-key").placeholder="sk-ant-…";$("connection-status").textContent="API key removed from this browser. Your learning is still saved.";}catch{$("settings-error").textContent="Couldn't remove the saved key. Check browser storage permissions.";}});
$("export-data").addEventListener("click",exportBackup);
$("export-recovery").addEventListener("click",downloadRecovery);
$("import-data").addEventListener("change",async e=>{
  const file=e.target.files[0];if(!file)return;
  try{if(file.size>5000000)throw new Error();const parsed=JSON.parse(await file.text());
    const saved=importLearning(parsed);renderNotebook();renderHistory();if(saved)notice("Backup imported. Existing sessions and phrases were kept.");
  }catch{notice("That file isn't a valid Norsk Tutor backup, or is larger than 5 MB. Your existing learning has not been changed.");}finally{e.target.value="";}
});
document.addEventListener("visibilitychange",()=>{if(document.hidden){stopRecognition();stopAudio();}});
window.addEventListener("pagehide",()=>{stopRecognition();stopAudio();controller?.abort();});
async function acquireWriteLock(){
  if(!supportsWriteLock||acquiringWriteLock||writeReady)return;
  acquiringWriteLock=true;
  try{
    await navigator.locks.request("norsk-tutor-learning-writer",{ifAvailable:true},async lock=>{
      if(!lock){storageBlocked=true;saveStatus("Open in another tab · saving paused",true);notice("Another tab is using this app. Close that tab and reload this one before practising. You can still export your learning here.");return;}
      writeReady=true;
      if(unsaved)save();
      await new Promise(resolve=>{releaseWriteLock=resolve;});
      releaseWriteLock=null;writeReady=false;
    });
  }catch{storageBlocked=true;saveStatus("Couldn't protect local saving · export a backup",true);}
  finally{acquiringWriteLock=false;}
}
window.addEventListener("pagehide",()=>releaseWriteLock?.());
window.addEventListener("pageshow",()=>acquireWriteLock());
window.addEventListener("storage",event=>{
  if(event.key!==DATA_KEY&&event.key!==null)return;
  storageBlocked=true;recoveryRaw=event.newValue;cancelWork();saveStatus("Another tab changed the saved copy",true);
  notice("Another tab changed or cleared your learning. Export any work from this tab before reloading so neither copy is lost.");
});
window.addEventListener("beforeunload",event=>{if(unsaved){event.preventDefault();event.returnValue="";}});
renderScenarios();renderLesson();renderNotebook();saveStatus(storageBlocked?"Saved data needs recovery":"Saved in this browser · not yet synced",storageBlocked);if(storageWarning)notice(storageWarning);

acquireWriteLock();
