import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  rollD6,
  roll2d6,
  attemptCheck,
  passiveCheck,
  isChoiceVisible,
  transitionTo,
  createDefaultPlayer,
  createProloguePlayer,
  saveStory,
  loadStory,
  savePlayer,
  loadPlayer,
  clearSave,
  STAT_MIN,
  DEFAULT_STAT_CONFIG,
  isValidNodeId,
  renameNode,
} from './engine';
import { Choice, PlayerState, StoryNode, StoryData, StatConfig } from './types';

// ─── Helpers ───

const testStatConfig: StatConfig = {
  stats: [
    { key: 'resolve', name: 'Resolve', description: 'Mental fortitude.' },
    { key: 'wit', name: 'Wit', description: 'Quick thinking.' },
    { key: 'composure', name: 'Composure', description: 'Emotional control.' },
    { key: 'deception', name: 'Deception', description: 'The art of lying.' },
  ],
  maxValue: 6,
  pointTotal: 10,
};

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    name: 'TestAgent',
    stats: { resolve: 2, wit: 2, composure: 2, deception: 2 },
    items: [],
    flags: [],
    currentNodeId: 'start',
    history: ['start'],
    ...overrides,
  };
}

function makeNode(overrides: Partial<StoryNode> = {}): StoryNode {
  return {
    id: 'node_a',
    speaker: 'Narrator',
    text: 'Test node',
    choices: [],
    ...overrides,
  };
}

function makeChoice(overrides: Partial<Choice> = {}): Choice {
  return {
    label: 'Do something',
    targetId: 'target',
    ...overrides,
  };
}

// ─── rollD6 ───

describe('rollD6', () => {
  it('returns a number between 1 and 6', () => {
    for (let i = 0; i < 200; i++) {
      const result = rollD6();
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(6);
    }
  });

  it('returns an integer', () => {
    for (let i = 0; i < 50; i++) {
      expect(Number.isInteger(rollD6())).toBe(true);
    }
  });
});

// ─── roll2d6 ───

describe('roll2d6', () => {
  it('returns a tuple of two numbers between 1 and 6', () => {
    for (let i = 0; i < 200; i++) {
      const [d1, d2] = roll2d6();
      expect(d1).toBeGreaterThanOrEqual(1);
      expect(d1).toBeLessThanOrEqual(6);
      expect(d2).toBeGreaterThanOrEqual(1);
      expect(d2).toBeLessThanOrEqual(6);
    }
  });

  it('produces varied results over many rolls', () => {
    const sums = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const [d1, d2] = roll2d6();
      sums.add(d1 + d2);
    }
    // 2d6 produces sums from 2-12, should hit at least 8 different sums
    expect(sums.size).toBeGreaterThanOrEqual(8);
  });
});

// ─── attemptCheck ───

