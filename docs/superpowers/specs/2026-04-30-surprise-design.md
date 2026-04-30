# Surprise — Design

Date: 2026-04-30
Status: Approved (pending user review of this doc)

## Goal

Add a GM-triggered "surprise" mechanic to the initiative flow we just shipped. Before the order is rolled, the GM declares which combatants are surprised. Surprised combatants are skipped during round 1 only and act normally from round 2 onward.

The dialog supports both side-level defaults ("the whole party is surprised") and per-row overrides ("but the wizard heard them first") and silently disables the surprise checkbox for combatants whose game mechanics already prevent surprise (Goblin ancestry, future +Vigilant spear, etc.).

## ShadowDark RAW

> When characters or creatures are surprised, they cannot act for the first round of combat. Initiative is rolled normally, but surprised combatants are skipped on round 1 only.

So surprise is an attribute of *individual combatants on round 1*, not a separate phase. Initiative still rolls; the order is still locked; some rows just get skipped during round 1.

## Current state

- `CombatPhase` includes `'surprise'` and `CombatState.surpriseActors?: string[]` exists in `src/schemas/combat.ts` — both are defined but never read or written. We will reuse `surpriseActors` and ignore the `'surprise'` phase value (we don't need a separate phase per RAW).
- `AncestryMechanic` already has a `'cannot_be_surprised'` discriminator and the `goblin` ancestry definition uses it (`src/data/ancestries.ts:32`).
- `Bandit` monster has an `Ambush` ability that says "If the bandit surprises a target, it deals an extra 1d6 damage on its first attack." This is RAW-correct flavor but currently does no engine work. **Out of scope for this spec** — handled as a follow-up. We only build the turn-skip half of surprise.
- The Goblin *monster* definition does not yet have a Keen Senses flag in code. Per RAW it should — we will add it as a small data fix as part of this work.

## Non-goals

- Damage bonuses against surprised targets (e.g., Bandit Ambush, Thief Backstab triggering on surprise). These are separate mechanics; we ship turn-skip first and add bonuses later.
- A separate "surprise round" phase. RAW says initiative rolls normally; we honor that.
- Surprise auto-detection from narrative state (stealth checks, light, perception). Surprise is the GM's call; the engine just records the call.

## Architecture

### Phase machine

No new phases. Combat still goes `null → 'initiative' → 'active' → null`. The only addition is that during the `'initiative'` phase the GM can edit `combat.surpriseActors`, and `advanceCombatTurn` reads it during round 1.

### Schema changes

**`src/schemas/combat.ts`** — `CombatState.surpriseActors` already exists as `string[] | undefined`. No type change. We just start using it.

**`src/schemas/monsters.ts`** — add an optional flag:

```ts
export interface MonsterDefinition {
  // ... existing fields ...
  cannotBeSurprised?: boolean;
}
```

Set on monsters whose stat block has "Can't be surprised" (Goblin per RAW, plus the Ghost's `Greater Undead` doesn't grant immunity to surprise so it stays unflagged — only mechanics that explicitly say "Can't be surprised" qualify).

### Rules engine changes

**`src/lib/rules/combat.ts`**

- `rollInitiative()` accepts an optional new parameter:
  ```ts
  options?: { surprisedCombatantIds?: string[] }
  ```
  If provided, it sets `combat.surpriseActors = options.surprisedCombatantIds` on the returned state. If absent or empty, `surpriseActors` is left undefined.

- `advanceCombatTurn()` (and the equivalent in the store) skip a combatant if **all** of these hold: `combat.roundNumber === 1` AND `combat.surpriseActors?.includes(combatant.id)`. After the round-1→2 wrap, `surpriseActors` is cleared (set to `undefined`) so future rounds don't re-skip. The skip behavior reuses the same `foundLive` loop pattern that already handles defeated combatants.

- New helper `getCombatantsImmuneToSurprise(characters, monsters)`:
  - For each PC combatant, check if `character.ancestry`'s mechanics include `cannot_be_surprised`.
  - For each monster combatant, check the monster definition's `cannotBeSurprised` flag.
  - Returns the set of combatant IDs that should be auto-disabled in the dialog.

This helper lives in `combat.ts` and is exported so the dialog component can call it.

### Store changes

**`src/stores/session-store.ts`**

- Existing `setCombat()` already accepts a `CombatState` with whatever `surpriseActors` value the GM constructed — no change.
- `advanceCombatTurn` action mirrors the rules engine's new round-1 skip logic and clears `surpriseActors` on round-1→2 wrap.

### GM UI

**New component: `src/components/gm/surprise-dialog.tsx`**

A modal that appears when the GM clicks **Roll Initiative** *if* the encounter has both a party and monsters (otherwise the existing one-click flow runs). Layout:

```
┌─ Surprise ─────────────────────────────────────┐
│                                                │
│  Who's surprised?                              │
│   ◉ Nobody  ○ The party  ○ The monsters       │
│                                                │
│  Combatants                                    │
│   ☑ Ralina (Human Fighter)                    │
│   ☐ Jorbin (Goblin Thief) — Keen Senses       │
│   ☑ Bandit                                    │
│   ☐ Goblin Scout — Keen Senses                │
│                                                │
│             [Cancel]  [Roll Initiative]       │
└────────────────────────────────────────────────┘
```

Behavior:
- Picking a side-level radio pre-checks all combatants on that side. Picking *Nobody* (default) clears all checkboxes. Per-row checkboxes can still be flipped freely after a side is chosen.
- Combatants returned by `getCombatantsImmuneToSurprise` show a subtle "Keen Senses" / "Can't be surprised" tag and their checkbox is forcibly unchecked + disabled.
- Clicking **Roll Initiative** in the modal calls `rollInitiative(...)` with `surprisedCombatantIds` as the array of checked combatant IDs (excluding immune ones).
- Clicking **Cancel** closes the modal without starting combat.
- The combatants in the modal are computed from `assignedCharacters` + the monster group row that `rollInitiative` will eventually create — but we list **PCs individually** and **monsters individually** at modal time even though the monster group row is collapsed in combat. The modal needs a stable identity for each row: PC combatants use `pc:${characterId}`, monster combatants use `monster:${instanceId}`. `rollInitiative` then translates these into actual combatant ids when it builds the combatants array.

  This separates the *data identity* (a specific PC or monster instance) from the *runtime combatant id* (a fresh generated id at roll time).

  Cleaner alternative: the modal stores `surprisedCharacterIds: string[]` and `surprisedMonsterInstanceIds: string[]`, and `rollInitiative` builds `surpriseActors` by mapping those into combatant ids during construction. **We use this alternative.** Public surface: `rollInitiative(characters, monsters, options?: { surprisedCharacterIds?: string[]; surprisedMonsterInstanceIds?: string[] })`. The monster group row counts as surprised iff *any* surprisedMonsterInstanceIds matches one of the monster instances — note this is a coarsening, since the engine collapses all monsters into one row. **All-or-nothing for the monster group on round 1.** If the GM wants per-monster surprise, they must end combat and re-spawn — out of scope.

### Encounter panel changes

**`src/components/gm/encounter-panel.tsx`**

The `onRollInitiative` callback no longer fires immediately. Instead it opens the new `SurpriseDialog`. The dialog calls back with the surprise selection, and *that* callback runs the existing initiative-start logic.

Wire flow:
1. GM clicks **Roll Initiative** → `setSurpriseDialogOpen(true)`
2. Dialog renders, GM picks options, clicks **Roll Initiative** in dialog → `onConfirmRollInitiative({ surprisedCharacterIds, surprisedMonsterInstanceIds })`
3. The session route's existing `onRollInitiative` body runs, now using the surprise options as a parameter to `rollInitiative()`.

### Tracker UI

**`src/components/combat/initiative-tracker.tsx`**

When `combat.roundNumber === 1` and a row's combatant id is in `combat.surpriseActors`, show a "💤 Surprised" badge next to the (auto) tag. The tag goes away on round 2 because we clear `surpriseActors` on the wrap.

The "Active" badge does NOT appear on a surprised row in round 1, because `currentTurnIndex` skips them. Existing logic.

### Data changes

**`src/data/monsters.ts`**

Add `cannotBeSurprised: true` to:
- `goblin` (RAW: Keen Senses)

That's the only RAW-confirmed monster with this trait in the current 244-monster set. Other "alert" or "perceptive" creatures (Bat Giant, etc.) don't get the flag because their stat blocks don't grant explicit surprise immunity.

If the user adds homebrew packs with surprise-immune monsters, the pack format already supports custom monster fields, so `cannotBeSurprised` Just Works in custom data once it's on the type.

### i18n changes

Add to `src/i18n/locales/en/ui.json` and `es/ui.json`:

| Key | EN | ES |
|---|---|---|
| `combat.surprise` | Surprise | Sorpresa |
| `combat.surpriseTitle` | Who's surprised? | ¿Quién es sorprendido? |
| `combat.surpriseNobody` | Nobody | Nadie |
| `combat.surpriseParty` | The party | El grupo |
| `combat.surpriseMonsters` | The monsters | Los monstruos |
| `combat.combatants` | Combatants | Combatientes |
| `combat.cantBeSurprised` | Can't be surprised | No puede ser sorprendido |
| `combat.surprisedBadge` | Surprised | Sorprendido |
| `common.cancel` | Cancel | Cancelar |

(`common.cancel` may already exist — verify before adding.)

## Sequence — full surprise flow

1. GM has 2 PCs (Ralina the Human Fighter, Jorbin the Goblin Thief) and 3 Bandits on the field.
2. GM clicks **Roll Initiative**. The Surprise dialog opens.
3. Dialog auto-disables and unchecks Jorbin (Goblin ancestry → Keen Senses).
4. GM picks **The party**. Ralina's checkbox auto-checks. Jorbin stays unchecked (immune).
5. GM clicks **Roll Initiative** in the dialog. Combat starts in `'initiative'` phase with `surpriseActors: [<Ralina's combatant id>]`.
6. Player roll prompt appears for Ralina and Jorbin as before. The monster group row already has its roll. 30s timer ticks.
7. Both PCs roll (or get auto-rolled). Order locks. Phase → `'active'`.
8. Tracker shows: Ralina **💤 Surprised**, Jorbin, Monsters in initiative order. Whoever's first that *isn't* Ralina becomes the active turn.
9. GM clicks **Next Turn** through round 1. When the pointer would land on Ralina, the loop in `advanceCombatTurn` skips her (just like a defeated combatant) and proceeds.
10. On wrap to round 2, `combat.roundNumber` becomes 2, `combat.surpriseActors = undefined`, the badge disappears. Ralina acts normally from this point forward.

## Sequence — surprise the monsters

1. GM picks **The monsters** in the dialog.
2. All Bandit instances are added to `surprisedMonsterInstanceIds`.
3. `rollInitiative` constructs the monster group row and adds *its* combatant id to `surpriseActors` (since the group is fully surprised).
4. Round 1: only PCs act. Monsters are skipped.
5. Round 2: Monsters act normally.

## Sequence — split surprise (per-row override)

GM picks **The party** as default but un-checks Ralina because "she heard footsteps and drew her sword" — she's then *not* in `surpriseActors` while Jorbin (who isn't immune anyway) and any other party members remain surprised. Engine doesn't care about narrative; it only honors the final checked list.

