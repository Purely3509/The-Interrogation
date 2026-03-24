import { useState } from 'react';
import { StoryData } from './types';
import { loadStory, saveStory } from './engine';
import Player from './components/Player/Player';
import Editor from './components/Editor/Editor';
import GraphView from './components/Graph/GraphView';
import defaultStory from './data/defaultStory';

type Mode = 'play' | 'edit' | 'graph';

export default function App() {
  const [mode, setMode] = useState<Mode>('play');
  const [story, setStory] = useState<StoryData>(() => {
    const saved = loadStory();
    if (saved) return saved;
    saveStory(defaultStory);
    return defaultStory;
  });

  return (
    <div className="app">
      <nav className="mode-bar">
        <button className={mode === 'play' ? 'active' : ''} onClick={() => setMode('play')}>Play</button>
        <button className={mode === 'edit' ? 'active' : ''} onClick={() => setMode('edit')}>Editor</button>
        <button className={mode === 'graph' ? 'active' : ''} onClick={() => setMode('graph')}>Graph</button>
      </nav>
      {mode === 'play' ? (
        <Player story={story} />
      ) : mode === 'edit' ? (
        <Editor story={story} onStoryChange={setStory} />
      ) : (
        <GraphView story={story} onStoryChange={setStory} />
      )}
    </div>
  );
}
