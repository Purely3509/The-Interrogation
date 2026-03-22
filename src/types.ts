export type Requirement = {
  ability: string;
  min?: number;
  max?: number;
};

export type RollCheck = {
  ability: string;
  difficulty: number;
  successNodeId: string;
  failureNodeId: string;
  criticalSuccessNodeId?: string;
  criticalSuccessThreshold?: number;
};

export type StoryOption = {
  id: string;
  text: string;
  targetNodeId?: string;
  requirement?: Requirement;
  rollCheck?: RollCheck;
};

export type StoryNode = {
  id: string;
  title: string;
  text: string;
  options: StoryOption[];
  position?: { x: number; y: number };
};

export type Story = {
  id: string;
  title: string;
  nodes: Record<string, StoryNode>;
  startNodeId: string;
  abilitiesDef: string[];
};

export type Character = {
  name: string;
  abilities: Record<string, number>;
};
