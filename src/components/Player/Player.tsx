import { useState, useCallback, useMemo } from 'react';
import { PlayerState, RollResult, Stats, StoryData } from '../../types';
import {
  attemptCheck,
  clearSave,
  createDefaultPlayer,
  createProloguePlayer,
  isChoiceVisible,
  savePlayer,
  transitionTo,
} from '../../engine';
import CharacterCreation from './CharacterCreation';
import StatConfirmation from './StatConfirmation';
import RollModal from './RollModal';

interface Props {
  story: StoryData;
}

export default function Player({ story }: Props) {
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [rollResult, setRollResult] = useState<RollResult | null>(null);
  const [pendingTargetId, setPendingTargetId] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const currentNode = player ? story.nodes[player.currentNodeId] : null;
  const statConfig = story.statConfig;

  // Check if any node in the story uses the dynamic opening (statConfirmation)
  const usesPrologue = useMemo(() => {
    return Object.values(story.nodes).some(n => n.statConfirmation);
  }, [story.nodes]);

  const handleCreate = useCallback((name: string, stats: Stats) => {
    const p = { ...createDefaultPlayer(story.startNodeId, statConfig), name, stats };
    setPlayer(p);
    savePlayer(p);
  }, [story.startNodeId, statConfig]);

  const handlePrologueStart = useCallback(() => {
    const p = createProloguePlayer(story.startNodeId, statConfig);
    setPlayer(p);
    savePlayer(p);
  }, [story.startNodeId, statConfig]);

  const goToNode = useCallback((nodeId: string, current: PlayerState, selectedChoice?: { choiceIdx: number }) => {
    const node = story.nodes[nodeId];
    if (!node) return;

    // Get the choice that was selected (for stat bonuses)
    let choice = undefined;
    if (selectedChoice !== undefined) {
      const currentNode = story.nodes[current.currentNodeId];
      if (currentNode) {
        choice = currentNode.choices[selectedChoice.choiceIdx];
      }
    }

    const next = transitionTo(node, current, choice, statConfig);
    setPlayer(next);
    savePlayer(next);

    // Check if we arrived at a stat confirmation node
    if (node.statConfirmation) {
      setShowConfirmation(true);
    }
  }, [story.nodes, statConfig]);

  const handleChoice = useCallback((choiceIdx: number) => {
    if (!player || !currentNode) return;
    const choice = currentNode.choices[choiceIdx];
    if (!choice) return;

    if (choice.check) {
      const result = attemptCheck(choice.check.stat, choice.check.dc, player.stats);
      result.choiceLabel = choice.label;
      setRollResult(result);
      setPendingTargetId(result.success ? choice.targetId : (choice.failTargetId ?? choice.targetId));
    } else {
      goToNode(choice.targetId, player, { choiceIdx });
    }
  }, [player, currentNode, goToNode]);

  const handleRollContinue = useCallback(() => {
    if (!player || !pendingTargetId || !currentNode) return;
    // Find the choice index for stat bonuses
    const choiceIdx = currentNode.choices.findIndex(c =>
      c.targetId === pendingTargetId || c.failTargetId === pendingTargetId
    );
    goToNode(pendingTargetId, player, choiceIdx >= 0 ? { choiceIdx } : undefined);
    setRollResult(null);
    setPendingTargetId(null);
  }, [player, pendingTargetId, currentNode, goToNode]);

  const handleConfirm = useCallback((name: string, stats: Stats) => {
    if (!player || !currentNode) return;
    const updated = { ...player, name, stats };
    setPlayer(updated);
    savePlayer(updated);
    setShowConfirmation(false);
  }, [player, currentNode]);

  const handleRestart = useCallback(() => {
    clearSave();
    setPlayer(null);
    setRollResult(null);
    setPendingTargetId(null);
    setShowConfirmation(false);
  }, []);

  // --- No player yet ---
  if (!player) {
    if (usesPrologue) {
      // Auto-start with prologue player
      handlePrologueStart();
      return null;
    }
    return <CharacterCreation statConfig={statConfig} onFinish={handleCreate} />;
  }

  // --- Stat confirmation screen ---
  if (showConfirmation && currentNode) {
    return (
      <StatConfirmation
        player={player}
        node={currentNode}
        statConfig={statConfig}
        onConfirm={handleConfirm}
      />
    );
  }

  // --- Missing node ---
  if (!currentNode) {
    return (
      <div className="player-screen">
        <div className="dialogue-panel">
          <p className="error">Node "{player.currentNodeId}" not found in story.</p>
          <button className="btn-primary" onClick={handleRestart}>Restart</button>
        </div>
      </div>
    );
  }

  const visibleChoices = currentNode.choices
    .map((c, i) => ({ choice: c, idx: i }))
    .filter(({ choice }) => isChoiceVisible(choice, player));

  return (
    <div className="player-screen">
      {/* Sidebar */}
      <aside className="stats-sidebar">
        <div className="agent-name">{player.name}</div>
        <div className="stat-list">
          {statConfig.stats.map(def => (
            <div key={def.key} className="stat-display">
              <span className="stat-label">{def.name}</span>
              <span className="stat-val">{player.stats[def.key] ?? 0}</span>
            </div>
          ))}
        </div>
        {player.items.length > 0 && (
          <div className="items-section">
            <h4>Items</h4>
            {player.items.map(i => <div key={i} className="item-tag">{i}</div>)}
          </div>
        )}
        <button className="btn-restart" onClick={handleRestart}>New Game</button>
      </aside>

      {/* Main dialogue */}
      <main className="dialogue-panel">
        <div className="speaker">{currentNode.speaker}</div>
        <div className="dialogue-text">{currentNode.text}</div>

        {currentNode.ending ? (
          <div className="ending">
            <p className="ending-label">— END —</p>
            <button className="btn-primary" onClick={handleRestart}>Play Again</button>
          </div>
        ) : (
          <div className="choices">
            {visibleChoices.map(({ choice, idx }) => (
              <button
                key={idx}
                className={`btn-choice ${choice.check ? 'has-check' : ''}`}
                onClick={() => handleChoice(idx)}
              >
                {choice.label}
                {choice.check && (
                  <span className="check-badge">
                    {choice.check.stat.toUpperCase()} DC {choice.check.dc}
                  </span>
                )}
              </button>
            ))}
            {visibleChoices.length === 0 && !currentNode.ending && (
              <p className="dead-end">No available options. <button className="btn-link" onClick={handleRestart}>Restart</button></p>
            )}
          </div>
        )}
      </main>

      {rollResult && <RollModal result={rollResult} onContinue={handleRollContinue} />}
    </div>
  );
}
