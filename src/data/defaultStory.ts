import { StoryData } from '../types';

const defaultStory: StoryData = {
  title: 'The Interrogation',
  startNodeId: 'intro',
  nodes: {
    intro: {
      id: 'intro',
      speaker: 'Narrator',
      text: 'A heavy metal door slams shut behind you. The room is bare concrete — a steel table, two chairs, a single buzzing fluorescent light. Your wrists ache from the cuffs. You have no idea how long you\'ve been here. A man in a grey suit sits across from you. He sets a thin folder on the table and opens it slowly.',
      choices: [
        { label: 'Stay silent and observe him', targetId: 'silent_observe' },
        { label: '"Who are you?"', targetId: 'ask_who' },
        {
          label: 'Try to slip one hand free of the cuffs',
          targetId: 'cuffs_success',
          check: { stat: 'composure', dc: 14 },
          failTargetId: 'cuffs_fail',
        },
      ],
    },

    silent_observe: {
      id: 'silent_observe',
      speaker: 'Interrogator',
      text: 'He looks up from the folder, studies your face. "The silent type. Good. That makes my job more interesting." He taps a photo in the folder — you catch a glimpse of a building on fire. "Let\'s start simple. Where were you on the night of March 15th?"',
      setFlags: ['observed_photo'],
      choices: [
        { label: '"I want a lawyer."', targetId: 'demand_lawyer' },
        {
          label: 'Fabricate a convincing alibi',
          targetId: 'alibi_success',
          check: { stat: 'deception', dc: 12 },
          failTargetId: 'alibi_fail',
        },
        { label: '"What building is that in the photo?"', targetId: 'ask_about_photo', requireFlags: ['observed_photo'] },
      ],
    },

    ask_who: {
      id: 'ask_who',
      speaker: 'Interrogator',
      text: '"Names don\'t matter here. Yours doesn\'t. Mine certainly doesn\'t." He closes the folder and leans forward. "What matters is what you know — and what you\'re going to tell me."',
      choices: [
        { label: '"I don\'t know anything."', targetId: 'deny_knowledge' },
        { label: '"What do you want to know?"', targetId: 'cooperate_early' },
        {
          label: 'Read his body language for weakness',
          targetId: 'read_success',
          check: { stat: 'wit', dc: 13 },
          failTargetId: 'read_fail',
        },
      ],
    },

    cuffs_success: {
      id: 'cuffs_success',
      speaker: 'Narrator',
      text: 'You feel the cuff mechanism give slightly. One hand is free — though you keep it in place, hiding your advantage. The interrogator doesn\'t notice.',
      setFlags: ['cuffs_loose'],
      grantItems: ['Loose Cuffs'],
      choices: [
        { label: 'Wait for the right moment', targetId: 'silent_observe' },
      ],
    },

    cuffs_fail: {
      id: 'cuffs_fail',
      speaker: 'Interrogator',
      text: 'The metal bites into your wrist. The interrogator glances down at the noise. "Trying to get comfortable? Don\'t bother. You\'ll be here a while." He picks up the folder again.',
      setFlags: ['cuffs_noticed'],
      choices: [
        { label: 'Stay still and listen', targetId: 'silent_observe' },
        { label: '"What do you want from me?"', targetId: 'ask_who' },
      ],
    },

    demand_lawyer: {
      id: 'demand_lawyer',
      speaker: 'Interrogator',
      text: 'He laughs — a dry, humourless sound. "A lawyer. That\'s charming." He stands, walks to the door, and knocks twice. Nothing happens. He sits back down. "No lawyers. No phone calls. No one knows you\'re here. Now — March 15th."',
      choices: [
        {
          label: 'Hold your nerve and refuse to speak',
          targetId: 'refuse_success',
          check: { stat: 'resolve', dc: 14 },
          failTargetId: 'refuse_fail',
        },
        {
          label: 'Fabricate a convincing alibi',
          targetId: 'alibi_success',
          check: { stat: 'deception', dc: 12 },
          failTargetId: 'alibi_fail',
        },
      ],
    },

    alibi_success: {
      id: 'alibi_success',
      speaker: 'Interrogator',
      text: 'You weave a story — specific enough to be believable, vague enough to be unverifiable. The interrogator writes something down. "We\'ll check that." He flips to the next page. You bought yourself time.',
      setFlags: ['alibi_accepted'],
      choices: [
        { label: 'Continue cooperating carefully', targetId: 'cooperate_early' },
      ],
    },

    alibi_fail: {
      id: 'alibi_fail',
      speaker: 'Interrogator',
      text: '"Really." He pushes a second photo across the table — a security camera still, timestamped March 15th, 23:47. It shows your face clearly. "Want to try again?"',
      setFlags: ['caught_lying'],
      choices: [
        { label: '"Fine. I was there. But I didn\'t do what you think."', targetId: 'partial_truth' },
        {
          label: 'Stay calm and pivot',
          targetId: 'pivot_success',
          check: { stat: 'composure', dc: 15 },
          failTargetId: 'pivot_fail',
        },
      ],
    },

    ask_about_photo: {
      id: 'ask_about_photo',
      speaker: 'Interrogator',
      text: 'His eyebrow rises — the first real reaction you\'ve seen. "You noticed that quickly." He turns the photo toward you. The Krasnov Industrial building, engulfed in flame. "You tell me what it is. You were there."',
      choices: [
        { label: '"That was already burning when I arrived."', targetId: 'partial_truth' },
        { label: '"Never seen it before."', targetId: 'deny_knowledge' },
      ],
    },

    deny_knowledge: {
      id: 'deny_knowledge',
      speaker: 'Interrogator',
      text: '"I think you do." He places both hands flat on the table. "And I think you know that I know you do. So let\'s skip the part where we pretend, and get to the part where you decide how this ends."',
      choices: [
        {
          label: '"You don\'t have anything on me."',
          targetId: 'bluff_success',
          check: { stat: 'deception', dc: 15 },
          failTargetId: 'bluff_fail',
        },
        { label: '"How does this end?"', targetId: 'how_it_ends' },
      ],
    },

    cooperate_early: {
      id: 'cooperate_early',
      speaker: 'Interrogator',
      text: 'He nods slowly. "Smart. Cooperation is... noticed." He pulls out a third photograph. An older woman. You recognize her immediately — your handler, Mira. "Who is this woman to you?"',
      choices: [
        { label: '"I\'ve never seen her before."', targetId: 'deny_mira' },
        { label: '"She\'s nobody. An asset."', targetId: 'downplay_mira' },
        {
          label: 'Deflect with a half-truth',
          targetId: 'deflect_mira_success',
          check: { stat: 'wit', dc: 14 },
          failTargetId: 'deflect_mira_fail',
        },
      ],
    },

    read_success: {
      id: 'read_success',
      speaker: 'Narrator',
      text: 'You catch it — a micro-expression, just a flicker. He\'s tired. His left hand trembles slightly when he reaches for the folder. This man is under pressure too. Someone is watching him, just like he\'s watching you.',
      setFlags: ['read_interrogator'],
      choices: [
        { label: '"You look tired. Long night?"', targetId: 'press_interrogator' },
        { label: 'File that away and cooperate', targetId: 'cooperate_early' },
      ],
    },

    read_fail: {
      id: 'read_fail',
      speaker: 'Interrogator',
      text: 'He catches you staring. "Looking for something? You won\'t find it." His expression is a mask. Whatever he\'s thinking, you can\'t read it.',
      choices: [
        { label: '"I don\'t know anything."', targetId: 'deny_knowledge' },
        { label: '"What do you want to know?"', targetId: 'cooperate_early' },
      ],
    },

    refuse_success: {
      id: 'refuse_success',
      speaker: 'Narrator',
      text: 'Minutes pass. Maybe an hour. You say nothing. He says nothing. The fluorescent light hums. Finally, he stands. "Have it your way." He leaves the room. You hear the lock engage — and then something unexpected. A woman\'s voice from a speaker in the ceiling: "Well done. You passed."',
      setFlags: ['resisted_interrogation'],
      choices: [
        { label: '"Passed what?"', targetId: 'ending_loyalty' },
      ],
    },

    refuse_fail: {
      id: 'refuse_fail',
      speaker: 'Narrator',
      text: 'You try to hold your nerve, but the silence eats at you. Your hands shake. He notices. "There it is," he says softly. "Everyone breaks. The question is when, not if."',
      choices: [
        { label: '"Fine. What do you want to know?"', targetId: 'cooperate_early' },
        { label: '"Go to hell."', targetId: 'how_it_ends' },
      ],
    },

    partial_truth: {
      id: 'partial_truth',
      speaker: 'Interrogator',
      text: '"Now we\'re getting somewhere." He leans back, arms crossed. "So you were there. And the fire — what, it just happened? Spontaneous combustion?" He waits.',
      choices: [
        {
          label: 'Reveal the mission was sanctioned',
          targetId: 'reveal_sanctioned',
          requireFlags: ['alibi_accepted'],
        },
        { label: '"Someone else started it. I was extracting an asset."', targetId: 'reveal_extraction' },
        {
          label: 'Use your loose cuffs to grab the folder',
          targetId: 'grab_folder',
          requireItems: ['Loose Cuffs'],
          check: { stat: 'composure', dc: 12 },
          failTargetId: 'grab_folder_fail',
        },
      ],
    },

    press_interrogator: {
      id: 'press_interrogator',
      speaker: 'Interrogator',
      text: 'A pause. His jaw tightens. "This isn\'t about me." But you can see it — the crack in the armour. He\'s not just asking questions. He needs answers. Someone above him is demanding results.',
      setFlags: ['interrogator_pressured'],
      choices: [
        { label: '"Who\'s watching? Your boss?"', targetId: 'how_it_ends' },
        { label: '"I can help you. But you have to help me first."', targetId: 'negotiate' },
      ],
    },

    negotiate: {
      id: 'negotiate',
      speaker: 'Interrogator',
      text: 'He stares at you for a long time. Then he reaches over and switches off a small device under the table — a recorder. "You have two minutes. Talk fast."',
      setFlags: ['recorder_off'],
      choices: [
        { label: '"I need to know who sent you."', targetId: 'ending_deal' },
        { label: '"Let me walk out of here."', targetId: 'ending_escape' },
      ],
    },

    // --- Endings ---

    how_it_ends: {
      id: 'how_it_ends',
      speaker: 'Interrogator',
      text: '"How does it end?" He stands and buttons his jacket. "For most people, badly." The door opens. Two guards enter. As they pull you to your feet, the interrogator says, quietly: "For what it\'s worth — I believe you."',
      choices: [],
      ending: true,
    },

    ending_loyalty: {
      id: 'ending_loyalty',
      speaker: 'Narrator',
      text: 'The speaker crackles. "This was a test, agent. Your loyalty is confirmed." The cuffs release automatically. The door opens. Mira stands in the hallway, arms crossed, the ghost of a smile on her face. "Welcome back."',
      choices: [],
      ending: true,
    },

    ending_deal: {
      id: 'ending_deal',
      speaker: 'Interrogator',
      text: 'He writes a name on a scrap of paper and slides it across the table. You read it. Your blood goes cold — it\'s someone inside your own agency. "Now you know," he says. "And now we\'re both in danger." He unlocks the door. "Go. Before the recording restarts."',
      grantItems: ['The Name'],
      choices: [],
      ending: true,
    },

    ending_escape: {
      id: 'ending_escape',
      speaker: 'Narrator',
      text: 'He considers it. Then he takes out a key and unlocks your cuffs. "Corridor left, service exit. You have ninety seconds before the cameras cycle back." You don\'t look back. The cold night air hits your face and you start running.',
      choices: [],
      ending: true,
    },

    // --- Extra branching nodes ---

    reveal_extraction: {
      id: 'reveal_extraction',
      speaker: 'Interrogator',
      text: '"An extraction." He pulls out another photo — this time it\'s a face you don\'t recognize. "This man was found dead in the building. Was he your asset?" His voice is sharp now. He\'s close to something.',
      choices: [
        { label: '"I don\'t know him."', targetId: 'deny_knowledge' },
        { label: '"He was already dead when I got there."', targetId: 'how_it_ends' },
        {
          label: '"That\'s above your clearance."',
          targetId: 'press_interrogator',
          check: { stat: 'wit', dc: 13 },
          failTargetId: 'how_it_ends',
        },
      ],
    },

    reveal_sanctioned: {
      id: 'reveal_sanctioned',
      speaker: 'Interrogator',
      text: 'You tell him the operation was sanctioned from above. His expression shifts — confusion, then anger. "Sanctioned? By whom?" He wasn\'t expecting this. The power balance just shifted.',
      choices: [
        { label: '"Check with your superiors."', targetId: 'ending_loyalty' },
        { label: '"Let me make a call and I can prove it."', targetId: 'negotiate' },
      ],
    },

    grab_folder: {
      id: 'grab_folder',
      speaker: 'Narrator',
      text: 'In one fluid motion, you slip the cuffs and snatch the folder. Inside: photographs, transcripts, a list of names. One name is circled in red — yours. But next to it, another name: your handler, Mira. She\'s listed as the primary suspect.',
      setFlags: ['saw_folder'],
      grantItems: ['Classified Folder'],
      choices: [
        { label: '"Mira isn\'t who you\'re looking for."', targetId: 'negotiate' },
        { label: 'Pocket the list and play dumb', targetId: 'how_it_ends' },
      ],
    },

    grab_folder_fail: {
      id: 'grab_folder_fail',
      speaker: 'Interrogator',
      text: 'You lunge — but he\'s faster. His hand pins your wrist to the table. "Interesting." He examines the loose cuff. "You\'re resourceful. But not resourceful enough." He calls for the guards.',
      removeItems: ['Loose Cuffs'],
      choices: [
        { label: 'Accept your fate', targetId: 'how_it_ends' },
      ],
    },

    deny_mira: {
      id: 'deny_mira',
      speaker: 'Interrogator',
      text: '"Liar." He says it without heat, almost bored. "We have phone records, meeting locations, dead drops. She ran you for three years." He taps the photo. "The question is whether she ordered the fire — or you did."',
      choices: [
        { label: '"She had nothing to do with the fire."', targetId: 'partial_truth' },
        { label: 'Say nothing', targetId: 'demand_lawyer' },
      ],
    },

    downplay_mira: {
      id: 'downplay_mira',
      speaker: 'Interrogator',
      text: '"An asset." He almost smiles. "She\'s your handler and you both know it. But I appreciate the attempt." He puts the photo away. "She\'s in a room like this one, three doors down. Whatever you tell me — I\'ll compare notes."',
      setFlags: ['mira_captured'],
      choices: [
        {
          label: '"If she\'s here, you already know everything."',
          targetId: 'negotiate',
          check: { stat: 'wit', dc: 14 },
          failTargetId: 'how_it_ends',
        },
        { label: '"Don\'t hurt her."', targetId: 'how_it_ends' },
      ],
    },

    deflect_mira_success: {
      id: 'deflect_mira_success',
      speaker: 'Narrator',
      text: 'You give just enough to seem cooperative — a different name, a plausible connection. The interrogator buys it, writing it down carefully. You\'ve steered him away from Mira. For now.',
      setFlags: ['mira_protected'],
      choices: [
        { label: 'Keep talking, keep deflecting', targetId: 'partial_truth' },
      ],
    },

    deflect_mira_fail: {
      id: 'deflect_mira_fail',
      speaker: 'Interrogator',
      text: '"You hesitated. Right there — just now." He points at you. "That tells me she matters. And that means she\'s leverage." He picks up a phone on the wall. "Bring in the woman."',
      setFlags: ['mira_in_danger'],
      choices: [
        { label: '"Wait. I\'ll talk."', targetId: 'negotiate' },
        {
          label: 'Stay stone-faced',
          targetId: 'demand_lawyer',
          check: { stat: 'resolve', dc: 16 },
          failTargetId: 'how_it_ends',
        },
      ],
    },

    bluff_success: {
      id: 'bluff_success',
      speaker: 'Narrator',
      text: 'Your bluff lands. The interrogator\'s confidence wavers — just for a second, but you see it. He doesn\'t have as much as he pretended. The folder is thinner than it looked.',
      setFlags: ['called_bluff'],
      choices: [
        { label: 'Press the advantage', targetId: 'press_interrogator' },
      ],
    },

    bluff_fail: {
      id: 'bluff_fail',
      speaker: 'Interrogator',
      text: '"Don\'t have anything?" He opens the folder wide. Photographs, recordings, satellite imagery. "I have everything. The only thing I don\'t have — is your confession. And I will."',
      choices: [
        { label: '"Then why are we still talking?"', targetId: 'how_it_ends' },
        { label: '"What do I get if I cooperate?"', targetId: 'negotiate' },
      ],
    },

    pivot_success: {
      id: 'pivot_success',
      speaker: 'Narrator',
      text: 'You keep your breathing steady. "That photo proves I was near the building. It doesn\'t prove I set the fire." The interrogator pauses. He\'s reassessing.',
      choices: [
        { label: '"Someone else set that fire. I can tell you who."', targetId: 'negotiate' },
      ],
    },

    pivot_fail: {
      id: 'pivot_fail',
      speaker: 'Interrogator',
      text: 'Your voice cracks — just barely, but he hears it. "There it is," he murmurs. He slides the security photo closer. "Tell me about March 15th. All of it."',
      choices: [
        { label: 'Tell the partial truth', targetId: 'partial_truth' },
        { label: 'Demand a lawyer again', targetId: 'demand_lawyer' },
      ],
    },
  },
};

export default defaultStory;