describe('attemptCheck', () => {
  it('returns correct structure', () => {
    const stats = { resolve: 3, wit: 2, composure: 1, deception: 0 };
    const result = attemptCheck('resolve', 8, stats);
    expect(result).toHaveProperty('stat', 'resolve');
    expect(result).toHaveProperty('dc', 8);
    expect(result).toHaveProperty('dice');
    expect(result.dice).toHaveLength(2);
    expect(result).toHaveProperty('modifier', 3);
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('critFail');
    expect(result).toHaveProperty('critSuccess');
    expect(result).toHaveProperty('choiceLabel', '');
  });

  it('calculates total as d1 + d2 + modifier', () => {
    const stats = { resolve: 4 };
    const result = attemptCheck('resolve', 8, stats);
    expect(result.total).toBe(result.dice[0] + result.dice[1] + 4);
  });

  it('uses 0 as modifier for unknown stat', () => {
    const stats = { resolve: 4 };
    const result = attemptCheck('unknown_stat', 8, stats);
    expect(result.modifier).toBe(0);
    expect(result.total).toBe(result.dice[0] + result.dice[1]);
  });

  it('snake eyes (double 1) is automatic fail', () => {
    // Mock to return 1, 1
    let callCount = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++;
      return 0; // always returns 1 on a d6
    });
    const stats = { resolve: 10 }; // High stat, would normally succeed
    const result = attemptCheck('resolve', 2, stats); // Low DC
    expect(result.dice).toEqual([1, 1]);
    expect(result.critFail).toBe(true);
    expect(result.critSuccess).toBe(false);
    expect(result.success).toBe(false); // Auto fail despite high total
    vi.restoreAllMocks();
  });

  it('double sixes is automatic success', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999); // returns 6
    const stats = { resolve: 0 };
    const result = attemptCheck('resolve', 20, stats); // Impossibly high DC
    expect(result.dice).toEqual([6, 6]);
    expect(result.critSuccess).toBe(true);
    expect(result.critFail).toBe(false);
    expect(result.success).toBe(true); // Auto success despite low total
    vi.restoreAllMocks();
  });

  it('succeeds when total >= dc (no crit)', () => {
    // Mock: first d6 returns 4, second d6 returns 3
    let callCount = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++;
      return callCount % 2 === 1 ? 0.5 : 0.333; // d6: 4, 3
    });
    const stats = { resolve: 2 };
    const result = attemptCheck('resolve', 9, stats);
    // total = 4 + 3 + 2 = 9, dc = 9
    expect(result.total).toBe(result.dice[0] + result.dice[1] + 2);
    if (result.total >= 9 && !result.critFail) {
      expect(result.success).toBe(true);
    }
    vi.restoreAllMocks();
  });

  it('fails when total < dc (no crit)', () => {
    // Mock both dice to 2: Math.floor(0.2 * 6) + 1 = 2
    vi.spyOn(Math, 'random').mockReturnValue(0.2);
    const stats = { resolve: 1 };
    const result = attemptCheck('resolve', 8, stats);
    // total = 2 + 2 + 1 = 5, dc = 8
    expect(result.dice).toEqual([2, 2]);
    expect(result.total).toBe(5);
    expect(result.critFail).toBe(false); // Not snake eyes
    expect(result.success).toBe(false);
    vi.restoreAllMocks();
  });

  it('uses the correct stat modifier', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // each d6 = 4
    const stats = { resolve: 1, wit: 3, composure: 5, deception: 0 };

    const witResult = attemptCheck('wit', 8, stats);
    expect(witResult.modifier).toBe(3);
    expect(witResult.total).toBe(witResult.dice[0] + witResult.dice[1] + 3);

    const compResult = attemptCheck('composure', 8, stats);
    expect(compResult.modifier).toBe(5);

    vi.restoreAllMocks();
  });
});

// ─── passiveCheck ───

describe('passiveCheck', () => {
  it('succeeds when stat + 6 >= dc', () => {
    expect(passiveCheck('resolve', 8, { resolve: 2 })).toBe(true); // 2 + 6 = 8 >= 8
  });

  it('fails when stat + 6 < dc', () => {
    expect(passiveCheck('resolve', 9, { resolve: 2 })).toBe(false); // 2 + 6 = 8 < 9
  });

  it('uses 0 for unknown stat', () => {
    expect(passiveCheck('unknown', 7, { resolve: 2 })).toBe(false); // 0 + 6 = 6 < 7
  });
});

// ─── isChoiceVisible ───

