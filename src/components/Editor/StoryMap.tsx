import { StoryData } from '../../types';

interface Props {
  story: StoryData;
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
}

export default function StoryMap({ story, selectedNodeId, onSelectNode }: Props) {
  const nodeIds = Object.keys(story.nodes);

  return (
    <div className="story-map">
      <h4>Nodes ({nodeIds.length})</h4>
      <div className="node-list">
        {nodeIds.map(id => {
          const node = story.nodes[id];
          const isStart = id === story.startNodeId;
          const isEnding = node.ending;
          return (
            <button
              key={id}
              className={`node-item ${selectedNodeId === id ? 'selected' : ''} ${isStart ? 'start' : ''} ${isEnding ? 'ending' : ''}`}
              onClick={() => onSelectNode(id)}
            >
              <span className="node-id">{id}</span>
              <span className="node-speaker">{node.speaker}</span>
              <span className="node-edges">{node.choices.length} →</span>
              {isStart && <span className="node-badge start-badge">START</span>}
              {isEnding && <span className="node-badge end-badge">END</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
