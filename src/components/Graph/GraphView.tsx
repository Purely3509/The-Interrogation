import { useRef, useEffect, useState, useCallback } from 'react';
import { StoryData, Choice } from '../../types';
import { saveStory } from '../../engine';

interface Props {
  story: StoryData;
  onStoryChange?: (story: StoryData) => void;
}

interface GraphNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speaker: string;
  isStart: boolean;
  isEnding: boolean;
  choiceCount: number;
  text: string;
  pinned: boolean;
}

interface GraphEdge {
  source: string;
  target: string;
  label: string;
  hasCheck: boolean;
  isFail: boolean;
}

const NODE_RADIUS = 24;
const LABEL_OFFSET = 32;
const CONNECTION_ZONE = 8; // outer ring thickness for connection drag

function buildGraph(story: StoryData): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeIds = Object.keys(story.nodes);
  const count = nodeIds.length;

  // Arrange in a circle initially
  nodeIds.forEach((id, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    const radius = Math.min(400, count * 18);
    const node = story.nodes[id];
    nodes.push({
      id,
      x: 600 + radius * Math.cos(angle),
      y: 450 + radius * Math.sin(angle),
      vx: 0,
      vy: 0,
      speaker: node.speaker,
      isStart: id === story.startNodeId,
      isEnding: !!node.ending,
      choiceCount: node.choices.length,
      text: node.text.slice(0, 120) + (node.text.length > 120 ? '...' : ''),
      pinned: false,
    });
  });

  for (const node of Object.values(story.nodes)) {
    for (const choice of node.choices) {
      if (story.nodes[choice.targetId]) {
        edges.push({
          source: node.id,
          target: choice.targetId,
          label: choice.label.length > 30 ? choice.label.slice(0, 30) + '...' : choice.label,
          hasCheck: !!choice.check,
          isFail: false,
        });
      }
      if (choice.failTargetId && story.nodes[choice.failTargetId]) {
        edges.push({
          source: node.id,
          target: choice.failTargetId,
          label: `[FAIL] ${choice.label.slice(0, 24)}...`,
          hasCheck: true,
          isFail: true,
        });
      }
    }
  }

  return { nodes, edges };
}

function forceSimulation(nodes: GraphNode[], edges: GraphEdge[], iterations: number): void {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const repulsion = 8000;
  const attraction = 0.005;
  const idealLength = 160;
  const damping = 0.85;
  const centerX = 600;
  const centerY = 450;
  const centerGravity = 0.01;

  for (let iter = 0; iter < iterations; iter++) {
    // Repulsion between all node pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        if (!a.pinned) { a.vx -= fx; a.vy -= fy; }
        if (!b.pinned) { b.vx += fx; b.vy += fy; }
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const a = nodeMap.get(edge.source);
      const b = nodeMap.get(edge.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const force = attraction * (dist - idealLength);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      if (!a.pinned) { a.vx += fx; a.vy += fy; }
      if (!b.pinned) { b.vx -= fx; b.vy -= fy; }
    }

    // Center gravity
    for (const node of nodes) {
      if (node.pinned) continue;
      node.vx += (centerX - node.x) * centerGravity;
      node.vy += (centerY - node.y) * centerGravity;
    }

    // Apply velocities with damping
    for (const node of nodes) {
      if (node.pinned) continue;
      node.vx *= damping;
      node.vy *= damping;
      node.x += node.vx;
      node.y += node.vy;
    }
  }
}

