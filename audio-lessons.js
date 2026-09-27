/* Original Bokmål lessons. English cues and model answers, not copied course material. */
const AudioCourse = (() => {
  const lessons = [
    {
      id: 'make-plans', title: 'Let’s make a plan', subtitle: 'Suggest a time, offer an alternative, and agree where to meet.',
      note: 'Use passer to ask whether a time suits someone. Norwegian often uses the present tense for a future arrangement.',
      phrases: [
        ['Har du lyst til å ta en kaffe?', 'Would you like to have a coffee?', 'Har du lyst til means would you like to. Listen, then repeat.'],
        ['Når passer det for deg?', 'When suits you?', 'Passer means suits or fits. Ask when it suits the other person.'],
        ['Jeg er opptatt i morgen.', 'I’m busy tomorrow.', 'Opptatt means busy. I morgen means tomorrow.'],
        ['Hva med torsdag i stedet?', 'How about Thursday instead?', 'Hva med offers a suggestion. I stedet means instead.'],
        ['Det passer bedre for meg.', 'That suits me better.', 'Bedre means better. You can use this to accept the alternative.'],
        ['Skal vi møtes utenfor kafeen?', 'Shall we meet outside the café?', 'Skal vi can introduce a suggestion. Utenfor means outside.'],
        ['Kan vi møtes litt senere?', 'Can we meet a little later?', 'Litt senere means a little later.'],
        ['Da ses vi på torsdag.', 'Then I’ll see you on Thursday.', 'Da means then. Ses vi is a natural way to say see you.']
      ],
      dialogue: [0,1,2,3,4,5,7]
    },
    {
      id: 'your-day', title: 'How was your day?', subtitle: 'Move beyond introductions and talk about what happened.',
      note: 'Hear useful past forms in context: var, jobbet, tok, and gikk. You don’t need to memorise a grammar table to try them.',
      phrases: [
        ['Hvordan var dagen din?', 'How was your day?', 'Var is the past form of er. Listen, then repeat.'],
        ['Jeg jobbet hjemme i dag.', 'I worked from home today.', 'Jobbet describes work in the past. Hjemme means at home.'],
        ['Jeg hadde mye å gjøre.', 'I had a lot to do.', 'Hadde means had. Mye å gjøre means a lot to do.'],
        ['Etter jobb gikk jeg en tur.', 'After work, I went for a walk.', 'Gikk is the past form of gå. After etter jobb, the verb comes before jeg.'],
        ['Det var godt å komme seg ut.', 'It was nice to get out.', 'This is a useful reaction after a walk or a long day indoors.'],
        ['Jeg har ikke spist ennå.', 'I haven’t eaten yet.', 'Har spist means have eaten. Ikke makes it negative, and ennå means yet here.'],
        ['Skal vi lage middag sammen?', 'Shall we cook dinner together?', 'Lage middag means make dinner. Sammen means together.'],
        ['Jeg gleder meg til helgen.', 'I’m looking forward to the weekend.', 'Jeg gleder meg til means I am looking forward to.']
      ],
      dialogue: [0,1,2,3,4,5,6,7]
    },
    {
      id: 'travel-changes', title: 'When travel plans change', subtitle: 'Ask for help, find an alternative, and check the details.',
      note: 'Practise complete questions you can reuse. After hvor, når, and hvilken, listen for the position of the verb.',
      phrases: [
        ['Unnskyld, kan du hjelpe meg?', 'Excuse me, can you help me?', 'A polite way to start when you need help.'],
        ['Toget mitt er forsinket.', 'My train is delayed.', 'Forsinket means delayed. Toget mitt means my train.'],
        ['Jeg må rekke en buss.', 'I need to catch a bus.', 'Rekke means to make it in time. Here you need to catch a bus.'],
        ['Finnes det en annen rute?', 'Is there another route?', 'Finnes det asks whether something exists or is available.'],
        ['Hvor må jeg bytte?', 'Where do I need to change?', 'Bytte means change. Here it means change transport.'],
        ['Hvor lang tid tar det?', 'How long does it take?', 'Learn this question as a whole phrase for asking about duration.'],
        ['Gjelder billetten på bussen også?', 'Is the ticket valid on the bus too?', 'Gjelder asks whether the ticket applies. Også means too.'],
        ['Kan du vise meg på kartet?', 'Can you show me on the map?', 'Vise means show. På kartet means on the map.']
      ],
      dialogue: [0,1,2,3,4,5,6,7]
    },
    {
      id: 'opinions', title: 'Say a little more', subtitle: 'Give an opinion, explain a reason, and keep a conversation going.',
      note: 'Build longer answers with fordi (because), men (but), and hvis (if). Try answering before the model voice returns.',
      phrases: [
        ['Hva synes du om det?', 'What do you think of that?', 'Synes is useful for asking for an opinion.'],
        ['Jeg synes det høres bra ut.', 'I think that sounds good.', 'Høres bra ut means sounds good.'],
        ['Jeg er enig, men jeg har et spørsmål.', 'I agree, but I have a question.', 'Enig means in agreement. Men means but.'],
        ['Kan du forklare litt mer?', 'Can you explain a little more?', 'Forklare means explain.'],
        ['Jeg vil gjerne prøve noe nytt.', 'I’d like to try something new.', 'Vil gjerne is a friendly way to say would like to. Noe nytt means something new.'],
        ['Jeg lærer norsk fordi jeg vil snakke med flere mennesker.', 'I’m learning Norwegian because I want to talk to more people.', 'Fordi connects your reason to what you are doing. Take your time with this longer sentence.'],
        ['Hvis jeg ikke forstår, spør jeg igjen.', 'If I don’t understand, I ask again.', 'Hvis means if. Notice spør jeg after the opening if clause.'],
        ['Det blir lettere når jeg øver.', 'It gets easier when I practise.', 'Lettere means easier. Øver means practise.']
      ],
      dialogue: [0,1,2,3,5,6,7]
    }
  ];
  function stepsFor(lesson) {
    const steps = [];
    const say = (text, lang = 'en', label = 'Listen', meaning = '') => steps.push({type:'say', text, lang, label, meaning});
    const wait = (label, text, phrase) => steps.push({type:'wait', label, text, seconds:Math.max(6, Math.ceil(phrase.split(' ').length * .8))});
    const recall = (phrase, label='Your turn') => {
      say(`How would you say: ${phrase[1]}`, 'en', label);
      wait('Try it in Norwegian', phrase[1], phrase[0]);
      say(phrase[0], 'nb', 'One way to say it', phrase[1]);
      wait('Say it once more', phrase[0], phrase[0]);
    };
    say(`${lesson.title}. Listen, repeat, and then try to remember. Speak aloud during the pauses. Your voice is not recorded.`, 'en', 'Welcome');
    lesson.phrases.forEach((phrase, i) => {
      say(`${phrase[1]} ${phrase[2]}`, 'en', 'Meaning & explanation');
      say(phrase[0], 'nb', 'Listen in Norwegian', phrase[1]);
      wait('Repeat aloud', phrase[0], phrase[0]);
      say(phrase[0], 'nb', 'Listen once more', phrase[1]);
      recall(phrase);
      if(i % 2 === 1) recall(lesson.phrases[i-1], 'Remember an earlier phrase');
    });
    say('Now listen to the phrases together as a short practice sequence. In a real conversation, the other person would add their own answers.', 'en', 'Listen together');
    for(const i of lesson.dialogue) say(lesson.phrases[i][0], 'nb', 'Practice sequence', lesson.phrases[i][1]);
    say('One last round. Try these in a different order. More than one answer can be right.', 'en', 'Recall round');
    for(const i of [5,2,7,0,6,3,1,4]) recall(lesson.phrases[i]);
    const previous = lessons[lessons.indexOf(lesson)-1];
    if(previous){say('And two phrases from the previous lesson.', 'en', 'Bring it back');recall(previous.phrases[0]);recall(previous.phrases[4]);}
    say('You have finished this lesson. Come back and try it again, or use one of these phrases in a conversation.', 'en', 'Well done');
    return steps;
  }
  const conversations = {
    'make-plans': [
      [2,'Skal vi ta en kaffe i morgen?','Shall we have a coffee tomorrow?','Tell your friend you are busy tomorrow.','Start with Jeg er…'],
      [3,'Når passer det for deg, da?','When suits you, then?','Suggest Thursday instead.','How about… begins Hva med…'],
      [6,'Torsdag passer. Skal vi møtes klokka to?','Thursday works. Shall we meet at two?','Ask if you can meet a little later.','Can we meet… begins Kan vi møtes…'],
      [7,'Ja, klokka tre passer også.','Yes, three o’clock works too.','Say you will see them on Thursday.','Start with Da ses vi…']
    ],
    'your-day': [
      [1,'Hvordan var dagen din?','How was your day?','Say you worked from home today.','The past of jobbe is jobbet.'],
      [2,'Var det travelt?','Was it busy?','Say you had a lot to do.','I had… begins Jeg hadde…'],
      [3,'Hva gjorde du etter jobb?','What did you do after work?','Say you went for a walk after work.','Begin Etter jobb, followed by gikk jeg…'],
      [6,'Jeg er sulten. Hva skal vi gjøre?','I’m hungry. What shall we do?','Suggest cooking dinner together.','Shall we… begins Skal vi…']
    ],
    'travel-changes': [
      [1,'Hei! Hva trenger du hjelp med?','Hello! What do you need help with?','Explain that your train is delayed.','My train… is Toget mitt…'],
      [3,'Da rekker du kanskje ikke bussen.','Then you might not catch the bus.','Ask whether there is another route.','Is there… begins Finnes det…'],
      [5,'Du kan ta bussen via sentrum.','You can take the bus via the city centre.','Ask how long it takes.','Start Hvor lang tid…'],
      [6,'Bussen går om ti minutter.','The bus leaves in ten minutes.','Ask whether the ticket is valid on the bus too.','Is the ticket valid… begins Gjelder billetten…']
    ],
    'opinions': [
      [1,'Vi kan bli med på en norsk samtalekveld. Hva synes du?','We could join a Norwegian conversation evening. What do you think?','Say you think that sounds good.','I think… begins Jeg synes…'],
      [3,'Vi møtes og snakker i små grupper.','We meet and talk in small groups.','Ask them to explain a little more.','Can you explain… begins Kan du forklare…'],
      [5,'Hvorfor lærer du norsk?','Why are you learning Norwegian?','Explain that you want to talk to more people.','Link your reason with fordi, meaning because.'],
      [6,'Hva gjør du hvis du ikke forstår?','What do you do if you don’t understand?','Say that if you don’t understand, you ask again.','Begin Hvis jeg ikke forstår…']
    ]
  };
  function conversationSteps(lesson, indices=null){
    return conversations[lesson.id].filter(t=>!indices||indices.includes(t[0])).flatMap(([index,nb,en,cue,hint])=>{
      const phrase=lesson.phrases[index],meta={phraseId:`${lesson.id}:${index}`};
      return [
        {type:'say',lang:'nb',text:nb,meaning:en,label:'Your conversation partner'},
        {type:'say',lang:'en',text:cue,label:'Your turn'},
        {type:'response',lang:'en',text:cue,label:'Answer aloud',hint,...meta},
        {type:'say',lang:'nb',text:phrase[0],meaning:phrase[1],label:'One possible reply',...meta},
        {type:'assess',lang:'nb',text:phrase[0],meaning:phrase[1],label:'How did that feel?',...meta}
      ];
    });
  }
  return {lessons, stepsFor, conversationSteps};
})();
if(typeof module !== 'undefined') module.exports = AudioCourse;
