import { useState, useEffect, useRef, useCallback } from 'react';
import { StoryData } from './types';
import { loadStory, saveStory } from './engine';
import Player from './components/Player/Player';
import Editor from './components/Editor/Editor';
import GraphView from './components/Graph/GraphView';
import defaultStory from './data/defaultStory';

type Mode = 'play' | 'edit' | 'graph';
type SaveStatus = 'saved' | 'saving' | 'unsaved';

const AUTOSAVE_DELAY = 1000; // 1 second debounce

export default function App() {
  const [mode, setMode] = useState<Mode>('play');
  const [story, setStory] = useState<StoryData>(() => {
    const saved = loadStory();
    if (saved) return saved;
    saveStory(defaultStory);
    return defaultStory;
  });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  const handleStoryChange = useCallback((newStory: StoryData) => {
    setStory(newStory);
    setSaveStatus('unsaved');
  }, []);

  // Debounced autosave
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (saveTimer.current) clearTimeout(saveTimer.current);

    setSaveStatus('unsaved');
    saveTimer.current = setTimeout(() => {
      setSaveStatus('saving');
      saveStory(story);
      setSaveStatus('saved');
    }, AUTOSAVE_DELAY);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [story]);

  return (
    <div className="app">
      <nav className="mode-bar">
        <button className={mode === 'play' ? 'active' : ''} onClick={() => setMode('play')}>Play</button>
        <button className={mode === 'edit' ? 'active' : ''} onClick={() => setMode('edit')}>Editor</button>
        <button className={mode === 'graph' ? 'active' : ''} onClick={() => setMode('graph')}>Graph</button>
        <span className={`autosave-status autosave-${saveStatus}`}>
          {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved'}
        </span>
      </nav>
      {mode === 'play' ? (
        <Player story={story} />
      ) : mode === 'edit' ? (
        <Editor story={story} onStoryChange={handleStoryChange} />
      ) : (
        <GraphView story={story} onStoryChange={handleStoryChange} />
      )}
    </div>
  );
}
