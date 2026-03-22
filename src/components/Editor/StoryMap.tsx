import React, { useState, useEffect, useRef } from 'react';
import { Story, StoryOption } from '../../types';

function getEdgePoint(x1: number, y1: number, x2: number, y2: number, w: number, h: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return { x: x2, y: y2 };
  
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  
  const hw = w / 2;
  const hh = h / 2;
  
  let x, y;
  if (absDx * hh > absDy * hw) {
    x = dx > 0 ? x2 - hw : x2 + hw;
    y = y2 - dy * (hw / absDx);
  } else {
    y = dy > 0 ? y2 - hh : y2 + hh;
    x = x2 - dx * (hh / absDy);
  }
  return { x, y };
}

export function StoryMap({ story, onChange, onSelectNode }: { story: Story, onChange: (s: Story) => void, onSelectNode: (id: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{ id: string, startX: number, startY: number, nodeX: number, nodeY: number } | null>(null);
  const [drawingConnection, setDrawingConnection] = useState<{ startNodeId: string, currentX: number, currentY: number } | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  useEffect(() => {
    let changed = false;
    const newNodes = { ...story.nodes };
    Object.values(newNodes).forEach((node, i) => {
      if (!node.position) {
        node.position = { x: 100 + (i % 4) * 250, y: 100 + Math.floor(i / 4) * 150 };
        changed = true;
      }
    });
    if (changed) {
      onChange({ ...story, nodes: newNodes });
    }
  }, [story, onChange]);

  const getContainerCoords = (clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    if (e.button !== 0) return; // Only left click
    e.stopPropagation();
    const node = story.nodes[id];
    setDragState({
      id,
      startX: e.clientX,
      startY: e.clientY,
      nodeX: node.position?.x || 0,
      nodeY: node.position?.y || 0
    });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleConnectionStart = (e: React.PointerEvent, id: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const coords = getContainerCoords(e.clientX, e.clientY);
    setDrawingConnection({
      startNodeId: id,
      currentX: coords.x,
      currentY: coords.y
    });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragState) {
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      const newNodes = {
        ...story.nodes,
        [dragState.id]: {
          ...story.nodes[dragState.id],
          position: {
            x: dragState.nodeX + dx,
            y: dragState.nodeY + dy
          }
        }
      };
      onChange({ ...story, nodes: newNodes });
    } else if (drawingConnection) {
      const coords = getContainerCoords(e.clientX, e.clientY);
      setDrawingConnection(prev => ({ ...prev!, currentX: coords.x, currentY: coords.y }));
      
      const targetEl = document.elementFromPoint(e.clientX, e.clientY);
      const nodeEl = targetEl?.closest('[data-node-id]');
      if (nodeEl) {
        const targetNodeId = nodeEl.getAttribute('data-node-id');
        if (targetNodeId && targetNodeId !== drawingConnection.startNodeId) {
          setHoveredNodeId(targetNodeId);
        } else {
          setHoveredNodeId(null);
        }
      } else {
        setHoveredNodeId(null);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragState) {
      setDragState(null);
      if (e.target instanceof HTMLElement && e.target.hasPointerCapture(e.pointerId)) {
        e.target.releasePointerCapture(e.pointerId);
      }
    } else if (drawingConnection) {
      const targetEl = document.elementFromPoint(e.clientX, e.clientY);
      const nodeEl = targetEl?.closest('[data-node-id]');
      if (nodeEl) {
        const targetNodeId = nodeEl.getAttribute('data-node-id');
        if (targetNodeId && targetNodeId !== drawingConnection.startNodeId) {
          const startNode = story.nodes[drawingConnection.startNodeId];
          const newOption: StoryOption = {
            id: `opt-${Date.now()}`,
            text: 'New Option',
            targetNodeId: targetNodeId
          };
          onChange({
            ...story,
            nodes: {
              ...story.nodes,
              [drawingConnection.startNodeId]: {
                ...startNode,
                options: [...startNode.options, newOption]
              }
            }
          });
        }
      }
      setDrawingConnection(null);
      setHoveredNodeId(null);
      if (e.target instanceof HTMLElement && e.target.hasPointerCapture(e.pointerId)) {
        e.target.releasePointerCapture(e.pointerId);
      }
    }
  };

  const connections: { x1: number, y1: number, x2: number, y2: number, color: string }[] = [];
  Object.values(story.nodes).forEach(node => {
    const p1 = node.position || { x: 0, y: 0 };
    const cx1 = p1.x + 100;
    const cy1 = p1.y + 40;

    node.options.forEach(opt => {
      const targets: { id: string, color: string }[] = [];
      if (opt.targetNodeId) targets.push({ id: opt.targetNodeId, color: '#52525b' });
      if (opt.rollCheck) {
        if (opt.rollCheck.successNodeId) targets.push({ id: opt.rollCheck.successNodeId, color: '#10b981' });
        if (opt.rollCheck.failureNodeId) targets.push({ id: opt.rollCheck.failureNodeId, color: '#ef4444' });
        if (opt.rollCheck.criticalSuccessNodeId) targets.push({ id: opt.rollCheck.criticalSuccessNodeId, color: '#a855f7' });
      }

      targets.forEach(t => {
        const targetNode = story.nodes[t.id];
        if (targetNode && targetNode.position) {
          const cx2 = targetNode.position.x + 100;
          const cy2 = targetNode.position.y + 40;
          const { x: ex2, y: ey2 } = getEdgePoint(cx1, cy1, cx2, cy2, 200, 80);
          connections.push({
            x1: cx1,
            y1: cy1,
            x2: ex2,
            y2: ey2,
            color: t.color
          });
        }
      });
    });
  });

  return (
    <div 
      className="w-full h-full overflow-auto bg-zinc-950 relative"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div style={{ width: 4000, height: 4000, position: 'relative' }} ref={containerRef}>
        <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
          <defs>
            <marker id="arrowhead-zinc" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#52525b" />
            </marker>
            <marker id="arrowhead-emerald" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" />
            </marker>
            <marker id="arrowhead-red" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
            </marker>
            <marker id="arrowhead-purple" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#a855f7" />
            </marker>
          </defs>
          {connections.map((c, i) => {
            let markerId = 'arrowhead-zinc';
            if (c.color === '#10b981') markerId = 'arrowhead-emerald';
            if (c.color === '#ef4444') markerId = 'arrowhead-red';
            if (c.color === '#a855f7') markerId = 'arrowhead-purple';
            
            return (
              <line 
                key={i} 
                x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} 
                stroke={c.color} 
                strokeWidth={2} 
                opacity={0.8} 
                markerEnd={`url(#${markerId})`}
              />
            );
          })}
          {drawingConnection && (() => {
            const startNode = story.nodes[drawingConnection.startNodeId];
            if (!startNode || !startNode.position) return null;
            const startX = startNode.position.x + 200;
            const startY = startNode.position.y + 40;
            return (
              <line 
                x1={startX} y1={startY} 
                x2={drawingConnection.currentX} y2={drawingConnection.currentY} 
                stroke="#a1a1aa" 
                strokeWidth={2} 
                strokeDasharray="5,5" 
                markerEnd="url(#arrowhead-zinc)"
              />
            );
          })()}
        </svg>
        {Object.values(story.nodes).map(node => (
          <div
            key={node.id}
            data-node-id={node.id}
            onPointerDown={(e) => handlePointerDown(e, node.id)}
            onDoubleClick={() => onSelectNode(node.id)}
            style={{
              position: 'absolute',
              left: node.position?.x || 0,
              top: node.position?.y || 0,
              width: 200,
              height: 80,
            }}
            className={`bg-zinc-900 border ${
              hoveredNodeId === node.id 
                ? 'border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                : node.id === story.startNodeId 
                  ? 'border-emerald-500' 
                  : 'border-zinc-700'
            } rounded-lg p-3 cursor-move shadow-lg hover:border-zinc-400 transition-colors select-none flex flex-col justify-center relative`}
          >
            <div className="font-bold text-sm text-zinc-100 truncate">{node.title || 'Untitled'}</div>
            <div className="text-xs text-zinc-500 truncate">{node.id}</div>
            
            {/* Connection Handle */}
            <div 
              className="absolute right-[-8px] top-1/2 -translate-y-1/2 w-4 h-4 bg-zinc-700 border-2 border-zinc-900 rounded-full cursor-crosshair hover:bg-zinc-300 hover:scale-125 transition-transform"
              onPointerDown={(e) => handleConnectionStart(e, node.id)}
              title="Drag to connect to another node"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
