import { useState, useCallback } from 'react';
import { PlayerState, RollResult, Stats, StoryData } from '../../types';
import {
  attemptCheck,
  clearSave,
  createDefaultPlayer,
  isChoiceVisible,
  savePlayer,
  transitionTo,
  STAT_NAMES,
} from '../../engine';
import CharacterCreation from './CharacterCreation';
import RollModal from './RollModal';

interface Props {
  story: StoryData;
}

export default function Player({ story }: Props) {
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [rollResult, setRollResult] = useState<RollResult | null>(null);
  const [pendingTargetId, setPendingTargetId] = useState<string | null>(null);

  const currentNode = player ? story.nodes[player.currentNodeId] : null;

  const handleCreate = useCallback((name: string, stats: Stats) => {
    const p = { ...createDefaultPlayer(story.startNodeId), name, stats };
    setPlayer(p);
    savePlayer(p);
  }, [story.startNodeId]);

  const goToNode = useCallback((nodeId: string, current: PlayerState) => {
    const node = story.nodes[nodeId];
    if (!node) return;
    const next = transitionTo(node, current);
    setPlayer(next);
    savePlayer(next);
  }, [story.nodes]);

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
      goToNode(choice.targetId, player);
    }
  }, [player, currentNode, goToNode]);

  const handleRollContinue = useCallback(() => {
    if (!player || !pendingTargetId) return;
    goToNode(pendingTargetId, player);
    setRollResult(null);
    setPendingTargetId(null);
  }, [player, pendingTargetId, goToNode]);

  const handleRestart = useCallback(() => {
    clearSave();
    setPlayer(null);
    setRollResult(null);
    setPendingTargetId(null);
  }, []);

  // --- Character creation ---
  if (!player) {
    return <CharacterCreation onFinish={handleCreate} />;
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
          {STAT_NAMES.map(s => (
            <div key={s} className="stat-display">
              <span className="stat-label">{s}</span>
              <span className="stat-val">{player.stats[s]}</span>
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
