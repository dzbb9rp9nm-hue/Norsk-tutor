/* Playback owns one utterance or pause at a time. Cancellation invalidates old callbacks. */
function createLessonPlayer({speak, cancel, schedule=setTimeout, unschedule=clearTimeout, onChange=()=>{}}) {
  let steps=[], index=0, playing=false, token=0, timer=null, error='', pauseScale=1;
  const state=()=>({index,total:steps.length,playing,done:steps.length>0&&index===steps.length,step:steps[index],error});
  const emit=()=>onChange(state());
  function stop(){playing=false;token++;unschedule(timer);timer=null;cancel();}
  function run(){
    if(!playing)return;
    if(index>=steps.length){playing=false;emit();return;}
    const current=++token, step=steps[index];
    if(step.type==='response'||step.type==='assess'){playing=false;emit();return;}
    emit();
    const next=()=>{if(current!==token||!playing)return;index++;run();};
    if(step.type==='wait')timer=schedule(next,step.seconds*pauseScale*1000);
    else {
      try{speak(step,next,()=>{if(current!==token)return;stop();error='Playback stopped. Tap Play to retry this step, or use Next to read through the lesson.';emit();});}
      catch{stop();error='Audio is unavailable. You can still use Next to read through the lesson.';emit();}
    }
  }
  return {
    load(nextSteps,start=0){stop();steps=nextSteps;index=Math.max(0,Math.min(steps.length,Number.isInteger(start)?start:0));error='';emit();},
    play(){if(playing||!steps.length)return;if(index===steps.length)index=0;error='';playing=true;run();},
    pause(){stop();emit();},
    move(delta){const resume=playing;stop();index=Math.max(0,Math.min(steps.length,index+delta));error='';playing=resume;playing?run():emit();},
    replay(){const resume=playing;stop();if(index===steps.length)index=Math.max(0,index-1);error='';playing=resume;playing?run():emit();},
    setPauseScale(value){pauseScale=value;},
    state
  };
}
if(typeof module !== 'undefined')module.exports={createLessonPlayer};
if(typeof document !== 'undefined') (()=>{
  const get=id=>document.getElementById(id), synth=window.speechSynthesis;
  let selected=null, currentUtterance=null, progress={}, storageWarning=false, mode='learn', ratings={};
  try{const saved=JSON.parse(localStorage.getItem('nt_audio_ratings_v1')||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))ratings=saved;}catch{}
  const key='nt_audio_progress_v1';
  try{const stored=JSON.parse(localStorage.getItem(key)||'{}');if(stored&&typeof stored==='object'&&!Array.isArray(stored))progress=stored;}catch{}
  function persist(state){
    if(!selected)return;
    progress[selected.id+(mode==='learn'?'':':'+mode)]=state.index;
    try{localStorage.setItem(key,JSON.stringify(progress));}catch{storageWarning=true;}
    get('audio-local-note').textContent=storageWarning?'Your place could not be saved. You can keep listening.':'Your place is saved on this device. Lesson progress does not sync between devices yet.';
  }
  const player=createLessonPlayer({
    cancel(){if(currentUtterance){currentUtterance.onend=currentUtterance.onerror=null;currentUtterance=null;}synth?.cancel();},
    speak(step,done,fail){
      if(!synth||!window.SpeechSynthesisUtterance)throw Error('No speech');
      const voices=synth.getVoices();
      const voice=voices.find(v=>step.lang==='nb'?/^(nb|no)(-|$)/i.test(v.lang):/^en-GB/i.test(v.lang))||voices.find(v=>step.lang==='en'&&/^en/i.test(v.lang));
      // Do not teach Norwegian using an English fallback voice.
      if(step.lang==='nb'&&!voice){player.pause();get('audio-feedback').textContent='No Norwegian voice is available yet. Enable a Norwegian voice in your device’s speech settings, then try Play again. You can still read each step with Next.';return;}
      const u=new window.SpeechSynthesisUtterance(step.text);currentUtterance=u;
      u.lang=step.lang==='nb'?'nb-NO':'en-GB';if(voice)u.voice=voice;
      u.rate=step.lang==='nb'?Number(get('audio-speed').value):1;
      u.onend=()=>{currentUtterance=null;done();};u.onerror=fail;synth.speak(u);
    },
    onChange(state){
      if(!selected)return;
      const response=state.step?.type==='response', assess=state.step?.type==='assess';
      get('audio-response-actions').hidden=!response;
      get('audio-rating-actions').hidden=!assess;
      get('audio-hint-text').textContent='';
      get('audio-play').hidden=response||assess;
      get('audio-replay').hidden=response||assess;
      get('audio-transcript-details').hidden=mode!=='learn'&&!state.done;
      get('audio-conversation').hidden=mode!=='learn'||!state.done;
      get('audio-review').hidden=!state.done||!AudioCourse.conversationSteps(selected).some(s=>s.phraseId&&ratings[s.phraseId]==='again');
      get('audio-play').textContent=state.playing?'Pause':state.done?'Play again':'Play';
      get('audio-previous').disabled=state.index===0;
      get('audio-next').disabled=state.done;
      get('audio-stage').textContent=state.done?'Lesson complete':state.step.label;
      get('audio-cue').textContent=state.done?'A little more Norwegian, ready for real life.':state.step.text;
      get('audio-cue').lang=state.step?.lang==='nb'||(state.step?.type==='wait'&&state.step.label!=='Try it in Norwegian')?'nb':'en';
      get('audio-meaning').textContent=state.step?.meaning||'';
      get('audio-pause-note').textContent=response?'Take as long as you need. Speak aloud, then reveal the reply.':assess?'Compare your answer, then choose how it felt. Other answers can be correct.':state.step?.type==='wait'?`Your turn — ${Math.round(state.step.seconds*Number(get('audio-pause').value))} seconds to speak. ${state.playing?'The lesson continues automatically.':'Tap Play when you’re ready.'}`:state.playing?'Listening…':state.done?'Try a conversation, revisit difficult replies, or choose another lesson.':'Paused. Play continues from the start of this step.';
      get('audio-progress').max=state.total;get('audio-progress').value=state.index;
      get('audio-progress-text').textContent=state.done?'Finished':`Step ${state.index+1} of ${state.total}`;
      get('audio-feedback').textContent=state.error;
      persist(state);
    }
  });
  window.audioLessonPlayer=player;
  function lessonSteps(){return mode==='learn'?AudioCourse.stepsFor(selected):AudioCourse.conversationSteps(selected,mode==='review'?reviewIndices:null);}
  let reviewIndices=[];
  function selectLesson(lesson,nextMode='learn'){
    stopRecognition();stopAudio();selected=lesson;mode=nextMode;
    reviewIndices=lesson.phrases.map((_,i)=>i).filter(i=>ratings[`${lesson.id}:${i}`]==='again');
    get('audio-player-panel').hidden=false;
    get('audio-pause').parentElement.hidden=mode!=='learn';
    get('audio-lesson-title').textContent=lesson.title+(mode==='learn'?'':mode==='review'?' · Practise again':' · Your turn');
    get('audio-lesson-note').textContent=mode==='learn'?lesson.note:'Listen to your partner, answer aloud, then hear a possible reply. Use a hint whenever you need one. Your choices are saved on this device; your voice is not recorded or graded.';
    const transcript=get('audio-transcript');transcript.replaceChildren();
    for(const [nb,en] of lesson.phrases){const row=document.createElement('li'),phrase=document.createElement('p'),meaning=document.createElement('p');phrase.textContent=nb;phrase.lang='nb';meaning.textContent=en;row.append(phrase,meaning);transcript.append(row);}
    get('audio-transcript-details').open=false;
    player.load(lessonSteps(),mode==='review'?0:progress[lesson.id+(mode==='learn'?'':':'+mode)]);
    get('audio-player-panel').scrollIntoView({block:'start'});
    get(player.state().step?.type==='response'?'audio-answer':player.state().step?.type==='assess'?'audio-comfortable':'audio-play').focus({preventScroll:true});
  }
  const list=get('audio-lessons');
  AudioCourse.lessons.forEach((lesson,i)=>{
    const card=document.createElement('article');card.className='audio-lesson-card';
    const number=document.createElement('span');number.className='eyebrow';number.textContent=`LESSON ${i+1}`;
    const title=document.createElement('h3');title.textContent=lesson.title;
    const desc=document.createElement('p');desc.textContent=lesson.subtitle;
    const open=document.createElement('button');open.className='subtle';open.textContent='Open lesson';open.setAttribute('aria-label',`Open lesson ${i+1}: ${lesson.title}`);open.addEventListener('click',()=>selectLesson(lesson));
    const conversation=document.createElement('button');conversation.className='subtle';conversation.textContent='Try the conversation';conversation.setAttribute('aria-label',`Try conversation ${i+1}: ${lesson.title}`);conversation.addEventListener('click',()=>selectLesson(lesson,'conversation'));
    const review=document.createElement('button');review.className='subtle';review.textContent='Practise difficult replies';review.addEventListener('click',()=>selectLesson(lesson,'review'));review.dataset.lessonReview=lesson.id;
    card.append(number,title,desc,open,conversation,review);list.append(card);
  });
  function updateReviews(){document.querySelectorAll('[data-lesson-review]').forEach(button=>{button.hidden=!AudioCourse.conversationSteps(AudioCourse.lessons.find(l=>l.id===button.dataset.lessonReview)).some(s=>s.phraseId&&ratings[s.phraseId]==='again');});}
  updateReviews();
  get('audio-hint').addEventListener('click',()=>{get('audio-hint-text').textContent=player.state().step?.hint||'';});
  get('audio-answer').addEventListener('click',()=>{player.move(1);player.play();});
  for(const [id,rating] of [['audio-comfortable','comfortable'],['audio-again','again']])get(id).addEventListener('click',()=>{
    const state=player.state();if(state.step?.type!=='assess')return;
    ratings[state.step.phraseId]=rating;
    try{localStorage.setItem('nt_audio_ratings_v1',JSON.stringify(ratings));}catch{storageWarning=true;}
    updateReviews();player.move(1);if(!player.state().done)player.play();
  });
  get('audio-conversation').addEventListener('click',()=>selectLesson(selected,'conversation'));
  get('audio-review').addEventListener('click',()=>selectLesson(selected,'review'));
  get('audio-play').addEventListener('click',()=>{if(player.state().playing)player.pause();else{stopRecognition();stopAudio();player.play();}});
  get('audio-previous').addEventListener('click',()=>player.move(-1));
  get('audio-next').addEventListener('click',()=>player.move(1));
  get('audio-replay').addEventListener('click',()=>{stopRecognition();stopAudio();player.replay();player.play();});
  get('audio-restart').addEventListener('click',()=>{if(selected)player.load(lessonSteps());});
  get('audio-pause').addEventListener('change',()=>{player.setPauseScale(Number(get('audio-pause').value));player.pause();});
  get('audio-speed').addEventListener('change',()=>player.pause());
  function voices(){get('audio-voice-note').textContent=!synth?'Audio playback is unavailable in this browser. Open a lesson and use Next to read the steps.':synth.getVoices().some(v=>/^(nb|no)(-|$)/i.test(v.lang))?'Uses your device’s Norwegian and English voices. No microphone needed.':'A Norwegian speech voice is needed for playback. If it is unavailable, enable one in your device’s speech settings. You can also read each step.';}
  synth?.addEventListener('voiceschanged',voices);voices();
})();
