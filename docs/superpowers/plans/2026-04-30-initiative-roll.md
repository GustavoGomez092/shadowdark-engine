# Initiative Roll Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a GM-triggered "Roll Initiative" button that prompts each player to roll their own 1d20+DEX initiative on their screen within 30 seconds, auto-rolls for stragglers, and shows a synced turn-order tracker on both sides for the rest of combat.

**Architecture:** Extend the existing `CombatState` with a deadline + per-row "auto" flag. Rebuild `rollInitiative()` to produce an `'initiative'`-phase state with unrolled PC rows and one shared monster row. Players see a new `InitiativePrompt` that wraps the existing `DiceRoller`; their roll arrives at the GM via the existing `player_roll` message with `purpose: 'initiative'`. When all rolls are in (or 30 s elapses), the GM client locks the order and combat enters `'active'` phase, where the existing `InitiativeTracker` is rendered on both sides and `advanceTurn()` drives `session.activeTurnId`.

**Tech Stack:** TypeScript (strict), React 19, TanStack Start, Zustand+Immer, Vitest, PeerJS.

---

## File Structure

| File | Purpose | Action |
|---|---|---|
| `src/schemas/combat.ts` | `CombatState`, `Combatant` types | Modify: add `initiativeDeadline?`, `initiativeRolledByAuto?` |
| `src/schemas/messages.ts` | P2P message envelopes | Modify: add `InitiativeRequestMessage` (GM→player) |
| `src/lib/rules/combat.ts` | Rules engine | Modify: rewrite `rollInitiative`, add `applyInitiativeRoll`, `autoRollMissing`, `lockInitiativeOrder`, `hasInitiativeAdvantage` |
| `src/lib/rules/__tests__/combat.test.ts` | Rules engine tests | Create (new test dir) |
| `src/stores/session-store.ts` | Zustand session store | Modify: add `applyInitiativeRoll`, `lockInitiativeOrder`, `advanceCombatTurn`, `endCombat` actions |
| `src/components/combat/initiative-tracker.tsx` | Shared tracker | Modify: support `'initiative'` phase (rolling… rows, countdown header, "(auto)" tag) |
| `src/components/combat/initiative-prompt.tsx` | Player prompt | Create |
| `src/components/gm/encounter-panel.tsx` | GM encounter panel | Modify: add toggle button, render tracker during combat |
| `src/routes/gm/session.$sessionId.tsx` | GM session route | Modify: button handler, 30 s deadline timer, peer handler for `player_roll{purpose:'initiative'}` |
| `src/routes/player/session.tsx` | Player session route | Modify: render `InitiativePrompt` |
| `src/i18n/locales/en/ui.json` | EN UI strings | Modify: add 6 keys |
| `src/i18n/locales/es/ui.json` | ES UI strings | Modify: add 6 keys |

All work happens in the `shadowdark-engine/` subdirectory (the git repo). Run all commands from there.

---

## Task 1: Schema additions

**Files:**
- Modify: `src/schemas/combat.ts`
- Modify: `src/schemas/messages.ts`

- [ ] **Step 1.1: Extend `CombatState` and `Combatant`**

Edit `src/schemas/combat.ts`. Replace the `CombatState` and `Combatant` interfaces with:

```ts
export interface CombatState {
  id: string;
  phase: CombatPhase;
  combatants: Combatant[];
  initiativeOrder: string[]; // combatant IDs in turn order
  currentTurnIndex: number;
  roundNumber: number;
  surpriseActors?: string[];
  log: CombatLogEntry[];
  initiativeDeadline?: number; // epoch ms; only set during 'initiative' phase
}

export interface Combatant {
  id: string;
  type: 'pc' | 'monster' | 'npc';
  referenceId: string;
  name: string;
  initiativeRoll?: number;
  initiativeBonus: number;
  hasActed: boolean;
  isDefeated: boolean;
  hasUsedAction: boolean;
  hasUsedMove: boolean;
  isDoubleMoveActive: boolean;
  initiativeRolledByAuto?: boolean; // true when GM client auto-rolled on timeout
}
```

- [ ] **Step 1.2: Add `InitiativeRequestMessage`**

Edit `src/schemas/messages.ts`. Just before the `// ── Map Viewer Messages ──` comment block (around line 286), add:

```ts
export interface InitiativeRequestMessage {
  type: 'initiative_request';
  combat: CombatState;
}
```

Then update the `GMToPlayerMessage` union (around line 176) to include it:

```ts
export type GMToPlayerMessage =
  | JoinRoomResponse
  | StateSyncMessage
  | StatePatchMessage
  | GMChatMessage
  | RollResultBroadcast
  | CombatUpdateMessage
  | LightUpdateMessage
  | EncounterRevealMessage
  | StoreOpenMessage
  | StoreCloseMessage
  | ForceDisconnectMessage
  | RoomCodeChangedMessage
  | PongMessage
  | ErrorMessage
  | MapSyncMessage
  | TokenMoveMessage
  | InitiativeRequestMessage;
```

- [ ] **Step 1.3: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors. (Schema additions are purely additive.)

- [ ] **Step 1.4: Commit**

```bash
git add src/schemas/combat.ts src/schemas/messages.ts
git commit -m "feat(combat): add initiative deadline and request message schema"
```

---

## Task 2: Test setup — combat rules test file

**Files:**
- Create: `src/lib/rules/__tests__/combat.test.ts`

- [ ] **Step 2.1: Create the test file with fixtures**

Create `src/lib/rules/__tests__/combat.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Character } from '@/schemas/character.ts'
import type { MonsterInstance, MonsterDefinition } from '@/schemas/monsters.ts'

function makeCharacter(overrides: Partial<Character> = {}): Character {
  const baseStats = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }
  return {
    id: overrides.id ?? 'pc-1',
    playerId: 'player-1',
    name: overrides.name ?? 'Ralina',
    ancestry: 'human',
    class: 'thief',
    level: 1,
    xp: 0,
    alignment: 'neutral',
    background: 'urchin',
    title: 'Rogue',
    languages: ['Common'],
    baseStats,
    statModifications: [],
    maxHp: 6,
    currentHp: 6,
    isDying: false,
    inventory: { items: [], coins: { gp: 0, sp: 0, cp: 0 } },
    spells: { knownSpells: [], penances: [] },
    conditions: [],
    talents: [],
    ancestryTraitUsed: false,
    hasLuckToken: false,
    weaponMasteries: [],
    notes: '',
    computed: {
      effectiveStats: baseStats,
      modifiers: { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 },
      ac: 10, gearSlots: 10, usedGearSlots: 0,
      meleeAttackBonus: 0, rangedAttackBonus: 0,
    },
    ...overrides,
  } as Character
}

function makeMonsterPair(id: string, name: string, dex = 10): { instance: MonsterInstance; definition: MonsterDefinition } {
  const definition: MonsterDefinition = {
    id, name, level: 1, ac: 12, hp: 5,
    attacks: [{ name: 'Bite', bonus: 0, damage: '1d4', range: 'close' }],
    movement: { normal: 'near' },
    stats: { STR: 10, DEX: dex, CON: 10, INT: 10, WIS: 10, CHA: 10 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: [],
  }
  const instance: MonsterInstance = {
    id: `${id}-instance`, definitionId: id, name,
    currentHp: 5, maxHp: 5, conditions: [],
    rangeBand: 'near', isDefeated: false,
  }
  return { instance, definition }
}

// Stub Math.random so dice are deterministic. Each call returns next array element.
let randomQueue: number[] = []
beforeEach(() => {
  randomQueue = []
  vi.spyOn(Math, 'random').mockImplementation(() => {
    if (randomQueue.length === 0) return 0.5
    return randomQueue.shift()!
  })
})
afterEach(() => {
  vi.restoreAllMocks()
})

// Helper: queue a d20 result. value 1-20 -> Math.random returning (value-1)/20.
function queueD20(...values: number[]) {
  for (const v of values) randomQueue.push((v - 1) / 20 + 0.0001)
}
// Helper: queue a d4 result.
function queueD4(...values: number[]) {
  for (const v of values) randomQueue.push((v - 1) / 4 + 0.0001)
}

describe('combat rules', () => {
  it('test scaffolding works', () => {
    queueD20(15)
    expect(Math.floor(Math.random() * 20) + 1).toBe(15)
  })
})

export { makeCharacter, makeMonsterPair, queueD20, queueD4 }
```

