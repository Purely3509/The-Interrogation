import { useState } from 'react';
import { Story, Character, StoryOption } from '../../types';
import { DiceRollModal } from './DiceRollModal';

export function Player({ story, character, onExit }: { story: Story, character: Character, onExit: () => void }) {
  const [currentNodeId, setCurrentNodeId] = useState(story.startNodeId);
  const [rollCheck, setRollCheck] = useState<{ option: StoryOption, resolve: (nodeId: string) => void } | null>(null);

  const currentNode = story.nodes[currentNodeId];

  const handleOptionClick = (option: StoryOption) => {
    if (option.rollCheck) {
      setRollCheck({
        option,
        resolve: (nextNodeId) => {
          setRollCheck(null);
          if (nextNodeId) {
            setCurrentNodeId(nextNodeId);
          }
        }
      });
    } else if (option.targetNodeId) {
      setCurrentNodeId(option.targetNodeId);
    }
  };

  if (!currentNode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-400 mb-4">Error: Node not found.</div>
        <button onClick={onExit} className="px-4 py-2 bg-zinc-800 rounded hover:bg-zinc-700">Return to Menu</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-8 flex flex-col min-h-screen">
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-xl font-bold">{character.name}</h2>
          <div className="flex gap-2 text-xs text-zinc-500 mt-1 flex-wrap">
            {Object.entries(character.abilities).map(([ability, score]) => (
              <span key={ability}>{ability}: {score}</span>
            ))}
          </div>
        </div>
        <button onClick={onExit} className="text-sm text-zinc-500 hover:text-zinc-300">Exit to Menu</button>
      </div>

      <div className="flex-1">
        <h1 className="text-3xl font-bold mb-6 text-zinc-100">{currentNode.title}</h1>
        <div className="prose prose-invert max-w-none mb-12 text-zinc-300 leading-relaxed whitespace-pre-wrap">
          {currentNode.text}
        </div>

        <div className="space-y-3">
          {currentNode.options.map(option => {
            // Check requirements
            if (option.requirement) {
              const score = character.abilities[option.requirement.ability] || 0;
              if (option.requirement.min !== undefined && score < option.requirement.min) return null;
              if (option.requirement.max !== undefined && score > option.requirement.max) return null;
            }

            return (
              <button
                key={option.id}
                onClick={() => handleOptionClick(option)}
                className="w-full text-left p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:bg-zinc-800 hover:border-zinc-700 transition group"
              >
                <span className="text-zinc-200 group-hover:text-white">{option.text}</span>
                {option.rollCheck && (
                  <span className="ml-3 text-xs font-mono text-zinc-500 bg-zinc-950 px-2 py-1 rounded">
                    Roll {option.rollCheck.ability} (DR {option.rollCheck.difficulty})
                  </span>
                )}
              </button>
            );
          })}
          {currentNode.options.length === 0 && (
            <div className="text-zinc-500 italic mt-8">End of path.</div>
          )}
        </div>
      </div>

      {rollCheck && (
        <DiceRollModal 
          option={rollCheck.option} 
          character={character} 
          onComplete={rollCheck.resolve} 
        />
      )}
    </div>
  );
}
