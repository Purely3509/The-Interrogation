// --- Story Graph ---

export interface StoryNode {
  id: string;
  /** Speaker label shown above the text (e.g. "Interrogator", "Narrator") */
  speaker: string;
  /** The dialogue or narration text displayed to the player */
  text: string;
  /** Named outgoing edges */
  choices: Choice[];
  /** If set, arriving at this node sets these flags on the player */
  setFlags?: string[];
  /** If set, arriving at this node grants these items */
  grantItems?: string[];
  /** If set, arriving at this node removes these items */
  removeItems?: string[];
  /** If true, this is a terminal / ending node */
  ending?: boolean;
}

export interface Choice {
  /** The relationship label shown on the edge and as the button text */
  label: string;
  /** Target node id */
  targetId: string;
  /** Stat check required to pick this choice (player rolls d20 + stat vs DC) */
  check?: StatCheck;
  /** Flags the player must have to see this choice */
  requireFlags?: string[];
  /** Flags that hide this choice if the player has them */
  excludeFlags?: string[];
  /** Items the player must have to see this choice */
  requireItems?: string[];
  /** Where to go if the stat check fails */
  failTargetId?: string;
}

export interface StatCheck {
  stat: StatName;
  dc: number;
}

// --- Player State ---

export type StatName = 'resolve' | 'wit' | 'composure' | 'deception';

export interface Stats {
  resolve: number;
  wit: number;
  composure: number;
  deception: number;
}

export interface PlayerState {
  name: string;
  stats: Stats;
  items: string[];
  flags: string[];
  currentNodeId: string;
  history: string[];
}

// --- Story Data ---

export interface StoryData {
  title: string;
  startNodeId: string;
  nodes: Record<string, StoryNode>;
}

// --- Roll result shown to user ---

export interface RollResult {
  stat: StatName;
  dc: number;
  roll: number;
  modifier: number;
  total: number;
  success: boolean;
  choiceLabel: string;
}
