import { useState } from 'react';
import { Stats, StatName } from '../../types';
import { STAT_POINT_TOTAL, STAT_MAX, STAT_MIN, STAT_NAMES, STAT_DESCRIPTIONS } from '../../engine';

interface Props {
  onFinish: (name: string, stats: Stats) => void;
}

export default function CharacterCreation({ onFinish }: Props) {
  const [name, setName] = useState('');
  const [stats, setStats] = useState<Stats>({ resolve: 2, wit: 2, composure: 2, deception: 2 });

  const spent = STAT_NAMES.reduce((sum, s) => sum + stats[s], 0);
  const remaining = STAT_POINT_TOTAL - spent;

  function adjust(stat: StatName, delta: number) {
    const next = stats[stat] + delta;
    if (next < STAT_MIN || next > STAT_MAX) return;
    const nextSpent = spent + delta;
    if (nextSpent > STAT_POINT_TOTAL) return;
    setStats({ ...stats, [stat]: next });
  }

  return (
    <div className="creation-screen">
      <h1>THE INTERROGATION</h1>
      <p className="subtitle">Create your agent</p>

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
        <p className="points-remaining">Skill points remaining: <strong>{remaining}</strong></p>
        {STAT_NAMES.map(stat => (
          <div key={stat} className="stat-row">
            <div className="stat-info">
              <span className="stat-name">{stat}</span>
              <span className="stat-desc">{STAT_DESCRIPTIONS[stat]}</span>
            </div>
            <div className="stat-controls">
              <button onClick={() => adjust(stat, -1)} disabled={stats[stat] <= STAT_MIN}>−</button>
              <span className="stat-value">{stats[stat]}</span>
              <button onClick={() => adjust(stat, 1)} disabled={stats[stat] >= STAT_MAX || remaining <= 0}>+</button>
            </div>
          </div>
        ))}
      </div>

      <button
        className="btn-primary"
        disabled={!name.trim()}
        onClick={() => onFinish(name.trim(), stats)}
      >
        Begin Interrogation
      </button>
    </div>
  );
}
