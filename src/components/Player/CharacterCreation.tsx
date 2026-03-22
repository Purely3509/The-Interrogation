import { useState } from 'react';
import { Story, Character } from '../../types';

export function CharacterCreation({ story, onComplete, onCancel }: { story: Story, onComplete: (c: Character) => void, onCancel: () => void }) {
  const [name, setName] = useState('Detective');
  const [abilities, setAbilities] = useState<Record<string, number>>(
    story.abilitiesDef.reduce((acc, ability) => ({ ...acc, [ability]: 1 }), {})
  );
  
  const totalPoints = 15;
  const usedPoints: number = Object.values(abilities).reduce((a: number, b: number) => a + b, 0) as number;
  const remainingPoints = totalPoints - usedPoints;

  const handleAbilityChange = (ability: string, delta: number) => {
    const current = abilities[ability];
    const next = current + delta;
    if (next >= 1 && next <= 6 && (delta < 0 || remainingPoints > 0)) {
      setAbilities({ ...abilities, [ability]: next });
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h2 className="text-3xl font-bold mb-6">Create Your Detective</h2>
      <div className="mb-6">
        <label className="block text-sm font-medium text-zinc-400 mb-2">Name</label>
        <input 
          type="text" 
          value={name} 
          onChange={e => setName(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded p-3 text-zinc-100 focus:outline-none focus:border-zinc-600"
        />
      </div>
      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Abilities</h3>
          <span className="text-sm text-zinc-400">Points Remaining: <span className={remainingPoints === 0 ? 'text-emerald-400' : 'text-zinc-100'}>{remainingPoints}</span></span>
        </div>
        <div className="space-y-3">
          {story.abilitiesDef.map(ability => (
            <div key={ability} className="flex items-center justify-between bg-zinc-900 p-3 rounded border border-zinc-800">
              <span className="font-medium">{ability}</span>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => handleAbilityChange(ability, -1)}
                  className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded hover:bg-zinc-700 disabled:opacity-50"
                  disabled={abilities[ability] <= 1}
                >-</button>
                <span className="w-4 text-center">{abilities[ability]}</span>
                <button 
                  onClick={() => handleAbilityChange(ability, 1)}
                  className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded hover:bg-zinc-700 disabled:opacity-50"
                  disabled={abilities[ability] >= 6 || remainingPoints <= 0}
                >+</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4 justify-end">
        <button onClick={onCancel} className="px-6 py-2 text-zinc-400 hover:text-zinc-100">Cancel</button>
        <button 
          onClick={() => onComplete({ name, abilities })}
          disabled={remainingPoints > 0}
          className="px-6 py-2 bg-zinc-100 text-zinc-950 font-medium rounded hover:bg-zinc-300 disabled:opacity-50"
        >
          Start Investigation
        </button>
      </div>
    </div>
  );
}