export default function GraphView({ story, onStoryChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.85);
  const [showEdgeLabels, setShowEdgeLabels] = useState(false);
  const dragging = useRef<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);
  const panning = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  // Connection drag state
  const [connecting, setConnecting] = useState<{ sourceId: string; mouseX: number; mouseY: number } | null>(null);
  const [connectionPrompt, setConnectionPrompt] = useState<{ sourceId: string; targetId: string } | null>(null);
  const [connectionLabel, setConnectionLabel] = useState('');

  // Track if graph has been laid out to preserve positions on edge-only changes
  const hasLaidOut = useRef(false);

  useEffect(() => {
    if (hasLaidOut.current && graphData) {
      // Story changed but we already have a layout — update edges without re-simulating
      const existingPositions = new Map(graphData.nodes.map(n => [n.id, { x: n.x, y: n.y, pinned: n.pinned }]));
      const { nodes: newNodes, edges: newEdges } = buildGraph(story);
      // Restore positions for existing nodes
      for (const node of newNodes) {
        const pos = existingPositions.get(node.id);
        if (pos) {
          node.x = pos.x;
          node.y = pos.y;
          node.pinned = pos.pinned;
        }
      }
      // Only re-simulate if nodes were added/removed
      const oldIds = new Set(graphData.nodes.map(n => n.id));
      const newIds = new Set(newNodes.map(n => n.id));
      const nodesChanged = oldIds.size !== newIds.size || [...oldIds].some(id => !newIds.has(id));
      if (nodesChanged) {
        forceSimulation(newNodes, newEdges, 300);
      }
      setGraphData({ nodes: newNodes, edges: newEdges });
    } else {
      const { nodes, edges } = buildGraph(story);
      forceSimulation(nodes, edges, 300);
      setGraphData({ nodes, edges });
      hasLaidOut.current = true;
    }
  }, [story]); // eslint-disable-line react-hooks/exhaustive-deps

  const toSvgCoords = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }, [pan, zoom]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    setZoom(z => Math.max(0.15, Math.min(3, z * factor)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    // Start panning if clicking on background
    const target = e.target as SVGElement;
    if (target === svgRef.current || target.tagName === 'svg' || target.classList.contains('graph-bg')) {
      panning.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (connecting) {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      setConnecting(prev => prev ? {
        ...prev,
        mouseX: (e.clientX - rect.left - pan.x) / zoom,
        mouseY: (e.clientY - rect.top - pan.y) / zoom,
      } : null);
      return;
    }
    if (dragging.current && graphData) {
      const { x, y } = toSvgCoords(e.clientX, e.clientY);
      setGraphData(prev => {
        if (!prev) return prev;
        const nodes = prev.nodes.map(n =>
          n.id === dragging.current!.nodeId ? { ...n, x, y, pinned: true } : n
        );
        return { ...prev, nodes };
      });
    }
    if (panning.current) {
      const dx = e.clientX - panning.current.startX;
      const dy = e.clientY - panning.current.startY;
      setPan({ x: panning.current.panX + dx, y: panning.current.panY + dy });
    }
  }, [graphData, pan, zoom, connecting, toSvgCoords]);

  const handleMouseUp = useCallback(() => {
    if (connecting) {
      // Dropped on background — cancel connection
      setConnecting(null);
    }
    dragging.current = null;
    panning.current = null;
  }, [connecting]);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (!onStoryChange || !graphData) {
      // No story change handler — just drag to reposition
      dragging.current = { nodeId, offsetX: 0, offsetY: 0 };
      return;
    }

    // Check if click is in the outer ring (connection zone)
    const gNode = graphData.nodes.find(n => n.id === nodeId);
    if (gNode) {
      const { x: svgX, y: svgY } = toSvgCoords(e.clientX, e.clientY);
      const dx = svgX - gNode.x;
      const dy = svgY - gNode.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > NODE_RADIUS - CONNECTION_ZONE) {
        // Start connection drag from outer ring
        setConnecting({ sourceId: nodeId, mouseX: svgX, mouseY: svgY });
        return;
      }
    }

    // Inner area — reposition drag
    dragging.current = { nodeId, offsetX: 0, offsetY: 0 };
  }, [onStoryChange, graphData, toSvgCoords]);

  const handleNodeMouseUp = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (connecting && connecting.sourceId !== nodeId) {
      e.stopPropagation();
      setConnectionPrompt({ sourceId: connecting.sourceId, targetId: nodeId });
      setConnectionLabel('');
      setConnecting(null);
    }
  }, [connecting]);

  const handleCreateConnection = useCallback(() => {
    if (!connectionPrompt || !connectionLabel.trim() || !onStoryChange) return;
    const { sourceId, targetId } = connectionPrompt;
    const sourceNode = story.nodes[sourceId];
    if (!sourceNode) return;

    const newChoice: Choice = { label: connectionLabel.trim(), targetId };
    const updatedNode = { ...sourceNode, choices: [...sourceNode.choices, newChoice] };
    const updatedStory: StoryData = {
      ...story,
      nodes: { ...story.nodes, [sourceId]: updatedNode },
    };
    onStoryChange(updatedStory);
    saveStory(updatedStory);
    setConnectionPrompt(null);
    setConnectionLabel('');
  }, [connectionPrompt, connectionLabel, onStoryChange, story]);

  if (!graphData) return <div className="graph-loading">Generating layout...</div>;

  const nodeMap = new Map(graphData.nodes.map(n => [n.id, n]));
  const selected = selectedNode ? story.nodes[selectedNode] : null;

  // Find connected edges for highlighting
  const connectedEdges = new Set<number>();
  const connectedNodes = new Set<string>();
  if (hoveredNode || selectedNode) {
    const focusId = hoveredNode || selectedNode;
    connectedNodes.add(focusId!);
    graphData.edges.forEach((edge, i) => {
      if (edge.source === focusId || edge.target === focusId) {
        connectedEdges.add(i);
        connectedNodes.add(edge.source);
        connectedNodes.add(edge.target);
      }
    });
  }

  return (
    <div className="graph-screen">
      <div className="graph-toolbar">
        <label className="graph-toggle">
          <input type="checkbox" checked={showEdgeLabels} onChange={e => setShowEdgeLabels(e.target.checked)} />
          Edge Labels
        </label>
        <span className="graph-stats">{graphData.nodes.length} nodes · {graphData.edges.length} edges</span>
        <button className="btn-secondary" onClick={() => { setPan({ x: 0, y: 0 }); setZoom(0.85); }}>Reset View</button>
      </div>

      <div className="graph-container">
        <svg
          ref={svgRef}
          className="graph-svg"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: connecting ? 'crosshair' : undefined }}
        >
          <defs>
            <marker id="arrow" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 3 L 0 6 z" fill="#71717a" />
            </marker>
            <marker id="arrow-highlight" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 3 L 0 6 z" fill="#c0a050" />
            </marker>
            <marker id="arrow-fail" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 3 L 0 6 z" fill="#c04040" />
            </marker>
          </defs>

          <rect className="graph-bg" width="100%" height="100%" fill="transparent" />

          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {/* Edges */}
            {graphData.edges.map((edge, i) => {
              const source = nodeMap.get(edge.source);
              const target = nodeMap.get(edge.target);
              if (!source || !target) return null;

              const dx = target.x - source.x;
              const dy = target.y - source.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist === 0) return null;

              // Shorten line to not overlap nodes
              const nx = dx / dist;
              const ny = dy / dist;
              const x1 = source.x + nx * NODE_RADIUS;
              const y1 = source.y + ny * NODE_RADIUS;
              const x2 = target.x - nx * (NODE_RADIUS + 8);
              const y2 = target.y - ny * (NODE_RADIUS + 8);

              const isHighlighted = connectedEdges.has(i);
              const opacity = (hoveredNode || selectedNode) ? (isHighlighted ? 1 : 0.12) : 0.5;
              const marker = edge.isFail ? 'url(#arrow-fail)' : isHighlighted ? 'url(#arrow-highlight)' : 'url(#arrow)';
              const color = edge.isFail ? '#c04040' : isHighlighted ? '#c0a050' : '#71717a';

              // Curve the edge slightly for parallel edges
              const mx = (x1 + x2) / 2;
              const my = (y1 + y2) / 2;
              const cx = mx + ny * 20;
              const cy = my - nx * 20;

              return (
                <g key={`edge-${i}`}>
                  <path
                    d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
                    fill="none"
                    stroke={color}
                    strokeWidth={isHighlighted ? 2 : 1}
                    opacity={opacity}
                    markerEnd={marker}
                    strokeDasharray={edge.isFail ? '4,4' : undefined}
                  />
                  {showEdgeLabels && (
                    <text
                      x={cx}
                      y={cy - 6}
                      textAnchor="middle"
                      fill={color}
                      fontSize={8}
                      opacity={opacity}
                      className="edge-label"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Connection drag preview line */}
            {connecting && (() => {
              const sourceNode = nodeMap.get(connecting.sourceId);
              if (!sourceNode) return null;
              return (
                <line
                  x1={sourceNode.x}
                  y1={sourceNode.y}
                  x2={connecting.mouseX}
                  y2={connecting.mouseY}
                  stroke="#c0a050"
                  strokeWidth={2}
                  strokeDasharray="6,4"
                  opacity={0.8}
                />
              );
            })()}

            {/* Nodes */}
            {graphData.nodes.map(node => {
              const isConnected = connectedNodes.has(node.id);
              const opacity = (hoveredNode || selectedNode) ? (isConnected ? 1 : 0.2) : 1;
              const isHovered = node.id === hoveredNode;
              const isSelected = node.id === selectedNode;
              const isConnectTarget = connecting && connecting.sourceId !== node.id;

              let fill = '#1c1c24';
              let stroke = '#2a2a35';
              if (node.isStart) { fill = '#1a2a1a'; stroke = '#40a060'; }
              if (node.isEnding) { fill = '#2a1a1a'; stroke = '#c04040'; }
              if (isHovered || isSelected) { stroke = '#c0a050'; }
              if (isConnectTarget && isHovered) { stroke = '#c0a050'; fill = '#1c241c'; }

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x},${node.y})`}
                  opacity={opacity}
                  onMouseDown={e => handleNodeMouseDown(e, node.id)}
                  onMouseUp={e => handleNodeMouseUp(e, node.id)}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={e => { e.stopPropagation(); if (!connecting) setSelectedNode(node.id === selectedNode ? null : node.id); }}
                  style={{ cursor: connecting ? 'crosshair' : onStoryChange ? 'grab' : 'grab' }}
                >
                  <circle
                    r={NODE_RADIUS}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isHovered || isSelected ? 3 : 1.5}
                  />
                  {/* Inner ring — visual hint for connection zone boundary */}
                  {node.choiceCount > 0 && (
                    <circle r={NODE_RADIUS - CONNECTION_ZONE} fill="none" stroke={stroke} strokeWidth={0.5} opacity={0.4} />
                  )}
                  {/* Speaker initial */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={node.isStart ? '#40a060' : node.isEnding ? '#c04040' : '#c0a050'}
                    fontSize={11}
                    fontFamily="'Courier New', monospace"
                    fontWeight="bold"
                  >
                    {node.speaker.charAt(0)}
                  </text>
                  {/* Node ID label */}
                  <text
                    y={LABEL_OFFSET}
                    textAnchor="middle"
                    fill="#d4d4d8"
                    fontSize={9}
                    fontFamily="'Courier New', monospace"
                  >
                    {node.id}
                  </text>
                  {/* Badges */}
                  {node.isStart && (
                    <text y={-LABEL_OFFSET} textAnchor="middle" fill="#40a060" fontSize={8} fontFamily="'Courier New', monospace" letterSpacing="1">
                      START
                    </text>
                  )}
                  {node.isEnding && (
                    <text y={-LABEL_OFFSET} textAnchor="middle" fill="#c04040" fontSize={8} fontFamily="'Courier New', monospace" letterSpacing="1">
                      END
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Connection prompt modal */}
        {connectionPrompt && (
          <div className="modal-overlay" onClick={() => setConnectionPrompt(null)}>
            <div className="modal connection-modal" onClick={e => e.stopPropagation()}>
              <h3>Create Connection</h3>
              <p className="connection-info">
                {connectionPrompt.sourceId} → {connectionPrompt.targetId}
              </p>
              <label>
                Choice Label
                <input
                  type="text"
                  value={connectionLabel}
                  onChange={e => setConnectionLabel(e.target.value)}
                  placeholder="Enter choice text..."
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter' && connectionLabel.trim()) handleCreateConnection(); }}
                />
              </label>
              <div className="connection-actions">
                <button className="btn-secondary" onClick={() => setConnectionPrompt(null)}>Cancel</button>
                <button className="btn-primary" disabled={!connectionLabel.trim()} onClick={handleCreateConnection}>Create</button>
              </div>
            </div>
          </div>
        )}

        {/* Detail panel */}
        {selected && (
          <div className="graph-detail">
            <div className="graph-detail-header">
              <span className="graph-detail-id">{selectedNode}</span>
              <button className="btn-icon" onClick={() => setSelectedNode(null)}>×</button>
            </div>
            <div className="graph-detail-speaker">{selected.speaker}</div>
            <div className="graph-detail-text">{selected.text}</div>
            {selected.choices.length > 0 && (
              <div className="graph-detail-choices">
                <h5>Choices ({selected.choices.length})</h5>
                {selected.choices.map((c, i) => (
                  <div key={i} className="graph-detail-choice">
                    <span className="choice-arrow">→</span>
                    <span>{c.label}</span>
                    <span className="choice-target">{c.targetId}</span>
                    {c.check && <span className="choice-check">{c.check.stat.toUpperCase()} DC {c.check.dc}</span>}
                  </div>
                ))}
              </div>
            )}
            {selected.setFlags && selected.setFlags.length > 0 && (
              <div className="graph-detail-flags">Sets: {selected.setFlags.join(', ')}</div>
            )}
            {selected.grantItems && selected.grantItems.length > 0 && (
              <div className="graph-detail-flags">Grants: {selected.grantItems.join(', ')}</div>
            )}
            {selected.ending && <div className="graph-detail-ending">ENDING NODE</div>}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="graph-legend">
        <span><span className="legend-dot legend-start" /> Start</span>
        <span><span className="legend-dot legend-end" /> Ending</span>
        <span><span className="legend-dot legend-normal" /> Scene</span>
        <span><span className="legend-line legend-solid" /> Choice</span>
        <span><span className="legend-line legend-dashed" /> Fail Path</span>
        {onStoryChange && <span style={{ marginLeft: 'auto', color: '#c0a050' }}>Drag outer ring to connect nodes</span>}
      </div>
    </div>
  );
}
