"use strict";
// Call-mode helpers for hands-free practice: short sounds that say what the app is doing
// when nobody is looking at the screen, and spoken commands that replace the buttons.

// Earcons: tiny tones played through WebAudio, so they work offline and need no files.
// Rising = your turn to speak. Falling = heard you, sending. Low double = needs your eyes.
const callMode=(()=>{
  let audio=null;
  function context(){
    if(typeof window==="undefined")return null;
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return null;
    if(!audio){try{audio=new AC();}catch{return null;}}
    if(audio.state==="suspended")audio.resume?.().catch?.(()=>{});
    return audio;
  }
  function play(notes){
    const ctx=context();if(!ctx)return;
    try{
      const start=ctx.currentTime;
      for(const [at,frequency,length=0.09] of notes){
        const osc=ctx.createOscillator(),gain=ctx.createGain();
        osc.type="sine";osc.frequency.value=frequency;
        gain.gain.setValueAtTime(0,start+at);
        gain.gain.linearRampToValueAtTime(0.06,start+at+0.015);
        gain.gain.linearRampToValueAtTime(0,start+at+length);
        osc.connect(gain);gain.connect(ctx.destination);
        osc.start(start+at);osc.stop(start+at+length+0.02);
      }
    }catch{}
  }
  return {
    listening(){play([[0,660],[0.11,880]]);},
    sent(){play([[0,880],[0.11,660]]);},
    error(){play([[0,220,0.16],[0.22,220,0.16]]);},
  };
})();

// A spoken command counts only when it is the learner's whole utterance, so command words
// inside a real sentence ("kan du gjenta setningen min?") are still sent to the tutor.
function voiceCommand(text){
  const clean=(text||"").toLocaleLowerCase().replace(/[.,!?…"'«»]/g,"").replace(/\s+/g," ").trim();
  const is=(...phrases)=>phrases.includes(clean);
  if(is("english","in english","speak english","switch to english","engelsk","på engelsk"))return "english";
  if(is("norwegian","in norwegian","speak norwegian","switch to norwegian","norsk","på norsk"))return "norwegian";
  if(is("repeat","repeat that","say that again","listen again","again","gjenta","si det igjen","en gang til"))return "repeat";
  if(is("slower","slow down","say it slower","slower please","saktere","snakk saktere","langsommere"))return "slower";
  if(is("hint","give me a hint","help","help me","i'm stuck","im stuck","hjelp","hjelp meg","et hint"))return "hint";
  if(is("finish","finish and recap","recap","finish the session","end the session","avslutt","ferdig","oppsummering"))return "recap";
  return null;
}

if(typeof module!=="undefined")module.exports={callMode,voiceCommand};