- [ ] **Step 2.2: Run scaffolding test**

Run: `npx vitest run src/lib/rules/__tests__/combat.test.ts`
Expected: 1 test passes.

- [ ] **Step 2.3: Commit**

```bash
git add src/lib/rules/__tests__/combat.test.ts
git commit -m "test(combat): add test fixtures and Math.random stub"
```

---

## Task 3: Rewrite `rollInitiative` (TDD)

**Files:**
- Modify: `src/lib/rules/combat.ts:12-74`
- Modify: `src/lib/rules/__tests__/combat.test.ts`

- [ ] **Step 3.1: Write failing test for the new `rollInitiative` shape**

Append to `src/lib/rules/__tests__/combat.test.ts` inside the `describe('combat rules', ...)` block:

```ts
  describe('rollInitiative', () => {
    it('builds a state in initiative phase with unrolled PC rows and one rolled monster row', () => {
      const { rollInitiative } = require('../combat.ts')
      const pcs = [
        makeCharacter({ id: 'pc-1', name: 'Ralina', baseStats: { STR: 10, DEX: 14, CON: 10, INT: 10, WIS: 10, CHA: 10 } as any }),
        makeCharacter({ id: 'pc-2', name: 'Jorbin' }),
      ]
      const monsters = [
        makeMonsterPair('goblin', 'Goblin', 13),
        makeMonsterPair('rat', 'Rat', 11),
      ]
      queueD20(15) // monster group roll uses highest DEX (13 -> +1)
      const before = Date.now()
      const state = rollInitiative(pcs, monsters)
      const after = Date.now()

      expect(state.phase).toBe('initiative')
      expect(state.combatants).toHaveLength(3) // 2 PCs + 1 monster group
      expect(state.initiativeOrder).toEqual([])
      expect(state.roundNumber).toBe(1)

      const pcRows = state.combatants.filter((c: any) => c.type === 'pc')
      expect(pcRows).toHaveLength(2)
      for (const r of pcRows) {
        expect(r.initiativeRoll).toBeUndefined()
      }

      const groupRow = state.combatants.find((c: any) => c.type === 'monster')!
      expect(groupRow.name).toBe('Monsters')
      expect(groupRow.initiativeRoll).toBe(15 + 1) // d20=15, +DEX mod 1
      expect(groupRow.initiativeBonus).toBe(1)

      expect(state.initiativeDeadline).toBeGreaterThanOrEqual(before + 29_000)
      expect(state.initiativeDeadline).toBeLessThanOrEqual(after + 31_000)
    })

    it('refuses to build state when there are no monsters', () => {
      const { rollInitiative } = require('../combat.ts')
      expect(() => rollInitiative([makeCharacter()], [])).toThrow(/no monsters/i)
    })

    it('refuses to build state when there are no characters', () => {
      const { rollInitiative } = require('../combat.ts')
      expect(() => rollInitiative([], [makeMonsterPair('rat', 'Rat')])).toThrow(/no characters/i)
    })
  })
```

- [ ] **Step 3.2: Run the test — expect failure**

Run: `npx vitest run src/lib/rules/__tests__/combat.test.ts`
Expected: 3 new tests fail (current `rollInitiative` produces per‑monster rows, no deadline, no group row).

- [ ] **Step 3.3: Rewrite `rollInitiative`**

In `src/lib/rules/combat.ts`, replace the existing `rollInitiative` function (currently lines 12–74) with:

```ts
const INITIATIVE_DEADLINE_MS = 30_000

export function rollInitiative(
  characters: Character[],
  monsters: { instance: MonsterInstance; definition: MonsterDefinition }[]
): CombatState {
  if (characters.length === 0) throw new Error('Cannot roll initiative: no characters')
  if (monsters.length === 0) throw new Error('Cannot roll initiative: no monsters')

  const combatants: Combatant[] = []

  for (const char of characters) {
    const stats = computeEffectiveStats(char)
    const dexMod = getAbilityModifier(stats.DEX)
    combatants.push({
      id: generateId(),
      type: 'pc',
      referenceId: char.id,
      name: char.name,
      initiativeRoll: undefined,
      initiativeBonus: dexMod,
      hasActed: false,
      isDefeated: false,
      hasUsedAction: false,
      hasUsedMove: false,
      isDoubleMoveActive: false,
    })
  }

  // ONE shared monster row using the highest DEX mod across the group.
  const groupDexMod = monsters
    .map(m => getAbilityModifier(m.definition.stats.DEX))
    .reduce((a, b) => Math.max(a, b), -Infinity)
  const groupRoll = rollDice('1d20', { purpose: 'initiative' })
  combatants.push({
    id: generateId(),
    type: 'monster',
    referenceId: monsters[0].instance.id,
    name: 'Monsters',
    initiativeRoll: groupRoll.total + groupDexMod,
    initiativeBonus: groupDexMod,
    hasActed: false,
    isDefeated: false,
    hasUsedAction: false,
    hasUsedMove: false,
    isDoubleMoveActive: false,
  })

  return {
    id: generateId(),
    phase: 'initiative',
    combatants,
    initiativeOrder: [],
    currentTurnIndex: 0,
    roundNumber: 1,
    initiativeDeadline: Date.now() + INITIATIVE_DEADLINE_MS,
    log: [{
      id: generateId(),
      timestamp: Date.now(),
      round: 1,
      actorId: 'system',
      type: 'round_start',
      message: 'Roll for initiative!',
    }],
  }
}
```

- [ ] **Step 3.4: Run tests — expect pass**

Run: `npx vitest run src/lib/rules/__tests__/combat.test.ts`
Expected: all tests pass.