## Edge cases

| Case | Behavior |
|---|---|
| GM cancels the dialog | No combat starts. State unchanged. |
| GM checks every combatant on both sides | All are surprised; round 1 has no actors and immediately wraps to round 2. (We log a system-message "All combatants surprised — skipping to round 2.") |
| GM checks zero combatants | Identical to today's behavior. `surpriseActors` is undefined. |
| Monster group is partially surprised in the dialog | The group row counts as surprised iff *any* of its instances are checked. Documented limitation. |
| Player joins mid-combat (after round 1) | They have no row. `surpriseActors` is already cleared. No special case needed. |
| Combat ends and restarts in same session | New combat → new dialog → new selection. `surpriseActors` from old combat is gone with the old `combat` state. |
| GM force-rolls a surprised combatant during the 'initiative' phase | Doesn't matter — initiative roll is independent of surprise. The roll happens; the row still gets skipped on round 1. |
| Combatant with `cannot_be_surprised` is force-checked via DOM tampering | Defense-in-depth: `rollInitiative` filters out immune ids before saving to `surpriseActors`. |

## Testing

Add to `src/lib/rules/__tests__/combat.test.ts`:

- `rollInitiative` with `surprisedCharacterIds` populates `surpriseActors` with the matching combatant ids.
- `rollInitiative` filters out characters whose ancestry has `cannot_be_surprised`.
- `rollInitiative` with all monster instance ids surprised marks the monster group row surprised; with *some* surprised it still marks the group.
- `getCombatantsImmuneToSurprise` returns Goblin PCs and Goblin-flagged monsters.
- `advanceTurn` (existing function) is extended in tests:
  - Round 1: surprised combatants are skipped.
  - Round 1→2 wrap: `surpriseActors` is cleared on the returned state.
  - Round 2+: previously surprised combatants act normally.