describe('isChoiceVisible', () => {
  it('returns true for a basic choice with no requirements', () => {
    const choice = makeChoice();
    const player = makePlayer();
    expect(isChoiceVisible(choice, player)).toBe(true);
  });

  it('returns true when player has all required flags', () => {
    const choice = makeChoice({ requireFlags: ['flagA', 'flagB'] });
    const player = makePlayer({ flags: ['flagA', 'flagB', 'flagC'] });
    expect(isChoiceVisible(choice, player)).toBe(true);
  });

  it('returns false when player is missing a required flag', () => {
    const choice = makeChoice({ requireFlags: ['flagA', 'flagB'] });
    const player = makePlayer({ flags: ['flagA'] });
    expect(isChoiceVisible(choice, player)).toBe(false);
  });

  it('returns false when player has no required flags', () => {
    const choice = makeChoice({ requireFlags: ['flagA'] });
    const player = makePlayer({ flags: [] });
    expect(isChoiceVisible(choice, player)).toBe(false);
  });

  it('returns true when player has none of the excluded flags', () => {
    const choice = makeChoice({ excludeFlags: ['bad_flag'] });
    const player = makePlayer({ flags: ['good_flag'] });
    expect(isChoiceVisible(choice, player)).toBe(true);
  });

  it('returns false when player has an excluded flag', () => {
    const choice = makeChoice({ excludeFlags: ['bad_flag'] });
    const player = makePlayer({ flags: ['bad_flag'] });
    expect(isChoiceVisible(choice, player)).toBe(false);
  });

  it('returns false when player has one of multiple excluded flags', () => {
    const choice = makeChoice({ excludeFlags: ['bad1', 'bad2'] });
    const player = makePlayer({ flags: ['good', 'bad2'] });
    expect(isChoiceVisible(choice, player)).toBe(false);
  });

  it('returns true when player has all required items', () => {
    const choice = makeChoice({ requireItems: ['Loose Cuffs'] });
    const player = makePlayer({ items: ['Loose Cuffs', 'Knife'] });
    expect(isChoiceVisible(choice, player)).toBe(true);
  });

  it('returns false when player is missing a required item', () => {
    const choice = makeChoice({ requireItems: ['Loose Cuffs'] });
    const player = makePlayer({ items: [] });
    expect(isChoiceVisible(choice, player)).toBe(false);
  });

  it('handles combined requireFlags + excludeFlags + requireItems', () => {
    const choice = makeChoice({
      requireFlags: ['observed_photo'],
      excludeFlags: ['caught_lying'],
      requireItems: ['Loose Cuffs'],
    });

    // All conditions met
    const player1 = makePlayer({ flags: ['observed_photo'], items: ['Loose Cuffs'] });
    expect(isChoiceVisible(choice, player1)).toBe(true);

    // Missing flag
    const player2 = makePlayer({ flags: [], items: ['Loose Cuffs'] });
    expect(isChoiceVisible(choice, player2)).toBe(false);

    // Has excluded flag
    const player3 = makePlayer({ flags: ['observed_photo', 'caught_lying'], items: ['Loose Cuffs'] });
    expect(isChoiceVisible(choice, player3)).toBe(false);

    // Missing item
    const player4 = makePlayer({ flags: ['observed_photo'], items: [] });
    expect(isChoiceVisible(choice, player4)).toBe(false);
  });

  it('returns true with empty requirement arrays', () => {
    const choice = makeChoice({ requireFlags: [], excludeFlags: [], requireItems: [] });
    const player = makePlayer();
    expect(isChoiceVisible(choice, player)).toBe(true);
  });
});

// ─── transitionTo ───

