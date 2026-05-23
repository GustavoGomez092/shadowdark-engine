# Character Export / Import

**Date:** 2026-05-23
**Status:** Approved

## Problem

Shadowdark characters are long-lived: they outlive any single session and can move
between campaigns and tables. Today the engine can only export an entire *session*
(`src/lib/storage/session-export.ts`) — there is no way to move a single character,
with its level, XP, equipment, known spells, talents, and abilities, from one game to
another. Players and GMs need to export a character to a portable file and import it
into any session.

## Decisions

| Decision | Choice |
|----------|--------|
| Portable unit | A single `Character` serialized to a `.json` file |
| Format envelope | `shadowdark-character-v1` — `{ format, exportedAt, engineVersion, character }` |
| Export availability | Player exports own character (incl. mid-session); GM exports any character |
| Import availability | Player join flow (becomes that player's character); GM characters route (added unassigned) |
| Transient state on import | Reset — `currentHp → maxHp`; clear conditions, death timer, dying flag, active focus spell; reset `hasLuckToken` to its default. Keep level, XP, equipment, known spells, talents/abilities, weapon masteries |
| Identity on import | Assign new `id`; clear `playerId` (re-bound on join/assignment) |
| Unresolved data-pack refs | Import anyway; collect warnings for spell IDs / item definition IDs not found in installed packs |
| Validation | Zod `CharacterSchema` at the import boundary; TS interfaces remain canonical |

## Architecture

### Zod Schema — `src/lib/character/schema.ts`

Runtime Zod schemas mirroring the interfaces in `src/schemas/character.ts`,
`src/schemas/inventory.ts`, and `src/schemas/spells.ts`. TypeScript interfaces remain
the canonical type definitions; the Zod schema is used exclusively to validate at the
import boundary. The `computed` block (`ComputedCharacterValues`) is validated leniently
because it is recomputed on import (see Import Logic).

**Schema tree (abridged):**

```
CharacterSchema
├── id: z.string()
├── playerId: z.string()
├── name: z.string().min(1)
├── ancestry / class / alignment: z.enum(...)
├── level: z.number().int().min(1).max(10)
├── xp: z.number().int().min(0)
├── background / deity? / title: z.string()
├── languages: z.string().array().default([])
├── baseStats: AbilityScoresSchema            // Record<STR..CHA, number>
├── statModifications: StatModificationSchema[].default([])
├── maxHp / currentHp: z.number().int()
├── isDying: z.boolean().default(false)
├── deathTimer?: DeathTimerSchema.optional()
├── inventory: InventoryStateSchema            // items[] + coins{gp,sp,cp}
├── spells: CharacterSpellStateSchema          // knownSpells[], activeFocusSpell?, penances[]
├── conditions: ActiveConditionSchema[].default([])
├── talents: AppliedTalentSchema[].default([])
├── ancestryTraitUsed / hasLuckToken: z.boolean()
├── elfChoice?: z.enum(['ranged','spellcasting']).optional()
├── weaponMasteries: z.string().array().default([])
├── notes: z.string().default('')
└── computed: ComputedCharacterValuesSchema.optional()   // recomputed on import

CharacterExportSchema
├── format: z.literal('shadowdark-character-v1')
├── exportedAt: z.number()
├── engineVersion: z.string()
└── character: CharacterSchema
```

**Validation function:**

- `validateCharacterExport(data: unknown): ValidationResult<CharacterExport>` — parses
  with `safeParse()`, returns `{ success, data?, errors? }`; error messages are
  user-friendly strings, not raw Zod paths.

### Export — `src/lib/character/export.ts`

```typescript
const ENGINE_VERSION = '1.0.0'

export function exportCharacter(character: Character): CharacterExport {
  return {
    format: 'shadowdark-character-v1',
    exportedAt: Date.now(),
    engineVersion: ENGINE_VERSION,
    character,
  }
}

export function characterFilename(character: Character): string {
  // e.g. "thorin-the-bold-lvl3.json", slugified, safe for filesystem
}
```

Reuses the existing `downloadJson(json: string, filename: string)` helper pattern from
`src/lib/storage/session-export.ts` (extract to a shared util if convenient, otherwise
duplicate the tiny helper — match existing approach, no new dependency).

### Import Logic — `src/lib/character/import.ts`

```typescript
export interface CharacterImportResult {
  valid: boolean
  character?: Character        // present when valid
  warnings?: string[]          // unresolved spell/item references
  errors?: string[]            // present when invalid
}

export function parseCharacterImport(json: unknown): CharacterImportResult
```

**Flow:**
1. Validate envelope with `validateCharacterExport()`. Also accept a raw `Character`
   object (no `format` field) for forward-compatibility, validated with `CharacterSchema`.
2. On success, transform the character:
   - `id = nanoid()` (new identity), `playerId = ''` (re-bound later).
   - **Reset transient state:** `currentHp = maxHp`, `isDying = false`,
     `deathTimer = undefined`, `conditions = []`, `spells.activeFocusSpell = undefined`,
     `hasLuckToken` reset to its default.
   - Recompute derived values via the existing character-rules recompute helper used by
     `levelUpCharacter` (so `computed` is always trustworthy regardless of source).
3. **Resolve references against installed packs** (`dataRegistry.getPacks()`):
   - For each `knownSpell.spellId` not found → warning `Spell "<id>" not found in installed data packs`.
   - For each `inventory.items[].definitionId` not found → warning (item still renders;
     `name`/`category`/`slots` are stored inline on the item).
   - Warnings never block import.
4. Return `{ valid: true, character, warnings }` or `{ valid: false, errors }`.

### UI — Export

**Player session** (`src/routes/player/session.tsx`): an "Export Character" action on the
player's own character sheet/menu, available at any time during the session. Calls
`exportCharacter(myCharacter)` → `downloadJson(...)`.

**GM** (`src/components/character/character-sheet.tsx` action row, alongside the existing
luck-token button at the top-right; surfaced from `src/routes/gm/characters.tsx`): export
the selected character.

### UI — Import

**Player join** (`src/routes/player/join.tsx`): an "Import character from file" option
alongside the existing create/select-character choices. On a valid file the parsed
character is offered as the character the player joins with; the GM assigns `playerId` on
join via the existing join handling. Warnings are shown before the player commits.

**GM characters** (`src/routes/gm/characters.tsx`): an "Import character" button. On a
valid file, `addCharacter()` adds it to `session.characters` with the new `id` and empty
`playerId`; the GM assigns it to a player later through the existing player-menu flow.
Warnings are shown after import.

## Test Strategy

### Tier 1: Unit — `src/lib/character/__tests__/character-schema.test.ts`

| Test | What it verifies |
|------|-----------------|
| Valid full character | All fields present → passes, data unchanged |
| Minimal character | Missing optional fields get defaults |
| Missing id / name | Fails with clear error |
| Out-of-range level (0, 11) | Fails validation |
| Wrong types | e.g. `xp: "lots"` → fails |
| Envelope wrong format | `format: 'wrong'` → fails |
| Raw character (no envelope) | Accepted and validated |

### Tier 2: Integration — `src/lib/character/__tests__/character-export-import.test.ts`

| Test | What it verifies |
|------|-----------------|
| Round-trip | build → export → parse → progression fields identical |
| New identity | imported `id` differs from source; `playerId` cleared |
| Transient reset | dying/conditions/deathTimer/activeFocus cleared; `currentHp === maxHp` |
| Computed recompute | `computed` matches a fresh recompute of the imported character |
| Unresolved spell | spell id absent from packs → warning, still imported |
| Unresolved item def | item def absent → warning, item still present with inline name |
| Filename slug | `characterFilename` produces a safe, descriptive name |

### Tier 3: E2E — `src/lib/character/__tests__/character-e2e.test.ts`

| Test | What it verifies |
|------|-----------------|
| GM export happy path | Select character → export → downloaded JSON is a valid envelope |
| GM import happy path | Import valid file → character appears in list, unassigned |
| Player join import | Join with imported file → character becomes the player's |
| Import error path | Invalid file → error message displayed, no crash |

Puppeteer against the dev server; Vitest for Tiers 1–2. Reuse a `makeFullCharacter()`
fixture (level 3, mixed inventory incl. a magic item, ≥2 known spells, ≥1 talent,
non-empty notes) across tiers.

## File Changes

### New Files
| Path | Purpose |
|------|---------|
| `src/lib/character/schema.ts` | Zod schemas + `validateCharacterExport` |
| `src/lib/character/export.ts` | `exportCharacter`, `characterFilename` |
| `src/lib/character/import.ts` | `parseCharacterImport` (transform + ref resolution) |
| `src/lib/character/__tests__/character-schema.test.ts` | Tier 1 |
| `src/lib/character/__tests__/character-export-import.test.ts` | Tier 2 |
| `src/lib/character/__tests__/character-e2e.test.ts` | Tier 3 |

### Modified Files
| Path | Change |
|------|--------|
| `src/routes/player/session.tsx` | Export-own-character action (mid-session) |
| `src/routes/player/join.tsx` | Import-from-file option in join flow |
| `src/routes/gm/characters.tsx` | Import-character button |
| `src/components/character/character-sheet.tsx` | Export action in the sheet header |

### Unchanged Files
| Path | Why |
|------|-----|
| `src/schemas/character.ts` | TS interfaces stay canonical |
| `src/stores/session-store.ts` | `addCharacter` already accepts a full Character |
| `src/lib/rules/character.ts` | Reuse existing recompute helper, no change |
