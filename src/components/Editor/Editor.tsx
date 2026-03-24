import { useState } from 'react';
import { StoryData, StoryNode, StatConfig, StatDefinition } from '../../types';
import { saveStory, renameNode } from '../../engine';
import StoryMap from './StoryMap';
import NodeEditor from './NodeEditor';

interface Props {
  story: StoryData;
  onStoryChange: (story: StoryData) => void;
}

let nodeCounter = 0;

function generateId(): string {
  nodeCounter++;
  return `node_${Date.now()}_${nodeCounter}`;
}

export default function Editor({ story, onStoryChange }: Props) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [storyTitle, setStoryTitle] = useState(story.title);
  const [startNodeId, setStartNodeId] = useState(story.startNodeId);
  const [showStatConfig, setShowStatConfig] = useState(false);

  const selectedNode = selectedNodeId ? story.nodes[selectedNodeId] ?? null : null;
  const allNodeIds = Object.keys(story.nodes);
  const statConfig = story.statConfig;

  function commit(nodes: Record<string, StoryNode>, title?: string, start?: string, sc?: StatConfig) {
    const updated: StoryData = {
      title: title ?? storyTitle,
      startNodeId: start ?? startNodeId,
      nodes,
      statConfig: sc ?? statConfig,
    };
    onStoryChange(updated);
    saveStory(updated);
  }

  function handleAddNode() {
    const id = generateId();
    const newNode: StoryNode = { id, speaker: 'Interrogator', text: '', choices: [] };
    const nodes = { ...story.nodes, [id]: newNode };
    commit(nodes);
    setSelectedNodeId(id);
  }

  function handleSaveNode(node: StoryNode) {
    const nodes = { ...story.nodes, [node.id]: node };
    commit(nodes);
    setSelectedNodeId(null);
  }

  function handleRenameNode(oldId: string, updatedNode: StoryNode) {
    const renamedStory = renameNode(story, oldId, updatedNode.id);
    // Update the node content as well (speaker, text, choices, etc.)
    renamedStory.nodes[updatedNode.id] = updatedNode;
    const updated: StoryData = {
      ...renamedStory,
      title: storyTitle,
    };
    onStoryChange(updated);
    saveStory(updated);
    setStartNodeId(updated.startNodeId);
    setSelectedNodeId(updatedNode.id);
  }

  function handleDeleteNode() {
    if (!selectedNodeId) return;
    const nodes = { ...story.nodes };
    delete nodes[selectedNodeId];
    // Remove dangling references
    for (const n of Object.values(nodes)) {
      n.choices = n.choices.filter(c => c.targetId !== selectedNodeId);
    }
    commit(nodes);
    setSelectedNodeId(null);
  }

  function handleTitleChange(title: string) {
    setStoryTitle(title);
    commit(story.nodes, title);
  }

  function handleStartChange(start: string) {
    setStartNodeId(start);
    commit(story.nodes, undefined, start);
  }

  function handleStatConfigChange(newConfig: StatConfig) {
    commit(story.nodes, undefined, undefined, newConfig);
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(story, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${story.title.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string) as StoryData;
          if (data.nodes && data.startNodeId) {
            setStoryTitle(data.title);
            setStartNodeId(data.startNodeId);
            onStoryChange(data);
            saveStory(data);
            setSelectedNodeId(null);
          }
        } catch {
          alert('Invalid story JSON file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  return (
    <div className="editor-screen">
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <label>Title
            <input type="text" value={storyTitle} onChange={e => handleTitleChange(e.target.value)} />
          </label>
          <label>Start Node
            <select value={startNodeId} onChange={e => handleStartChange(e.target.value)}>
              {allNodeIds.map(id => <option key={id} value={id}>{id}</option>)}
            </select>
          </label>
          <button
            className={`btn-secondary ${showStatConfig ? 'active' : ''}`}
            onClick={() => setShowStatConfig(!showStatConfig)}
          >
            Stats Config
          </button>
        </div>
        <div className="toolbar-right">
          <button className="btn-secondary" onClick={handleImport}>Import</button>
          <button className="btn-secondary" onClick={handleExport}>Export</button>
          <button className="btn-primary" onClick={handleAddNode}>+ New Node</button>
        </div>
      </div>

      {showStatConfig && (
        <StatConfigEditor config={statConfig} onChange={handleStatConfigChange} />
      )}

      <div className="editor-body">
        <StoryMap story={story} selectedNodeId={selectedNodeId} onSelectNode={setSelectedNodeId} />

        <div className="editor-detail">
          {selectedNode ? (
            <NodeEditor
              key={selectedNodeId}
              node={selectedNode}
              allNodeIds={allNodeIds}
              statConfig={statConfig}
              onSave={handleSaveNode}
              onRename={handleRenameNode}
              onDelete={handleDeleteNode}
              onCancel={() => setSelectedNodeId(null)}
            />
          ) : (
            <div className="editor-placeholder">
              <p>Select a node from the list or create a new one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Stat Config Editor ---

interface StatConfigEditorProps {
  config: StatConfig;
  onChange: (config: StatConfig) => void;
}

function StatConfigEditor({ config, onChange }: StatConfigEditorProps) {
  function updateStat(idx: number, patch: Partial<StatDefinition>) {
    const stats = [...config.stats];
    stats[idx] = { ...stats[idx], ...patch };
    onChange({ ...config, stats });
  }

  function addStat() {
    const key = `stat_${Date.now()}`;
    onChange({
      ...config,
      stats: [...config.stats, { key, name: 'New Stat', description: 'Description...' }],
    });
  }

  function removeStat(idx: number) {
    onChange({
      ...config,
      stats: config.stats.filter((_, i) => i !== idx),
    });
  }

  return (
    <div className="stat-config-editor">
      <div className="stat-config-header">
        <h4>Stats Configuration</h4>
        <div className="stat-config-globals">
          <label>Max Value
            <input
              type="number"
              min={1}
              max={20}
              value={config.maxValue}
              onChange={e => onChange({ ...config, maxValue: Number(e.target.value) })}
            />
          </label>
          <label>Point Total
            <input
              type="number"
              min={1}
              max={100}
              value={config.pointTotal}
              onChange={e => onChange({ ...config, pointTotal: Number(e.target.value) })}
            />
          </label>
        </div>
      </div>
      <div className="stat-config-list">
        {config.stats.map((def, idx) => (
          <div key={idx} className="stat-config-row">
            <input
              type="text"
              placeholder="Key"
              value={def.key}
              onChange={e => updateStat(idx, { key: e.target.value })}
              className="stat-config-key"
            />
            <input
              type="text"
              placeholder="Display Name"
              value={def.name}
              onChange={e => updateStat(idx, { name: e.target.value })}
              className="stat-config-name"
            />
            <input
              type="text"
              placeholder="Description"
              value={def.description}
              onChange={e => updateStat(idx, { description: e.target.value })}
              className="stat-config-desc"
            />
            <button className="btn-icon" onClick={() => removeStat(idx)} title="Remove stat">✕</button>
          </div>
        ))}
      </div>
      <button className="btn-secondary" onClick={addStat}>+ Add Stat</button>
    </div>
  );
}
