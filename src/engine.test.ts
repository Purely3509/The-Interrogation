import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  rollD20,
  attemptCheck,
  isChoiceVisible,
  transitionTo,
  createDefaultPlayer,
  saveStory,
  loadStory,
  savePlayer,
  loadPlayer,
  clearSave,
  STAT_POINT_TOTAL,
  STAT_MAX,
  STAT_MIN,
  STAT_NAMES,
  STAT_DESCRIPTIONS,
} from './engine';
import { Choice, PlayerState, StoryNode, StoryData } from './types';

// ─── Helpers ───

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

// ─── rollD20 ───

describe('rollD20', () => {
  it('returns a number between 1 and 20', () => {
    for (let i = 0; i < 200; i++) {
      const result = rollD20();
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(20);
    }
  });

  it('returns an integer', () => {
    for (let i = 0; i < 50; i++) {
      expect(Number.isInteger(rollD20())).toBe(true);
    }
  });

  it('produces varied results over many rolls', () => {
    const results = new Set<number>();
    for (let i = 0; i < 500; i++) results.add(rollD20());
    // Should hit at least 15 different values in 500 rolls
    expect(results.size).toBeGreaterThanOrEqual(15);
  });
});

// ─── attemptCheck ───

describe('attemptCheck', () => {
  it('returns correct structure', () => {
    const stats = { resolve: 3, wit: 2, composure: 1, deception: 0 };
    const result = attemptCheck('resolve', 12, stats);
    expect(result).toHaveProperty('stat', 'resolve');
    expect(result).toHaveProperty('dc', 12);
    expect(result).toHaveProperty('roll');
    expect(result).toHaveProperty('modifier', 3);
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('choiceLabel', '');
  });

  it('calculates total as roll + modifier', () => {
    const stats = { resolve: 4, wit: 0, composure: 0, deception: 0 };
    const result = attemptCheck('resolve', 10, stats);
    expect(result.total).toBe(result.roll + 4);
  });

  it('succeeds when total >= dc', () => {
    // Mock Math.random to return high roll (20)
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const stats = { resolve: 0, wit: 0, composure: 0, deception: 0 };
    const result = attemptCheck('resolve', 10, stats);
    expect(result.roll).toBe(20);
    expect(result.success).toBe(true);
    vi.restoreAllMocks();
  });

  it('fails when total < dc', () => {
    // Mock Math.random to return low roll (1)
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const stats = { resolve: 0, wit: 0, composure: 0, deception: 0 };
    const result = attemptCheck('resolve', 10, stats);
    expect(result.roll).toBe(1);
    expect(result.success).toBe(false);
    vi.restoreAllMocks();
  });

  it('uses the correct stat modifier', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // roll = 11
    const stats = { resolve: 1, wit: 3, composure: 5, deception: 0 };

    const witResult = attemptCheck('wit', 10, stats);
    expect(witResult.modifier).toBe(3);
    expect(witResult.total).toBe(witResult.roll + 3);

    const compResult = attemptCheck('composure', 10, stats);
    expect(compResult.modifier).toBe(5);

    vi.restoreAllMocks();
  });

  it('succeeds exactly at dc boundary', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.45); // roll = 10
    const stats = { resolve: 2, wit: 0, composure: 0, deception: 0 };
    const result = attemptCheck('resolve', 12, stats);
    expect(result.total).toBe(12);
    expect(result.success).toBe(true);
    vi.restoreAllMocks();
  });

  it('fails one below dc boundary', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.4); // roll = 9
    const stats = { resolve: 2, wit: 0, composure: 0, deception: 0 };
    const result = attemptCheck('resolve', 12, stats);
    expect(result.total).toBe(11);
    expect(result.success).toBe(false);
    vi.restoreAllMocks();
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
});

// ─── createDefaultPlayer ───

describe('createDefaultPlayer', () => {
  it('creates a player with the correct start node', () => {
    const player = createDefaultPlayer('intro');
    expect(player.currentNodeId).toBe('intro');
    expect(player.history).toEqual(['intro']);
  });

  it('has default name "Agent"', () => {
    expect(createDefaultPlayer('x').name).toBe('Agent');
  });

  it('has balanced stats totaling 8', () => {
    const player = createDefaultPlayer('x');
    const total = player.stats.resolve + player.stats.wit + player.stats.composure + player.stats.deception;
    expect(total).toBe(STAT_POINT_TOTAL);
  });

  it('starts with empty items and flags', () => {
    const player = createDefaultPlayer('x');
    expect(player.items).toEqual([]);
    expect(player.flags).toEqual([]);
  });

  it('each stat is 2 by default', () => {
    const player = createDefaultPlayer('x');
    for (const stat of STAT_NAMES) {
      expect(player.stats[stat]).toBe(2);
    }
  });
});

// ─── Constants ───

describe('constants', () => {
  it('STAT_POINT_TOTAL is 8', () => {
    expect(STAT_POINT_TOTAL).toBe(8);
  });

  it('STAT_MAX is 5', () => {
    expect(STAT_MAX).toBe(5);
  });

  it('STAT_MIN is 0', () => {
    expect(STAT_MIN).toBe(0);
  });

  it('STAT_NAMES has all four stats', () => {
    expect(STAT_NAMES).toEqual(['resolve', 'wit', 'composure', 'deception']);
  });

  it('STAT_DESCRIPTIONS has an entry for each stat', () => {
    for (const name of STAT_NAMES) {
      expect(typeof STAT_DESCRIPTIONS[name]).toBe('string');
      expect(STAT_DESCRIPTIONS[name].length).toBeGreaterThan(0);
    }
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
    let player = createDefaultPlayer('room');

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
