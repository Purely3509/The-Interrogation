// --- Stat Configuration ---

export interface StatDefinition {
  /** Internal key used in code and data (e.g., "resolve") */
  key: string;
  /** Display name shown in UI (e.g., "Resolve") */
  name: string;
  /** Tooltip/help text describing the stat */
  description: string;
}

export interface StatConfig {
  /** Ordered list of stat definitions */
  stats: StatDefinition[];
  /** Per-stat maximum value (default 6) */
  maxValue: number;
  /** Total points available for allocation (default 10) */
  pointTotal: number;
}

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
  /** If true, reaching this node triggers the stat confirmation screen */
  statConfirmation?: boolean;
}

export interface Choice {
  /** The relationship label shown on the edge and as the button text */
  label: string;
  /** Target node id */
  targetId: string;
  /** Stat check required to pick this choice (player rolls 2d6 + stat vs DC) */
  check?: StatCheck;
  /** Flags the player must have to see this choice */
  requireFlags?: string[];
  /** Flags that hide this choice if the player has them */
  excludeFlags?: string[];
  /** Items the player must have to see this choice */
  requireItems?: string[];
  /** Where to go if the stat check fails */
  failTargetId?: string;
  /** Stat bonuses granted when this choice is selected */
  statBonuses?: Stats;
}

export interface StatCheck {
  stat: string;
  dc: number;
}

// --- Player State ---

/** Stats are a dynamic map of stat key → value */
export type Stats = Record<string, number>;

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
  /** Configuration for the stat system */
  statConfig: StatConfig;
}

// --- Roll result shown to user ---

export interface RollResult {
  stat: string;
  dc: number;
  /** The two d6 dice values */
  dice: [number, number];
  modifier: number;
  total: number;
  success: boolean;
  /** Rolled double 1s — automatic failure */
  critFail: boolean;
  /** Rolled double 6s — automatic success */
  critSuccess: boolean;
  choiceLabel: string;
}
