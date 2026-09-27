const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createLessonPlayer}=require('../audio-player.js');
const course=require('../audio-lessons.js');
function setup(){
  const utterances=[],timers=new Map();let timer=0;
  const player=createLessonPlayer({speak:(step,next,fail)=>utterances.push({step,next,fail}),cancel(){},schedule:(fn,ms)=>{timers.set(++timer,{fn,ms});return timer;},unschedule:id=>timers.delete(id)});
  return {player,utterances,timers};
}
test('all four lessons withhold each recall answer until the speaking pause ends',()=>{
  assert.equal(course.lessons.length,4);
  for(const lesson of course.lessons){
    const steps=course.stepsFor(lesson);
    assert.equal(lesson.phrases.length,8);
    for(let i=0;i<steps.length;i++)if(steps[i].type==='say'&&steps[i].text.startsWith('How would you say:')){
      assert.equal(steps[i+1].type,'wait');assert.equal(steps[i+1].label,'Try it in Norwegian');
      assert.ok(steps[i+1].seconds>=6);assert.equal(steps[i+2].lang,'nb');
      assert.notEqual(steps[i+1].text,steps[i+2].text);
    }
  }
});
test('speech completion starts a timed pause before revealing the answer',()=>{
  const {player,utterances,timers}=setup();
  player.load([{type:'say',text:'Question'},{type:'wait',seconds:6},{type:'say',text:'Answer'}]);player.setPauseScale(1.5);player.play();
  assert.equal(utterances.length,1);utterances[0].next();assert.equal(player.state().index,1);assert.equal(utterances.length,1);
  const timer=[...timers.values()][0];assert.equal(timer.ms,9000);timer.fn();assert.equal(utterances[1].step.text,'Answer');utterances[1].next();assert.equal(player.state().done,true);
});
test('pause and lesson changes invalidate late speech and timer callbacks',()=>{
  const {player,utterances,timers}=setup();
  player.load([{type:'say',text:'Question'},{type:'wait',seconds:6},{type:'say',text:'Answer'}]);player.play();
  const late=utterances[0].next;player.pause();late();assert.equal(player.state().index,0);
  player.play();utterances[1].next();const lateTimer=[...timers.values()][0].fn;player.pause();lateTimer();assert.equal(player.state().index,1);
  player.load([{type:'say',text:'New lesson'}]);late();lateTimer();assert.equal(player.state().index,0);assert.equal(player.state().playing,false);
});
test('replay, navigation, errors and completion preserve a recoverable position',()=>{
  const {player,utterances}=setup();player.load([{type:'say',text:'First'},{type:'say',text:'Last'}],999);
  assert.equal(player.state().done,true);player.play();assert.equal(player.state().index,0);
  utterances[0].fail();assert.equal(player.state().playing,false);assert.match(player.state().error,/retry/);
  player.move(1);player.play();assert.equal(utterances.at(-1).step.text,'Last');player.replay();assert.equal(player.state().index,1);
  utterances.at(-1).next();assert.equal(player.state().done,true);player.move(-1);assert.equal(player.state().index,1);
});
test('conversation waits for the learner before speaking an answer and before continuing after assessment',()=>{
  const {player,utterances,timers}=setup();
  player.load(course.conversationSteps(course.lessons[0]));player.play();
  utterances[0].next();utterances[1].next();
  assert.equal(player.state().step.type,'response');assert.equal(player.state().playing,false);
  assert.equal(utterances.length,2);assert.equal(timers.size,0);
  player.move(1);player.play();assert.equal(utterances[2].step.text,course.lessons[0].phrases[2][0]);utterances[2].next();
  assert.equal(player.state().step.type,'assess');assert.equal(player.state().playing,false);
});
test('targeted review includes only marked phrases from the chosen lesson',()=>{
  for(const lesson of course.lessons){
    const turns=course.conversationSteps(lesson);assert.equal(turns.filter(s=>s.type==='response').length,4);
    const chosen=Number(turns.find(s=>s.phraseId).phraseId.split(':')[1]);
    const review=course.conversationSteps(lesson,[chosen]);assert.equal(review.length,5);
    assert.ok(review.filter(s=>s.phraseId).every(s=>s.phraseId===`${lesson.id}:${chosen}`));
    assert.equal(review[2].type,'response');assert.ok(review[2].hint);assert.notEqual(review[2].text,review[3].text);
  }
});
