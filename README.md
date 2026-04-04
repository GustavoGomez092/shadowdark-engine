# ShadowDark Engine

A real-time, web-based game management engine for [ShadowDark RPG](https://www.thearcanelibrary.com/pages/shadowdark). No backend required -- everything runs in the browser using peer-to-peer WebRTC connections.

The GM creates a room, players join with a code, and the entire session state is managed through the GM's browser with real-time sync to all connected players.

## Features

### Core Architecture
- **Zero backend** -- pure client-side SPA built with TanStack Start
- **Peer-to-peer** -- WebRTC connections via PeerJS for real-time multiplayer
- **GM-authoritative** -- GM's browser is the source of truth, persisted to localStorage
- **Session persistence** -- save/resume sessions, survive page refreshes on both sides
- **Auto-reconnection** -- players automatically reconnect with exponential backoff

### Game Master Tools
- **Session management** -- create rooms with optional password protection, shareable room codes
- **Character management** -- create characters with full stat rolling, assign to players
- **Encounter system** -- spawn monsters, manage combat with per-entity HP tracking, active turn management
- **Random encounter generator** -- configurable level range and foe count with preview before spawning
- **Reward distribution** -- post-combat XP, gold, and item awards with level-up detection
- **Store system** -- create shops by type (weapons, armor, magic, general, etc.) with auto-populated catalogs
- **Light tracker** -- real-time countdown timers for torches, lanterns, and campfires with configurable durations
- **Per-player context menu** -- HP, XP, gold, inventory, luck tokens, all from the overview
- **Danger level control** -- unsafe/risky/deadly with automatic encounter check intervals
- **Full reference wiki** -- rules cheat sheet, spells, items, monsters, world lore, generators

### Player Tools
- **Character sheet** -- full interactive sheet with stats, HP, AC (updates with equipped armor), inventory management
- **Inventory system** -- equip/unequip weapons and armor, drop items, gear slot tracking with encumbrance
- **Light management** -- light torches, lanterns, campfires from inventory (consumes items, ride-along timer reset)
- **Shopping** -- buy/sell items at GM-activated stores with affordability checks
- **Rest system** -- 8-hour rest with confirmation dialog showing effects, consumes rations
- **Character creation** -- players can create their own characters (with limited rerolls) if none assigned
- **Dice roller** -- animated roller with geometric die icons, advantage/disadvantage, modifier controls

### Real-Time Features
- **Dice roll broadcasting** -- all rolls shown as toasts to all players + logged to chat
- **Action transparency** -- every GM action (HP, XP, gold, items, luck tokens) logged to shared chat
- **Encounter view** -- players see active threats and party status during combat
- **Active turn indicator** -- GM sets whose turn it is, player sees "It's your turn!" + dice roller appears
- **Darkness system** -- darkness banner for all players when no light source active, hidden when paused

### ShadowDark Rules Implementation
- **244 monsters** with stat blocks, abilities, and attacks
- **143 spells** (tiers 1-5, wizard and priest)
- **60 backgrounds**
- **45+ gear items** including potions, scrolls, wands, magic items, gems
- **6 ancestries** with full mechanical traits
- **4 classes** with talent tables, features, spell progression
- **7 deities** with alignment and domain
- **AC calculation** from equipped armor (leather/chainmail/plate/shield/mithral)
- **XP system** -- treasure quality based (Poor/Normal/Fabulous/Legendary), level-up at level x 10
- **Light rules** -- torches (1hr), lanterns (1hr + oil), campfires (8hr), ride-along timer reset
- **Death system** -- 0 HP = dying, death timer, stabilize checks, nat 20 revival

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [TanStack Start](https://tanstack.com/start) (Vite + React 19) |
| Language | TypeScript (strict mode) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| State | [Zustand](https://zustand-demo.pmnd.rs/) + [Immer](https://immerjs.github.io/) |
| P2P | [PeerJS](https://peerjs.com/) (WebRTC) |
| Validation | [Zod](https://zod.dev/) |
| IDs | [nanoid](https://github.com/ai/nanoid) |

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
git clone git@github.com:GustavoGomez092/shadowdark-engine.git
cd shadowdark-engine
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build

```bash
npm run build
```

## How to Play

### As Game Master

1. Go to **Create Game** and name your session
2. Share the **room code** with your players
3. Create characters in the **Characters** tab or let players create their own
4. Assign characters to players from the **Overview**
5. Use the **Monsters** tab to spawn encounters
6. Manage combat with the **Encounter Panel** (set active turns, track HP)
7. **Resolve encounters** with treasure quality, gold, XP, and item awards
8. Open **Stores** for players to buy/sell equipment
9. Monitor light sources and danger levels from the **Overview**

### As Player

1. Go to **Join Game** and enter the room code
2. Create a character or wait for GM assignment
3. Manage your inventory -- equip weapons, armor, light torches
4. Roll dice when it's your turn (dice roller appears automatically)
5. Shop at GM-activated stores
6. Take rests to heal and restore spells (consumes rations)

## Project Structure

```
src/
  routes/           # TanStack file-based routes (15 pages)
  schemas/          # TypeScript types + Zod schemas (13 files)
  data/             # Static game data (244 monsters, 143 spells, etc.)
  stores/           # Zustand state stores (session, player)
  lib/
    peer/           # PeerJS host/client + singletons
    dice/           # Dice rolling engine with parser
    rules/          # Game rules engines (character, combat, spells, inventory, light, XP, encounters)
    utils/          # ID generation, modifiers, time formatting, action logging
    ai/             # AI integration (placeholder for Phase 9)
  components/
    character/      # Character sheet, creation wizard
    combat/         # Initiative tracker, encounter views
    dice/           # Animated dice roller with SVG die icons
    light/          # Light source tracker
    gm/             # GM tools (encounter panel, player menu, store editor, rewards, header)
    player/         # Player tools (light controls, shop widget)
    shared/         # Toast notifications, chat messages, auto-scroll, spinners
  hooks/            # Custom React hooks (peer connections, dice, timers)
```

## Data Sources

Monster, spell, and background data extracted and adapted from [foundryvtt-shadowdark](https://github.com/Muttley/foundryvtt-shadowdark) (MIT License) with additional manual entries from the ShadowDark RPG Quickstart Guides.

## Configuration

### Light Source Durations
In **Settings**, customize torch, lantern, and campfire durations for faster-paced games. Defaults match official ShadowDark rules (1 hour real time for torches/lanterns, 8 hours for campfires).

## Roadmap

- [x] **JSON-based extensible data** -- drop-in content packs for homebrew monsters, spells, items, with pack color tagging, source filters, and content preview
- [x] **AI Integration** -- LLM-powered GM assistant (Ollama + OpenAI-compatible) with encounter narration, NPC generation, room descriptions, store creation, ruling help, and contextual scene awareness
- [x] **Session export/import** -- save full sessions as JSON files for backup and sharing, with drag-and-drop import
- [x] **Level-up wizard** -- guided level-up flow with HP rolling, talent selection, new spells
- [x] **Multi-language support** -- full i18n with 560+ UI strings, 811 game data entries, and AI context translation. English + Spanish with data overlay system for community-contributed languages

## License

MIT

## Acknowledgments

- [ShadowDark RPG](https://www.thearcanelibrary.com/pages/shadowdark) by The Arcane Library
- [foundryvtt-shadowdark](https://github.com/Muttley/foundryvtt-shadowdark) for comprehensive game data
- [PeerJS](https://peerjs.com/) for WebRTC abstraction
- [TanStack](https://tanstack.com/) for the React framework