- [ ] **Step 3.5: Commit**

```bash
git add src/lib/rules/combat.ts src/lib/rules/__tests__/combat.test.ts
git commit -m "feat(combat): rewrite rollInitiative for player-rolled flow"
```

---

## Task 4: `applyInitiativeRoll` helper (TDD)

**Files:**
- Modify: `src/lib/rules/combat.ts`
- Modify: `src/lib/rules/__tests__/combat.test.ts`

- [ ] **Step 4.1: Write failing test**

Append inside the `describe('combat rules', ...)` block:

```ts
  describe('applyInitiativeRoll', () => {
    it('sets the roll on the targeted combatant only', () => {
      const { rollInitiative, applyInitiativeRoll } = require('../combat.ts')
      const pcs = [makeCharacter({ id: 'pc-1' }), makeCharacter({ id: 'pc-2', name: 'Jorbin' })]
      queueD20(10) // monster group roll
      const state = rollInitiative(pcs, [makeMonsterPair('rat', 'Rat')])
      const pc1Row = state.combatants.find((c: any) => c.referenceId === 'pc-1')!

      const updated = applyInitiativeRoll(state, pc1Row.id, 17, false)

      const updatedRow = updated.combatants.find((c: any) => c.id === pc1Row.id)!
      expect(updatedRow.initiativeRoll).toBe(17)
      expect(updatedRow.initiativeRolledByAuto).toBe(false)
      const otherPcRow = updated.combatants.find((c: any) => c.referenceId === 'pc-2')!
      expect(otherPcRow.initiativeRoll).toBeUndefined()
    })

    it('marks auto-rolled when byAuto is true', () => {
      const { rollInitiative, applyInitiativeRoll } = require('../combat.ts')
      queueD20(10)
      const state = rollInitiative([makeCharacter()], [makeMonsterPair('rat', 'Rat')])
      const pcRow = state.combatants.find((c: any) => c.type === 'pc')!
      const updated = applyInitiativeRoll(state, pcRow.id, 9, true)
      const r = updated.combatants.find((c: any) => c.id === pcRow.id)!
      expect(r.initiativeRolledByAuto).toBe(true)
    })
  })
```

- [ ] **Step 4.2: Run — expect failure**

Run: `npx vitest run src/lib/rules/__tests__/combat.test.ts`
Expected: 2 new tests fail (function not exported).

- [ ] **Step 4.3: Implement**

In `src/lib/rules/combat.ts`, immediately after `rollInitiative`, add:

```ts
export function applyInitiativeRoll(
  state: CombatState,
  combatantId: string,
  total: number,
  byAuto: boolean
): CombatState {
  return {
    ...state,
    combatants: state.combatants.map(c =>
      c.id === combatantId
        ? { ...c, initiativeRoll: total, initiativeRolledByAuto: byAuto }
        : c
    ),
  }
}
```

- [ ] **Step 4.4: Run — expect pass**

Run: `npx vitest run src/lib/rules/__tests__/combat.test.ts`
Expected: all pass.

- [ ] **Step 4.5: Commit**

```bash
git add src/lib/rules/combat.ts src/lib/rules/__tests__/combat.test.ts
git commit -m "feat(combat): add applyInitiativeRoll helper"
```

---

## Task 5: `hasInitiativeAdvantage` + `autoRollMissing` (TDD)

**Files:**
- Modify: `src/lib/rules/combat.ts`
- Modify: `src/lib/rules/__tests__/combat.test.ts`

- [ ] **Step 5.1: Write failing tests**

Append inside the `describe('combat rules', ...)` block:

```ts
  describe('autoRollMissing', () => {
    it('rolls only for combatants with undefined initiative and marks them auto', () => {
      const { rollInitiative, applyInitiativeRoll, autoRollMissing } = require('../combat.ts')
      const pc1 = makeCharacter({ id: 'pc-1' })
      const pc2 = makeCharacter({ id: 'pc-2', name: 'Jorbin' })
      queueD20(10) // monster group
      let state = rollInitiative([pc1, pc2], [makeMonsterPair('rat', 'Rat')])
      const pc1Row = state.combatants.find((c: any) => c.referenceId === 'pc-1')!
      state = applyInitiativeRoll(state, pc1Row.id, 18, false)

      // pc-2 still missing — auto roll should fire for them only
      queueD20(7)
      const updated = autoRollMissing(state, [pc1, pc2])

      const pc2Row = updated.combatants.find((c: any) => c.referenceId === 'pc-2')!
      expect(pc2Row.initiativeRoll).toBe(7) // d20=7, DEX mod 0
      expect(pc2Row.initiativeRolledByAuto).toBe(true)
      const pc1RowAfter = updated.combatants.find((c: any) => c.referenceId === 'pc-1')!
      expect(pc1RowAfter.initiativeRoll).toBe(18)
      expect(pc1RowAfter.initiativeRolledByAuto).toBe(false)
    })

    it('uses advantage for characters with initiative_advantage talent', () => {
      const { rollInitiative, autoRollMissing } = require('../combat.ts')
      const lucky = makeCharacter({
        id: 'pc-1',
        talents: [{
          id: 't1',
          source: 'level-up',
          level: 1,
          description: 'Initiative advantage',
          mechanic: { type: 'initiative_advantage' } as any,
        }] as any,
      })
      queueD20(10) // monster group
      const state = rollInitiative([lucky], [makeMonsterPair('rat', 'Rat')])
      // advantage rolls 2 d20s and keeps the higher
      queueD20(3, 19)
      const updated = autoRollMissing(state, [lucky])
      const row = updated.combatants.find((c: any) => c.type === 'pc')!
      expect(row.initiativeRoll).toBe(19) // higher of (3, 19)
    })
  })
```

- [ ] **Step 5.2: Run — expect failure**

Run: `npx vitest run src/lib/rules/__tests__/combat.test.ts`
Expected: 2 new tests fail.

- [ ] **Step 5.3: Implement**

In `src/lib/rules/combat.ts`, after `applyInitiativeRoll`, add:

```ts
export function hasInitiativeAdvantage(character: Character): boolean {
  return character.talents.some(t => t.mechanic.type === 'initiative_advantage')
}

export function autoRollMissing(state: CombatState, characters: Character[]): CombatState {
  let working = state
  for (const c of state.combatants) {
    if (c.type !== 'pc') continue
    if (c.initiativeRoll !== undefined) continue
    const character = characters.find(ch => ch.id === c.referenceId)
    if (!character) continue
    const advantage = hasInitiativeAdvantage(character)
    const roll = rollDice('1d20', {
      purpose: 'initiative',
      rolledBy: character.id,
      advantage,
    })
    const total = roll.total + c.initiativeBonus
    working = applyInitiativeRoll(working, c.id, total, true)
  }
  return working
}
```

- [ ] **Step 5.4: Run — expect pass**

Run: `npx vitest run src/lib/rules/__tests__/combat.test.ts`
Expected: all pass.

- [ ] **Step 5.5: Commit**

