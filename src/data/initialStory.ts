import { Story } from '../types';

export const initialStory: Story = {
  id: 'the-interrogation',
  title: 'The Interrogation',
  startNodeId: 'node-1',
  abilitiesDef: [
    'Empathy',
    'Intimidation',
    'Logic',
    'Electrochemistry',
    'Pattern Recognition',
    'Authority',
    'Physical Instrument'
  ],
  nodes: {
    'node-1': {
      id: 'node-1',
      title: 'The Raid Aftermath',
      text: 'The rain beats against the precinct window. A bunch of cultists were performing a ritual. They got in a shootout with the police. A girl was loaded into a van and driven away by two more cultists, and the rest of the cultists were killed, except one who is injured and brought to the station.\n\nYou are the detective in charge of interrogating him. He sits in the interrogation room, bleeding through a makeshift bandage, muttering incomprehensible words.',
      options: [
        {
          id: 'opt-1',
          text: 'Enter the interrogation room.',
          targetNodeId: 'node-2'
        }
      ]
    },
    'node-2': {
      id: 'node-2',
      title: 'The Interrogation Room',
      text: 'The suspect looks up as you enter. His eyes are wide, pupils dilated. "The vessel is gone. You are too late," he whispers.',
      options: [
        {
          id: 'opt-2-1',
          text: '[Authority] "Sit up straight and tell me where the van went!"',
          rollCheck: {
            ability: 'Authority',
            difficulty: 8,
            successNodeId: 'node-auth-success',
            failureNodeId: 'node-auth-fail',
            criticalSuccessNodeId: 'node-auth-crit',
            criticalSuccessThreshold: 12
          }
        },
        {
          id: 'opt-2-2',
          text: '[Empathy] "You\'re hurt. Let me get a doctor, but you need to talk to me."',
          rollCheck: {
            ability: 'Empathy',
            difficulty: 7,
            successNodeId: 'node-emp-success',
            failureNodeId: 'node-emp-fail'
          }
        },
        {
          id: 'opt-2-3',
          text: '[Pattern Recognition] Look closely at the blood patterns and his twitching.',
          rollCheck: {
            ability: 'Pattern Recognition',
            difficulty: 9,
            successNodeId: 'node-pat-success',
            failureNodeId: 'node-pat-fail',
            criticalSuccessNodeId: 'node-pat-crit',
            criticalSuccessThreshold: 12
          }
        }
      ]
    },
    'node-auth-success': {
      id: 'node-auth-success',
      title: 'Authority Success',
      text: 'He flinches at your tone. "They took her to the old docks... Pier 4," he stammers out, intimidated by your presence.',
      options: []
    },
    'node-auth-fail': {
      id: 'node-auth-fail',
      title: 'Authority Failure',
      text: 'He laughs, a wet, coughing sound. "Your laws mean nothing to the Old Ones. You have no power here, pig."',
      options: []
    },
    'node-auth-crit': {
      id: 'node-auth-crit',
      title: 'Authority Critical Success',
      text: 'You slam the table so hard the mirror rattles. He screams in terror, but his heart rate spikes too fast. He goes into cardiac arrest from the shock and bleeds out before the paramedics arrive. You got nothing.',
      options: []
    },
    'node-emp-success': {
      id: 'node-emp-success',
      title: 'Empathy Success',
      text: 'He looks at you, a glimmer of humanity returning. "It hurts... They said it wouldn\'t hurt. Pier 4. Please, help me."',
      options: []
    },
    'node-emp-fail': {
      id: 'node-emp-fail',
      title: 'Empathy Failure',
      text: '"Liar!" he spits blood at you. "You only want the vessel! You don\'t care about me!"',
      options: []
    },
    'node-pat-success': {
      id: 'node-pat-success',
      title: 'Pattern Recognition Success',
      text: 'You notice his twitches aren\'t random. He\'s tapping a rhythm. Morse code? No, coordinates. He\'s subconsciously repeating the rendezvous point.',
      options: []
    },
    'node-pat-fail': {
      id: 'node-pat-fail',
      title: 'Pattern Recognition Failure',
      text: 'He\'s just twitching. Probably shock. You can\'t make sense of it.',
      options: []
    },
    'node-pat-crit': {
      id: 'node-pat-crit',
      title: 'Pattern Recognition Critical',
      text: 'You see the pattern. It\'s not just in his twitches, it\'s in the blood on the table, the flickering of the fluorescent light. It all connects. The geometry of the room is wrong. You feel a sharp pain in your head as you glimpse the non-Euclidean truth of the universe. You lose your grip on reality for a moment.',
      options: []
    }
  }
};
