import { useState } from 'react';
import { PlayerState, StatConfig, Stats, StoryNode } from '../../types';
import { STAT_MIN } from '../../engine';

interface Props {
  player: PlayerState;
  node: StoryNode;
  statConfig: StatConfig;
  onConfirm: (name: string, stats: Stats) => void;
}

const ADJUSTMENT_BUDGET = 2;

export default function StatConfirmation({ player, node, statConfig, onConfirm }: Props) {
  const [name, setName] = useState(player.name === 'Agent' ? '' : player.name);
  const [stats, setStats] = useState<Stats>({ ...player.stats });

  // Track how many points have been redistributed
  const originalTotal = statConfig.stats.reduce((sum, def) => sum + (player.stats[def.key] ?? 0), 0);
  const currentTotal = statConfig.stats.reduce((sum, def) => sum + (stats[def.key] ?? 0), 0);
  const pointsAdded = currentTotal - originalTotal;
  const adjustmentsRemaining = ADJUSTMENT_BUDGET - pointsAdded;

  function adjust(statKey: string, delta: number) {
    const current = stats[statKey] ?? 0;
    const next = current + delta;
    if (next < STAT_MIN || next > statConfig.maxValue) return;
    if (delta > 0 && adjustmentsRemaining <= 0) return;
    setStats({ ...stats, [statKey]: next });
  }

  return (
    <div className="creation-screen">
      <h1>AGENT PROFILE</h1>
      <p className="subtitle">Review your capabilities</p>

      {node.text && (
        <div className="confirmation-narrative">
          <div className="speaker">{node.speaker}</div>
          <div className="dialogue-text">{node.text}</div>
        </div>
      )}

      <div className="creation-field">
        <label>Code Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Enter code name..."
          maxLength={24}
          autoFocus
        />
      </div>

      <div className="creation-stats">
        <p className="points-remaining">
          Adjustment points remaining: <strong>{adjustmentsRemaining}</strong>
        </p>
        {statConfig.stats.map(def => {
          const base = player.stats[def.key] ?? 0;
          const current = stats[def.key] ?? 0;
          const diff = current - base;
          return (
            <div key={def.key} className="stat-row">
              <div className="stat-info">
                <span className="stat-name">{def.name}</span>
                <span className="stat-desc">{def.description}</span>
              </div>
              <div className="stat-controls">
                <button onClick={() => adjust(def.key, -1)} disabled={current <= STAT_MIN}>−</button>
                <span className="stat-value">
                  {current}
                  {diff !== 0 && (
                    <span className={diff > 0 ? 'stat-bonus' : 'stat-penalty'}>
                      {diff > 0 ? ` (+${diff})` : ` (${diff})`}
                    </span>
                  )}
                </span>
                <button onClick={() => adjust(def.key, 1)} disabled={current >= statConfig.maxValue || adjustmentsRemaining <= 0}>+</button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        className="btn-primary"
        disabled={!name.trim()}
        onClick={() => onConfirm(name.trim(), stats)}
      >
        Confirm & Continue
      </button>
    </div>
  );
}
