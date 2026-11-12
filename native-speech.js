"use strict";
// Native speech bridge for the iPhone app shell (Capacitor).
// In a normal browser this file does nothing. Inside the native app it replaces the
// browser's speech recognition and voices with the iPhone's own engines, through the same
// interfaces app.js already uses — so the rest of the app needs no changes. The native
// engines keep working with the screen locked and the phone in a pocket, which the
// browser ones cannot do.
// Plugins expected in the shell: @capgo/capacitor-speech-recognition ("SpeechRecognition")
// and @capacitor-community/text-to-speech ("TextToSpeech").

function createNativeSpeech(recognizer,tts){
  // ---- Voices: fetched once from the device; empty until the list arrives, like Safari. ----
  let voices=[];
  tts.getSupportedVoices().then(result=>{
    voices=(result?.voices||[]).map((v,i)=>({name:v.name,lang:(v.lang||"").replace("_","-"),voiceURI:v.voiceURI,localService:v.localService!==false,default:v.default===true,_index:i}));
  }).catch(()=>{});

  // ---- Speaking: one utterance at a time, chained like the browser's queue. ----
  let queue=[],speakingNow=false,generation=0;
  function pump(){
    if(speakingNow||!queue.length)return;
    const u=queue.shift(),current=generation;speakingNow=true;
    tts.speak({
      text:u.text,
      lang:u.voice?.lang||u.lang||"nb-NO",
      rate:typeof u.rate==="number"?u.rate:1,
      volume:typeof u.volume==="number"?u.volume:1,
      ...(u.voice&&typeof u.voice._index==="number"?{voice:u.voice._index}:{}),
      category:"playback" // keep playing with the screen locked
    }).then(()=>{
      speakingNow=false;
      if(current===generation){try{u.onend?.();}catch{}pump();}
    }).catch(()=>{
      speakingNow=false;
      if(current===generation){try{u.onerror?.({error:"synthesis-failed"});}catch{}pump();}
    });
  }
  function Utterance(text){this.text=String(text??"");this.lang="";this.rate=1;this.volume=1;this.voice=null;this.onend=null;this.onerror=null;}
  const synthesis={
    getVoices(){return voices;},
    speak(u){queue.push(u);pump();},
    cancel(){generation++;queue=[];speakingNow=false;tts.stop().catch(()=>{});},
  };

  // ---- Listening: emulates the small part of the Web Speech API the app uses. ----
  // The plugin reports one growing transcript per session; each update is delivered as a
  // single interim result, which suits the app's own draft-building and silence timing.
  function Recognition(){
    const self=this;
    this.lang="nb-NO";this.continuous=true;this.interimResults=true;
    this.onresult=null;this.onend=null;this.onerror=null;
    let handles=[],done=false,transcript="";
    const cleanup=()=>{for(const h of handles)Promise.resolve(h).then(x=>x?.remove?.()).catch(()=>{});handles=[];};
    const finish=()=>{if(done)return;done=true;cleanup();try{self.onend?.();}catch{}};
    const report=(isFinal)=>{const result=[{transcript}];result.isFinal=isFinal;try{self.onresult?.({results:[result]});}catch{}};
    const failure=(code)=>{if(done)return;try{self.onerror?.({error:code});}catch{}finish();};
    this.start=function(){
      done=false;transcript="";
      recognizer.requestPermissions().then(status=>{
        if(done)return;
        if(status?.speechRecognition&&status.speechRecognition!=="granted")return failure("not-allowed");
        handles.push(recognizer.addListener("partialResults",ev=>{
          if(done)return;
          const heard=ev?.matches?.[0];
          if(typeof heard==="string"&&heard.trim()){transcript=heard;report(false);}
        }));
        handles.push(recognizer.addListener("listeningState",ev=>{
          if(done)return;
          if(ev?.status==="stopped"){if(transcript)report(true);finish();}
        }));
        handles.push(recognizer.addListener("error",ev=>{
          if(done)return;
          const text=((ev?.code||"")+" "+(ev?.message||"")).toLowerCase();
          failure(/denied|permission|restricted/.test(text)?"not-allowed":/no.?match|no.?speech/.test(text)?"no-speech":"audio-capture");
        }));
        recognizer.start({language:self.lang,partialResults:true,addPunctuation:true,maxResults:3}).catch(()=>failure("audio-capture"));
      }).catch(()=>failure("not-allowed"));
    };
    this.stop=function(){if(done)return;recognizer.stop().catch(()=>{if(transcript)report(true);finish();});};
    this.abort=function(){if(done)return;recognizer.stop().catch(()=>{});finish();};
  }
  return {Recognition,synthesis,Utterance};
}

// Only inside the native shell: replace the browser engines with the device's own.
(function(){
  if(typeof window==="undefined")return;
  const cap=window.Capacitor;
  if(!cap||typeof cap.isNativePlatform!=="function"||!cap.isNativePlatform())return;
  const plugins=cap.Plugins||{};
  const recognizer=plugins.SpeechRecognition,tts=plugins.TextToSpeech;
  if(!recognizer||!tts)return;
  const native=createNativeSpeech(recognizer,tts);
  window.SpeechRecognition=native.Recognition;
  window.webkitSpeechRecognition=native.Recognition;
  window.speechSynthesis=native.synthesis;
  window.SpeechSynthesisUtterance=native.Utterance;
})();

if(typeof module!=="undefined")module.exports={createNativeSpeech};
