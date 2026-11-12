// The native speech bridge: iPhone engines behind the browser's speech interfaces.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createNativeSpeech}=require('../native-speech.js');
const flush=()=>new Promise(r=>setImmediate(r));

function fakePlugins(){
 const listeners={};
 const recognizer={
  calls:[],granted:true,
  async requestPermissions(){return {speechRecognition:this.granted?'granted':'denied'};},
  addListener(name,fn){(listeners[name]??=[]).push(fn);return Promise.resolve({remove(){listeners[name]=listeners[name].filter(f=>f!==fn);}});},
  emit(name,ev){for(const fn of listeners[name]||[])fn(ev);},
  async start(options){this.calls.push(['start',options]);},
  async stop(){this.calls.push(['stop']);this.emit('listeningState',{status:'stopped'});},
 };
 const tts={
  spoken:[],stopped:0,voiceList:[{name:'Nora',lang:'nb_NO',voiceURI:'nb-1'},{name:'Kate',lang:'en-GB',voiceURI:'en-1'}],
  async getSupportedVoices(){return {voices:this.voiceList};},
  speak(options){this.spoken.push(options);return (this.speakGate??=Promise.resolve()),new Promise(resolve=>(this.resolvers??=[]).push(resolve));},
  async stop(){this.stopped++;},
 };
 return {recognizer,tts,listeners};
}
test('recognition streams the growing transcript and finalises on stop',async()=>{
 const {recognizer,tts}=fakePlugins();
 const {Recognition}=createNativeSpeech(recognizer,tts);
 const r=new Recognition();r.lang='nb-NO';
 const events=[];let ended=0;
 r.onresult=e=>events.push({text:e.results[0][0].transcript,final:e.results[0].isFinal});
 r.onend=()=>ended++;
 r.start();await flush();
 assert.equal(recognizer.calls[0][0],'start');
 assert.equal(recognizer.calls[0][1].language,'nb-NO');
 assert.equal(recognizer.calls[0][1].partialResults,true);
 recognizer.emit('partialResults',{matches:['jeg vil']});
 recognizer.emit('partialResults',{matches:['jeg vil gjerne ha en kaffe']});
 r.stop();await flush();
 assert.deepEqual(events.at(-1),{text:'jeg vil gjerne ha en kaffe',final:true});
 assert.equal(events[0].final,false);
 assert.equal(ended,1);
});
test('denied permission surfaces the not-allowed error the app already understands',async()=>{
 const {recognizer,tts}=fakePlugins();recognizer.granted=false;
 const {Recognition}=createNativeSpeech(recognizer,tts);
 const r=new Recognition();const errors=[];let ended=0;
 r.onerror=e=>errors.push(e.error);r.onend=()=>ended++;
 r.start();await flush();
 assert.deepEqual(errors,['not-allowed']);assert.equal(ended,1);
 assert.equal(recognizer.calls.length,0,'never started without permission');
});
test('speaking queues one utterance at a time with device voices and lock-screen audio',async()=>{
 const {recognizer,tts}=fakePlugins();
 const {synthesis,Utterance}=createNativeSpeech(recognizer,tts);
 await flush();
 const voices=synthesis.getVoices();
 assert.equal(voices[0].lang,'nb-NO','underscored device locale is normalised');
 const first=new Utterance('Hei!');first.lang='nb-NO';first.rate=0.9;first.voice=voices[0];
 const second=new Utterance('Hello');second.lang='en-GB';
 let firstDone=false;first.onend=()=>{firstDone=true;};
 synthesis.speak(first);synthesis.speak(second);
 assert.equal(tts.spoken.length,1,'second waits for the first');
 assert.equal(tts.spoken[0].voice,0);assert.equal(tts.spoken[0].rate,0.9);
 assert.equal(tts.spoken[0].category,'playback');
 tts.resolvers.shift()();await flush();
 assert.equal(firstDone,true);assert.equal(tts.spoken.length,2);
});
test('cancel stops the device voice and silences utterances already queued',async()=>{
 const {recognizer,tts}=fakePlugins();
 const {synthesis,Utterance}=createNativeSpeech(recognizer,tts);
 const u=new Utterance('Hei');let done=0;u.onend=()=>done++;
 synthesis.speak(u);synthesis.speak(new Utterance('mer'));
 synthesis.cancel();
 tts.resolvers.shift()();await flush();
 assert.equal(done,0,'a cancelled utterance never reports finishing');
 assert.equal(tts.stopped,1);
 assert.equal(tts.spoken.length,1,'the queued utterance was dropped');
});
