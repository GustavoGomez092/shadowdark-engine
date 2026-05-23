# XP & Leveling — Manual E2E Verification Checklist

**Date:** 2026-05-23
**Related spec:** `../specs/2026-05-23-xp-leveling-verification-design.md`

Run against the dev server (`pnpm dev`, http://localhost:3000) with two clients: a
GM session and a connected player. Mark each step ✅/❌ with notes. File any ❌ as a fix.

## Automated coverage (already passing)

`src/lib/rules/__tests__/xp-leveling.test.ts` locks the manual's rules:
- level × 10 XP to advance; XP resets to 0; level cap 10
- talent rolls at 1/3/5/7/9; HP die added to max HP on level up
- treasure XP 0/1/3/10; `distributeEncounterRewards` full XP per PC + level-up detection
- **talent ability-score increases applied as permanent stat modifications** (the bug fixed during this pass)

## Manual steps

| # | Step | Expected | Result |
|---|------|----------|--------|
| 1 | GM resolves an encounter → Rewards dialog → distribute XP/gold | Each selected character's XP rises by treasure quality + bonus; gold added | |
| 2 | Observe the player client | Player XP bar advances to the new value shortly after (state sync) | |
| 3 | Push a character to ≥ level×10 XP | "Ready to Level Up" appears on the player's sheet; not before | |
| 4 | Player opens the level-up wizard | Talent step only at levels 1/3/5/7/9; spell step only for caster classes with new slots | |
| 5 | Wizard talent roll lands on a **stat-boost** talent (e.g. "+2 to STR/DEX/CON") | Wizard prompts which stat to raise; cannot finish until chosen | |
| 6 | Choose the **"+2 to distribute"** option | Wizard enforces exactly 2 points distributed | |
| 7 | Pick a stat-boost talent via the **"choose a talent"** path | Wizard now prompts for the stat (previously missing) | |
| 8 | Complete the wizard | GM character shows new level, increased max HP, XP reset to 0, added talent/spells; **chosen ability score increased on the sheet**; level-up chat message posts | |
| 9 | Observe the player client after GM applies | Player sheet reflects new level/HP/XP and the raised ability score | |
| 10 | Take a Rest after leveling | The talent's stat increase persists (permanent modification) | |
| 11 | Level-10 character with surplus XP | No "Ready to Level Up" shown | |
| 12 | Reload GM and player | Levels/XP/stat increases persist | |

## Notes

_Record observations, anomalies, and follow-up fixes here._
