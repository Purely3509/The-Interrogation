# The Interrogation

## Project Overview
An interactive narrative game (spy interrogation) built with Vite, React 18, and TypeScript. Features a branching story graph with 35 nodes, d20-based stat checks, and a full in-app editor.

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

## Graph View Features
- SVG-based force-directed layout
- Color-coded nodes (green=start, red=ending)
- Directed edges with arrows; dashed red lines for fail paths
- Pan, zoom, drag nodes
- Click node for detail panel (text, choices, flags, items)
- Hover highlighting of connected nodes/edges
- Toggleable edge labels

## Testing
- 52 tests covering all engine functions
- Test file: `src/engine.test.ts`
- Covers: rollD20, attemptCheck, isChoiceVisible, transitionTo, createDefaultPlayer, constants, localStorage persistence, integration walkthrough

## Outstanding TODOs
- Set up GitHub Pages deployment (discussed but deferred)
- Mobile responsiveness improvements
- Graph view: minimap, search/filter nodes, layout presets
