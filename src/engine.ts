import { Choice, PlayerState, RollResult, StatName, Stats, StoryData, StoryNode } from './types';

// --- Dice ---

export function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

export function attemptCheck(stat: StatName, dc: number, stats: Stats): RollResult & { roll: number } {
  const roll = rollD20();
  const modifier = stats[stat];
  const total = roll + modifier;
  return { stat, dc, roll, modifier, total, success: total >= dc, choiceLabel: '' };
}

// --- Visibility ---

export function isChoiceVisible(choice: Choice, player: PlayerState): boolean {
  if (choice.requireFlags) {
    if (!choice.requireFlags.every(f => player.flags.includes(f))) return false;
  }
  if (choice.excludeFlags) {
    if (choice.excludeFlags.some(f => player.flags.includes(f))) return false;
  }
  if (choice.requireItems) {
    if (!choice.requireItems.every(i => player.items.includes(i))) return false;
  }
  return true;
}

// --- Transition ---

export function transitionTo(
  node: StoryNode,
  player: PlayerState,
): PlayerState {
  const next = { ...player, currentNodeId: node.id, history: [...player.history, node.id] };
  if (node.setFlags) {
    next.flags = [...new Set([...next.flags, ...node.setFlags])];
  }
  if (node.grantItems) {
    next.items = [...new Set([...next.items, ...node.grantItems])];
  }
  if (node.removeItems) {
    next.items = next.items.filter(i => !node.removeItems!.includes(i));
  }
  return next;
}

// --- Default player ---

export function createDefaultPlayer(startNodeId: string): PlayerState {
  return {
    name: 'Agent',
    stats: { resolve: 2, wit: 2, composure: 2, deception: 2 },
    items: [],
    flags: [],
    currentNodeId: startNodeId,
    history: [startNodeId],
  };
}

// --- Stat point buy (8 points, each stat 0-5, start at 0) ---

export const STAT_POINT_TOTAL = 8;
export const STAT_MAX = 5;
export const STAT_MIN = 0;
export const STAT_NAMES: StatName[] = ['resolve', 'wit', 'composure', 'deception'];

export const STAT_DESCRIPTIONS: Record<StatName, string> = {
  resolve: 'Mental fortitude. Resist pressure, endure pain, hold your nerve.',
  wit: 'Quick thinking. Talk your way out, spot inconsistencies, improvise.',
  composure: 'Emotional control. Stay calm, hide reactions, maintain cover.',
  deception: 'The art of lying. Mislead, misdirect, fabricate convincingly.',
};

// --- Story persistence ---

const STORY_STORAGE_KEY = 'the-interrogation-story';
const PLAYER_STORAGE_KEY = 'the-interrogation-player';

export function saveStory(story: StoryData): void {
  localStorage.setItem(STORY_STORAGE_KEY, JSON.stringify(story));
}

export function loadStory(): StoryData | null {
  const raw = localStorage.getItem(STORY_STORAGE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function savePlayer(player: PlayerState): void {
  localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(player));
}

export function loadPlayer(): PlayerState | null {
  const raw = localStorage.getItem(PLAYER_STORAGE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function clearSave(): void {
  localStorage.removeItem(PLAYER_STORAGE_KEY);
}
