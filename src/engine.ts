import { Choice, PlayerState, RollResult, StatConfig, Stats, StoryData, StoryNode } from './types';

// --- Default stat config (used as fallback) ---

export const DEFAULT_STAT_CONFIG: StatConfig = {
  stats: [
    { key: 'resolve', name: 'Resolve', description: 'Mental fortitude. Resist pressure, endure pain, hold your nerve.' },
    { key: 'wit', name: 'Wit', description: 'Quick thinking. Talk your way out, spot inconsistencies, improvise.' },
    { key: 'composure', name: 'Composure', description: 'Emotional control. Stay calm, hide reactions, maintain cover.' },
    { key: 'deception', name: 'Deception', description: 'The art of lying. Mislead, misdirect, fabricate convincingly.' },
  ],
  maxValue: 6,
  pointTotal: 10,
};

// --- Dice ---

export function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export function roll2d6(): [number, number] {
  return [rollD6(), rollD6()];
}

export function attemptCheck(stat: string, dc: number, stats: Stats): RollResult {
  const dice = roll2d6();
  const [d1, d2] = dice;
  const modifier = stats[stat] ?? 0;
  const total = d1 + d2 + modifier;
  const critFail = d1 === 1 && d2 === 1;
  const critSuccess = d1 === 6 && d2 === 6;
  const success = critFail ? false : (critSuccess ? true : total >= dc);
  return { stat, dc, dice, modifier, total, success, critFail, critSuccess, choiceLabel: '' };
}

export function passiveCheck(stat: string, dc: number, stats: Stats): boolean {
  return (stats[stat] ?? 0) + 6 >= dc;
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
  choice?: Choice,
  statConfig?: StatConfig,
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
  // Apply stat bonuses from the choice
  if (choice?.statBonuses) {
    const maxValue = statConfig?.maxValue ?? 6;
    const newStats = { ...next.stats };
    for (const [stat, bonus] of Object.entries(choice.statBonuses)) {
      if (bonus) {
        newStats[stat] = Math.min(maxValue, (newStats[stat] ?? 0) + bonus);
      }
    }
    next.stats = newStats;
  }
  return next;
}

// --- Default player ---

export function createDefaultPlayer(startNodeId: string, statConfig?: StatConfig): PlayerState {
  const config = statConfig ?? DEFAULT_STAT_CONFIG;
  const defaultValue = Math.floor(config.pointTotal / config.stats.length);
  const stats: Stats = {};
  for (const def of config.stats) {
    stats[def.key] = defaultValue;
  }
  return {
    name: 'Agent',
    stats,
    items: [],
    flags: [],
    currentNodeId: startNodeId,
    history: [startNodeId],
  };
}

/** Create a player with lower starting stats for the prologue/dynamic opening. */
export function createProloguePlayer(startNodeId: string, statConfig?: StatConfig): PlayerState {
  const config = statConfig ?? DEFAULT_STAT_CONFIG;
  const stats: Stats = {};
  for (const def of config.stats) {
    stats[def.key] = 1;
  }
  return {
    name: 'Agent',
    stats,
    items: [],
    flags: [],
    currentNodeId: startNodeId,
    history: [startNodeId],
  };
}

// --- Stat constants (defaults, overridden by statConfig) ---

export const STAT_MIN = 0;

// --- Node renaming ---

/** Validate a proposed node ID. Returns null if valid, or an error message string. */
export function isValidNodeId(id: string, existingIds: string[], currentId: string): string | null {
  if (!id.trim()) return 'ID cannot be empty';
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return 'ID may only contain letters, numbers, underscores, and hyphens';
  if (id !== currentId && existingIds.includes(id)) return 'A node with this ID already exists';
  return null;
}

/** Rename a node, cascading the change through all references in the story. */
export function renameNode(story: StoryData, oldId: string, newId: string): StoryData {
  const nodes: Record<string, StoryNode> = {};
  for (const [key, node] of Object.entries(story.nodes)) {
    const updatedNode = { ...node };
    // Update the node's own id if it's the one being renamed
    if (key === oldId) {
      updatedNode.id = newId;
    }
    // Update all choice targetId and failTargetId references
    updatedNode.choices = updatedNode.choices.map(c => {
      const updated = { ...c };
      if (updated.targetId === oldId) updated.targetId = newId;
      if (updated.failTargetId === oldId) updated.failTargetId = newId;
      return updated;
    });
    // Re-key the node
    nodes[key === oldId ? newId : key] = updatedNode;
  }
  return {
    ...story,
    startNodeId: story.startNodeId === oldId ? newId : story.startNodeId,
    nodes,
  };
}

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