Add to existing store tests if they exist (none currently for combat actions — keep coverage in the rules engine layer).

## Files touched (summary)

- `src/schemas/monsters.ts` — add `cannotBeSurprised?: boolean`
- `src/data/monsters.ts` — set `cannotBeSurprised: true` on Goblin
- `src/lib/rules/combat.ts` — extend `rollInitiative`, `advanceTurn`; add `getCombatantsImmuneToSurprise`
- `src/lib/rules/__tests__/combat.test.ts` — 6 new tests
- `src/stores/session-store.ts` — extend `advanceCombatTurn` to clear `surpriseActors` on wrap and skip surprised rows on round 1
- `src/components/gm/surprise-dialog.tsx` — new
- `src/components/gm/encounter-panel.tsx` — open dialog instead of firing initiative directly; new `onConfirmRollInitiative` prop
- `src/components/combat/initiative-tracker.tsx` — render "Surprised" badge on round 1
- `src/routes/gm/session.$sessionId.tsx` — pass surprise selection through to `rollInitiative`
- `src/i18n/locales/en/ui.json`, `es/ui.json` — 9 keys (one verifiable as already present)

## Open questions

None. The remaining ambiguities have decisions:
- Monster group surprise is all-or-nothing for the group row.
- The `'surprise'` phase value in `CombatPhase` stays defined but unused.
- Bandit *Ambush* and similar damage-on-surprise effects are deferred to a follow-up spec.
