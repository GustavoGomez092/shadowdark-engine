# ShadowDark Engine

A real-time, web-based game management engine for [ShadowDark RPG](https://www.thearcanelibrary.com/pages/shadowdark). No backend required -- everything runs in the browser using peer-to-peer WebRTC connections.

The GM creates a room, players join with a code, and the entire session state is managed through the GM's browser with real-time sync to all connected players.

![Feature Tour](docs/feature-tour.gif)

## Features

### Core Architecture
- **Zero backend** -- pure client-side SPA built with TanStack Start
- **Peer-to-peer** -- WebRTC connections via PeerJS for real-time multiplayer
- **GM-authoritative** -- GM's browser is the source of truth, persisted to localStorage
- **Session persistence** -- save/resume sessions, survive page refreshes on both sides
- **Auto-reconnection** -- players automatically reconnect with exponential backoff
- **Room code rotation** -- proactive 25-minute room code refresh prevents PeerJS timeout disconnections

### Game Master Tools
- **Session management** -- create rooms with optional password protection, shareable room codes
- **Character management** -- create characters with full stat rolling, assign to players
- **Encounter system** -- spawn monsters, manage combat with per-entity HP tracking, active turn management
- **Random encounter generator** -- configurable level range, foe count, multi-source pack filter with preview before spawning
- **Reward distribution** -- post-combat XP, gold, and item awards with level-up detection
- **Store system** -- create shops by type (weapons, armor, magic, general, etc.) with full item catalog, source filters, and pack color borders
- **Light tracker** -- real-time countdown timers for torches, lanterns, and campfires with configurable durations
- **Per-player context menu** -- HP, XP, gold, inventory, luck tokens, all from the overview
- **Danger level control** -- unsafe/risky/deadly with automatic encounter check intervals
- **Full reference wiki** -- rules cheat sheet, spells, items, monsters, world lore, generators (fully translated)
- **AI GM assistant** -- LLM-powered encounter narration, NPC generation, room descriptions, store creation, ruling help, and more
- **Session export/import** -- backup full sessions as JSON files with bundled data packs for sharing across devices

### Player Tools
- **Character sheet** -- full interactive sheet with stats, HP, AC (updates with equipped armor), inventory management
- **Inventory system** -- equip/unequip weapons and armor, drop items, gear slot tracking with encumbrance
- **Light management** -- light torches, lanterns, campfires from inventory (consumes items, ride-along timer reset)
- **Shopping** -- buy/sell items at GM-activated stores with affordability checks
- **Rest system** -- 8-hour rest with confirmation dialog showing effects, consumes rations
- **Character creation** -- players can create their own characters (with limited rerolls) if none assigned
- **Level-up wizard** -- guided multi-step flow with animated dice rolling, talent selection, and spell learning
- **Dice roller** -- animated multi-dice roller with geometric die icons, advantage/disadvantage, modifier controls

### Data Pack System
- **JSON-based content packs** -- drop-in homebrew monsters, spells, items, classes, ancestries, and more
- **Pack color tagging** -- assign a color to any pack for visual identification across all lists
- **Source filters** -- filter monsters and items by pack in encounter generator, store editor, rewards, and player menu
- **Multi-select encounter generator** -- pick and choose from multiple packs for random encounters
- **Content preview** -- browse pack contents before importing
- **Drag-and-drop upload** -- import packs by dragging JSON files onto the upload area
- **Enable/disable toggle** -- temporarily disable packs without removing them
- **ID conflict detection** -- warnings when pack items override core data or other packs
- **3 sample packs included** -- Crimson Vale, Frozen Depths, and Thieves' Guild
- **Pack creation guide** -- comprehensive documentation at `docs/data-pack-guide.md`

### AI Integration
- **Provider-agnostic** -- supports Ollama (free, local) and any OpenAI-compatible endpoint (OpenAI, Groq, Together, LM Studio, etc.)
- **Ollama-first** -- auto-detects local Ollama instance, discovers available models
- **7 quick actions** -- Describe Encounter, NPC Dialogue, Adventure Hook, Ruling Help, Generate Store, Describe Room, Design Trap
- **Context-aware prompts** -- automatically includes party composition, active monsters (with stats/abilities/descriptions), light/darkness state, and danger level
- **Scene context** -- text area to set the stage before any quick action
- **Streaming responses** -- real-time streaming with stop button
- **Locale-aware** -- AI responds in the user's language, game data sent to LLM is translated
- **Post to chat** -- share AI-generated content with all players via the game chat
- **Cost transparency** -- free providers skip all warnings; paid providers show token estimates and usage tracking
- **Markdown rendering** -- bold and italic formatting in AI responses
- **Floating sidebar** -- accessible from every GM page, persists across navigation

### Multi-Language Support
- **Full i18n** -- 560+ UI strings and 811 game data entries translated
- **English + Spanish** -- complete Latin American neutral Spanish translation
- **Data overlay system** -- lightweight JSON files translate only names/descriptions; game mechanics stay in one place
- **Language picker everywhere** -- landing page, GM header, player session, join page, and settings
- **Per-user preference** -- each player picks their own language, stored in localStorage
- **Translated game data** -- 244 monster names/descriptions, 143 spells, 15 classes with features/talents, 7 ancestries, 28 weapons, 6 armor types, 68 gear items, 60 backgrounds, 16 deities, 225 titles
- **AI context translation** -- LLM receives game data in the user's language for consistent narration
- **Fallback chain** -- missing translations gracefully show English

### Real-Time Features
- **Dice roll broadcasting** -- all rolls shown as toasts to all players + logged to chat
- **Action transparency** -- every GM action (HP, XP, gold, items, luck tokens) logged to shared chat
- **Encounter view** -- players see active threats and party status during combat
- **Active turn indicator** -- GM sets whose turn it is, player sees "It's your turn!" + dice roller appears
- **Darkness system** -- darkness banner for all players when no light source active, hidden when paused
- **Level-up badge** -- pulsing badge in Connected Players when a character has enough XP to level up

### ShadowDark Rules Implementation
- **244 monsters** with stat blocks, abilities, attacks, and descriptions
- **143 spells** (tiers 1-5, wizard and priest)
- **60 backgrounds**
- **45+ gear items** including potions, scrolls, wands, magic items, gems
- **7 ancestries** with full mechanical traits (dwarf, elf, goblin, halfling, half-orc, human, kobold)
- **15 classes** with talent tables, features, spell progression (4 core + 11 expansion)
- **16 deities** with alignment and domain
- **AC calculation** from equipped armor (leather/chainmail/plate/shield/mithral)
- **XP system** -- treasure quality based (Poor/Normal/Fabulous/Legendary), level-up at level x 10
- **Light rules** -- torches (1hr), lanterns (1hr + oil), campfires (8hr), ride-along timer reset
- **Death system** -- 0 HP = dying, death timer, stabilize checks, nat 20 revival
- **Level-up system** -- HP rolling with class hit die + CON, talent selection via 2d6, spell learning for casters

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
| Testing | [Vitest](https://vitest.dev/) (86 tests) |

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

### Test

```bash
npm run test
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
10. Use the **AI Assistant** (floating button) for encounter narration, NPC dialogue, and more

### As Player

1. Go to **Join Game** and enter the room code
2. Create a character or wait for GM assignment
3. Manage your inventory -- equip weapons, armor, light torches
4. Roll dice when it's your turn (dice roller appears automatically)
5. Shop at GM-activated stores
6. Take rests to heal and restore spells (consumes rations)
7. Level up when you earn enough XP (wizard guides you through HP, talents, and spells)

## Project Structure

```
src/
  routes/              # TanStack file-based routes
  schemas/             # TypeScript types + Zod schemas
  data/                # Static game data (244 monsters, 143 spells, etc.)
  stores/              # Zustand state stores (session, player)
  i18n/                # Internationalization system
    index.ts           # t(), ti(), tData(), tDataNested() functions
    locales/
      en/ui.json       # English UI strings (560+ keys)
      es/ui.json       # Spanish UI strings
      es/monsters.json # Spanish monster overlay (244 entries)
      es/spells.json   # Spanish spell overlay (143 entries)
      es/classes.json  # Spanish class overlay with features/talents
      es/*.json        # Weapons, armor, gear, ancestries, backgrounds, deities, titles
  lib/
    peer/              # PeerJS host/client + room rotation
    dice/              # Dice rolling engine with parser
    rules/             # Game rules engines (character, combat, spells, inventory, light, XP, encounters)
    utils/             # ID generation, modifiers, time formatting, action logging
    ai/                # AI client, prompt builder, settings persistence
    data/              # Data registry, pack validation, sort helpers
    storage/           # Session export/import utilities
  components/
    character/         # Character sheet, creation wizard, level-up wizard
    combat/            # Initiative tracker, encounter views
    dice/              # Animated multi-dice roller with SVG die icons
    light/             # Light source tracker
    gm/                # GM tools (encounter panel, player menu, store editor, rewards, header, data packs)
    player/            # Player tools (light controls, shop widget, inventory)
    ai/                # AI panel sidebar, AI settings
    shared/            # Toast notifications, chat messages, auto-scroll, spinners
  hooks/               # Custom React hooks (peer connections, dice, timers, locale, AI, data registry)
  docs/                # Data pack creation guide
  sample-packs/        # 3 sample data packs (Crimson Vale, Frozen Depths, Thieves' Guild)
```

## Data Packs

![Data Pack Upload Demo](docs/data-pack-demo.gif)

### Creating a Data Pack

See the comprehensive guide at [`docs/data-pack-guide.md`](docs/data-pack-guide.md) for full field reference, examples, and validation rules.

A data pack is a JSON file with this structure:

```json
{
  "id": "my-homebrew",
  "name": "My Homebrew Pack",
  "author": "Your Name",
  "version": "1.0",
  "description": "Custom monsters and spells",
  "color": "#ff6b35",
  "data": {
    "monsters": [...],
    "spells": [...],
    "weapons": [...],
    "armor": [...],
    "gear": [...],
    "backgrounds": [...],
    "deities": [...],
    "languages": [...],
    "ancestries": [...],
    "classes": [...]
  }
}
```

Upload packs via **Settings > Data Packs** or drag-and-drop onto the upload area. All 10 data categories are supported. The optional `color` field adds a colored left border to all items from that pack across the entire UI.

### Sample Packs

Three sample packs are included in the `sample-packs/` directory:

| Pack | Color | Content |
|------|-------|---------|
| **Crimson Vale** | Red `#dc2626` | 3 monsters, 2 spells, 1 weapon, 2 gear, 1 background |
| **Frozen Depths** | Blue `#38bdf8` | 3 monsters, 2 spells, 2 weapons, 1 armor, 3 gear, 2 backgrounds, 1 language |
| **Thieves' Guild** | Purple `#a855f7` | 4 monsters, 2 spells, 2 weapons, 5 gear, 3 backgrounds |

## AI Integration

### Setup

1. Install [Ollama](https://ollama.com/) for free local AI (recommended)
2. Pull a model: `ollama pull llama3.2` or `ollama pull mistral`
3. Go to **Settings > AI Provider Setup** -- Ollama is auto-detected
4. Click **Use Ollama** to activate

For OpenAI-compatible providers (OpenAI, Groq, Together, LM Studio), click **Add Provider** and enter the endpoint URL, API key, and model name.

### Quick Actions

The AI assistant is accessible from the floating **AI** button on every GM page:

| Action | What it does |
|--------|-------------|
| **Describe Encounter** | Narrates the current combat scene using active monster data, lighting, and danger level |
| **NPC Dialogue** | Creates an NPC with personality, voice, and sample dialogue |
| **Adventure Hook** | Generates a compelling adventure hook with goal, complication, and reward |
| **Ruling Help** | Asks clarifying questions to help the GM make fair ShadowDark rulings |
| **Generate Store** | Creates a shop name, shopkeeper personality, and atmosphere |
| **Describe Room** | Narrates room ambiance (sights, sounds, smells) without inventing exits or traps |
| **Design Trap** | Designs a trap with trigger, effect, DC, and clues |

Use the **Scene Context** text area to set the stage before clicking any quick action.

### Cost Awareness

- **Free providers** (Ollama, LM Studio): no warnings, no cost
- **Paid providers**: labeled with a paid badge, token usage tracked per session and lifetime
- API keys are stored in a separate localStorage key (`shadowdark:ai-settings`), never in session data, never synced to players

## Session Export/Import

### Exporting

- **From Settings**: click **Export Current Session** to download the active session
- **From Sessions page**: click **Export** on any saved session

Exports include:
- Full session state (characters, monsters, combat, stores, chat, settings)
- All installed data packs (so the import is fully self-contained)
- Connection-specific data is stripped (peer IDs, connected players)

### Importing

- **From Settings**: drag-and-drop or click the import area
- **From Sessions page**: drag-and-drop or click **Import Session File**

On import:
- A new room code is automatically generated
- Any bundled data packs not already installed are auto-installed
- The session appears in the saved sessions list, ready to resume

## Multi-Language Support

### For Users

Select your language from the dropdown available on:
- Landing page (top-right)
- GM header (next to player count)
- Player session header (next to Leave button)
- Player join page (top-right)
- GM Settings (Language section)

Language is per-user -- each player can use their own language independently.

### Adding a New Language

The i18n system uses a data overlay approach -- no code changes needed to add a language.

**Step 1: Translate UI strings**

Copy `src/i18n/locales/en/ui.json` to `src/i18n/locales/{code}/ui.json` and translate all 560+ keys.

**Step 2: Translate game data**

Create overlay files in `src/i18n/locales/{code}/`:

| File | Content | Entries |
|------|---------|---------|
| `monsters.json` | Monster names, descriptions, attacks, abilities, tags | 244 |
| `spells.json` | Spell names and descriptions | 143 |
| `classes.json` | Class names, descriptions, feature names/descriptions, talent descriptions | 15 |
| `ancestries.json` | Ancestry names, trait names, trait descriptions | 7 |
| `weapons.json` | Weapon names | 28 |
| `armor.json` | Armor names | 6 |
| `gear.json` | Gear names and descriptions | 68 |
| `backgrounds.json` | Background names and descriptions | 60 |
| `deities.json` | Deity descriptions (names are proper nouns) | 16 |
| `titles.json` | Character title translations | 225 |

Each overlay file only contains translatable text (names, descriptions). Game mechanics (stats, costs, HP, dice) stay in the TypeScript data files.

**Step 3: Register the locale**

In `src/i18n/index.ts`:
1. Import the new UI and data JSON files
2. Add the locale code to `SUPPORTED_LOCALES`
3. Add a label to `LOCALE_LABELS`
4. Add entries to `UI_TRANSLATIONS` and `DATA_OVERLAYS`

**Translation guidelines:**
- Keep game mechanics abbreviations in English: STR, DEX, CON, INT, WIS, CHA, AC, HP, XP, DC
- Keep dice expressions in English: d4, d6, d8, d10, d12, d20, 2d6
- Use `{{variable}}` for interpolation placeholders (don't translate variable names)
- Fallback chain: your locale → English → raw key

## Room Code Rotation

The engine proactively rotates room codes every 25 minutes to prevent PeerJS signaling server timeout disconnections during long sessions.

### How It Works

1. **Timer fires** every 25 minutes on the GM's browser
2. **GM broadcasts** `room_code_changed` message with the new code to all connected players
3. **Brief pause** (500ms) ensures message delivery
4. **GM destroys** old peer and creates a new one with the new room code
5. **Players receive** the message, store the new code, and auto-reconnect after 1 second
6. **Session state** updates with the new `gmPeerId`

### Why 25 Minutes?

PeerJS cloud signaling servers typically expire inactive peer IDs after ~60 minutes. The 25-minute rotation interval provides a comfortable safety margin, ensuring the room code is always fresh.

### For Players

Room rotation is completely seamless. Players may see a brief "Reconnecting..." flash during rotation, then they're back. No action needed -- the client automatically reconnects to the new room code.

## Configuration

### Light Source Durations
In **Settings**, customize torch, lantern, and campfire durations for faster-paced games. Defaults match official ShadowDark rules (1 hour real time for torches/lanterns, 8 hours for campfires).

### Data Pack Display
In **Settings > Data Pack Display**, toggle "Show pack monsters first" and "Show pack items first" to sort custom pack content to the top of all lists.

### AI Settings
In **Settings > AI Provider Setup**, configure your AI provider, temperature, max tokens, streaming, and custom system prompt.

## Data Sources

Monster, spell, and background data extracted and adapted from [foundryvtt-shadowdark](https://github.com/Muttley/foundryvtt-shadowdark) (MIT License) with additional manual entries from the ShadowDark RPG Quickstart Guides. All 244 monsters include evocative dark fantasy descriptions.

## Testing

86 automated tests across 3 test suites:

| Suite | Tests | Coverage |
|-------|-------|----------|
| Data Packs | 55 | Validator, registry, merge logic, conflict detection, enable/disable, pack color, sort helper, array stability, localStorage persistence |
| AI Prompts | 15 | System prompt builder, game context extraction, purpose labels, darkness/combat/party context |
| Room Rotation | 16 | Code generation, message protocol, player handling, timing, flow simulation, edge cases, state persistence |

Run tests:

```bash
npm run test
```

## Roadmap

All v1 features have been shipped:

- [x] **JSON-based extensible data** -- drop-in content packs for homebrew monsters, spells, items, with pack color tagging, source filters, and content preview
- [x] **AI Integration** -- LLM-powered GM assistant (Ollama + OpenAI-compatible) with encounter narration, NPC generation, room descriptions, store creation, ruling help, and contextual scene awareness
- [x] **Session export/import** -- save full sessions as JSON files for backup and sharing, with drag-and-drop import and bundled data packs
- [x] **Level-up wizard** -- guided level-up flow with animated multi-dice rolling, talent selection, and new spell learning
- [x] **Multi-language support** -- full i18n with 560+ UI strings, 811 game data entries, and AI context translation. English + Spanish with data overlay system for community-contributed languages

## License

MIT

## Acknowledgments

- [ShadowDark RPG](https://www.thearcanelibrary.com/pages/shadowdark) by The Arcane Library
- [foundryvtt-shadowdark](https://github.com/Muttley/foundryvtt-shadowdark) for comprehensive game data
- [PeerJS](https://peerjs.com/) for WebRTC abstraction
- [TanStack](https://tanstack.com/) for the React framework
