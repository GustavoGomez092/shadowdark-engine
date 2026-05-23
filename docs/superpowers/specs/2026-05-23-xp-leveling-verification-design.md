# XP Awarding & Leveling — Verification

**Date:** 2026-05-23
**Status:** Approved

## Problem

The GM/player flow for awarding XP, accumulating it, and leveling up appears to already
be implemented end-to-end:

- GM resolves an encounter → `RewardsDialog` → `distributeEncounterRewards()` updates each
  character's XP/gold in the session store → `gmPeer.broadcastStateSync()` syncs players.
- Player sees an XP bar and `getXpToNextLevel`/`canLevelUp`-driven "Ready to Level Up"
  button on the character sheet → `LevelUpWizard` → sends `player_level_up`.
- GM handles `player_level_up` → `levelUpCharacter()` → applies HP roll, talent, new
  spells → re-broadcasts authoritative state.

Because it is already wired, the goal is **verification, not rebuild**: confirm the
behavior matches the Shadowdark manual, lock the rules in with tests, exercise the flow
end-to-end, and fix only what is actually broken.

## Rules Reference (Shadowdark manual)

Confirmed from `Shadowdark_Booklet_Print.pdf` (Advancement / Leveling Up) and
`shadowdark_booklet.pdf` (Awarding XP):

| Rule | Value |
|------|-------|
| XP to gain a level | current level × 10 (`XP_THRESHOLDS` = {1:10 … 10:100}) |
| XP on leveling | resets to 0 |
| Level cap | 10 |
| Talent roll levels | 1, 3, 5, 7, 9 (`TALENT_LEVELS`) |
| HP on level up | roll the class's hit-points die, add to max HP |
| Treasure XP | Poor 0 / Normal 1 / Fabulous 3 / Legendary 10 (`TREASURE_XP`) |
| XP source | full treasure value to each PC; boons/clever play may award XP |

These already match `src/schemas/reference.ts` and `src/lib/rules/xp.ts`. Verification
confirms behavior, not just constants.

## Decisions

| Decision | Choice |
|----------|--------|
| Scope | Verify only — no new UI |
| Output | Automated rule tests + a documented manual E2E checklist |
| Bugs | Anything found during verification becomes a tracked fix, not speculative rework |

## Verification Plan

### Automated rule tests — `src/lib/rules/__tests__/xp-leveling.test.ts`

| Test | What it verifies |
|------|-----------------|
| Threshold math | `getXpToNextLevel` / `canLevelUp` use level × 10 across levels 1–9 |
| XP reset | `levelUpCharacter` sets `xp` to 0 |
| Level cap | `canLevelUp` is false at level 10 regardless of XP; level never exceeds 10 |
| Talent levels | `gainsTalentAtLevel` true at 1/3/5/7/9, false at 2/4/6/8/10 |
| HP gain | `levelUpCharacter` increases `maxHp` by the passed HP roll and heals that amount |
| Treasure XP | `awardTreasureXP` adds 0/1/3/10 by quality |
| Distribution | `distributeEncounterRewards` gives full XP to each character and reports `levelUps` |
| Progress | `getXPProgress` returns coherent current/needed/percent |

(Some of these may already exist; consolidate/extend rather than duplicate.)

### Manual E2E checklist (run against the live dev server, two clients)

Documented step-by-step with explicit acceptance criteria:

1. **Award via encounter** — GM resolves an encounter, opens `RewardsDialog`, distributes
   XP/gold. _Expect:_ each selected character's XP increases in the GM character list; the
   amount matches treasure quality + any bonus.
2. **Player sync** — _Expect:_ the player's XP bar advances to the new value within a
   moment of the GM distributing (state sync).
3. **Threshold indicator** — push a character to ≥ level×10 XP. _Expect:_ "Ready to Level
   Up" appears on the player's sheet; not before.
4. **Level-up wizard** — player completes the wizard (HP roll, talent if applicable,
   spell choices). _Expect:_ wizard only offers a talent roll at levels 1/3/5/7/9; spell
   choices appear for caster classes.
5. **Authoritative apply** — _Expect:_ GM character shows new level, increased max HP,
   XP reset to 0, added talent/spells; a level-up chat message posts.
