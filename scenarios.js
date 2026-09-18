"use strict";
const SCENARIOS = {
  cafe: {title:"A coffee, please", goal:"Order a drink and ask the price.", role:"You are a café worker. Help the learner order a drink and ask the price. Keep this to a short beginner role play.", opening:"Hei! Hva vil du ha?", translation:"Hi! What would you like?", phrases:[["Jeg vil gjerne ha en kaffe.","I would like a coffee."],["Hva koster det?","How much does it cost?"],["Tusen takk!","Thank you very much!"]]},
  introductions: {title:"Hei! I'm Matthew.", goal:"Introduce yourself and get acquainted.", role:"You are meeting the learner for the first time. Practise names, where you come from, and one interest.", opening:"Hei! Jeg heter Nora. Hva heter du?", translation:"Hi! My name is Nora. What is your name?", phrases:[["Jeg heter Matthew.","My name is Matthew."],["Jeg kommer fra Storbritannia.","I come from the United Kingdom."],["Hyggelig å møte deg.","Nice to meet you."]]},
  shop: {title:"In the shop", goal:"Find what you need and ask the price.", role:"You are a shop assistant. Help the learner find an item, ask its price, and buy it. Use simple everyday vocabulary.", opening:"Hei! Kan jeg hjelpe deg?", translation:"Hi! Can I help you?", phrases:[["Jeg ser etter en genser.","I'm looking for a jumper."],["Hvor mye koster den?","How much does it cost?"],["Jeg tar den.","I'll take it."]]},
  free: {title:"A little conversation", goal:"Talk about your day, your interests, or anything you like.", role:"Have a relaxed beginner conversation about the learner's day and interests.", opening:"Hei, Matthew! Hvordan har du det?", translation:"Hi, Matthew! How are you?", phrases:[["Jeg har det bra.","I'm doing well."],["Kan du si det en gang til?","Can you say that again?"],["Jeg forstår ikke.","I don't understand."]]}
};