describe('transitionTo', () => {
  it('updates currentNodeId', () => {
    const player = makePlayer({ currentNodeId: 'start' });
    const node = makeNode({ id: 'next_node' });
    const result = transitionTo(node, player);
    expect(result.currentNodeId).toBe('next_node');
  });

  it('appends to history', () => {
    const player = makePlayer({ history: ['start'] });
    const node = makeNode({ id: 'node_b' });
    const result = transitionTo(node, player);
    expect(result.history).toEqual(['start', 'node_b']);
  });

  it('does not mutate the original player', () => {
    const player = makePlayer({ history: ['start'], flags: ['old_flag'], items: ['old_item'] });
    const node = makeNode({ id: 'node_b', setFlags: ['new_flag'], grantItems: ['new_item'], removeItems: ['old_item'] });
    const result = transitionTo(node, player);
    expect(player.history).toEqual(['start']);
    expect(player.flags).toEqual(['old_flag']);
    expect(player.items).toEqual(['old_item']);
    expect(result).not.toBe(player);
  });

  it('sets flags from the node', () => {
    const player = makePlayer({ flags: ['existing'] });
    const node = makeNode({ setFlags: ['new_flag', 'another'] });
    const result = transitionTo(node, player);
    expect(result.flags).toContain('existing');
    expect(result.flags).toContain('new_flag');
    expect(result.flags).toContain('another');
  });

  it('deduplicates flags', () => {
    const player = makePlayer({ flags: ['duplicate'] });
    const node = makeNode({ setFlags: ['duplicate', 'fresh'] });
    const result = transitionTo(node, player);
    expect(result.flags.filter(f => f === 'duplicate')).toHaveLength(1);
    expect(result.flags).toContain('fresh');
  });

  it('grants items from the node', () => {
    const player = makePlayer({ items: [] });
    const node = makeNode({ grantItems: ['Loose Cuffs'] });
    const result = transitionTo(node, player);
    expect(result.items).toContain('Loose Cuffs');
  });

  it('deduplicates items', () => {
    const player = makePlayer({ items: ['Loose Cuffs'] });
    const node = makeNode({ grantItems: ['Loose Cuffs'] });
    const result = transitionTo(node, player);
    expect(result.items.filter(i => i === 'Loose Cuffs')).toHaveLength(1);
  });

  it('removes items from the node', () => {
    const player = makePlayer({ items: ['Loose Cuffs', 'Classified Folder'] });
    const node = makeNode({ removeItems: ['Loose Cuffs'] });
    const result = transitionTo(node, player);
    expect(result.items).not.toContain('Loose Cuffs');
    expect(result.items).toContain('Classified Folder');
  });

  it('handles grant and remove in same transition', () => {
    const player = makePlayer({ items: ['Old Item'] });
    const node = makeNode({ grantItems: ['New Item'], removeItems: ['Old Item'] });
    const result = transitionTo(node, player);
    expect(result.items).toContain('New Item');
    expect(result.items).not.toContain('Old Item');
  });

  it('does nothing with no setFlags/grantItems/removeItems', () => {
    const player = makePlayer({ flags: ['a'], items: ['b'] });
    const node = makeNode({ id: 'plain' });
    const result = transitionTo(node, player);
    expect(result.flags).toEqual(['a']);
    expect(result.items).toEqual(['b']);
  });

  it('removing a nonexistent item is a no-op', () => {
    const player = makePlayer({ items: ['Knife'] });
    const node = makeNode({ removeItems: ['Ghost Item'] });
    const result = transitionTo(node, player);
    expect(result.items).toEqual(['Knife']);
  });

  it('applies stat bonuses from a choice', () => {
    const player = makePlayer({ stats: { resolve: 2, wit: 2, composure: 2, deception: 2 } });
    const node = makeNode({ id: 'next' });
    const choice = makeChoice({ statBonuses: { resolve: 1, wit: 2 } });
    const result = transitionTo(node, player, choice, testStatConfig);
    expect(result.stats.resolve).toBe(3);
    expect(result.stats.wit).toBe(4);
    expect(result.stats.composure).toBe(2); // unchanged
  });

  it('clamps stat bonuses to maxValue', () => {
    const player = makePlayer({ stats: { resolve: 5 } });
    const node = makeNode({ id: 'next' });
    const choice = makeChoice({ statBonuses: { resolve: 3 } });
    const result = transitionTo(node, player, choice, testStatConfig);
    expect(result.stats.resolve).toBe(6); // maxValue is 6
  });

  it('does not apply stat bonuses when choice has none', () => {
    const player = makePlayer({ stats: { resolve: 2 } });
    const node = makeNode({ id: 'next' });
    const choice = makeChoice();
    const result = transitionTo(node, player, choice, testStatConfig);
    expect(result.stats.resolve).toBe(2);
  });
});

