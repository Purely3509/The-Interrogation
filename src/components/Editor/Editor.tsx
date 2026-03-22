import { useState } from 'react';
import { Story, StoryNode, StoryOption } from '../../types';
import { Plus, Trash2, ArrowLeft, Map as MapIcon, List } from 'lucide-react';
import { StoryMap } from './StoryMap';

export function Editor({ story, onChange, onExit }: { story: Story, onChange: (s: Story) => void, onExit: () => void }) {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(story.startNodeId);
  const [viewMode, setViewMode] = useState<'edit' | 'map'>('edit');

  const handleAddNode = () => {
    const id = `node-${Date.now()}`;
    const newNode: StoryNode = {
      id,
      title: 'New Node',
      text: '',
      options: []
    };
    onChange({
      ...story,
      nodes: { ...story.nodes, [id]: newNode }
    });
    setSelectedNodeId(id);
  };

  const handleDeleteNode = (id: string) => {
    if (id === story.startNodeId) return; // Cannot delete start node
    const newNodes = { ...story.nodes };
    delete newNodes[id];
    onChange({ ...story, nodes: newNodes });
    if (selectedNodeId === id) {
      setSelectedNodeId(story.startNodeId);
    }
  };

  const updateNode = (id: string, updates: Partial<StoryNode>) => {
    onChange({
      ...story,
      nodes: {
        ...story.nodes,
        [id]: { ...story.nodes[id], ...updates }
      }
    });
  };

  const selectedNode = story.nodes[selectedNodeId];

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      {/* Sidebar */}
      <div className="w-64 border-r border-zinc-800 flex flex-col bg-zinc-900/50">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <button onClick={onExit} className="text-zinc-400 hover:text-white flex items-center gap-2 text-sm">
            <ArrowLeft size={16} /> Exit
          </button>
          <div className="flex items-center gap-1">
            <button onClick={() => setViewMode('edit')} className={`p-1.5 rounded ${viewMode === 'edit' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`} title="List View">
              <List size={16} />
            </button>
            <button onClick={() => setViewMode('map')} className={`p-1.5 rounded ${viewMode === 'map' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`} title="Map View">
              <MapIcon size={16} />
            </button>
            <button onClick={handleAddNode} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white ml-1" title="Add Node">
              <Plus size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {Object.values(story.nodes).map(node => (
            <div 
              key={node.id}
              onClick={() => setSelectedNodeId(node.id)}
              className={`p-2 rounded cursor-pointer flex justify-between items-center group ${selectedNodeId === node.id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}
            >
              <span className="truncate text-sm">{node.title || 'Untitled'}</span>
              {node.id !== story.startNodeId && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}
                  className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className={`flex-1 flex flex-col ${viewMode === 'map' ? 'overflow-hidden' : 'overflow-y-auto p-8'}`}>
        {viewMode === 'map' ? (
          <StoryMap 
            story={story} 
            onChange={onChange} 
            onSelectNode={(id) => {
              setSelectedNodeId(id);
              setViewMode('edit');
            }} 
          />
        ) : selectedNode ? (
          <div className="max-w-3xl mx-auto space-y-6 w-full">
            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Node ID</label>
              <div className="text-sm font-mono text-zinc-400 bg-zinc-900 p-2 rounded border border-zinc-800 inline-block">{selectedNode.id}</div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Title</label>
              <input 
                type="text" 
                value={selectedNode.title}
                onChange={e => updateNode(selectedNode.id, { title: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-zinc-600 text-xl font-bold"
                placeholder="Node Title"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Text</label>
              <textarea 
                value={selectedNode.text}
                onChange={e => updateNode(selectedNode.id, { text: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-zinc-300 focus:outline-none focus:border-zinc-600 min-h-[200px] leading-relaxed resize-y"
                placeholder="Story text goes here..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider">Options</label>
                <button 
                  onClick={() => {
                    const newOption: StoryOption = { id: `opt-${Date.now()}`, text: 'New Option', targetNodeId: '' };
                    updateNode(selectedNode.id, { options: [...selectedNode.options, newOption] });
                  }}
                  className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1 rounded flex items-center gap-1"
                >
                  <Plus size={14} /> Add Option
                </button>
              </div>

              <div className="space-y-4">
                {selectedNode.options.map((option, idx) => (
                  <OptionEditor 
                    key={option.id} 
                    option={option} 
                    story={story}
                    onChange={(updatedOption) => {
                      const newOptions = [...selectedNode.options];
                      newOptions[idx] = updatedOption;
                      updateNode(selectedNode.id, { options: newOptions });
                    }}
                    onDelete={() => {
                      const newOptions = selectedNode.options.filter(o => o.id !== option.id);
                      updateNode(selectedNode.id, { options: newOptions });
                    }}
                  />
                ))}
                {selectedNode.options.length === 0 && (
                  <div className="text-center p-8 border border-dashed border-zinc-800 rounded-lg text-zinc-500 text-sm">
                    No options. This is an end node.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-500">
            Select a node to edit
          </div>
        )}
      </div>
    </div>
  );
}

function OptionEditor({ option, story, onChange, onDelete }: { key?: string, option: StoryOption, story: Story, onChange: (o: StoryOption) => void, onDelete: () => void }) {
  const isRoll = !!option.rollCheck;

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <input 
            type="text" 
            value={option.text}
            onChange={e => onChange({ ...option, text: e.target.value })}
            className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white focus:outline-none focus:border-zinc-600"
            placeholder="Option text..."
          />
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
            <input 
              type="checkbox" 
              checked={!!option.requirement}
              onChange={e => {
                if (e.target.checked) {
                  onChange({ ...option, requirement: { ability: story.abilitiesDef[0], min: 1 } });
                } else {
                  onChange({ ...option, requirement: undefined });
                }
              }}
              className="rounded bg-zinc-900 border-zinc-700"
            />
            Requirement
          </label>
          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
            <input 
              type="checkbox" 
              checked={isRoll}
              onChange={e => {
                if (e.target.checked) {
                  onChange({ 
                    ...option, 
                    targetNodeId: undefined,
                    rollCheck: { ability: story.abilitiesDef[0], difficulty: 10, successNodeId: '', failureNodeId: '' }
                  });
                } else {
                  onChange({ 
                    ...option, 
                    rollCheck: undefined,
                    targetNodeId: ''
                  });
                }
              }}
              className="rounded bg-zinc-900 border-zinc-700"
            />
            Roll Check
          </label>
          <button onClick={onDelete} className="text-zinc-500 hover:text-red-400 p-1">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {option.requirement && (
        <div className="flex items-center gap-4 bg-zinc-950 p-3 rounded border border-zinc-800/50 mb-4">
          <div className="flex-1">
            <label className="block text-xs text-zinc-500 mb-1">Required Ability</label>
            <select 
              value={option.requirement.ability}
              onChange={e => onChange({ ...option, requirement: { ...option.requirement!, ability: e.target.value } })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-white"
            >
              {story.abilitiesDef.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="w-24">
            <label className="block text-xs text-zinc-500 mb-1">Min Score</label>
            <input 
              type="number" 
              value={option.requirement.min ?? ''}
              onChange={e => onChange({ ...option, requirement: { ...option.requirement!, min: e.target.value ? parseInt(e.target.value) : undefined } })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-white"
              placeholder="None"
            />
          </div>
          <div className="w-24">
            <label className="block text-xs text-zinc-500 mb-1">Max Score</label>
            <input 
              type="number" 
              value={option.requirement.max ?? ''}
              onChange={e => onChange({ ...option, requirement: { ...option.requirement!, max: e.target.value ? parseInt(e.target.value) : undefined } })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-white"
              placeholder="None"
            />
          </div>
        </div>
      )}

      {isRoll ? (
        <div className="grid grid-cols-2 gap-4 bg-zinc-950 p-4 rounded border border-zinc-800/50">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Ability</label>
            <select 
              value={option.rollCheck!.ability}
              onChange={e => onChange({ ...option, rollCheck: { ...option.rollCheck!, ability: e.target.value } })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-white"
            >
              {story.abilitiesDef.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Difficulty</label>
            <input 
              type="number" 
              value={option.rollCheck!.difficulty}
              onChange={e => onChange({ ...option, rollCheck: { ...option.rollCheck!, difficulty: parseInt(e.target.value) || 0 } })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-emerald-500/70 mb-1">Success Node</label>
            <NodeSelect value={option.rollCheck!.successNodeId} onChange={v => onChange({ ...option, rollCheck: { ...option.rollCheck!, successNodeId: v } })} story={story} />
          </div>
          <div>
            <label className="block text-xs text-red-500/70 mb-1">Failure Node</label>
            <NodeSelect value={option.rollCheck!.failureNodeId} onChange={v => onChange({ ...option, rollCheck: { ...option.rollCheck!, failureNodeId: v } })} story={story} />
          </div>
          <div>
            <label className="block text-xs text-purple-500/70 mb-1">Critical Success Node (Optional)</label>
            <NodeSelect value={option.rollCheck!.criticalSuccessNodeId || ''} onChange={v => onChange({ ...option, rollCheck: { ...option.rollCheck!, criticalSuccessNodeId: v } })} story={story} allowEmpty />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Crit Threshold (Default 12)</label>
            <input 
              type="number" 
              value={option.rollCheck!.criticalSuccessThreshold || 12}
              onChange={e => onChange({ ...option, rollCheck: { ...option.rollCheck!, criticalSuccessThreshold: parseInt(e.target.value) || 12 } })}
              className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-white"
            />
          </div>
        </div>
      ) : (
        <div className="bg-zinc-950 p-4 rounded border border-zinc-800/50">
          <label className="block text-xs text-zinc-500 mb-1">Target Node</label>
          <NodeSelect value={option.targetNodeId || ''} onChange={v => onChange({ ...option, targetNodeId: v })} story={story} />
        </div>
      )}
    </div>
  );
}

function NodeSelect({ value, onChange, story, allowEmpty }: { value: string, onChange: (v: string) => void, story: Story, allowEmpty?: boolean }) {
  const isMissing = value !== '' && !story.nodes[value];
  return (
    <div className="flex flex-col gap-1">
      <select 
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full bg-zinc-900 border ${isMissing ? 'border-red-500 text-red-400' : 'border-zinc-800 text-white'} rounded p-2 text-sm`}
      >
        {allowEmpty && <option value="">-- None --</option>}
        {isMissing && <option value={value}>⚠️ Deleted Node ({value})</option>}
        {Object.values(story.nodes).map(n => (
          <option key={n.id} value={n.id} className="text-white">{n.title || n.id}</option>
        ))}
      </select>
      {isMissing && <span className="text-xs text-red-500">Warning: Target node no longer exists.</span>}
    </div>
  );
}
