// Call-mode helpers: spoken commands and earcons for hands-free practice.
const {test}=require('node:test');
const assert=require('node:assert/strict');

test('spoken commands match whole utterances in both languages, forgiving punctuation and case',()=>{
 delete require.cache[require.resolve('../call-mode.js')];
 const {voiceCommand}=require('../call-mode.js');
 assert.equal(voiceCommand('English'),'english');
 assert.equal(voiceCommand('på engelsk!'),'english');
 assert.equal(voiceCommand('Norsk.'),'norwegian');
 assert.equal(voiceCommand('  Repeat that '),'repeat');
 assert.equal(voiceCommand('En gang til'),'repeat');
 assert.equal(voiceCommand('Snakk saktere'),'slower');
 assert.equal(voiceCommand("I'm stuck"),'hint');
 assert.equal(voiceCommand('Hjelp meg'),'hint');
 assert.equal(voiceCommand('Finish and recap'),'recap');
 assert.equal(voiceCommand('Avslutt'),'recap');
});
test('command words inside real sentences are not commands',()=>{
 const {voiceCommand}=require('../call-mode.js');
 assert.equal(voiceCommand('Kan du gjenta setningen min?'),null);
 assert.equal(voiceCommand('I need help with the bill'),null);
 assert.equal(voiceCommand('Jeg vil ha en kaffe'),null);
 assert.equal(voiceCommand('Can you speak English with me today'),null);
 assert.equal(voiceCommand(''),null);
 assert.equal(voiceCommand(null),null);
});
test('earcons schedule short quiet tones and survive a missing or broken audio stack',()=>{
 const tones=[];
 class Gain{constructor(){this.gain={setValueAtTime:()=>{},linearRampToValueAtTime:(v,at)=>{tones.at(-1).envelope.push([v,at]);}};}connect(){}}
 class Osc{constructor(){this.frequency={};tones.push({osc:this,envelope:[]});}connect(){}start(at){this.started=at;}stop(at){this.stopped=at;}}
 global.window={AudioContext:function(){this.currentTime=0;this.state='running';this.createOscillator=()=>new Osc();this.createGain=()=>new Gain();this.destination={};}};
 delete require.cache[require.resolve('../call-mode.js')];
 const {callMode}=require('../call-mode.js');
 callMode.listening();
 assert.equal(tones.length,2);
 assert.ok(tones[0].osc.frequency.value<tones[1].osc.frequency.value,'listening rises');
 assert.ok(tones.every(t=>t.osc.stopped-t.osc.started<0.5),'tones are short');
 assert.ok(tones.every(t=>t.envelope.every(([v])=>v<=0.06)),'tones are quiet');
 tones.length=0;callMode.sent();
 assert.ok(tones[0].osc.frequency.value>tones[1].osc.frequency.value,'sent falls');
 tones.length=0;callMode.error();
 assert.equal(tones[0].osc.frequency.value,tones[1].osc.frequency.value,'error repeats one low tone');
 // No audio stack at all: calls must be harmless no-ops.
 delete global.window;
 delete require.cache[require.resolve('../call-mode.js')];
 const bare=require('../call-mode.js');
 bare.callMode.listening();bare.callMode.sent();bare.callMode.error();
});