Object.assign(SCENARIOS, {
  "restaurant": {
    "title": "A table for two",
    "category": "Food & drink",
    "goal": "Ask for a table and order a simple meal.",
    "role": "Run a fictional Norwegian beginner role play: Ask for a table and order a simple meal. Start with simple A1 language and one question at a time. Use fictional names, addresses, prices, and times where needed; never request real personal details. Do not claim to make real bookings or purchases.",
    "opening": "God kveld! Hvor mange er dere?",
    "translation": "Good evening! How many of you are there?",
    "phrases": [
      [
        "Et bord for to, takk.",
        "A table for two, please."
      ],
      [
        "Kan jeg få menyen?",
        "May I have the menu?"
      ],
      [
        "Kan vi få regningen?",
        "Can we have the bill?"
      ]
    ]
  },
  "bakery": {
    "title": "Something from the bakery",
    "category": "Food & drink",
    "goal": "Buy bread and something sweet.",
    "role": "Run a fictional Norwegian beginner role play: Buy bread and something sweet. Start with simple A1 language and one question at a time. Use fictional names, addresses, prices, and times where needed; never request real personal details. Do not claim to make real bookings or purchases.",
    "opening": "Hei! Hva vil du kjøpe?",
    "translation": "Hi! What would you like to buy?",
    "phrases": [
      [
        "Jeg vil ha et brød.",
        "I would like a loaf of bread."
      ],
      [
        "Har dere kanelboller?",
        "Do you have cinnamon buns?"
      ],
      [
        "To stykker, takk.",
        "Two, please."
      ]
    ]
  },
  "supermarket": {
    "title": "The weekly shop",
    "category": "Food & drink",
    "goal": "Find ingredients and pay at the checkout.",
    "role": "Run a fictional Norwegian beginner role play: Find ingredients and pay at the checkout. Start with simple A1 language and one question at a time. Use fictional names, addresses, prices, and times where needed; never request real personal details. Do not claim to make real bookings or purchases.",
    "opening": "Hei! Leter du etter noe?",
    "translation": "Hi! Are you looking for something?",
    "phrases": [
      [
        "Hvor finner jeg melk?",
        "Where can I find milk?"
      ],
      [
        "Jeg trenger en pose.",
        "I need a bag."
      ],
      [
        "Kan jeg betale med kort?",
        "Can I pay by card?"
      ]
    ]
  },
  "takeaway": {
    "title": "Lunch to go",
    "category": "Food & drink",
    "goal": "Order a sandwich and a drink to take away.",
    "role": "Run a fictional Norwegian beginner role play: Order a sandwich and a drink to take away. Start with simple A1 language and one question at a time. Use fictional names, addresses, prices, and times where needed; never request real personal details. Do not claim to make real bookings or purchases.",
    "opening": "Hei! Vil du spise her eller ta med?",
    "translation": "Hi! Would you like to eat here or take it away?",
    "phrases": [
      [
        "Jeg vil gjerne ta med.",
        "I would like to take it away."
      ],
      [
        "En sandwich og et glass vann, takk.",
        "A sandwich and a glass of water, please."
      ],
      [
        "Uten ost, takk.",
        "Without cheese, please."
      ]
    ]
  },
  "hotel": {
    "title": "Checking in",
    "category": "Travel",
    "goal": "Check into a hotel and ask about breakfast.",
    "role": "Run a fictional Norwegian beginner role play: Check into a hotel and ask about breakfast. Start with simple A1 language and one question at a time. Use fictional names, addresses, prices, and times where needed; never request real personal details. Do not claim to make real bookings or purchases.",
    "opening": "Velkommen! Har du en reservasjon?",
    "translation": "Welcome! Do you have a reservation?",
    "phrases": [
      [
        "Jeg har bestilt et rom.",
        "I have booked a room."
      ],
      [
        "Når er det frokost?",
        "When is breakfast?"
      ],
      [
        "Hvor er heisen?",
        "Where is the lift?"
      ]
    ]
  },
  "train": {
    "title": "A train ticket",
    "category": "Travel",
    "goal": "Buy a ticket and ask which platform to use.",
    "role": "Run a fictional Norwegian beginner role play: Buy a ticket and ask which platform to use. Start with simple A1 language and one question at a time. Use fictional names, addresses, prices, and times where needed; never request real personal details. Do not claim to make real bookings or purchases.",
    "opening": "Hei! Hvor skal du reise?",
    "translation": "Hi! Where are you travelling to?",
    "phrases": [
      [
        "En billett til Oslo, takk.",
        "A ticket to Oslo, please."
      ],
      [
        "Når går neste tog?",
        "When does the next train leave?"
      ],
      [
        "Hvilket spor går toget fra?",
        "Which platform does the train leave from?"
      ]
    ]
  },
  "bus": {
    "title": "Catching the bus",
    "category": "Travel",
    "goal": "Check your bus route and where to get off.",
    "role": "Run a fictional Norwegian beginner role play: Check your bus route and where to get off. Start with simple A1 language and one question at a time. Use fictional names, addresses, prices, and times where needed; never request real personal details. Do not claim to make real bookings or purchases.",
    "opening": "Hei! Hvor skal du?",
    "translation": "Hi! Where are you going?",
    "phrases": [
      [
        "Går denne bussen til sentrum?",
        "Does this bus go to the city centre?"
      ],
      [
        "Hvor kjøper jeg billett?",
        "Where do I buy a ticket?"
      ],
      [
        "Kan du si fra når vi er fremme?",
        "Can you let me know when we arrive?"
      ]
    ]
  },
  "directions": {
    "title": "Finding your way",
    "category": "Travel",
    "goal": "Ask for directions and check you understood.",
    "role": "Run a fictional Norwegian beginner role play: Ask for directions and check you understood. Start with simple A1 language and one question at a time. Use fictional names, addresses, prices, and times where needed; never request real personal details. Do not claim to make real bookings or purchases.",
    "opening": "Hei! Trenger du hjelp?",
    "translation": "Hi! Do you need help?",
    "phrases": [
      [
        "Hvor er togstasjonen?",
        "Where is the train station?"
      ],
      [
        "Er det langt å gå?",
        "Is it a long walk?"
      ],
      [
        "Skal jeg ta til venstre?",
        "Should I turn left?"
      ]
    ]
  },
  "airport": {
    "title": "At the airport",
    "category": "Travel",
    "goal": "Find your gate and ask about departure.",
    "role": "Run a fictional Norwegian beginner role play: Find your gate and ask about departure. Start with simple A1 language and one question at a time. Use fictional names, addresses, prices, and times where needed; never request real personal details. Do not claim to make real bookings or purchases.",
    "opening": "Hei! Hvilket fly skal du ta?",
    "translation": "Hi! Which flight are you taking?",
    "phrases": [
      [
        "Hvor er gate tolv?",
        "Where is gate twelve?"
      ],
      [
        "Når begynner ombordstigningen?",
        "When does boarding begin?"
      ],
      [
        "Er flyet forsinket?",
        "Is the flight delayed?"
      ]
    ]
  },
  "taxi": {
    "title": "A taxi ride",
    "category": "Travel",
    "goal": "Explain where you are going and ask the fare.",
    "role": "Run a fictional Norwegian beginner role play: Explain where you are going and ask the fare. Start with simple A1 language and one question at a time. Use fictional names, addresses, prices, and times where needed; never request real personal details. Do not claim to make real bookings or purchases.",
    "opening": "Hei! Hvor vil du dra?",
    "translation": "Hi! Where would you like to go?",
    "phrases": [
      [
        "Til hotellet, takk.",
        "To the hotel, please."
      ],
      [
        "Hvor lang tid tar det?",
        "How long does it take?"
      ],
      [
        "Hva koster turen?",
        "How much does the journey cost?"
      ]
    ]
  },
  "weather": {
    "title": "A little weather talk",
    "category": "People & leisure",
    "goal": "Describe the weather and make a simple plan.",
    "role": "Run a fictional Norwegian beginner role play: Describe the weather and make a simple plan. Start with simple A1 language and one question at a time. Use fictional names, addresses, prices, and times where needed; never request real personal details. Do not claim to make real bookings or purchases.",
    "opening": "Hei! Hvordan er været hos deg?",
    "translation": "Hi! What is the weather like where you are?",
    "phrases": [
      [
        "Det regner i dag.",
        "It is raining today."
      ],
      [
        "Det er litt kaldt.",
        "It is a little cold."
      ],
      [
        "Skal vi gå en tur?",
        "Shall we go for a walk?"
      ]
    ]
  },
  "weekend": {
    "title": "Weekend plans",
    "category": "People & leisure",
    "goal": "Say what you want to do this weekend.",
    "role": "Run a fictional Norwegian beginner role play: Say what you want to do this weekend. Start with simple A1 language and one question at a time. Use fictional names, addresses, prices, and times where needed; never request real personal details. Do not claim to make real bookings or purchases.",
    "opening": "Hva skal du gjøre i helgen?",
    "translation": "What are you going to do this weekend?",
    "phrases": [
      [
        "Jeg skal besøke en venn.",
        "I am going to visit a friend."
      ],
      [
        "Jeg har ingen planer ennå.",
        "I have no plans yet."
      ],
      [
        "Hva har du lyst til å gjøre?",
        "What would you like to do?"
      ]
    ]
  },
  "hobbies": {
    "title": "What do you enjoy?",
    "category": "People & leisure",
    "goal": "Talk about a hobby and ask about someone else.",
    "role": "Run a fictional Norwegian beginner role play: Talk about a hobby and ask about someone else. Start with simple A1 language and one question at a time. Use fictional names, addresses, prices, and times where needed; never request real personal details. Do not claim to make real bookings or purchases.",
    "opening": "Hva liker du å gjøre på fritiden?",
    "translation": "What do you like to do in your free time?",
    "phrases": [
      [
        "Jeg liker å lese.",
        "I like reading."
      ],
      [
        "Jeg går ofte på tur.",
        "I often go for walks."
      ],
      [
        "Hva liker du?",
        "What do you like?"
      ]
    ]
  },
  "family": {
    "title": "People in your life",
    "category": "People & leisure",
    "goal": "Describe your family or invent one for practice.",
    "role": "Run a fictional Norwegian beginner role play: Describe your family or invent one for practice. Start with simple A1 language and one question at a time. Use fictional names, addresses, prices, and times where needed; never request real personal details. Do not claim to make real bookings or purchases.",
    "opening": "Vil du fortelle litt om familien din?",
    "translation": "Would you like to tell me a little about your family?",
    "phrases": [
      [
        "Jeg har en søster.",
        "I have a sister."
      ],
      [
        "Hun bor i England.",
        "She lives in England."
      ],
      [
        "Vi snakker ofte sammen.",
        "We often talk to each other."
      ]
    ]
  },
  "invitation": {
    "title": "Fancy a coffee?",
    "category": "People & leisure",
    "goal": "Invite a friend and agree a time and place.",
    "role": "Run a fictional Norwegian beginner role play: Invite a friend and agree a time and place. Start with simple A1 language and one question at a time. Use fictional names, addresses, prices, and times where needed; never request real personal details. Do not claim to make real bookings or purchases.",
    "opening": "Hei! Har du tid til en kaffe denne uken?",
    "translation": "Hi! Do you have time for a coffee this week?",
    "phrases": [
      [
        "Det vil jeg gjerne.",
        "I would like that."
      ],
      [
        "Passer det på fredag?",
        "Would Friday suit you?"
      ],
      [
        "Skal vi møtes klokken tre?",
        "Shall we meet at three o’clock?"
      ]
    ]
  },
  "neighbour": {
    "title": "Meeting a neighbour",
    "category": "People & leisure",
    "goal": "Introduce yourself and ask about the neighbourhood.",
    "role": "Run a fictional Norwegian beginner role play: Introduce yourself and ask about the neighbourhood. Start with simple A1 language and one question at a time. Use fictional names, addresses, prices, and times where needed; never request real personal details. Do not claim to make real bookings or purchases.",
    "opening": "Hei! Er du ny her?",
    "translation": "Hi! Are you new here?",
    "phrases": [
      [
        "Ja, jeg har nettopp flyttet hit.",
        "Yes, I have just moved here."
      ],
      [
        "Hvordan er det å bo her?",
        "What is it like living here?"
      ],
      [
        "Er det en butikk i nærheten?",
        "Is there a shop nearby?"
      ]
    ]
  },
  "routine": {
    "title": "Your everyday routine",
    "category": "Daily life",
    "goal": "Describe a few things you do in a normal day.",
    "role": "Run a fictional Norwegian beginner role play: Describe a few things you do in a normal day. Start with simple A1 language and one question at a time. Use fictional names, addresses, prices, and times where needed; never request real personal details. Do not claim to make real bookings or purchases.",
    "opening": "Når står du opp om morgenen?",
    "translation": "When do you get up in the morning?",
    "phrases": [
      [
        "Jeg står opp klokken sju.",
        "I get up at seven."
      ],
      [
        "Jeg spiser frokost hjemme.",
        "I eat breakfast at home."
      ],
      [
        "Om kvelden leser jeg.",
        "In the evening I read."
      ]
    ]
  },
  "work": {
    "title": "A chat about work",
    "category": "Daily life",
    "goal": "Say what you do and ask a simple work question.",
    "role": "Run a fictional Norwegian beginner role play: Say what you do and ask a simple work question. Start with simple A1 language and one question at a time. Use fictional names, addresses, prices, and times where needed; never request real personal details. Do not claim to make real bookings or purchases.",
    "opening": "Hva jobber du med?",
    "translation": "What do you do for work?",
    "phrases": [
      [
        "Jeg jobber på et kontor.",
        "I work in an office."
      ],
      [
        "Jeg jobber hjemme i dag.",
        "I am working from home today."
      ],
      [
        "Når begynner du på jobb?",
        "When do you start work?"
      ]
    ]
  },
  "library": {
    "title": "At the library",
    "category": "Daily life",
    "goal": "Ask for a library card and find a beginner book.",
    "role": "Run a fictional Norwegian beginner role play: Ask for a library card and find a beginner book. Start with simple A1 language and one question at a time. Use fictional names, addresses, prices, and times where needed; never request real personal details. Do not claim to make real bookings or purchases.",
    "opening": "Hei! Hva kan jeg hjelpe deg med?",
    "translation": "Hi! What can I help you with?",
    "phrases": [
      [
        "Jeg vil gjerne ha et lånekort.",
        "I would like a library card."
      ],
      [
        "Har dere bøker på lett norsk?",
        "Do you have books in easy Norwegian?"
      ],
      [
        "Hvor lenge kan jeg låne boken?",
        "How long can I borrow the book?"
      ]
    ]
  },
  "post": {
    "title": "Sending a parcel",
    "category": "Daily life",
    "goal": "Ask how to send a parcel and what it costs.",
    "role": "Run a fictional Norwegian beginner role play: Ask how to send a parcel and what it costs. Start with simple A1 language and one question at a time. Use fictional names, addresses, prices, and times where needed; never request real personal details. Do not claim to make real bookings or purchases.",
    "opening": "Hei! Hvor skal pakken sendes?",
    "translation": "Hi! Where should the parcel be sent?",
    "phrases": [
      [
        "Jeg vil sende denne pakken.",
        "I would like to send this parcel."
      ],
      [
        "Den skal til Storbritannia.",
        "It is going to the United Kingdom."
      ],
      [
        "Hvor mye koster det?",
        "How much does it cost?"
      ]
    ]
  },
  "haircut": {
    "title": "Booking a haircut",
    "category": "Daily life",
    "goal": "Ask for an appointment and explain a simple haircut.",
    "role": "Run a fictional Norwegian beginner role play: Ask for an appointment and explain a simple haircut. Start with simple A1 language and one question at a time. Use fictional names, addresses, prices, and times where needed; never request real personal details. Do not claim to make real bookings or purchases.",
    "opening": "Hei! Vil du bestille en time?",
    "translation": "Hi! Would you like to book an appointment?",
    "phrases": [
      [
        "Har dere en ledig time i morgen?",
        "Do you have an appointment available tomorrow?"
      ],
      [
        "Bare litt kortere, takk.",
        "Just a little shorter, please."
      ],
      [
        "Klokken ti passer bra.",
        "Ten o’clock works well."
      ]
    ]
  }
});
SCENARIOS.cafe.category = "Food & drink";
SCENARIOS.introductions.category = "People & leisure";
SCENARIOS.shop.category = "Daily life";

if(typeof module!=="undefined")module.exports=SCENARIOS;