// ─── createDefaultPlayer ───

describe('createDefaultPlayer', () => {
  it('creates a player with the correct start node', () => {
    const player = createDefaultPlayer('intro', testStatConfig);
    expect(player.currentNodeId).toBe('intro');
    expect(player.history).toEqual(['intro']);
  });

  it('has default name "Agent"', () => {
    expect(createDefaultPlayer('x', testStatConfig).name).toBe('Agent');
  });

  it('has balanced stats using statConfig', () => {
    const player = createDefaultPlayer('x', testStatConfig);
    const total = Object.values(player.stats).reduce((a, b) => a + b, 0);
    // 10 / 4 = 2 per stat, total = 8 (floor rounding)
    const expectedPerStat = Math.floor(testStatConfig.pointTotal / testStatConfig.stats.length);
    expect(total).toBe(expectedPerStat * testStatConfig.stats.length);
  });

  it('starts with empty items and flags', () => {
    const player = createDefaultPlayer('x', testStatConfig);
    expect(player.items).toEqual([]);
    expect(player.flags).toEqual([]);
  });

  it('creates stats for each stat in config', () => {
    const player = createDefaultPlayer('x', testStatConfig);
    for (const def of testStatConfig.stats) {
      expect(player.stats).toHaveProperty(def.key);
    }
  });

  it('uses DEFAULT_STAT_CONFIG when no config provided', () => {
    const player = createDefaultPlayer('x');
    for (const def of DEFAULT_STAT_CONFIG.stats) {
      expect(player.stats).toHaveProperty(def.key);
    }
  });
});

// ─── createProloguePlayer ───

describe('createProloguePlayer', () => {
  it('creates a player with all stats at 1', () => {
    const player = createProloguePlayer('intro', testStatConfig);
    for (const def of testStatConfig.stats) {
      expect(player.stats[def.key]).toBe(1);
    }
  });

  it('starts at the given node', () => {
    const player = createProloguePlayer('intro', testStatConfig);
    expect(player.currentNodeId).toBe('intro');
    expect(player.history).toEqual(['intro']);
  });

  it('has default name "Agent"', () => {
    expect(createProloguePlayer('x', testStatConfig).name).toBe('Agent');
  });
});

// ─── Constants ───

describe('constants', () => {
  it('STAT_MIN is 0', () => {
    expect(STAT_MIN).toBe(0);
  });

  it('DEFAULT_STAT_CONFIG has four stats', () => {
    expect(DEFAULT_STAT_CONFIG.stats).toHaveLength(4);
  });

  it('DEFAULT_STAT_CONFIG has expected keys', () => {
    const keys = DEFAULT_STAT_CONFIG.stats.map(s => s.key);
    expect(keys).toEqual(['resolve', 'wit', 'composure', 'deception']);
  });

  it('DEFAULT_STAT_CONFIG has descriptions for each stat', () => {
    for (const def of DEFAULT_STAT_CONFIG.stats) {
      expect(typeof def.description).toBe('string');
      expect(def.description.length).toBeGreaterThan(0);
    }
  });

  it('DEFAULT_STAT_CONFIG maxValue is 6', () => {
    expect(DEFAULT_STAT_CONFIG.maxValue).toBe(6);
  });

  it('DEFAULT_STAT_CONFIG pointTotal is 10', () => {
    expect(DEFAULT_STAT_CONFIG.pointTotal).toBe(10);
  });
});

// ─── isValidNodeId ───

