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
