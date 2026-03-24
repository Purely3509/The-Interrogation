# The Interrogation

## Project Overview
An interactive narrative game (spy interrogation) built with Vite, React 18, and TypeScript. Features a branching story graph with 35 nodes, 2d6-based stat checks, a full in-app editor, and graph-mode editing.

## Tech Stack
- **Framework**: React 18 + TypeScript
- **Build**: Vite 5
- **Testing**: Vitest + jsdom
- **Styling**: Vanilla CSS with custom properties (dark theme, gold accents)
- **Persistence**: localStorage (no backend)

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Type-check + production build
- `npm run test` — Run test suite (Vitest)
- `npm run preview` — Preview production build

## Architecture
- `src/types.ts` — All TypeScript interfaces (StoryNode, Choice, PlayerState, etc.)
- `src/engine.ts` — Core game logic (dice, visibility, transitions, persistence)
- `src/data/defaultStory.ts` — 35-node default story data
- `src/components/Player/` — Game play UI (CharacterCreation, Player, RollModal)
- `src/components/Editor/` — Story editor UI (Editor, StoryMap, NodeEditor)
- `src/components/Graph/` — Knowledge graph visualization (GraphView)

## Game Modes
1. **Play** — Experience the interactive story
2. **Editor** — Create/modify story nodes, choices, flags, items
3. **Graph** — Force-directed knowledge graph visualization of all nodes and connections

## Autosave
- Centralized debounced autosave (1s) in `App.tsx` via `useEffect` on story state
- Visual status indicator in the mode bar: Saved (green) / Saving... (gold) / Unsaved (dim)
- Editor and Graph components no longer call `saveStory()` directly — all persistence flows through App

## Graph View Features
- SVG-based force-directed layout
- Color-coded nodes (green=start, red=ending)
- Directed edges with arrows; dashed red lines for fail paths
- Pan, zoom, drag nodes
- Click node for detail panel (text, choices, flags, items)
- Hover highlighting of connected nodes/edges
- Toggleable edge labels
- **Node creation**: double-click background or "+ New Node" toolbar button; modal for ID, speaker, text, ending flag
- **Node deletion**: delete button in detail panel (except start node)
- **Edge creation**: drag from outer ring of a node to another node; modal for choice label

## Dice / Resolution System (current)
- 2d6 + stat modifier vs DC
- Four data-driven stats (configurable in editor): Resolve, Wit, Composure, Deception
- Double 1s = critical failure (auto-fail), double 6s = critical success (auto-pass)
- Stat bonuses can be granted per-choice

## Testing
- 77 tests covering all engine functions
- Test file: `src/engine.test.ts`
- Covers: roll2d6, attemptCheck, isChoiceVisible, transitionTo, createDefaultPlayer, constants, localStorage persistence, renameNode, integration walkthrough

## Outstanding TODOs
- **Recalibrate dice/resolution system**: move to 2d6 + one of four attributes (Brawn, Will, Wit, Cool) + relevant skills/tags. Full rework of `engine.ts`, `types.ts`, stat config, and character creation. Tackle with fresh context.
- Set up GitHub Pages deployment (discussed but deferred)
- Mobile responsiveness improvements
- Graph view: minimap, search/filter nodes, layout presets
