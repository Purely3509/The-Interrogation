import { useState } from 'react';
import { StatConfig, Stats } from '../../types';
import { STAT_MIN } from '../../engine';

interface Props {
  statConfig: StatConfig;
  onFinish: (name: string, stats: Stats) => void;
}

export default function CharacterCreation({ statConfig, onFinish }: Props) {
  const [name, setName] = useState('');
  const [stats, setStats] = useState<Stats>(() => {
    const initial: Stats = {};
    const defaultValue = Math.floor(statConfig.pointTotal / statConfig.stats.length);
    for (const def of statConfig.stats) {
      initial[def.key] = defaultValue;
    }
    return initial;
  });

  const spent = statConfig.stats.reduce((sum, def) => sum + (stats[def.key] ?? 0), 0);
  const remaining = statConfig.pointTotal - spent;

  function adjust(statKey: string, delta: number) {
    const current = stats[statKey] ?? 0;
    const next = current + delta;
    if (next < STAT_MIN || next > statConfig.maxValue) return;
    const nextSpent = spent + delta;
    if (nextSpent > statConfig.pointTotal) return;
    setStats({ ...stats, [statKey]: next });
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
        {statConfig.stats.map(def => (
          <div key={def.key} className="stat-row">
            <div className="stat-info">
              <span className="stat-name">{def.name}</span>
              <span className="stat-desc">{def.description}</span>
            </div>
            <div className="stat-controls">
              <button onClick={() => adjust(def.key, -1)} disabled={(stats[def.key] ?? 0) <= STAT_MIN}>−</button>
              <span className="stat-value">{stats[def.key] ?? 0}</span>
              <button onClick={() => adjust(def.key, 1)} disabled={(stats[def.key] ?? 0) >= statConfig.maxValue || remaining <= 0}>+</button>
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
