# Campaign Export/Import Validation & Testing

**Date:** 2026-04-12
**Status:** Approved

## Problem

The campaign creator exports JSON but lacks runtime validation. The import path accepts any object with `id` and `name` — no schema checks, no format detection, no defaults for missing fields. There are zero tests for the export/import pipeline.

## Decisions

| Decision | Choice |
|----------|--------|
| Import paths | Two separate paths: raw Campaign JSON vs. Adventure Document (`shadowdark-adventure-v1`) |
| Adventure doc structure | Strict superset — Campaign + `format` + `exportedAt` |
| Validation strictness | Lenient with defaults — validate types, fill missing optional fields, warn |
| Test strategy | Puppeteer for critical UI paths, Vitest for everything else |
| Sample adventure | Standalone `.json` file in `public/samples/`, not bundled in app |

## Architecture

### Zod Schemas — `src/lib/campaign/schema.ts`

Runtime Zod schemas mirroring every interface in `src/schemas/campaign.ts`. TypeScript interfaces remain the canonical type definitions; Zod schemas are used exclusively for validation at the import boundary.

**Schema tree:**

```
CampaignSchema
├── id: z.string()
├── name: z.string().min(1)
├── author: z.string().default('')
├── version: z.string().default('1.0')
├── description: z.string().default('')
├── createdAt: z.number().default(Date.now)
├── updatedAt: z.number().default(Date.now)
├── content: DataPackContentSchema.default({})
│   └── monsters/spells/weapons/armor/gear/backgrounds/deities/languages/ancestries/classes: [...].optional()
├── adventure: AdventureModuleSchema.default(empty adventure)
│   ├── hook: z.string().default('')
│   ├── overview: z.string().default('')
│   ├── targetLevel: z.tuple([z.number(), z.number()]).default([1, 3])
│   ├── rooms: AdventureRoomSchema[].default([])
│   │   └── each room: id, number, name, description, gmNotes, monsterIds[], treasure, traps[], connections[], mapId?
│   ├── randomEncounters: RandomEncounterTableSchema[].default([])
│   │   └── each table: id, name, diceExpression, entries[]
│   │       └── each entry: roll (number or [number, number]), description, monsterIds?, quantity?
│   └── npcs: AdventureNPCSchema[].default([])
│       └── each npc: id, name, ancestry, role, description, personality, stats?, portraitPrompt?
├── lore: LoreDocumentSchema.default({ chapters: [] })
│   └── chapters[]: id, title, sortOrder, sections[]
│       └── sections[]: id, title, content, sortOrder
└── maps: CampaignMapSchema[].default([])
    └── each map: id, name, width, height, cellSize, layers[], labels[], markers[], seed?, dungeonData?

AdventureDocumentSchema
├── format: z.literal('shadowdark-adventure-v1')
├── exportedAt: z.number()
└── ...all CampaignSchema fields
```

**Validation functions:**

- `validateCampaign(data: unknown): ValidationResult` — parses with `CampaignSchema.safeParse()`, returns `{ success, data?, errors? }`
- `validateAdventureDocument(data: unknown): ValidationResult` — parses with `AdventureDocumentSchema.safeParse()`, returns same shape
- Error messages are user-friendly strings (e.g., "Missing required field: name"), not raw Zod paths

**Return types:**

```typescript
interface ValidationResult<T> {
  success: boolean
  data?: T          // Present when success is true
  errors?: string[] // Present when success is false
}

interface ParseResult {
  success: boolean
  campaign?: Campaign  // Present when success is true
  errors?: string[]    // Present when success is false
}
```

### Export Refactor — `src/lib/campaign/export.ts`

`exportAdventureDocument` changes from object spread to explicit field mapping:

```typescript
export function exportAdventureDocument(campaign: Campaign): AdventureDocument {
  return {
    format: 'shadowdark-adventure-v1',
    exportedAt: Date.now(),
    id: campaign.id,
    name: campaign.name,
    author: campaign.author,
    version: campaign.version,
    description: campaign.description,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
    content: campaign.content,
    adventure: campaign.adventure,
    lore: campaign.lore,
    maps: campaign.maps,
  }
}
```

`exportAsDataPack` remains unchanged.

### Import Logic — `src/lib/campaign/import.ts`

New module that handles format detection and validation:

```typescript
export function parseCampaignFile(json: unknown): ParseResult
```

**Flow:**
1. Check if `json` is an object
2. Detect format: does it have `format === 'shadowdark-adventure-v1'`?
3. Route to validator:
   - Adventure doc → `validateAdventureDocument()` → strip `format` and `exportedAt` → return Campaign
   - No format field → `validateCampaign()` → return Campaign
