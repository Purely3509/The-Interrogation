import { useState } from 'react';
import { Story, Character } from './types';
import { initialStory } from './data/initialStory';
import { Editor } from './components/Editor/Editor';
import { Player } from './components/Player/Player';
import { CharacterCreation } from './components/Player/CharacterCreation';

export default function App() {
  const [mode, setMode] = useState<'menu' | 'play' | 'edit' | 'character-creation'>('menu');
  const [story, setStory] = useState<Story>(initialStory);
  const [character, setCharacter] = useState<Character | null>(null);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {mode === 'menu' && (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-5xl font-bold mb-8 tracking-tighter text-zinc-100">The Interrogation</h1>
          <div className="flex gap-4">
            <button onClick={() => setMode('character-creation')} className="px-6 py-3 bg-zinc-100 text-zinc-950 font-medium rounded-lg hover:bg-zinc-300 transition">Play Story</button>
            <button onClick={() => setMode('edit')} className="px-6 py-3 bg-zinc-800 text-zinc-100 font-medium rounded-lg hover:bg-zinc-700 transition">Open Editor</button>
          </div>
        </div>
      )}
      {mode === 'character-creation' && (
        <CharacterCreation 
          story={story} 
          onComplete={(char) => { setCharacter(char); setMode('play'); }} 
          onCancel={() => setMode('menu')} 
        />
      )}
      {mode === 'play' && character && (
        <Player 
          story={story} 
          character={character} 
          onExit={() => setMode('menu')} 
        />
      )}
      {mode === 'edit' && (
        <Editor 
          story={story} 
          onChange={setStory} 
          onExit={() => setMode('menu')} 
        />
      )}
    </div>
  );
}