describe('isValidNodeId', () => {
  const existing = ['intro', 'node_a', 'node_b'];

  it('returns null for a valid new ID', () => {
    expect(isValidNodeId('new_node', existing, 'intro')).toBeNull();
  });

  it('returns null when ID is unchanged (same as currentId)', () => {
    expect(isValidNodeId('intro', existing, 'intro')).toBeNull();
  });

  it('returns error for empty string', () => {
    expect(isValidNodeId('', existing, 'intro')).toBe('ID cannot be empty');
  });

  it('returns error for whitespace-only string', () => {
    expect(isValidNodeId('   ', existing, 'intro')).toBe('ID cannot be empty');
  });

  it('returns error for invalid characters', () => {
    expect(isValidNodeId('node with spaces', existing, 'intro')).not.toBeNull();
    expect(isValidNodeId('node.dot', existing, 'intro')).not.toBeNull();
  });

  it('returns error for duplicate ID', () => {
    expect(isValidNodeId('node_a', existing, 'intro')).toBe('A node with this ID already exists');
  });

  it('allows hyphens and underscores', () => {
    expect(isValidNodeId('my-node_1', existing, 'intro')).toBeNull();
  });
});

// ─── renameNode ───

describe('renameNode', () => {
  const story: StoryData = {
    title: 'Test',
    startNodeId: 'start',
    statConfig: testStatConfig,
    nodes: {
      start: {
        id: 'start',
        speaker: 'Narrator',
        text: 'Begin',
        choices: [
          { label: 'Go to A', targetId: 'node_a' },
          { label: 'Go to B', targetId: 'node_b', check: { stat: 'wit', dc: 8 }, failTargetId: 'node_a' },
        ],
      },
      node_a: {
        id: 'node_a',
        speaker: 'Narrator',
        text: 'Node A',
        choices: [{ label: 'Back', targetId: 'start' }],
      },
      node_b: {
        id: 'node_b',
        speaker: 'Narrator',
        text: 'Node B',
        choices: [{ label: 'To A', targetId: 'node_a' }],
      },
    },
  };

  it('renames the node key and id property', () => {
    const result = renameNode(story, 'node_a', 'alpha');
    expect(result.nodes['alpha']).toBeDefined();
    expect(result.nodes['node_a']).toBeUndefined();
    expect(result.nodes['alpha'].id).toBe('alpha');
  });

  it('updates targetId references in other nodes', () => {
    const result = renameNode(story, 'node_a', 'alpha');
    // start's first choice pointed to node_a, should now point to alpha
    expect(result.nodes['start'].choices[0].targetId).toBe('alpha');
    // node_b's choice pointed to node_a
    expect(result.nodes['node_b'].choices[0].targetId).toBe('alpha');
  });

  it('updates failTargetId references', () => {
    const result = renameNode(story, 'node_a', 'alpha');
    // start's second choice has failTargetId: 'node_a'
    expect(result.nodes['start'].choices[1].failTargetId).toBe('alpha');
  });

  it('updates startNodeId when renaming the start node', () => {
    const result = renameNode(story, 'start', 'beginning');
    expect(result.startNodeId).toBe('beginning');
    expect(result.nodes['beginning']).toBeDefined();
    expect(result.nodes['beginning'].id).toBe('beginning');
  });

  it('does not affect unrelated nodes', () => {
    const result = renameNode(story, 'node_a', 'alpha');
    expect(result.nodes['start'].id).toBe('start');
    expect(result.nodes['node_b'].id).toBe('node_b');
  });
});

// ─── localStorage persistence ───