```bash
git add src/lib/rules/combat.ts src/lib/rules/__tests__/combat.test.ts
git commit -m "feat(combat): add hasInitiativeAdvantage and autoRollMissing"
```

---

## Task 6: `lockInitiativeOrder` with tie-breaking (TDD)

**Files:**
- Modify: `src/lib/rules/combat.ts`
- Modify: `src/lib/rules/__tests__/combat.test.ts`

- [ ] **Step 6.1: Write failing tests**

Append inside the `describe('combat rules', ...)` block:

```ts
  describe('lockInitiativeOrder', () => {
    it('sorts highest first and transitions to active phase', () => {
      const { rollInitiative, applyInitiativeRoll, lockInitiativeOrder } = require('../combat.ts')
      const pc1 = makeCharacter({ id: 'pc-1', name: 'Ralina' })
      const pc2 = makeCharacter({ id: 'pc-2', name: 'Jorbin' })
      queueD20(10) // monsters: 10
      let state = rollInitiative([pc1, pc2], [makeMonsterPair('rat', 'Rat')])
      const pc1Row = state.combatants.find((c: any) => c.referenceId === 'pc-1')!
      const pc2Row = state.combatants.find((c: any) => c.referenceId === 'pc-2')!
      state = applyInitiativeRoll(state, pc1Row.id, 18, false)
      state = applyInitiativeRoll(state, pc2Row.id, 5, false)

      const locked = lockInitiativeOrder(state)

      expect(locked.phase).toBe('active')
      expect(locked.currentTurnIndex).toBe(0)
      expect(locked.initiativeDeadline).toBeUndefined()
      // Order: Ralina 18 > Monsters 10 > Jorbin 5
      expect(locked.initiativeOrder).toEqual([pc1Row.id, locked.combatants.find((c: any) => c.type === 'monster')!.id, pc2Row.id])
    })

    it('breaks PC-vs-monster ties in favor of PC', () => {
      const { rollInitiative, applyInitiativeRoll, lockInitiativeOrder } = require('../combat.ts')
      queueD20(10)
      let state = rollInitiative([makeCharacter()], [makeMonsterPair('rat', 'Rat')])
      const pcRow = state.combatants.find((c: any) => c.type === 'pc')!
      state = applyInitiativeRoll(state, pcRow.id, 10, false) // tie with monsters

      const locked = lockInitiativeOrder(state)
      expect(locked.initiativeOrder[0]).toBe(pcRow.id)
    })

    it('breaks PC-vs-PC ties by combatant array order', () => {
      const { rollInitiative, applyInitiativeRoll, lockInitiativeOrder } = require('../combat.ts')
      const pc1 = makeCharacter({ id: 'pc-1', name: 'A' })
      const pc2 = makeCharacter({ id: 'pc-2', name: 'B' })
      queueD20(5) // monsters low
      let state = rollInitiative([pc1, pc2], [makeMonsterPair('rat', 'Rat')])
      const pc1Row = state.combatants.find((c: any) => c.referenceId === 'pc-1')!
      const pc2Row = state.combatants.find((c: any) => c.referenceId === 'pc-2')!
      state = applyInitiativeRoll(state, pc1Row.id, 12, false)
      state = applyInitiativeRoll(state, pc2Row.id, 12, false)

      const locked = lockInitiativeOrder(state)
      expect(locked.initiativeOrder.indexOf(pc1Row.id)).toBeLessThan(locked.initiativeOrder.indexOf(pc2Row.id))
    })
  })
```

- [ ] **Step 6.2: Run — expect failure**

Run: `npx vitest run src/lib/rules/__tests__/combat.test.ts`
Expected: 3 new tests fail.

- [ ] **Step 6.3: Implement**

In `src/lib/rules/combat.ts`, after `autoRollMissing`, add:

```ts
export function lockInitiativeOrder(state: CombatState): CombatState {
  // Pair each combatant with its index for stable tie-breaking among PCs.
  const indexed = state.combatants.map((c, idx) => ({ c, idx }))
  indexed.sort((a, b) => {
    const rollA = a.c.initiativeRoll ?? -Infinity
    const rollB = b.c.initiativeRoll ?? -Infinity
    if (rollA !== rollB) return rollB - rollA
    // PC beats monster on ties
    if (a.c.type === 'pc' && b.c.type !== 'pc') return -1
    if (b.c.type === 'pc' && a.c.type !== 'pc') return 1
    // Same-type tie: array order
    return a.idx - b.idx
  })
  const initiativeOrder = indexed.map(x => x.c.id)

  return {
    ...state,
    phase: 'active',
    initiativeOrder,
    currentTurnIndex: 0,
    initiativeDeadline: undefined,
    log: [...state.log, {
      id: generateId(),
      timestamp: Date.now(),
      round: state.roundNumber,
      actorId: 'system',
      type: 'round_start',
      message: `Round ${state.roundNumber} begins.`,
    }],
  }
}
```

- [ ] **Step 6.4: Run — expect pass**

Run: `npx vitest run src/lib/rules/__tests__/combat.test.ts`
Expected: all pass.

- [ ] **Step 6.5: Commit**

```bash
git add src/lib/rules/combat.ts src/lib/rules/__tests__/combat.test.ts
git commit -m "feat(combat): add lockInitiativeOrder with PC-tie rules"
```

---

## Task 7: Store actions for combat lifecycle

**Files:**
- Modify: `src/stores/session-store.ts`

- [ ] **Step 7.1: Add new actions to the store interface**

Edit the `SessionStore` interface in `src/stores/session-store.ts` (around line 44–46). Replace the `// Combat` block with:

```ts
  // Combat
  setCombat: (combat: CombatState | null) => void
  applyInitiativeRoll: (combatantId: string, total: number, byAuto: boolean) => void
  lockInitiativeOrder: () => void
  advanceCombatTurn: () => void
  endCombat: () => void
```

- [ ] **Step 7.2: Add the action implementations**

In the same file, find the `setCombat:` action (around line 304). Add immediately after it:

```ts
    applyInitiativeRoll: (combatantId, total, byAuto) => {
      set(state => {
        if (!state.session?.combat) return
        const c = state.session.combat.combatants.find(c => c.id === combatantId)
        if (!c) return
        c.initiativeRoll = total
        c.initiativeRolledByAuto = byAuto
      })
      const s = get().session
      if (s) debouncedSave(s)
    },

    lockInitiativeOrder: () => {
      set(state => {
        if (!state.session?.combat) return
        const combat = state.session.combat
        // Inline the same sort as lib/rules/combat.ts:lockInitiativeOrder so we mutate in place under immer.
        const indexed = combat.combatants.map((c, idx) => ({ id: c.id, type: c.type, roll: c.initiativeRoll ?? -Infinity, idx }))
        indexed.sort((a, b) => {
          if (a.roll !== b.roll) return b.roll - a.roll
          if (a.type === 'pc' && b.type !== 'pc') return -1
          if (b.type === 'pc' && a.type !== 'pc') return 1
          return a.idx - b.idx
        })
        combat.phase = 'active'
        combat.initiativeOrder = indexed.map(x => x.id)
        combat.currentTurnIndex = 0
        combat.initiativeDeadline = undefined
        combat.log.push({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          round: combat.roundNumber,
          actorId: 'system',
          type: 'round_start',
          message: `Round ${combat.roundNumber} begins.`,
        })
        // Drive activeTurnId from the new current combatant.
        const current = combat.combatants.find(c => c.id === combat.initiativeOrder[0])
        state.session.activeTurnId = current?.referenceId ?? null
      })
      const s = get().session
      if (s) debouncedSave(s)
    },

    advanceCombatTurn: () => {
      set(state => {
        if (!state.session?.combat) return
        const combat = state.session.combat
        if (combat.phase !== 'active') return
        const order = combat.initiativeOrder
        if (order.length === 0) return

        let next = combat.currentTurnIndex
        for (let i = 0; i < order.length; i++) {
          next = (next + 1) % order.length
          if (next === 0) {
            combat.roundNumber += 1
            for (const c of combat.combatants) c.hasActed = false
            combat.log.push({
              id: crypto.randomUUID(),
              timestamp: Date.now(),
              round: combat.roundNumber,
              actorId: 'system',
              type: 'round_start',
              message: `Round ${combat.roundNumber} begins.`,
            })
          }
          const candidate = combat.combatants.find(c => c.id === order[next])
          if (candidate && !candidate.isDefeated) break
        }
        combat.currentTurnIndex = next
        const current = combat.combatants.find(c => c.id === order[next])
        state.session.activeTurnId = current?.referenceId ?? null
      })
      const s = get().session
      if (s) debouncedSave(s)
    },

    endCombat: () => {
      set(state => {
        if (!state.session) return
        state.session.combat = null
        state.session.activeTurnId = null
      })
      const s = get().session
      if (s) debouncedSave(s)
    },
```

- [ ] **Step 7.3: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 7.4: Run all tests**

Run: `npx vitest run`
Expected: existing 86 tests + 9 new combat tests = 95 pass. No regressions.

- [ ] **Step 7.5: Commit**

```bash
git add src/stores/session-store.ts
git commit -m "feat(store): add initiative lifecycle actions"
```

---

## Task 8: Extend `InitiativeTracker` for the initiative phase

**Files:**
- Modify: `src/components/combat/initiative-tracker.tsx`

- [ ] **Step 8.1: Replace the component**

Replace the entire contents of `src/components/combat/initiative-tracker.tsx` with:

```tsx
import { useEffect, useState } from 'react'
import type { CombatState, Combatant } from '@/schemas/combat.ts'

interface Props {
  combat: CombatState
  onAdvanceTurn?: () => void
  onEndCombat?: () => void
  onForceRoll?: (combatantId: string) => void
  isGM: boolean
}

function useCountdown(deadline: number | undefined): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (deadline == null) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [deadline])
  if (deadline == null) return 0
  return Math.max(0, Math.ceil((deadline - now) / 1000))
}

export function InitiativeTracker({ combat, onAdvanceTurn, onEndCombat, onForceRoll, isGM }: Props) {
  const isInitiativePhase = combat.phase === 'initiative'
  const secondsLeft = useCountdown(isInitiativePhase ? combat.initiativeDeadline : undefined)
  const currentId = combat.initiativeOrder[combat.currentTurnIndex]

  const orderedRows: Combatant[] = isInitiativePhase
    ? combat.combatants
    : combat.initiativeOrder
        .map(id => combat.combatants.find(c => c.id === id))
        .filter((c): c is Combatant => !!c)

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">
          {isInitiativePhase
            ? `Roll for initiative — ${secondsLeft}s`
            : `Combat — Round ${combat.roundNumber}`}
        </h2>
        {isGM && !isInitiativePhase && (
          <div className="flex gap-2">
            {onAdvanceTurn && (
              <button
                onClick={onAdvanceTurn}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition"
              >
                Next Turn
              </button>
            )}
            {onEndCombat && (
              <button
                onClick={onEndCombat}
                className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent transition"
              >
                End Combat
              </button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-1">
        {orderedRows.map((combatant, index) => {
          const isCurrent = !isInitiativePhase && combatant.id === currentId
          const isPC = combatant.type === 'pc'
          const unrolled = combatant.initiativeRoll === undefined
          return (
            <div
              key={combatant.id}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                combatant.isDefeated ? 'opacity-30 line-through' :
                isCurrent ? 'bg-primary/15 border border-primary/30' :
                'border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                {!isInitiativePhase && (
                  <span className="w-6 text-center text-xs font-mono text-muted-foreground">{index + 1}</span>
                )}
                <span className={`h-2 w-2 rounded-full ${isPC ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={`font-medium ${isCurrent ? 'text-primary' : ''}`}>{combatant.name}</span>
                {combatant.initiativeRolledByAuto && (
                  <span className="text-[10px] text-muted-foreground italic">(auto)</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {unrolled ? (
                  <span className="text-xs text-muted-foreground italic">rolling…</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Init: {combatant.initiativeRoll}</span>
                )}
                {isInitiativePhase && isGM && unrolled && isPC && onForceRoll && (
                  <button
                    onClick={() => onForceRoll(combatant.id)}
                    className="rounded-md border border-border px-2 py-0.5 text-[10px] hover:bg-accent"
                    title="Roll for them now"
                  >
                    Roll
                  </button>
                )}
                {isCurrent && !combatant.isDefeated && (
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">Active</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Combat Log</p>
        <div className="max-h-32 space-y-0.5 overflow-y-auto">
          {combat.log.slice(-8).map(entry => (
            <p key={entry.id} className="text-xs text-muted-foreground">
              <span className="text-muted-foreground/60">R{entry.round}</span> {entry.message}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 8.2: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 8.3: Commit**

```bash
git add src/components/combat/initiative-tracker.tsx
git commit -m "feat(combat): extend InitiativeTracker for initiative phase"
```

---

## Task 9: Player-side `InitiativePrompt` component

**Files:**
- Create: `src/components/combat/initiative-prompt.tsx`

- [ ] **Step 9.1: Create the file**

Create `src/components/combat/initiative-prompt.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { DiceRoller } from '@/components/dice/dice-roller.tsx'
import type { Character } from '@/schemas/character.ts'
import type { CombatState, Combatant } from '@/schemas/combat.ts'

interface Props {
  combat: CombatState
  myCharacter: Character
  onRoll: (total: number, isNat20: boolean, isNat1: boolean) => void
}

function findMyCombatant(combat: CombatState, characterId: string): Combatant | undefined {
  return combat.combatants.find(c => c.type === 'pc' && c.referenceId === characterId)
}

function hasInitiativeAdvantage(character: Character): boolean {
  return character.talents.some(t => t.mechanic.type === 'initiative_advantage')
}

export function InitiativePrompt({ combat, myCharacter, onRoll }: Props) {
  const me = findMyCombatant(combat, myCharacter.id)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (combat.initiativeDeadline == null) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [combat.initiativeDeadline])

  if (!me || me.initiativeRoll !== undefined) return null
  if (combat.initiativeDeadline == null) return null

  const secondsLeft = Math.max(0, Math.ceil((combat.initiativeDeadline - now) / 1000))
  const advantageLocked = hasInitiativeAdvantage(myCharacter)
  const dexMod = me.initiativeBonus

  return (
    <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-amber-400">Roll for initiative!</p>
          <p className="text-xs text-amber-300">
            d20 {dexMod >= 0 ? `+ ${dexMod}` : `− ${Math.abs(dexMod)}`} (DEX)
            {advantageLocked && ' · advantage'}
          </p>
        </div>
        <p className="text-2xl font-mono font-bold text-amber-400">{secondsLeft}s</p>
      </div>
      <DiceRoller
        characterName={myCharacter.name}
        compact
        lockedDie="d20"
        onRoll={(result) => {
          const total = result.total + dexMod
          onRoll(total, result.dice[0]?.isNat20 ?? false, result.dice[0]?.isNat1 ?? false)
        }}
      />
    </div>
  )
}
```

> Note: the existing `DiceRoller` does not yet honor a forced advantage prop. The talent's effect on the *display* is informational here; the source of truth for advantage is the GM auto-roll path (Task 5) and the player's own choice in the dice roller UI for manual rolls. If you want strict enforcement, treat that as a follow-up.

- [ ] **Step 9.2: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 9.3: Commit**

```bash
git add src/components/combat/initiative-prompt.tsx
git commit -m "feat(combat): add player-side InitiativePrompt"
```

---

## Task 10: Add i18n keys

**Files:**
- Modify: `src/i18n/locales/en/ui.json`
- Modify: `src/i18n/locales/es/ui.json`

- [ ] **Step 10.1: Find the `combat.*` block**

Run: `grep -n '"combat"' src/i18n/locales/en/ui.json | head -3`
Expected: shows the `"combat": { ... }` object key.

- [ ] **Step 10.2: Add EN keys**

Inside the `"combat"` object in `src/i18n/locales/en/ui.json`, add (or merge with existing keys):

```json
"rollInitiative": "Roll Initiative",
"endCombat": "End Combat",
"rollForInitiative": "Roll for initiative!",
"initiativeCountdown": "{{seconds}}s",
"rolling": "rolling…",
"autoRolled": "(auto)"
```

- [ ] **Step 10.3: Add ES keys**

Inside the `"combat"` object in `src/i18n/locales/es/ui.json`, add:

```json
"rollInitiative": "Tirar Iniciativa",
"endCombat": "Terminar Combate",
"rollForInitiative": "¡Tira por iniciativa!",
"initiativeCountdown": "{{seconds}}s",
"rolling": "tirando…",
"autoRolled": "(auto)"
```

- [ ] **Step 10.4: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/i18n/locales/en/ui.json','utf8')); JSON.parse(require('fs').readFileSync('src/i18n/locales/es/ui.json','utf8')); console.log('ok')"`
Expected: `ok`.

- [ ] **Step 10.5: Commit**

```bash
git add src/i18n/locales/en/ui.json src/i18n/locales/es/ui.json
git commit -m "i18n: add initiative keys (en, es)"
```

---

## Task 11: GM encounter panel — toggle button + render tracker during combat

**Files:**
- Modify: `src/components/gm/encounter-panel.tsx`

- [ ] **Step 11.1: Extend the `Props` interface**

In `src/components/gm/encounter-panel.tsx`, replace the `Props` interface (lines 13–24) with:

```ts
interface Props {
  monsters: MonsterInstance[]
  characters: Character[]
  combat: import('@/schemas/combat.ts').CombatState | null
  activeTurnId: string | null
  onSetActiveTurn: (id: string | null) => void
  onBroadcastRoll: (name: string, expression: string, total: number, isNat20: boolean, isNat1: boolean) => void
  onUpdateMonsterHp: (id: string, delta: number) => void
  onDefeatMonster: (id: string) => void
  onRemoveMonster: (id: string) => void
  onUpdateCharacterHp: (id: string, delta: number) => void
  onResolveEncounter: (encounterType: 'random' | 'story') => void
  onRollInitiative: () => void
  onEndCombat: () => void
  onAdvanceTurn: () => void
  onForceInitiativeRoll: (combatantId: string) => void
}
```

- [ ] **Step 11.2: Destructure the new props**

In the `EncounterPanel` function signature (line 26), add the new props:

```tsx
export function EncounterPanel({
  monsters,
  characters,
  combat,
  activeTurnId,
  onSetActiveTurn,
  onBroadcastRoll,
  onUpdateMonsterHp,
  onDefeatMonster,
  onRemoveMonster,
  onUpdateCharacterHp,
  onResolveEncounter,
  onRollInitiative,
  onEndCombat,
  onAdvanceTurn,
  onForceInitiativeRoll,
}: Props) {
```

- [ ] **Step 11.3: Import the tracker**

At the top of the file, with other imports, add:

```tsx
import { InitiativeTracker } from '@/components/combat/initiative-tracker.tsx'
```

- [ ] **Step 11.4: Replace the resolve button block with conditional combat controls**

Find the block (lines 110–121) that currently renders:

```tsx
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
            {ti('combat.activeCount', { count: activeMonsters.length })}
          </span>
          <button
            onClick={() => onResolveEncounter(encounterType)}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition"
          >
            {t('combat.resolveEncounter')}
          </button>
        </div>
```

Replace it with:

```tsx
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
            {ti('combat.activeCount', { count: activeMonsters.length })}
          </span>
          {combat ? (
            <button
              onClick={onEndCombat}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent transition"
            >
              {t('combat.endCombat')}
            </button>
          ) : (
            <>
              <button
                onClick={onRollInitiative}
                disabled={characters.length === 0 || activeMonsters.length === 0}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
                title={characters.length === 0 ? 'Assign characters first' : ''}
              >
                {t('combat.rollInitiative')}
              </button>
              <button
                onClick={() => onResolveEncounter(encounterType)}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition"
              >
                {t('combat.resolveEncounter')}
              </button>
            </>
          )}
        </div>
```

- [ ] **Step 11.5: Replace the center detail pane with the tracker during combat**

Find the center column (the `{selectedMonster && selectedMonsterDef ? ... : selectedCharacter ? ... : ...}` block, around lines 202–239). Wrap it so it shows the tracker during combat:

```tsx
        {/* Center: Detail Panel (monster or character) — replaced by tracker during combat */}
        <div>
          {combat ? (
            <InitiativeTracker
              combat={combat}
              isGM={true}
              onAdvanceTurn={onAdvanceTurn}
              onEndCombat={onEndCombat}
              onForceRoll={onForceInitiativeRoll}
            />
          ) : selectedMonster && selectedMonsterDef ? (
            <div className="space-y-4">
              <MonsterDetail
                instance={selectedMonster}
                definition={selectedMonsterDef}
                onHpChange={(delta) => onUpdateMonsterHp(selectedMonster.id, delta)}
                onDefeat={() => onDefeatMonster(selectedMonster.id)}
              />
              {activeTurnId === selectedMonster.id && (
                <DiceRoller characterName={selectedMonster.name} compact onRoll={(result) => {
                  const n20 = result.dice[0]?.isNat20 ?? false
                  const n1 = result.dice[0]?.isNat1 ?? false
                  pushRollToast({
                    id: generateId(),
                    playerName: selectedMonster.name,
                    diceType: result.expression,
                    total: result.total,
                    isNat20: n20,
                    isNat1: n1,
                    timestamp: Date.now(),
                  })
                  onBroadcastRoll(selectedMonster.name, result.expression, result.total, n20, n1)
                }} />
              )}
            </div>
          ) : selectedCharacter ? (
            <CharacterDetail
              character={selectedCharacter}
              onHpChange={(delta) => onUpdateCharacterHp(selectedCharacter.id, delta)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {t('combat.selectThreatOrPartyMember')}
            </div>
          )}
        </div>
```

- [ ] **Step 11.6: Type-check**

Run: `npx tsc --noEmit`
Expected: errors only in `routes/gm/session.$sessionId.tsx` for missing new props (those will be fixed in Task 12). The encounter-panel itself should be clean.

- [ ] **Step 11.7: Commit**

```bash
git add src/components/gm/encounter-panel.tsx
git commit -m "feat(gm): toggle button and tracker in encounter panel"
```

---

## Task 12: GM session route — wire up handlers and 30s timer

**Files:**
- Modify: `src/routes/gm/session.$sessionId.tsx`

- [ ] **Step 12.1: Add imports**

At the top of `src/routes/gm/session.$sessionId.tsx`, with other imports from `@/lib/rules/combat.ts`, change:

```ts
import { rollDeathSave } from '@/lib/rules/combat.ts'
```

to:

```ts
import { rollDeathSave, rollInitiative, applyInitiativeRoll, autoRollMissing, lockInitiativeOrder } from '@/lib/rules/combat.ts'
import { getMonster } from '@/data/index.ts'
```

(`getMonster` may already be imported — if so, skip that line.)

- [ ] **Step 12.2: Wire the new EncounterPanel props**

Find the `<EncounterPanel ... />` JSX (around line 1031). Inside its props, add four new handlers right after `onResolveEncounter`:

```tsx
            combat={session.combat}
            onRollInitiative={() => {
              const assignedCharacters = characters.filter(c => session.connectedPlayers.some(p => p.characterId === c.id))
              const liveMonsters = activeMonsters
                .map(m => {
                  const def = getMonster(m.definitionId)
                  return def ? { instance: m, definition: def } : null
                })
                .filter((x): x is { instance: typeof activeMonsters[number]; definition: NonNullable<ReturnType<typeof getMonster>> } => !!x)
              if (assignedCharacters.length === 0 || liveMonsters.length === 0) return
              const combat = rollInitiative(assignedCharacters, liveMonsters)
              useSessionStore.getState().setCombat(combat)
              setTimeout(() => {
                gmPeer.broadcastStateSync()
                gmPeer.broadcast({ type: 'initiative_request', combat })
              }, 50)
            }}
            onEndCombat={() => {
              useSessionStore.getState().endCombat()
              setTimeout(() => gmPeer.broadcastStateSync(), 50)
            }}
            onAdvanceTurn={() => {
              useSessionStore.getState().advanceCombatTurn()
              setTimeout(() => gmPeer.broadcastStateSync(), 50)
            }}
            onForceInitiativeRoll={(combatantId) => {
              const combat = useSessionStore.getState().session?.combat
              const row = combat?.combatants.find(c => c.id === combatantId)
              if (!combat || !row || row.type !== 'pc') return
              const character = characters.find(c => c.id === row.referenceId)
              if (!character) return
              const updated = autoRollMissing(combat, [character])
              const single = updated.combatants.find(c => c.id === combatantId)
              if (single?.initiativeRoll != null) {
                useSessionStore.getState().applyInitiativeRoll(combatantId, single.initiativeRoll, true)
                addChatMessage(createActionLog(`${row.name} rolled initiative → ${single.initiativeRoll} (auto)`))
                checkAndLockInitiativeOrder()
                setTimeout(() => gmPeer.broadcastStateSync(), 50)
              }
            }}
```

- [ ] **Step 12.3: Add the `checkAndLockInitiativeOrder` helper near the top of the component**

Inside the `GMSession` component body, near the other handler declarations (e.g., near `setRewardsState`), add:

```ts
  const checkAndLockInitiativeOrder = () => {
    const combat = useSessionStore.getState().session?.combat
    if (!combat || combat.phase !== 'initiative') return
    const allRolled = combat.combatants.every(c => c.initiativeRoll !== undefined)
    if (allRolled) {
      useSessionStore.getState().lockInitiativeOrder()
    }
  }
```

- [ ] **Step 12.4: Add the 30-second deadline timer**

Inside `GMSession`, near the other `useEffect` hooks, add:

```tsx
  useEffect(() => {
    const combat = session?.combat
    if (!combat || combat.phase !== 'initiative' || combat.initiativeDeadline == null) return
    const remaining = combat.initiativeDeadline - Date.now()
    if (remaining <= 0) {
      // Already past — fire now.
      const updated = autoRollMissing(combat, characters)
      for (const c of updated.combatants) {
        if (c.initiativeRoll !== undefined && c.initiativeRolledByAuto) {
          useSessionStore.getState().applyInitiativeRoll(c.id, c.initiativeRoll, true)
          addChatMessage(createActionLog(`${c.name} rolled initiative → ${c.initiativeRoll} (auto)`))
        }
      }
      useSessionStore.getState().lockInitiativeOrder()
      setTimeout(() => gmPeer.broadcastStateSync(), 50)
      return
    }
    const id = setTimeout(() => {
      const c2 = useSessionStore.getState().session?.combat
      if (!c2 || c2.phase !== 'initiative') return
      const updated = autoRollMissing(c2, characters)
      for (const c of updated.combatants) {
        if (c.initiativeRoll !== undefined && c.initiativeRolledByAuto && c2.combatants.find(x => x.id === c.id)?.initiativeRoll === undefined) {
          useSessionStore.getState().applyInitiativeRoll(c.id, c.initiativeRoll, true)
          addChatMessage(createActionLog(`${c.name} rolled initiative → ${c.initiativeRoll} (auto)`))
        }
      }
      useSessionStore.getState().lockInitiativeOrder()
      setTimeout(() => gmPeer.broadcastStateSync(), 50)
    }, remaining)
    return () => clearTimeout(id)
  }, [session?.combat?.id, session?.combat?.phase, session?.combat?.initiativeDeadline, characters])
```

- [ ] **Step 12.5: Handle `player_roll` with `purpose: 'initiative'`**

In `src/routes/gm/session.$sessionId.tsx` find the existing `if (message.type === 'player_roll') {` block at line 145. Insert the initiative-specific branch as the very first statement inside that block (before the existing `pushRollToast` etc.) so it can short-circuit:

```ts
    if (message.type === 'player_roll') {
      // Initiative rolls take a dedicated path — short-circuit before the generic toast/chat code below.
      if (message.purpose === 'initiative') {
        const combat = useSessionStore.getState().session?.combat
        if (!combat || combat.phase !== 'initiative') return
        const player = useSessionStore.getState().session?.players[peerId]
        const characterId = player?.characterId
        const row = combat.combatants.find(
          c => c.type === 'pc' && c.referenceId === characterId && c.initiativeRoll === undefined
        )
        if (!row) return
        useSessionStore.getState().applyInitiativeRoll(row.id, message.total, false)
        const character = characterId ? useSessionStore.getState().session?.characters[characterId] : null
        const rollName = character?.name ?? row.name
        const natLabel = message.isNat20 ? ' — NATURAL 20!' : message.isNat1 ? ' — Natural 1' : ''
        pushRollToast({
          id: generateId(), playerName: rollName, diceType: message.expression,
          total: message.total, isNat20: message.isNat20, isNat1: message.isNat1, timestamp: Date.now(),
        })
        addChatMessage({
          id: generateId(), senderId: peerId, senderName: rollName, type: 'roll',
          content: `rolled ${message.expression} → ${message.total}${natLabel} (initiative)`,
          timestamp: Date.now(), isPublic: true,
        })
        gmPeer.broadcast({
          type: 'roll_result',
          roll: { id: generateId(), expression: message.expression, dice: [], modifier: 0, total: message.total, timestamp: Date.now(), rolledBy: rollName },
          characterName: rollName, isPublic: true, context: 'initiative',
        })
        checkAndLockInitiativeOrder()
        setTimeout(() => broadcastStateSyncRef.current(), 50)
        return
      }
      // ... existing generic player_roll handling continues below unchanged ...
```

Leave the rest of the existing handler in place. The early `return` ensures initiative rolls don't double-toast.

- [ ] **Step 12.6: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 12.7: Run all tests**

Run: `npx vitest run`
Expected: all tests pass; no regressions.

- [ ] **Step 12.8: Commit**

```bash
git add src/routes/gm/session.\$sessionId.tsx
git commit -m "feat(gm): wire initiative trigger, deadline timer, and roll receipt"
```

---

## Task 13: Player session route — render the prompt

**Files:**
- Modify: `src/routes/player/session.tsx`

- [ ] **Step 13.1: Add the import**

At the top of `src/routes/player/session.tsx`, with other component imports, add:

```tsx
import { InitiativePrompt } from '@/components/combat/initiative-prompt.tsx'
import { InitiativeTracker } from '@/components/combat/initiative-tracker.tsx'
```

- [ ] **Step 13.2: Render the prompt above the character sheet**

Find the JSX block immediately after `<EncounterView ... />` and the surrounding closing `</div>` (around line 292). Insert before the next `<div className="grid gap-4 ...">`:

```tsx
        {state.combat?.phase === 'initiative' && state.myCharacter && (
          <InitiativePrompt
            combat={state.combat}
            myCharacter={state.myCharacter}
            onRoll={(total, isNat20, isNat1) => {
              send({
                type: 'player_roll',
                expression: '1d20',
                total,
                isNat20,
                isNat1,
                purpose: 'initiative',
                isPublic: true,
              })
            }}
          />
        )}
        {state.combat?.phase === 'active' && (
          <div className="mb-4">
            <InitiativeTracker combat={state.combat} isGM={false} />
          </div>
        )}
```

> **Note:** `state.combat` must be present in `PlayerVisibleState`. If `npx tsc --noEmit` complains that `combat` is missing, add it to the projection in `getPlayerVisibleState` (`src/stores/session-store.ts`) by including `combat: state.session.combat` in the returned object — it is already broadcast via `state_sync` in messaging, so verify the field is plumbed end-to-end.

- [ ] **Step 13.3: Verify `combat` is on `PlayerVisibleState`**

Run: `grep -n "combat" src/schemas/session.ts`
Expected: shows `combat: CombatState | null` on `PlayerVisibleState`. If not present, add it; then add `combat: state.session.combat` to the returned object in `getPlayerVisibleState` in `src/stores/session-store.ts`.

- [ ] **Step 13.4: Type-check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 13.5: Run all tests**

Run: `npx vitest run`
Expected: all pass.

- [ ] **Step 13.6: Commit**

```bash
git add src/routes/player/session.tsx src/stores/session-store.ts src/schemas/session.ts
git commit -m "feat(player): render initiative prompt and tracker"
```

---

## Task 14: Manual end-to-end test

**Files:** none (verification only)

- [ ] **Step 14.1: Start the dev server**

Run: `npm run dev`
Expected: `VITE … ready` and listening on `http://localhost:3000`.

- [ ] **Step 14.2: Open two browsers**

Open `http://localhost:3000` in Chrome (GM) and `http://localhost:3000` in a private window (player).
- GM: Create Game → name it → note the room code.
- GM: Create a character, assign it to a player slot.
- Player: Join Game with the room code, take the assigned character.

- [ ] **Step 14.3: Spawn monsters and start combat**

- GM: Open Monsters tab, spawn 2 goblins.
- GM: Encounter Panel appears at the bottom. Click **Roll Initiative**.

Expected: GM sees the initiative tracker with 1 PC row "rolling…" and 1 "Monsters" row with a number. Header counts down from 30s.

- [ ] **Step 14.4: Player rolls**

- Player: A yellow "Roll for initiative!" panel appears at the top of the screen with a countdown and a d20 roller.
- Player: Click roll. The roll toast fires.

Expected: GM tracker updates — PC row now shows the rolled number, panel transitions to active phase, "Next Turn" button appears.

- [ ] **Step 14.5: Test the timeout fallback**

- GM: With monsters still on field, click **End Combat**, then **Roll Initiative** again.
- Player: Do nothing. Wait 30 seconds.

Expected: GM auto-rolls for the player. The roll toast fires under the character's name with "(auto)" appended in the tracker. Combat enters active phase.

- [ ] **Step 14.6: Test Next Turn / End Combat**

- GM: Click **Next Turn** repeatedly. The active row cycles, round number increments after wrapping.
- GM: Click **End Combat**.

Expected: Tracker disappears on both sides. Resolve Encounter button reappears.

- [ ] **Step 14.7: Run the full test suite once more**

Run: `npx vitest run`
Expected: all pass (95 tests).

- [ ] **Step 14.8: Final commit (if there were tweaks)**

If you made any small fixes during manual testing, commit them now:

```bash
git add -A
git commit -m "fix: small adjustments from manual e2e"
```

---

## Definition of done

- All tasks above checked off.
- `npx tsc --noEmit` clean.
- `npx vitest run` reports 95+ tests passing (86 existing + ≥9 new combat tests).
- Manual E2E in Task 14 succeeds for both the happy path and the timeout fallback.
- Both EN and ES translations resolve for the six new keys (verify by switching the locale dropdown on the GM page).