4. Return `{ success: true, campaign }` or `{ success: false, errors: string[] }`

### UI Change — `src/routes/campaign/index.tsx`

`handleImport` refactored to use `parseCampaignFile`:

```typescript
function handleImport(file: File) {
  // ... FileReader boilerplate ...
  const json = JSON.parse(reader.result as string)
  const result = parseCampaignFile(json)
  if (result.success) {
    importCampaign(result.campaign)
    navigate(...)
  } else {
    setImportError(result.errors.join(', '))
  }
}
```

## Test Strategy

### Tier 1: Unit — `src/lib/campaign/__tests__/campaign-schema.test.ts`

| Test | What it verifies |
|------|-----------------|
| Valid full campaign | All fields present → passes validation, data unchanged |
| Minimal campaign (id + name only) | Missing fields get correct defaults |
| Missing id | Validation fails with clear error |
| Missing name | Validation fails with clear error |
| Wrong types | e.g., `targetLevel: "high"` → fails |
| Nested defaults | Missing `adventure` → empty module; missing `traps` → `[]` |
| Adventure room validation | Room with all fields passes; room missing fields gets defaults |
| Trap validation | Valid trap passes; defaults for detectionDC/disarmDC |
| NPC validation | Valid NPC passes; ancestry defaults to reasonable value |
| Encounter table validation | Valid table passes; entries with roll ranges work |
| Lore validation | Chapters with sections pass; empty chapters valid |
| Map validation | Full map with layers/labels/markers passes |
| Adventure doc — valid format | `format: 'shadowdark-adventure-v1'` + valid campaign → passes |
| Adventure doc — wrong format | `format: 'wrong'` → fails |
| Content arrays | Monsters/spells/weapons validate against sub-schemas |

### Tier 2: Integration — `src/lib/campaign/__tests__/campaign-export-import.test.ts`

| Test | What it verifies |
|------|-----------------|
| Empty campaign round-trip | create → export → parse → identical |
| Rich campaign round-trip | All fields populated → export → import → all data preserved |
| DataPack export | Campaign → `exportAsDataPack` → valid DataPack |
| Format detection | `parseCampaignFile` routes adventure docs vs raw campaigns |
| Metadata stripping | `format`/`exportedAt` not present in resulting Campaign |
| Lenient import | JSON missing optional fields → imports with defaults |
| Invalid JSON shape | Returns error messages, no crashes |
| Cross-field integrity | Referenced monsterIds exist in content, mapIds exist in maps |

### Tier 3: E2E — `src/lib/campaign/__tests__/campaign-e2e.test.ts`

| Test | What it verifies |
|------|-----------------|
| Export happy path | Create campaign → export → downloaded JSON is valid adventure doc |
| Import happy path | Upload valid adventure JSON → campaign loads with data |
| Import error path | Upload invalid file → error message displayed |

Puppeteer against dev server. Longer timeout. Can run independently via `vitest run campaign-e2e`.

### Test Fixtures

`makeFullCampaign()` helper that builds a campaign with all fields populated:
- 2 rooms (one with traps, one with monster refs)
- 2 NPCs (one with stats, one without)
- 1 encounter table with mixed entries (single roll + range)
- 1 lore chapter with 2 sections
- 1 map with layers, labels, markers
- Content: 1 monster, 1 spell, 1 weapon

Reused across all three test tiers.

## File Changes

### New Files
| Path | Purpose |
|------|---------|
| `src/lib/campaign/schema.ts` | Zod schemas + validation functions |
| `src/lib/campaign/import.ts` | `parseCampaignFile` — format detection + validation |
| `src/lib/campaign/__tests__/campaign-schema.test.ts` | Tier 1 unit tests |
| `src/lib/campaign/__tests__/campaign-export-import.test.ts` | Tier 2 integration tests |
| `src/lib/campaign/__tests__/campaign-e2e.test.ts` | Tier 3 Puppeteer tests |
| `public/samples/sample-adventure.json` | Standalone sample adventure (created after implementation) |

### Modified Files
| Path | Change |
|------|--------|
| `src/lib/campaign/export.ts` | `exportAdventureDocument` → explicit fields, typed return |
| `src/routes/campaign/index.tsx` | `handleImport` → uses `parseCampaignFile` |

### Unchanged Files
| Path | Why |
|------|-----|
| `src/schemas/campaign.ts` | TypeScript interfaces stay as canonical types |
| `src/stores/campaign-store.ts` | Receives already-validated Campaign objects |
| `src/lib/campaign/defaults.ts` | Factory functions unchanged |
| All UI editor components | No editor changes needed |
