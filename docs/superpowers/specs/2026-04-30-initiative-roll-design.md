# Initiative Roll — Design

Date: 2026-04-30
Status: Approved (pending user review of this doc)

## Goal

Add a GM-triggered initiative roll to the ShadowDark Engine. When the GM starts combat, every player rolls their own initiative on their own screen using the dice roller they already have. Players who don't roll within 30 seconds get auto-rolled by the GM client. Both sides see the resulting turn order and the active turn updates round to round.

## ShadowDark RAW (rules we're implementing)

- Initiative is rolled once at the start of combat. The order is reused every round until combat ends.
- Each PC rolls **1d20 + DEX modifier**.
- All monsters in the encounter share **one group roll** using the highest DEX modifier in the group.
- Highest result acts first, descending. **Ties between a PC and a monster: PC goes first.** Ties between PCs are broken by the order the combatants appear in `combat.combatants` (deterministic, stable across reloads).
- Some talents (e.g. the thief's `initiative_advantage`) grant advantage on the roll.

## Current state

- Rules engine `rollInitiative()` exists in `src/lib/rules/combat.ts:12` but is never called from any UI. It also rolls per‑monster instead of once for the group — this design fixes that.
- `CombatState` schema, `session.combat`, `setCombat()` in the store, and the `InitiativeTracker` component all exist but are not wired into any route.
- `DiceRoller` component already supports a locked die type and broadcasts via `player_roll`.

## Non-goals

- Adding combatants mid-combat (out of scope for v1 — GM ends and restarts combat if the encounter changes).
- Surprise rounds (the `'surprise'` phase exists in the schema but stays unused).
- Player-side override / re-roll after the order is locked.

## Architecture

### Phase machine

`CombatState.phase` drives all UI. We use three values; the existing `'inactive'` and `'surprise'` values stay defined but are not entered by this feature.

| Phase          | Trigger                                                    | What's visible                                                                                       |
| -------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `'initiative'` | GM clicks **Roll Initiative**.                             | Player: prompt + countdown + dice roller. GM: live tracker with "rolling…" rows.                     |
| `'active'`     | All rows have a roll, OR `initiativeDeadline` has elapsed. | Both sides: tracker. GM: **Next Turn** / **End Combat**. Player: dice roller appears on their turn.  |
| `'ended'`      | GM clicks **End Combat**.                                  | Tracker dismissed; `session.combat` cleared back to `null` after the final log entry is broadcast.    |

### Schema changes

`src/schemas/combat.ts`:

- Add `initiativeDeadline?: number` (epoch ms) to `CombatState`. Both clients render the countdown from this so they agree without separate timers.
- `Combatant.initiativeRoll` is already `number | undefined`. We use `undefined` to mean "not rolled yet". Add `initiativeRolledByAuto?: boolean` so we can label auto-rolls.

`src/schemas/messages.ts`:

- New GM→player message: `{ type: 'initiative_request'; combat: CombatState }`. Sent immediately after the GM creates the combat state in `'initiative'` phase. Players use this purely as a hint to surface the prompt; the authoritative state still flows through `state_sync`.
- Reuse `player_roll` with `purpose: 'initiative'`. The GM applies the roll to the matching combatant.

### Rules engine changes (`src/lib/rules/combat.ts`)

- Rewrite `rollInitiative(characters, monsters)` to produce a `CombatState` in `phase: 'initiative'` with:
  - One `Combatant` per character with `type: 'pc'`, `initiativeRoll: undefined`, `initiativeBonus: dexMod`.
  - **One** `Combatant` for the monster group with `type: 'monster'`, name `"Monsters"`, `initiativeRoll` rolled immediately using the highest DEX mod across monsters, `initiativeBonus` = that mod. `referenceId` is set to the first monster instance ID (used for "whose turn" only loosely — monsters share a turn).
  - `initiativeDeadline = Date.now() + 30_000`.
  - `initiativeOrder` is empty until phase transitions to `'active'`.
- New helper `applyInitiativeRoll(state, combatantId, total, byAuto)` returns updated state with that combatant's roll set.
- New helper `autoRollMissing(state, characters)` rolls 1d20+DEX for every PC combatant whose `initiativeRoll` is undefined, marks them auto-rolled, and returns updated state.
- New helper `lockInitiativeOrder(state)` sorts combatants (highest first; PCs win ties over monsters; first-rolled wins PC-vs-PC ties), populates `initiativeOrder`, sets `phase: 'active'`, `currentTurnIndex: 0`, `roundNumber: 1`, and writes a `'round_start'` log entry. Returns updated state.
- Existing `advanceTurn()`, `defeatCombatant()`, `endCombat()` need no changes.

### Store changes (`src/stores/session-store.ts`)

Add actions if absent:

- `applyInitiativeRoll(combatantId, total, byAuto)`
- `lockInitiativeOrder()`
- `advanceCombatTurn()` — wraps `advanceTurn()`, also updates `session.activeTurnId` to point at the new current combatant's `referenceId`.
- `endCombat()` — sets `phase: 'ended'`, broadcasts the final log, then clears `session.combat = null` and `session.activeTurnId = null`.

### GM UI (`src/components/gm/encounter-panel.tsx` + `src/routes/gm/session.$sessionId.tsx`)

- Encounter panel header gets a single combat-toggle button:
  - **Roll Initiative** when `session.combat == null` and there is at least one assigned PC and one active monster.
  - Replaces the **Resolve Encounter** button while combat is in `'initiative'` or `'active'` phase, and toggles to **End Combat** during those phases.
  - Disabled (with tooltip) if no PCs are assigned to the session.
- During `'initiative'` and `'active'`, the encounter panel's center pane is replaced by `InitiativeTracker`. The left ("Spawned Threats") and right ("The Party") columns stay so the GM can still adjust HP and select rows.
- Session route handles three new things:
  1. **Button click** → calls `rollInitiative`, then `setCombat`, then `gmPeer.broadcastStateSync()`, then `gmPeer.broadcast({ type: 'initiative_request', combat })`.
  2. **30-second deadline timer** — a `useEffect` keyed on `combat?.initiativeDeadline`. When it fires, calls `autoRollMissing` then `lockInitiativeOrder`, broadcasts state, and posts one chat log entry per auto-roll (so the toast still appears under the character name with "(auto)").
  3. **`player_roll` with `purpose: 'initiative'`** — peer handler calls `applyInitiativeRoll`. If, after applying, every combatant has a roll, immediately calls `lockInitiativeOrder` (don't wait for the deadline). Broadcasts state.

### Player UI (`src/routes/player/session.tsx` + new `src/components/combat/initiative-prompt.tsx`)

- New `InitiativePrompt` component renders when:
  - `session.combat?.phase === 'initiative'`, AND
  - the player has a combatant row with `initiativeRoll === undefined`.
- The prompt sits above the character sheet (top of the player main column, not the sidebar) so it's impossible to miss. Contents:
  - Header: **"Roll for initiative — Ns"** with N counting down from `initiativeDeadline`.
  - A reused `<DiceRoller lockedDie="d20" />` configured with the character's DEX modifier pre-applied. If the character has the `initiative_advantage` talent, the roller starts in advantage mode (and the mode toggle is disabled).
  - The roller's `onRoll` sends `player_roll { purpose: 'initiative', total, ... }` and the existing roll toast fires.
  - Once the player has rolled (or auto-rolled), the prompt is replaced by the `InitiativeTracker` view of the order forming.
- During `'active'` phase, the player sees the `InitiativeTracker` plus the existing on-turn dice roller (unchanged). The tracker is collapsible.

### Initiative tracker

`src/components/combat/initiative-tracker.tsx` is extended to handle the `'initiative'` phase:

- Rows for unrolled PCs show a small spinner + "rolling…" instead of an init number.
- Rows show "(auto)" when `initiativeRolledByAuto === true`.
- The header shows the countdown when `phase === 'initiative'`.
- GM-only "Roll for them" button on each unrolled row, which auto-rolls just that one combatant immediately. (Useful when a player is clearly AFK and the GM doesn't want to wait.)

### Talent integration

Initiative advantage comes from `character.talents` containing a talent with `mechanic.type === 'initiative_advantage'`. The player roller respects this; the GM auto-roll path also respects it (we pass the character into `autoRollMissing` and check the talent before rolling).

## Sequence — happy path

1. GM has 4 PCs in the session and 3 goblins on the field. Clicks **Roll Initiative**.
2. GM client: builds `CombatState` with 4 PC rows (no rolls yet) + 1 monster-group row (rolled now to 14). `initiativeDeadline = now + 30s`. `setCombat`. Broadcasts `state_sync` and `initiative_request`.
3. Each player sees the prompt at the top of their screen with a 30-second countdown. They tap roll. Each `player_roll { purpose: 'initiative' }` arrives at the GM.
4. GM applies each roll. After the 4th arrives, `lockInitiativeOrder` runs immediately. State broadcasts.
5. Both sides see the tracker. Active turn = first combatant. Active player sees the regular dice roller for actions.
6. GM clicks **Next Turn** to advance. Round 2 starts when wrapping. When the encounter ends, GM clicks **End Combat**, which clears combat state and re-enables **Resolve Encounter**.

## Sequence — timeout fallback

Same as happy path through step 3. At step 4, only 2 of 4 players rolled. The 30s timer fires on the GM client. `autoRollMissing` uses each missing character's DEX (and talent) to roll. Each auto-roll is broadcast as a roll toast labeled `"<Character> (auto)"`. `lockInitiativeOrder` runs. State broadcasts. From here it's identical.

## Edge cases

| Case                                            | Behavior                                                                                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GM clicks Roll Initiative with no monsters      | Button is disabled.                                                                                                                                     |
| GM clicks Roll Initiative with no PCs assigned  | Button is disabled with tooltip "Assign characters to players first".                                                                                   |
| Player joins after combat already started       | If their character had a row when combat began, they can still roll until the deadline; otherwise they have no row and wait for the next combat. The deadline does not reset on join. |
| Player disconnects mid-roll                     | Timer expires, GM auto-rolls for them. When they reconnect, they see the locked order via `state_sync`.                                                 |
| GM disconnects mid-combat                       | Combat state is in localStorage. On reload, the session resumes; if `phase === 'initiative'` and the deadline has passed, the GM client auto-finishes. |
| PC drops to 0 HP during combat                  | Row stays, marked defeated. `advanceTurn` already skips defeated. (Existing behavior.)                                                                  |
| Monster instance dies                           | Monster group row stays (it represents the group). Only when all monsters are defeated does the group row become defeated.                              |
| Initiative advantage talent                     | Player roller starts in advantage mode (locked). GM auto-roll uses advantage too.                                                                       |

## Testing

Add to `src/lib/rules/__tests__/combat.test.ts`:

- `rollInitiative` produces a `CombatState` with `phase: 'initiative'`, one row per PC, one row for monsters, monster row rolled, deadline set ~30s out.
- `applyInitiativeRoll` updates only the targeted combatant.
- `autoRollMissing` only rolls combatants without a roll, and respects `initiative_advantage` talent.
- `lockInitiativeOrder` sorts highest-first; PC beats monster on ties; sets phase to `'active'`.
- `advanceTurn` skips defeated combatants and increments `roundNumber` on wrap (existing behavior — keep test).

Add to `src/components/combat/__tests__/initiative-tracker.test.tsx` (new file):

- Renders countdown when `phase === 'initiative'`.
- Renders "rolling…" placeholder for unrolled rows.
- Renders "(auto)" tag for auto-rolled rows.

## Files touched (summary)

- `src/schemas/combat.ts` — add `initiativeDeadline`, `initiativeRolledByAuto`.
- `src/schemas/messages.ts` — add `initiative_request`.
- `src/lib/rules/combat.ts` — rewrite `rollInitiative`; add `applyInitiativeRoll`, `autoRollMissing`, `lockInitiativeOrder`.
- `src/stores/session-store.ts` — add `applyInitiativeRoll`, `lockInitiativeOrder`, `advanceCombatTurn`, `endCombat` actions if missing.
- `src/components/combat/initiative-tracker.tsx` — extend for initiative phase.
- `src/components/combat/initiative-prompt.tsx` — new.
- `src/components/gm/encounter-panel.tsx` — toggle button, render tracker during combat.
- `src/routes/gm/session.$sessionId.tsx` — button handler, deadline timer, peer handler for `player_roll{purpose:'initiative'}`.
- `src/routes/player/session.tsx` — render `InitiativePrompt`.
- Tests in `src/lib/rules/__tests__/combat.test.ts` and a new `initiative-tracker.test.tsx`.
- i18n keys: `combat.rollInitiative`, `combat.endCombat`, `combat.rollForInitiativeNs`, `combat.auto`, `combat.rolling`, `combat.initiativeOrder` — added to `src/i18n/locales/en/ui.json` and `es/ui.json`.

## Open questions

None. Both decisions confirmed:

1. Combat-toggle button replaces Resolve Encounter while combat is active.
2. Auto-rolls broadcast as normal roll toasts with "(auto)" tag.