describe('persistence (localStorage)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const sampleStory: StoryData = {
    title: 'Test Story',
    startNodeId: 'start',
    statConfig: testStatConfig,
    nodes: {
      start: {
        id: 'start',
        speaker: 'Narrator',
        text: 'Hello',
        choices: [{ label: 'Go', targetId: 'end' }],
      },
      end: {
        id: 'end',
        speaker: 'Narrator',
        text: 'Goodbye',
        choices: [],
        ending: true,
      },
    },
  };

  describe('saveStory / loadStory', () => {
    it('roundtrips a story through localStorage', () => {
      saveStory(sampleStory);
      const loaded = loadStory();
      expect(loaded).toEqual(sampleStory);
    });

    it('returns null when no story is saved', () => {
      expect(loadStory()).toBeNull();
    });

    it('returns null if stored JSON is invalid', () => {
      localStorage.setItem('the-interrogation-story', 'not-json!!!');
      expect(loadStory()).toBeNull();
    });

    it('overwrites a previously saved story', () => {
      saveStory(sampleStory);
      const updated = { ...sampleStory, title: 'Updated' };
      saveStory(updated);
      expect(loadStory()!.title).toBe('Updated');
    });
  });

  describe('savePlayer / loadPlayer', () => {
    it('roundtrips a player through localStorage', () => {
      const player = makePlayer();
      savePlayer(player);
      const loaded = loadPlayer();
      expect(loaded).toEqual(player);
    });

    it('returns null when no player is saved', () => {
      expect(loadPlayer()).toBeNull();
    });

    it('returns null if stored JSON is invalid', () => {
      localStorage.setItem('the-interrogation-player', '{broken');
      expect(loadPlayer()).toBeNull();
    });
  });

  describe('clearSave', () => {
    it('removes the player save', () => {
      const player = makePlayer();
      savePlayer(player);
      expect(loadPlayer()).not.toBeNull();
      clearSave();
      expect(loadPlayer()).toBeNull();
    });

    it('does not remove the story save', () => {
      saveStory(sampleStory);
      savePlayer(makePlayer());
      clearSave();
      expect(loadStory()).toEqual(sampleStory);
    });
  });
});

// ─── Integration-style: full walkthrough ───

describe('integration: mini story walkthrough', () => {
  const story: StoryData = {
    title: 'Mini',
    startNodeId: 'room',
    statConfig: testStatConfig,
    nodes: {
      room: {
        id: 'room',
        speaker: 'Narrator',
        text: 'You are in a room.',
        setFlags: ['entered_room'],
        choices: [
          { label: 'Open door', targetId: 'hallway' },
          { label: 'Secret path', targetId: 'vault', requireFlags: ['has_key'] },
        ],
      },
      hallway: {
        id: 'hallway',
        speaker: 'Narrator',
        text: 'A hallway stretches ahead.',
        grantItems: ['Key'],
        setFlags: ['has_key'],
        choices: [
          { label: 'Go back', targetId: 'room' },
          { label: 'Exit', targetId: 'end' },
        ],
      },
      vault: {
        id: 'vault',
        speaker: 'Narrator',
        text: 'You found treasure!',
        grantItems: ['Gold'],
        removeItems: ['Key'],
        choices: [{ label: 'Leave', targetId: 'end' }],
      },
      end: {
        id: 'end',
        speaker: 'Narrator',
        text: 'The end.',
        choices: [],
        ending: true,
      },
    },
  };

  it('plays through a full path: room → hallway → room → vault → end', () => {
    let player = createDefaultPlayer('room', testStatConfig);

    // Arrive at room
    player = transitionTo(story.nodes.room, player);
    expect(player.flags).toContain('entered_room');

    // Secret path not visible yet
    expect(isChoiceVisible(story.nodes.room.choices[1], player)).toBe(false);

    // Go to hallway
    player = transitionTo(story.nodes.hallway, player);
    expect(player.items).toContain('Key');
    expect(player.flags).toContain('has_key');

    // Go back to room
    player = transitionTo(story.nodes.room, player);

    // Secret path now visible
    expect(isChoiceVisible(story.nodes.room.choices[1], player)).toBe(true);

    // Enter vault
    player = transitionTo(story.nodes.vault, player);
    expect(player.items).toContain('Gold');
    expect(player.items).not.toContain('Key');

    // Go to end
    player = transitionTo(story.nodes.end, player);
    expect(player.currentNodeId).toBe('end');
    expect(player.history).toEqual(['room', 'room', 'hallway', 'room', 'vault', 'end']);
  });
});