6. **Re-sync** — _Expect:_ player sheet reflects the new level/HP/XP after the GM
   re-broadcast.
7. **Level cap** — a level-10 character with surplus XP shows no "Ready to Level Up".
8. **Persistence** — reload GM and player; levels/XP persist.

Each step gets a ✅/❌ with notes. Failures are filed as fixes.

## Fixes Applied During Verification

**Bug: ability score increases from talents were never applied.** Effective stats are
computed from `baseStats + statModifications` only; `computeEffectiveStats` never read
`talents`, and `levelUpCharacter` never converted a `stat_bonus` / "+2 to distribute"
choice into a `statModification`. So the chosen +2 was stored on the talent but never
reached the sheet. Affected every class (all have `stat_bonus` talents) and both the
"pick a stat" and "+2 distribute" paths.

Fix (TDD, in the rules layer so it is authoritative and tested):
- `deriveStatIncreases` (`src/lib/rules/talent-stats.ts`) — pure resolver from a talent
  choice to `{ stat, amount }[]`, covering single-option auto-apply, multi-option choice,
  distribution, and a stat_bonus talent picked via the choose-talent path.
- `levelUpCharacter(char, hpRoll, talent?, statIncreases?)` appends permanent
  `statModifications` for each increase, then recomputes.
- `LevelUpResult` / `PlayerLevelUp` / player send / GM handler all carry `statIncreases`.
- Wizard now also prompts which stat to raise when a stat_bonus talent is picked via the
  "choose a talent" option (previously no prompt → silently no effect).

**Bug: casters could not level up (found via E2E).** The GM's `player_level_up`
handler pushed new spells onto `character.spells.knownSpells` directly. That array is
part of the Immer-frozen session state, so the push threw — silently rejected by the GM
peer ("Bad message") for every class that sends `newSpellIds` (i.e. all casters). Martials
were unaffected. Fixed by extracting `applyPlayerLevelUp` (`src/lib/peer/apply-level-up.ts`),
which builds the leveled character **immutably** (new `knownSpells` array), and wiring the
route to it. Covered by `src/lib/peer/__tests__/apply-level-up.test.ts` (uses a deep-frozen
character to reproduce the crash).

**Gap: witch/seer have spell slots but no spells.** Spell data contains only `wizard`
and `priest` class spells; `witch`/`seer` classes open spell slots on level-up but
`getSpellsByClass('witch')` returns an empty list — a leveling witch sees an empty
spell-selection dropdown. Documented (not fixed — authoring a witch spell list is content
work) in `leveling-progression.test.ts` and flagged for follow-up.

## Test Coverage Added

- `src/lib/rules/__tests__/leveling-progression.test.ts` — deterministic: every class
  (thief/fighter/ranger/wizard/priest/witch) driven 1→10, asserting HP growth, +2-per-talent
  attribute increases, talent accumulation, and caster spell-slot growth.
- `src/lib/character/__tests__/leveling-e2e.test.ts` — Puppeteer (recommended over Cypress:
  already a dependency, matches existing E2E, runs `// @vitest-environment node`, gated on the
  dev server). Drives the real GM+player PeerJS flow: create session → join → create character
  → GM awards XP → player level-up wizard, for a Thief and a Wizard (asserting the caster is
  shown a real new-spell list). Browser launched with background-throttling disabled so WebRTC
  stays alive on the backgrounded GM tab.

## File Changes

### New Files
| Path | Purpose |
|------|---------|
| `src/lib/rules/__tests__/xp-leveling.test.ts` | Rule-locking unit tests (consolidate with any existing xp tests) |
| `docs/superpowers/verification/2026-05-23-xp-leveling-checklist.md` | Manual E2E checklist + results |

### Modified Files
| Path | Change |
|------|--------|
| _(only if verification finds a bug)_ | Targeted fix in the relevant rules/route/component |

### Unchanged Files (expected)
| Path | Why |
|------|-----|
| `src/lib/rules/xp.ts`, `src/lib/rules/character.ts` | Logic already matches the manual |
| `src/components/gm/rewards-dialog.tsx`, `src/components/character/level-up-wizard.tsx` | Already wired |
| `src/routes/gm/session.$sessionId.tsx` | `player_level_up` handler already present |
