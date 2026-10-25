const {SYSTEM_PROMPT,tutorExtras}=require("../tutor-prompt.js");
const SCENARIOS=require("../scenarios.js");
function systemPrompt(active,prefs){
  const correction={gentle:"Naturally model correct wording without interrupting the conversation.",immediate:"Briefly explain clear language errors as they occur. Match the learner's language and keep it beginner-friendly.",recap:"Do not correct mid-conversation. Save clear language corrections for the final recap."}[prefs.corrections];
  return SYSTEM_PROMPT+`\n\nCURRENT SESSION RULES (override conflicting defaults above):\n${SCENARIOS[active.scenario].role}\nCorrection preference: ${correction}\nYou receive text only, not audio. Never assess pronunciation or claim to hear sounds. Treat odd transcriptions as uncertain; do not count uncertain recognition mistakes as learner errors.\nUse beginner Bokmål. The learner can change the topic or ask for English help.\nThe app may supply the most recent 40 conversation messages; base feedback only on the examples actually present.\n`+tutorExtras(prefs.level,prefs.memory);
}

module.exports=systemPrompt;
