# Generalized Random Tables Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the encounter-only table system with a generalized random table system that supports multiple kinds (encounter, loot, event, custom), multi-attachment to rooms/maps, a dedicated Tables tab, and full PDF/export/import support.

**Architecture:** Tables become a top-level `campaign.tables: RandomTable[]` array, replacing `adventure.randomEncounters`. Each table has a `kind` field, optional `customKind` label, and an `attachments` array linking it to rooms and maps. The old encounter table data is auto-migrated on load and import.

**Tech Stack:** TypeScript, Zod 4 (validation), Zustand 5 + Immer (state), React 19 (UI), @react-pdf/renderer (PDF), TanStack Router (routing), Vitest (tests)

**Spec:** `docs/superpowers/specs/2026-04-16-generalized-random-tables-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/schemas/campaign.ts` | Modify | New `RandomTable`, `RandomTableEntry`, `TableAttachment`, `TableKind` types. Remove `RandomEncounterTable`, `RandomEncounterEntry`. Add `tables` to `Campaign`, remove `randomEncounters` from `AdventureModule`. |
| `src/lib/campaign/schema.ts` | Modify | New Zod schemas `RandomTableSchema`, `RandomTableEntrySchema`, `TableAttachmentSchema`. Remove old encounter schemas. Add `tables` to `CampaignSchema`. Add `migrateRandomEncounters()` helper. |
| `src/lib/campaign/defaults.ts` | Modify | Replace `createEmptyEncounterTable()` with `createEmptyTable(kind)`. Update `createEmptyCampaign()`. |
| `src/stores/campaign-store.ts` | Modify | Replace encounter table methods with `addTable`, `updateTable`, `removeTable`, `attachTable`, `detachTable`. Add migration in `loadCampaign()`. |
| `src/lib/campaign/export.ts` | Modify | Add `tables` to `AdventureDocument` and `exportAdventureDocument()`. |
| `src/lib/campaign/import.ts` | Modify | Add migration call in `parseCampaignFile()`. |
| `src/routes/campaign/$campaignId.tables.tsx` | Create | New Tables tab page with list, filter, and editor modal trigger. |
| `src/components/campaign/tables/table-editor.tsx` | Create | Generalized table editor modal with kind selector, attachment picker, conditional encounter fields. |
| `src/components/campaign/adventure/encounter-table-editor.tsx` | Delete | Replaced by `tables/table-editor.tsx`. |
| `src/routes/campaign/$campaignId.adventure.tsx` | Modify | Remove encounters tab, add reference link to Tables tab. |
| `src/components/campaign/campaign-header.tsx` | Modify | Add Tables nav item. |
| `src/lib/campaign/pdf/adventure-pdf.tsx` | Modify | Replace `EncounterTable` with generalized `RandomTablePDF`. Add tables section, attachment bar, room references. |
| `src/i18n/locales/en/ui.json` | Modify | Add table-related translation keys. |
| `src/i18n/locales/es/ui.json` | Modify | Add table-related translation keys. |
| `src/lib/campaign/__tests__/tables-schema.test.ts` | Create | Zod schema validation tests. |
| `src/lib/campaign/__tests__/tables-migration.test.ts` | Create | Migration logic tests. |
| `src/lib/campaign/__tests__/tables-export-import.test.ts` | Create | Round-trip export/import tests. |
| `src/lib/campaign/__tests__/tables-store.test.ts` | Create | Store operation tests. |

---

## Task 1: Schema Types

**Files:**
- Modify: `src/schemas/campaign.ts`

- [ ] **Step 1: Replace type definitions**

Open `src/schemas/campaign.ts`. Replace the encounter table types and update Campaign/AdventureModule:

```typescript
// Replace lines 69-81 (RandomEncounterTable and RandomEncounterEntry) with:

// ── Random Tables ──

export type TableKind = 'encounter' | 'loot' | 'event' | 'custom'

export interface TableAttachment {
  type: 'room' | 'map'
  id: string
}

export interface RandomTable {
  id: string
  name: string
  kind: TableKind
  customKind?: string
  diceExpression: string
  entries: RandomTableEntry[]
  attachments: TableAttachment[]
}

export interface RandomTableEntry {
  roll: number | [number, number]
  description: string
  monsterIds?: string[]
  quantity?: string
}
```

Then update the `Campaign` interface (line 8) to add `tables`:

```typescript
export interface Campaign {
  id: string
  name: string
  author: string
  version: string
  description: string
  createdAt: number
  updatedAt: number
  content: DataPackContent
  tables: RandomTable[]
  adventure: AdventureModule
  lore: LoreDocument
  maps: CampaignMap[]
}
```

And remove `randomEncounters` from `AdventureModule` (line 29):

```typescript
export interface AdventureModule {
  hook: string
  overview: string
  targetLevel: [number, number]
  rooms: AdventureRoom[]
  npcs: AdventureNPC[]
  stores: AdventureStore[]
}
```

- [ ] **Step 2: Verify TypeScript compiles the schema file**

Run: `cd "/Volumes/Content/projects/ShadowDark Engine/shadowdark-engine" && npx tsc --noEmit src/schemas/campaign.ts 2>&1 | head -20`

Expected: Errors in OTHER files that reference the old types (this is expected and will be fixed in subsequent tasks). The schema file itself should have no errors.

- [ ] **Step 3: Commit**

```bash
git add src/schemas/campaign.ts
git commit -m "$(cat <<'EOF'
feat(tables): generalize RandomTable schema with kind, attachments, and top-level campaign.tables

Replace RandomEncounterTable/RandomEncounterEntry with RandomTable/RandomTableEntry.
Add TableKind, TableAttachment types. Move tables to Campaign top-level,
remove randomEncounters from AdventureModule.
EOF
)"
```

---

## Task 2: Zod Validation Schemas & Migration Helper

**Files:**
- Modify: `src/lib/campaign/schema.ts`
- Test: `src/lib/campaign/__tests__/tables-schema.test.ts`

- [ ] **Step 1: Write the failing schema validation tests**

Create `src/lib/campaign/__tests__/tables-schema.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { RandomTableSchema, TableAttachmentSchema, validateCampaign } from '../schema.ts'

describe('TableAttachmentSchema', () => {
  it('validates a room attachment', () => {
    const result = TableAttachmentSchema.safeParse({ type: 'room', id: 'room-1' })
    expect(result.success).toBe(true)
  })

  it('validates a map attachment', () => {
    const result = TableAttachmentSchema.safeParse({ type: 'map', id: 'map-1' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid attachment type', () => {
    const result = TableAttachmentSchema.safeParse({ type: 'npc', id: 'npc-1' })
    expect(result.success).toBe(false)
  })
})

describe('RandomTableSchema', () => {
  it('validates a complete table', () => {
    const table = {
      id: 'tbl-1',
      name: 'Tavern Gossip',
      kind: 'event',
      diceExpression: '1d6',
      entries: [
        { roll: 1, description: 'The king is ill' },
        { roll: [2, 3] as [number, number], description: 'Bandits on the road' },
      ],
      attachments: [{ type: 'room', id: 'room-tavern' }],
    }
    const result = RandomTableSchema.safeParse(table)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.kind).toBe('event')
      expect(result.data.attachments).toHaveLength(1)
    }
  })

  it('applies defaults for missing optional fields', () => {
    const result = RandomTableSchema.safeParse({ id: 'tbl-2' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('')
      expect(result.data.kind).toBe('encounter')
      expect(result.data.diceExpression).toBe('1d6')
      expect(result.data.entries).toEqual([])
      expect(result.data.attachments).toEqual([])
    }
  })

  it('rejects invalid kind', () => {
    const result = RandomTableSchema.safeParse({ id: 'tbl-3', kind: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('validates encounter entry with monsterIds and quantity', () => {
    const table = {
      id: 'tbl-4',
      name: 'Encounters',
      kind: 'encounter',
      diceExpression: '1d6',
      entries: [
        { roll: 1, description: 'Skeleton patrol', monsterIds: ['skeleton-1'], quantity: '1d4' },
      ],
      attachments: [],
    }
    const result = RandomTableSchema.safeParse(table)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.entries[0].monsterIds).toEqual(['skeleton-1'])
      expect(result.data.entries[0].quantity).toBe('1d4')
    }
  })

  it('validates custom kind with customKind label', () => {
    const table = {
      id: 'tbl-5',
      name: 'Weather',
      kind: 'custom',
      customKind: 'Weather',
      diceExpression: '1d8',
      entries: [],
      attachments: [],
    }
    const result = RandomTableSchema.safeParse(table)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.customKind).toBe('Weather')
    }
  })

  it('allows extra fields via passthrough', () => {
    const table = {
      id: 'tbl-6',
      name: 'Test',
      kind: 'loot',
      diceExpression: '1d6',
      entries: [{ roll: 1, description: 'Gold', extraField: true }],
      attachments: [],
      futureField: 'hello',
    }
    const result = RandomTableSchema.safeParse(table)
    expect(result.success).toBe(true)
  })
})

describe('CampaignSchema with tables', () => {
  it('validates a campaign with tables field', () => {
    const result = validateCampaign({
      id: 'c-1',
      name: 'Test Campaign',
      tables: [
        {
          id: 'tbl-1',
          name: 'Gossip',
          kind: 'event',
          diceExpression: '1d6',
          entries: [{ roll: 1, description: 'Rumor' }],
          attachments: [],
        },
      ],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tables).toHaveLength(1)
      expect(result.data.tables[0].name).toBe('Gossip')
    }
  })

  it('defaults tables to empty array when missing', () => {
    const result = validateCampaign({ id: 'c-2', name: 'No Tables' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tables).toEqual([])
    }
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "/Volumes/Content/projects/ShadowDark Engine/shadowdark-engine" && npx vitest run src/lib/campaign/__tests__/tables-schema.test.ts 2>&1 | tail -20`

Expected: FAIL — `RandomTableSchema` and `TableAttachmentSchema` are not exported from `schema.ts` yet.

- [ ] **Step 3: Update Zod schemas**

In `src/lib/campaign/schema.ts`:

1. Replace the `RandomEncounterEntrySchema` and `RandomEncounterTableSchema` (lines 78-94) with:

```typescript
// ── Table Attachment ──

export const TableAttachmentSchema = z.object({
  type: z.enum(['room', 'map']),
  id: z.string(),
})

// ── Random Table Entry ──

export const RandomTableEntrySchema = z.object({
  roll: z.union([z.number(), z.tuple([z.number(), z.number()])]),
  description: z.string(),
  monsterIds: z.array(z.string()).optional(),
  quantity: z.string().optional(),
}).passthrough()

// ── Random Table ──

export const RandomTableSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  kind: z.enum(['encounter', 'loot', 'event', 'custom']).default('encounter'),
  customKind: z.string().optional(),
  diceExpression: z.string().default('1d6'),
  entries: z.array(RandomTableEntrySchema).default([]),
  attachments: z.array(TableAttachmentSchema).default([]),
}).passthrough()
```

2. Update `AdventureModuleSchema` (line 126) to remove `randomEncounters`:

```typescript
export const AdventureModuleSchema = z.object({
  hook: z.string().default(''),
  overview: z.string().default(''),
  targetLevel: z.tuple([z.number(), z.number()]).default([1, 3]),
  rooms: z.array(AdventureRoomSchema).default([]),
  npcs: z.array(AdventureNPCSchema).default([]),
  stores: z.array(AdventureStoreSchema).default([]),
}).passthrough()
```

3. Update `CampaignSchema` (line 242) to add `tables` and remove `randomEncounters` from the adventure default:

```typescript
export const CampaignSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  author: z.string().default(''),
  version: z.string().default('1.0'),
  description: z.string().default(''),
  createdAt: z.number().default(() => Date.now()),
  updatedAt: z.number().default(() => Date.now()),
  content: DataPackContentSchema.default({}),
  tables: z.array(RandomTableSchema).default([]),
  adventure: AdventureModuleSchema.default({
    hook: '',
    overview: '',
    targetLevel: [1, 3] as [number, number],
    rooms: [],
    npcs: [],
    stores: [],
  }),
  lore: LoreDocumentSchema.default({ chapters: [] }),
  maps: z.array(CampaignMapSchema).default([]),
}).passthrough()
```

4. Add the migration helper function at the bottom of the file (before the validation functions):

```typescript
// ── Migration: adventure.randomEncounters → campaign.tables ──

export function migrateRandomEncounters(data: Record<string, unknown>): Record<string, unknown> {
  const adventure = data.adventure as Record<string, unknown> | undefined
  if (!adventure) return data

  const oldEncounters = adventure.randomEncounters as unknown[] | undefined
  const existingTables = data.tables as unknown[] | undefined

  // Only migrate if old field exists and new field doesn't
  if (oldEncounters && oldEncounters.length > 0 && (!existingTables || existingTables.length === 0)) {
    data.tables = oldEncounters.map((enc: unknown) => {
      const e = enc as Record<string, unknown>
      return {
        ...e,
        kind: 'encounter',
        attachments: [],
      }
    })
  }

  // Remove old field
  delete adventure.randomEncounters

  return data
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd "/Volumes/Content/projects/ShadowDark Engine/shadowdark-engine" && npx vitest run src/lib/campaign/__tests__/tables-schema.test.ts 2>&1 | tail -20`

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/campaign/schema.ts src/lib/campaign/__tests__/tables-schema.test.ts
git commit -m "$(cat <<'EOF'
feat(tables): add Zod schemas for RandomTable, TableAttachment, and migration helper

Replace RandomEncounterTableSchema/RandomEncounterEntrySchema with
RandomTableSchema/RandomTableEntrySchema/TableAttachmentSchema.
Add migrateRandomEncounters() helper for backward-compatible import.
EOF
)"
```

---

## Task 3: Defaults & Factory Functions

**Files:**
- Modify: `src/lib/campaign/defaults.ts`

- [ ] **Step 1: Update defaults**

In `src/lib/campaign/defaults.ts`:

1. Update the import (line 2) — replace `RandomEncounterTable` with `RandomTable` and add `TableKind`:

```typescript
import type { Campaign, AdventureRoom, AdventureNPC, TrapDefinition, RandomTable, TableKind, AdventureStore, LoreChapter, LoreSection } from '@/schemas/campaign.ts'
```

2. Update `createEmptyCampaign()` (lines 6-28) — add `tables: []`, remove `randomEncounters`:

```typescript
export function createEmptyCampaign(name: string, author: string = ''): Campaign {
  return {
    id: generateId(),
    name,
    author,
    version: '1.0',
    description: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    content: {},
    tables: [],
    adventure: {
      hook: '',
      overview: '',
      targetLevel: [1, 3],
      rooms: [],
      npcs: [],
      stores: [],
    },
    lore: { chapters: [] },
    maps: [],
  }
}
```

3. Replace `createEmptyEncounterTable()` (lines 67-74) with:

```typescript
export function createEmptyTable(kind: TableKind = 'encounter'): RandomTable {
  return {
    id: generateId(),
    name: '',
    kind,
    diceExpression: '1d6',
    entries: [],
    attachments: [],
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/campaign/defaults.ts
git commit -m "$(cat <<'EOF'
feat(tables): update defaults with createEmptyTable() and campaign.tables field

Replace createEmptyEncounterTable() with createEmptyTable(kind).
Add tables:[] to createEmptyCampaign(), remove randomEncounters.
EOF
)"
```

---

## Task 4: Campaign Store

**Files:**
- Modify: `src/stores/campaign-store.ts`
- Test: `src/lib/campaign/__tests__/tables-store.test.ts`

- [ ] **Step 1: Write the failing store tests**

Create `src/lib/campaign/__tests__/tables-store.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useCampaignStore } from '@/stores/campaign-store.ts'
import type { RandomTable, TableAttachment } from '@/schemas/campaign.ts'

function makeTable(overrides: Partial<RandomTable> = {}): RandomTable {
  return {
    id: `tbl-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Test Table',
    kind: 'encounter',
    diceExpression: '1d6',
    entries: [],
    attachments: [],
    ...overrides,
  }
}

describe('Campaign Store — Tables', () => {
  beforeEach(() => {
    // Reset store
    useCampaignStore.setState({ campaign: null })
    // Create a campaign to work with
    useCampaignStore.getState().createCampaign('Test Campaign', 'Tester')
  })

  it('addTable pushes to campaign.tables', () => {
    const table = makeTable({ name: 'Gossip' })
    useCampaignStore.getState().addTable(table)

    const tables = useCampaignStore.getState().campaign!.tables
    expect(tables).toHaveLength(1)
    expect(tables[0].name).toBe('Gossip')
  })

  it('updateTable modifies the correct table by ID', () => {
    const table = makeTable({ id: 'tbl-update', name: 'Before' })
    useCampaignStore.getState().addTable(table)

    useCampaignStore.getState().updateTable('tbl-update', t => { t.name = 'After' })

    const updated = useCampaignStore.getState().campaign!.tables.find(t => t.id === 'tbl-update')
    expect(updated!.name).toBe('After')
  })

  it('removeTable filters out the correct table', () => {
    const t1 = makeTable({ id: 'tbl-keep', name: 'Keep' })
    const t2 = makeTable({ id: 'tbl-remove', name: 'Remove' })
    useCampaignStore.getState().addTable(t1)
    useCampaignStore.getState().addTable(t2)

    useCampaignStore.getState().removeTable('tbl-remove')

    const tables = useCampaignStore.getState().campaign!.tables
    expect(tables).toHaveLength(1)
    expect(tables[0].id).toBe('tbl-keep')
  })

  it('attachTable pushes to attachments array', () => {
    const table = makeTable({ id: 'tbl-attach' })
    useCampaignStore.getState().addTable(table)

    const attachment: TableAttachment = { type: 'room', id: 'room-1' }
    useCampaignStore.getState().attachTable('tbl-attach', attachment)

    const t = useCampaignStore.getState().campaign!.tables.find(t => t.id === 'tbl-attach')
    expect(t!.attachments).toHaveLength(1)
    expect(t!.attachments[0]).toEqual({ type: 'room', id: 'room-1' })
  })

  it('detachTable removes matching attachment', () => {
    const table = makeTable({
      id: 'tbl-detach',
      attachments: [
        { type: 'room', id: 'room-1' },
        { type: 'map', id: 'map-1' },
      ],
    })
    useCampaignStore.getState().addTable(table)

    useCampaignStore.getState().detachTable('tbl-detach', { type: 'room', id: 'room-1' })

    const t = useCampaignStore.getState().campaign!.tables.find(t => t.id === 'tbl-detach')
    expect(t!.attachments).toHaveLength(1)
    expect(t!.attachments[0]).toEqual({ type: 'map', id: 'map-1' })
  })

  it('attachTable does not duplicate same attachment', () => {
    const table = makeTable({ id: 'tbl-nodup' })
    useCampaignStore.getState().addTable(table)

    const attachment: TableAttachment = { type: 'room', id: 'room-1' }
    useCampaignStore.getState().attachTable('tbl-nodup', attachment)
    useCampaignStore.getState().attachTable('tbl-nodup', attachment)

    const t = useCampaignStore.getState().campaign!.tables.find(t => t.id === 'tbl-nodup')
    expect(t!.attachments).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "/Volumes/Content/projects/ShadowDark Engine/shadowdark-engine" && npx vitest run src/lib/campaign/__tests__/tables-store.test.ts 2>&1 | tail -20`

Expected: FAIL — `addTable`, `updateTable`, etc. don't exist on the store yet.

- [ ] **Step 3: Update the campaign store**

In `src/stores/campaign-store.ts`:

1. Update imports (line 3) — replace `RandomEncounterTable` with `RandomTable, TableAttachment`:

```typescript
import type { Campaign, CampaignIndexEntry, AdventureRoom, AdventureNPC, RandomTable, TableAttachment, AdventureStore, LoreChapter, LoreSection } from '@/schemas/campaign.ts'
```

2. In the `CampaignStore` interface (lines 12-59), replace the encounter table methods (lines 35-37) with table methods:

```typescript
  // Tables
  addTable: (table: RandomTable) => void
  updateTable: (id: string, updater: (t: RandomTable) => void) => void
  removeTable: (id: string) => void
  attachTable: (tableId: string, attachment: TableAttachment) => void
  detachTable: (tableId: string, attachment: TableAttachment) => void
```

3. In `loadCampaign()` (line 117), add migration logic after the stores backfill (line 121):

```typescript
    loadCampaign: (id) => {
      const campaign = loadFromStorage(id)
      if (!campaign) return false
      // Backfill fields added after initial campaign creation
      if (!campaign.adventure.stores) campaign.adventure.stores = []
      // Migrate old randomEncounters to tables
      if (!campaign.tables) {
        const oldEncounters = (campaign.adventure as Record<string, unknown>).randomEncounters as RandomTable[] | undefined
        if (oldEncounters && oldEncounters.length > 0) {
          campaign.tables = oldEncounters.map(enc => ({
            ...enc,
            kind: 'encounter' as const,
            attachments: [],
          }))
        } else {
          campaign.tables = []
        }
        delete (campaign.adventure as Record<string, unknown>).randomEncounters
        // Save immediately so migration runs only once
        saveToStorage(campaign)
      }
      set(state => { state.campaign = campaign })
      return true
    },
```

4. Replace the encounter table method implementations (lines 203-219) with:

```typescript
    addTable: (table) => {
      set(state => {
        if (!state.campaign) return
        if (!state.campaign.tables) state.campaign.tables = []
        state.campaign.tables.push(table)
      })
      const c = get().campaign; if (c) debouncedSave(c)
    },
    updateTable: (id, updater) => {
      set(state => {
        const t = state.campaign?.tables?.find(t => t.id === id)
        if (t) updater(t)
      })
      const c = get().campaign; if (c) debouncedSave(c)
    },
    removeTable: (id) => {
      set(state => {
        if (!state.campaign) return
        state.campaign.tables = (state.campaign.tables ?? []).filter(t => t.id !== id)
      })
      const c = get().campaign; if (c) debouncedSave(c)
    },
    attachTable: (tableId, attachment) => {
      set(state => {
        const t = state.campaign?.tables?.find(t => t.id === tableId)
        if (!t) return
        const exists = t.attachments.some(a => a.type === attachment.type && a.id === attachment.id)
        if (!exists) t.attachments.push(attachment)
      })
      const c = get().campaign; if (c) debouncedSave(c)
    },
    detachTable: (tableId, attachment) => {
      set(state => {
        const t = state.campaign?.tables?.find(t => t.id === tableId)
        if (!t) return
        t.attachments = t.attachments.filter(a => !(a.type === attachment.type && a.id === attachment.id))
      })
      const c = get().campaign; if (c) debouncedSave(c)
    },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd "/Volumes/Content/projects/ShadowDark Engine/shadowdark-engine" && npx vitest run src/lib/campaign/__tests__/tables-store.test.ts 2>&1 | tail -20`

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stores/campaign-store.ts src/lib/campaign/__tests__/tables-store.test.ts
git commit -m "$(cat <<'EOF'
feat(tables): add table CRUD and attachment methods to campaign store

Replace addEncounterTable/updateEncounterTable/removeEncounterTable with
addTable/updateTable/removeTable/attachTable/detachTable.
Add migration in loadCampaign() for old randomEncounters data.
EOF
)"
```

---

## Task 5: Export & Import with Migration

**Files:**
- Modify: `src/lib/campaign/export.ts`
- Modify: `src/lib/campaign/import.ts`
- Test: `src/lib/campaign/__tests__/tables-migration.test.ts`
- Test: `src/lib/campaign/__tests__/tables-export-import.test.ts`

- [ ] **Step 1: Write the failing migration tests**

Create `src/lib/campaign/__tests__/tables-migration.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { migrateRandomEncounters } from '../schema.ts'

describe('migrateRandomEncounters', () => {
  it('migrates old randomEncounters to tables with kind=encounter', () => {
    const data: Record<string, unknown> = {
      id: 'c-1',
      name: 'Old Campaign',
      adventure: {
        randomEncounters: [
          {
            id: 'enc-1',
            name: 'Forest Encounters',
            diceExpression: '1d6',
            entries: [
              { roll: 1, description: 'Wolves', monsterIds: ['wolf-1'], quantity: '1d4' },
              { roll: [2, 3] as [number, number], description: 'Nothing happens' },
            ],
          },
        ],
        rooms: [],
        npcs: [],
        stores: [],
      },
    }

    const result = migrateRandomEncounters(data)

    expect(result.tables).toBeDefined()
    const tables = result.tables as Record<string, unknown>[]
    expect(tables).toHaveLength(1)
    expect(tables[0].kind).toBe('encounter')
    expect(tables[0].attachments).toEqual([])
    expect(tables[0].name).toBe('Forest Encounters')
    expect(tables[0].id).toBe('enc-1')

    // Old field should be removed
    const adv = result.adventure as Record<string, unknown>
    expect(adv.randomEncounters).toBeUndefined()
  })

  it('preserves existing tables field', () => {
    const data: Record<string, unknown> = {
      id: 'c-2',
      name: 'New Campaign',
      tables: [
        { id: 'tbl-1', name: 'Gossip', kind: 'event', diceExpression: '1d6', entries: [], attachments: [] },
      ],
      adventure: {
        randomEncounters: [
          { id: 'enc-old', name: 'Old Table', diceExpression: '1d6', entries: [] },
        ],
        rooms: [],
      },
    }

    const result = migrateRandomEncounters(data)

    const tables = result.tables as Record<string, unknown>[]
    expect(tables).toHaveLength(1)
    expect(tables[0].id).toBe('tbl-1')
  })

  it('handles campaign with both tables and empty randomEncounters', () => {
    const data: Record<string, unknown> = {
      id: 'c-3',
      adventure: {
        randomEncounters: [],
        rooms: [],
      },
    }

    const result = migrateRandomEncounters(data)

    // Empty randomEncounters should not produce tables
    expect(result.tables).toBeUndefined()
    const adv = result.adventure as Record<string, unknown>
    expect(adv.randomEncounters).toBeUndefined()
  })

  it('handles campaign with no adventure field', () => {
    const data: Record<string, unknown> = { id: 'c-4', name: 'No Adventure' }

    const result = migrateRandomEncounters(data)

    expect(result.tables).toBeUndefined()
  })
})
```

- [ ] **Step 2: Write the failing export/import tests**

Create `src/lib/campaign/__tests__/tables-export-import.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import type { Campaign, RandomTable } from '@/schemas/campaign.ts'
import { exportAdventureDocument } from '../export.ts'
import { parseCampaignFile } from '../import.ts'

function makeCampaignWithTables(tables: RandomTable[]): Campaign {
  return {
    id: 'campaign-tables-001',
    name: 'Tables Test Campaign',
    author: 'Test',
    version: '1.0',
    description: '',
    createdAt: 1700000000000,
    updatedAt: 1700100000000,
    content: {
      monsters: [{
        id: 'goblin',
        name: 'Goblin',
        level: 1,
        ac: 11,
        hp: 5,
        attacks: [{ name: 'Dagger', bonus: 1, damage: '1d4', range: 'close' as const }],
        movement: { normal: 'near' as const },
        stats: { STR: 8, DEX: 14, CON: 8, INT: 8, WIS: 8, CHA: 8 },
        alignment: 'chaotic' as const,
        abilities: [],
        checksMorale: true,
        tags: [],
      }],
    },
    tables,
    adventure: {
      hook: '',
      overview: '',
      targetLevel: [1, 3],
      rooms: [
        { id: 'room-1', number: 1, name: 'Entry Hall', description: '', gmNotes: '', monsterIds: [], treasure: '', traps: [], connections: [] },
      ],
      npcs: [],
      stores: [],
    },
    lore: { chapters: [] },
    maps: [
      { id: 'map-1', name: 'Level 1', seed: 42, createdAt: 1700000000000, updatedAt: 1700000000000, width: 30, height: 20, cellSize: 40, layers: [], labels: [], markers: [] },
    ],
  }
}

describe('tables export/import round-trip', () => {
  it('round-trips tables of every kind', () => {
    const tables: RandomTable[] = [
      { id: 'tbl-enc', name: 'Random Encounters', kind: 'encounter', diceExpression: '1d6', entries: [{ roll: 1, description: 'Goblins', monsterIds: ['goblin'], quantity: '1d4' }], attachments: [] },
      { id: 'tbl-loot', name: 'Treasure Hoard', kind: 'loot', diceExpression: '1d8', entries: [{ roll: [1, 2] as [number, number], description: '10 gold coins' }], attachments: [] },
      { id: 'tbl-event', name: 'Tavern Gossip', kind: 'event', diceExpression: '1d6', entries: [{ roll: 1, description: 'The king is ill' }], attachments: [] },
      { id: 'tbl-custom', name: 'Weather', kind: 'custom', customKind: 'Weather', diceExpression: '1d4', entries: [{ roll: 1, description: 'Rain' }], attachments: [] },
    ]
    const campaign = makeCampaignWithTables(tables)

    const doc = exportAdventureDocument(campaign)
    const result = parseCampaignFile(doc)

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.campaign.tables).toHaveLength(4)
    expect(result.campaign.tables[0].kind).toBe('encounter')
    expect(result.campaign.tables[1].kind).toBe('loot')
    expect(result.campaign.tables[2].kind).toBe('event')
    expect(result.campaign.tables[3].kind).toBe('custom')
    expect(result.campaign.tables[3].customKind).toBe('Weather')
  })

  it('preserves attachments through round-trip', () => {
    const tables: RandomTable[] = [
      {
        id: 'tbl-attached',
        name: 'Room Events',
        kind: 'event',
        diceExpression: '1d6',
        entries: [{ roll: 1, description: 'Noise' }],
        attachments: [
          { type: 'room', id: 'room-1' },
          { type: 'map', id: 'map-1' },
        ],
      },
    ]
    const campaign = makeCampaignWithTables(tables)

    const doc = exportAdventureDocument(campaign)
    const result = parseCampaignFile(doc)

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.campaign.tables[0].attachments).toHaveLength(2)
    expect(result.campaign.tables[0].attachments[0]).toEqual({ type: 'room', id: 'room-1' })
    expect(result.campaign.tables[0].attachments[1]).toEqual({ type: 'map', id: 'map-1' })
  })

  it('preserves entry fields through round-trip', () => {
    const tables: RandomTable[] = [
      {
        id: 'tbl-entries',
        name: 'Encounters',
        kind: 'encounter',
        diceExpression: '1d6',
        entries: [
          { roll: 1, description: 'Goblins', monsterIds: ['goblin'], quantity: '1d4+1' },
          { roll: [2, 3] as [number, number], description: 'Nothing' },
          { roll: 4, description: 'Trap' },
        ],
        attachments: [],
      },
    ]
    const campaign = makeCampaignWithTables(tables)

    const doc = exportAdventureDocument(campaign)
    const result = parseCampaignFile(doc)

    expect(result.success).toBe(true)
    if (!result.success) return
    const entries = result.campaign.tables[0].entries
    expect(entries).toHaveLength(3)
    expect(entries[0].monsterIds).toEqual(['goblin'])
    expect(entries[0].quantity).toBe('1d4+1')
    expect(entries[1].roll).toEqual([2, 3])
    expect(entries[2].roll).toBe(4)
  })

  it('imports old-format JSON with adventure.randomEncounters', () => {
    const oldFormat = {
      id: 'old-001',
      name: 'Old Campaign',
      adventure: {
        hook: 'An old hook',
        overview: '',
        targetLevel: [1, 3],
        rooms: [],
        randomEncounters: [
          {
            id: 'enc-old',
            name: 'Old Encounters',
            diceExpression: '1d6',
            entries: [
              { roll: 1, description: 'Skeletons', monsterIds: ['skeleton-1'], quantity: '1d4' },
              { roll: [2, 3] as [number, number], description: 'Empty corridor' },
            ],
          },
        ],
        npcs: [],
        stores: [],
      },
    }

    const result = parseCampaignFile(oldFormat)

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.campaign.tables).toHaveLength(1)
    expect(result.campaign.tables[0].kind).toBe('encounter')
    expect(result.campaign.tables[0].name).toBe('Old Encounters')
    expect(result.campaign.tables[0].attachments).toEqual([])
    expect(result.campaign.tables[0].entries).toHaveLength(2)
    expect(result.campaign.tables[0].entries[0].monsterIds).toEqual(['skeleton-1'])
  })

  it('imports new-format JSON with tables directly', () => {
    const newFormat = {
      id: 'new-001',
      name: 'New Campaign',
      tables: [
        { id: 'tbl-1', name: 'Gossip', kind: 'event', diceExpression: '1d6', entries: [{ roll: 1, description: 'Rumor' }], attachments: [] },
      ],
      adventure: { hook: '', overview: '', targetLevel: [1, 3], rooms: [], npcs: [], stores: [] },
    }

    const result = parseCampaignFile(newFormat)

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.campaign.tables).toHaveLength(1)
    expect(result.campaign.tables[0].kind).toBe('event')
  })

  it('drops orphaned attachments on import', () => {
    // Table references room-99 and map-99 which don't exist in the campaign
    const campaign = makeCampaignWithTables([
      {
        id: 'tbl-orphan',
        name: 'Orphan Test',
        kind: 'event',
        diceExpression: '1d6',
        entries: [{ roll: 1, description: 'Test' }],
        attachments: [
          { type: 'room', id: 'room-1' },     // exists
          { type: 'room', id: 'room-99' },    // orphaned
          { type: 'map', id: 'map-1' },       // exists
          { type: 'map', id: 'map-99' },      // orphaned
        ],
      },
    ])

    const doc = exportAdventureDocument(campaign)
    const result = parseCampaignFile(doc)

    expect(result.success).toBe(true)
    if (!result.success) return
    const attachments = result.campaign.tables[0].attachments
    expect(attachments).toHaveLength(2)
    expect(attachments[0]).toEqual({ type: 'room', id: 'room-1' })
    expect(attachments[1]).toEqual({ type: 'map', id: 'map-1' })
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd "/Volumes/Content/projects/ShadowDark Engine/shadowdark-engine" && npx vitest run src/lib/campaign/__tests__/tables-migration.test.ts src/lib/campaign/__tests__/tables-export-import.test.ts 2>&1 | tail -30`

Expected: FAIL — export doesn't include `tables`, import doesn't migrate.

- [ ] **Step 4: Update export.ts**

In `src/lib/campaign/export.ts`:

1. Add `tables` to the `AdventureDocument` interface (after line 12, `content`):

```typescript
export interface AdventureDocument {
  format: 'shadowdark-adventure-v1'
  exportedAt: number
  id: string
  name: string
  author: string
  version: string
  description: string
  createdAt: number
  updatedAt: number
  content: Campaign['content']
  tables: Campaign['tables']
  adventure: Campaign['adventure']
  lore: Campaign['lore']
  maps: Campaign['maps']
}
```

2. Add `tables` to `exportAdventureDocument()` return (after line 44, `content`):

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
    tables: campaign.tables,
    adventure: campaign.adventure,
    lore: campaign.lore,
    maps: campaign.maps,
  }
}
```

- [ ] **Step 5: Update import.ts**

In `src/lib/campaign/import.ts`, add migration and orphan cleanup:

```typescript
import type { Campaign, RandomTable } from '@/schemas/campaign.ts'
import { validateCampaign, validateAdventureDocument, migrateRandomEncounters } from './schema.ts'

export type ParseResult =
  | { success: true; campaign: Campaign }
  | { success: false; errors: string[] }

function cleanOrphanedAttachments(campaign: Campaign): Campaign {
  const roomIds = new Set(campaign.adventure.rooms.map(r => r.id))
  const mapIds = new Set((campaign.maps ?? []).map(m => m.id))

  campaign.tables = (campaign.tables ?? []).map(table => ({
    ...table,
    attachments: table.attachments.filter(a => {
      if (a.type === 'room') return roomIds.has(a.id)
      if (a.type === 'map') return mapIds.has(a.id)
      return false
    }),
  }))

  return campaign
}

export function parseCampaignFile(json: unknown): ParseResult {
  if (json === null || json === undefined || typeof json !== 'object' || Array.isArray(json)) {
    return { success: false, errors: ['Input must be a JSON object'] }
  }

  const obj = json as Record<string, unknown>

  // Run migration before validation
  migrateRandomEncounters(obj)

  // Detect adventure document format
  if (obj.format === 'shadowdark-adventure-v1') {
    const advResult = validateAdventureDocument(json)
    if (!advResult.success) {
      return { success: false, errors: advResult.errors }
    }
    const { format: _format, exportedAt: _exportedAt, ...campaignFields } = advResult.data!
    return { success: true, campaign: cleanOrphanedAttachments(campaignFields as Campaign) }
  }

  // If it has a format field but it's not the one we recognize, reject
  if ('format' in obj && typeof obj.format === 'string') {
    return {
      success: false,
      errors: [`Unrecognized format: "${obj.format}". Expected "shadowdark-adventure-v1" or no format field.`],
    }
  }

  // Raw campaign format
  const campaignResult = validateCampaign(json)
  if (!campaignResult.success) {
    return { success: false, errors: campaignResult.errors }
  }
  return { success: true, campaign: cleanOrphanedAttachments(campaignResult.data as Campaign) }
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd "/Volumes/Content/projects/ShadowDark Engine/shadowdark-engine" && npx vitest run src/lib/campaign/__tests__/tables-migration.test.ts src/lib/campaign/__tests__/tables-export-import.test.ts 2>&1 | tail -30`

Expected: All tests PASS.

- [ ] **Step 7: Run all existing tests to check for regressions**

Run: `cd "/Volumes/Content/projects/ShadowDark Engine/shadowdark-engine" && npx vitest run 2>&1 | tail -30`

Expected: Some existing export/import tests may need updates because the campaign shape changed (`randomEncounters` removed, `tables` added). Fix any failures:

- In `campaign-export-import.test.ts`, the `makeFullCampaign()` fixture needs `tables` field added and `randomEncounters` removed from adventure. The encounter data should be moved to `tables` with `kind: 'encounter'` and `attachments: []`.
- Update assertions that reference `adventure.randomEncounters` to reference `tables` instead.
- Update the expected keys list for `AdventureDocument` to include `tables`.
- The `lenient import` test should expect `tables: []` instead of `adventure.randomEncounters: []`.

- [ ] **Step 8: Commit**

```bash
git add src/lib/campaign/export.ts src/lib/campaign/import.ts src/lib/campaign/__tests__/tables-migration.test.ts src/lib/campaign/__tests__/tables-export-import.test.ts src/lib/campaign/__tests__/campaign-export-import.test.ts
git commit -m "$(cat <<'EOF'
feat(tables): add tables to export/import with backward-compatible migration

Export includes campaign.tables in adventure documents.
Import runs migrateRandomEncounters() before validation, then cleans
orphaned attachments. Old-format campaigns auto-migrate on import.
EOF
)"
```

---

## Task 6: i18n Translation Keys

**Files:**
- Modify: `src/i18n/locales/en/ui.json`
- Modify: `src/i18n/locales/es/ui.json`

- [ ] **Step 1: Add English translation keys**

In `src/i18n/locales/en/ui.json`, add before the closing `}` (before the last line):

```json
  "campaign.nav.tables": "Tables",
  "campaign.tables.title": "Random Tables",
  "campaign.tables.new": "New Table",
  "campaign.tables.empty": "No tables yet",
  "campaign.tables.filterAll": "All",
  "campaign.tables.global": "Global",
  "campaign.tables.deleteConfirm": "Delete this table?",
  "campaign.tables.kind.encounter": "Encounter",
  "campaign.tables.kind.loot": "Loot",
  "campaign.tables.kind.event": "Event",
  "campaign.tables.kind.custom": "Custom",
  "campaign.tables.editor.name": "Table Name",
  "campaign.tables.editor.kind": "Kind",
  "campaign.tables.editor.customKind": "Custom Kind Label",
  "campaign.tables.editor.dice": "Dice Expression",
  "campaign.tables.editor.attachments": "Attached To",
  "campaign.tables.editor.attachTo": "Attach to...",
  "campaign.tables.editor.entries": "Entries",
  "campaign.tables.editor.addEntry": "Add Entry",
  "campaign.tables.editor.roll": "Roll",
  "campaign.tables.editor.description": "Description",
  "campaign.tables.editor.quantity": "Quantity",
  "campaign.tables.editor.monsters": "Monsters",
  "campaign.tables.pdf.section": "Random Tables",
  "campaign.tables.pdf.attachedTo": "Attached to",
  "campaign.adventure.tablesRef": "Manage tables in the Tables tab"
```

- [ ] **Step 2: Add Spanish translation keys**

In `src/i18n/locales/es/ui.json`, add before the closing `}`:

```json
  "campaign.nav.tables": "Tablas",
  "campaign.tables.title": "Tablas Aleatorias",
  "campaign.tables.new": "Nueva Tabla",
  "campaign.tables.empty": "Sin tablas a\u00fan",
  "campaign.tables.filterAll": "Todas",
  "campaign.tables.global": "Global",
  "campaign.tables.deleteConfirm": "\u00bfEliminar esta tabla?",
  "campaign.tables.kind.encounter": "Encuentro",
  "campaign.tables.kind.loot": "Bot\u00edn",
  "campaign.tables.kind.event": "Evento",
  "campaign.tables.kind.custom": "Personalizado",
  "campaign.tables.editor.name": "Nombre de Tabla",
  "campaign.tables.editor.kind": "Tipo",
  "campaign.tables.editor.customKind": "Etiqueta Personalizada",
  "campaign.tables.editor.dice": "Expresi\u00f3n de Dados",
  "campaign.tables.editor.attachments": "Asociada A",
  "campaign.tables.editor.attachTo": "Asociar a...",
  "campaign.tables.editor.entries": "Entradas",
  "campaign.tables.editor.addEntry": "Agregar Entrada",
  "campaign.tables.editor.roll": "Tirada",
  "campaign.tables.editor.description": "Descripci\u00f3n",
  "campaign.tables.editor.quantity": "Cantidad",
  "campaign.tables.editor.monsters": "Monstruos",
  "campaign.tables.pdf.section": "Tablas Aleatorias",
  "campaign.tables.pdf.attachedTo": "Asociada a",
  "campaign.adventure.tablesRef": "Administrar tablas en la pesta\u00f1a Tablas"
```

- [ ] **Step 3: Commit**

```bash
git add src/i18n/locales/en/ui.json src/i18n/locales/es/ui.json
git commit -m "$(cat <<'EOF'
feat(tables): add en/es i18n keys for tables tab, editor, and PDF
EOF
)"
```

---

## Task 7: Campaign Header Navigation

**Files:**
- Modify: `src/components/campaign/campaign-header.tsx`

- [ ] **Step 1: Add Tables nav item**

In `src/components/campaign/campaign-header.tsx`, update the `NAV_ITEMS` array (line 6). Insert the tables entry after content and before adventure:

```typescript
const NAV_ITEMS = [
  { key: 'campaign.nav.overview', href: '/campaign/$campaignId', matchEnd: true },
  { key: 'campaign.nav.content', href: '/campaign/$campaignId/content', matchEnd: false },
  { key: 'campaign.nav.tables', href: '/campaign/$campaignId/tables', matchEnd: false },
  { key: 'campaign.nav.adventure', href: '/campaign/$campaignId/adventure', matchEnd: false },
  { key: 'campaign.nav.lore', href: '/campaign/$campaignId/lore', matchEnd: false },
  { key: 'campaign.nav.map', href: '/campaign/$campaignId/map', matchEnd: false },
  { key: 'campaign.nav.ai', href: '/campaign/$campaignId/ai', matchEnd: false },
]
```

- [ ] **Step 2: Verify in browser**

Open `http://localhost:3000/campaign` in a browser. Create or open a campaign. Confirm the "Tables" tab appears in the navigation bar between "Content" and "Adventure". Clicking it should show a 404/blank page for now (we'll create the route next).

- [ ] **Step 3: Commit**

```bash
git add src/components/campaign/campaign-header.tsx
git commit -m "$(cat <<'EOF'
feat(tables): add Tables nav item to campaign header
EOF
)"
```

---

## Task 8: Tables Tab Page

**Files:**
- Create: `src/routes/campaign/$campaignId.tables.tsx`

- [ ] **Step 1: Create the Tables tab route**

Create `src/routes/campaign/$campaignId.tables.tsx`:

```typescript
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useCampaignStore } from '@/stores/campaign-store.ts'
import { useLocale } from '@/hooks/use-locale.ts'
import { createEmptyTable } from '@/lib/campaign/defaults.ts'
import { TableEditor } from '@/components/campaign/tables/table-editor.tsx'
import type { RandomTable, TableKind } from '@/schemas/campaign.ts'

export const Route = createFileRoute('/campaign/$campaignId/tables')({
  component: TablesPage,
})

const KIND_COLORS: Record<TableKind, string> = {
  encounter: 'bg-red-500/20 text-red-400',
  loot: 'bg-amber-500/20 text-amber-400',
  event: 'bg-blue-500/20 text-blue-400',
  custom: 'bg-purple-500/20 text-purple-400',
}

function TablesPage() {
  const { t } = useLocale()
  const campaign = useCampaignStore(s => s.campaign)
  const addTable = useCampaignStore(s => s.addTable)
  const updateTable = useCampaignStore(s => s.updateTable)
  const removeTable = useCampaignStore(s => s.removeTable)

  const [editingTable, setEditingTable] = useState<RandomTable | null>(null)
  const [kindFilter, setKindFilter] = useState<TableKind | 'all'>('all')

  if (!campaign) return null

  const tables = campaign.tables ?? []
  const filtered = kindFilter === 'all' ? tables : tables.filter(t => t.kind === kindFilter)

  function saveTable(table: RandomTable) {
    const exists = tables.find(t => t.id === table.id)
    if (exists) updateTable(table.id, t => Object.assign(t, table))
    else addTable(table)
    setEditingTable(null)
  }

  function handleDelete(id: string) {
    if (confirm(t('campaign.tables.deleteConfirm'))) {
      removeTable(id)
    }
  }

  function getKindLabel(table: RandomTable): string {
    if (table.kind === 'custom' && table.customKind) return table.customKind
    return t(`campaign.tables.kind.${table.kind}`)
  }

  function getAttachmentSummary(table: RandomTable): string {
    if (table.attachments.length === 0) return t('campaign.tables.global')
    return table.attachments.map(a => {
      if (a.type === 'room') {
        const room = campaign!.adventure.rooms.find(r => r.id === a.id)
        return room ? `#${room.number} ${room.name}` : 'Unknown room'
      }
      if (a.type === 'map') {
        const map = campaign!.maps.find(m => m.id === a.id)
        return map ? map.name : 'Unknown map'
      }
      return ''
    }).filter(Boolean).join(', ')
  }

  const kinds: (TableKind | 'all')[] = ['all', 'encounter', 'loot', 'event', 'custom']

  return (
    <main className="mx-auto max-w-5xl px-3 py-4 sm:px-4 sm:py-8">
      <h1 className="mb-4 text-2xl font-bold">{t('campaign.tables.title')}</h1>

      {/* Top bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {kinds.map(k => (
            <button
              key={k}
              onClick={() => setKindFilter(k)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                kindFilter === k
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'border border-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {k === 'all' ? t('campaign.tables.filterAll') : t(`campaign.tables.kind.${k}`)}
              {k !== 'all' && ` (${tables.filter(t => t.kind === k).length})`}
            </button>
          ))}
        </div>
        <button
          onClick={() => setEditingTable(createEmptyTable(kindFilter === 'all' ? 'encounter' : kindFilter))}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
        >
          + {t('campaign.tables.new')}
        </button>
      </div>

      {/* Table list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <p className="text-muted-foreground">{t('campaign.tables.empty')}</p>
          <button
            onClick={() => setEditingTable(createEmptyTable('encounter'))}
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
          >
            + {t('campaign.tables.new')}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(table => (
            <div
              key={table.id}
              onClick={() => setEditingTable(table)}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-3 cursor-pointer hover:border-border/80 transition"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{table.name || 'Unnamed Table'}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${KIND_COLORS[table.kind]}`}>
                    {getKindLabel(table)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {table.diceExpression} · {table.entries.length} entries · {getAttachmentSummary(table)}
                </p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); handleDelete(table.id) }}
                className="shrink-0 text-xs text-red-400 hover:text-red-300 ml-3"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Editor modal */}
      {editingTable && (
        <TableEditor
          table={editingTable}
          rooms={campaign.adventure.rooms}
          maps={campaign.maps}
          onSave={saveTable}
          onCancel={() => setEditingTable(null)}
        />
      )}
    </main>
  )
}
```

- [ ] **Step 2: Verify in browser**

Open `http://localhost:3000/campaign/<id>/tables`. Confirm the page renders with the title "Random Tables", the kind filter buttons, and the "New Table" button. The list should show "No tables yet" for a new campaign.

Note: The page will not fully work until the `TableEditor` component exists (Task 9).

- [ ] **Step 3: Commit**

```bash
git add src/routes/campaign/\$campaignId.tables.tsx
git commit -m "$(cat <<'EOF'
feat(tables): add dedicated Tables tab page with kind filtering and list view
EOF
)"
```

---

## Task 9: Table Editor Component

**Files:**
- Create: `src/components/campaign/tables/table-editor.tsx`
- Delete: `src/components/campaign/adventure/encounter-table-editor.tsx`

- [ ] **Step 1: Create the generalized table editor**

Create directory and file `src/components/campaign/tables/table-editor.tsx`:

```typescript
import { useState } from 'react'
import { generateId } from '@/lib/utils/id.ts'
import { useLocale } from '@/hooks/use-locale.ts'
import type { RandomTable, RandomTableEntry, TableKind, TableAttachment } from '@/schemas/campaign.ts'
import type { AdventureRoom } from '@/schemas/campaign.ts'
import type { CampaignMap } from '@/schemas/map.ts'

interface Props {
  table: RandomTable
  rooms: AdventureRoom[]
  maps: CampaignMap[]
  onSave: (table: RandomTable) => void
  onCancel: () => void
}

const KIND_OPTIONS: { value: TableKind; labelKey: string }[] = [
  { value: 'encounter', labelKey: 'campaign.tables.kind.encounter' },
  { value: 'loot', labelKey: 'campaign.tables.kind.loot' },
  { value: 'event', labelKey: 'campaign.tables.kind.event' },
  { value: 'custom', labelKey: 'campaign.tables.kind.custom' },
]

export function TableEditor({ table: initial, rooms, maps, onSave, onCancel }: Props) {
  const { t } = useLocale()
  const [tbl, setTbl] = useState<RandomTable>({
    ...initial,
    entries: initial.entries.map(e => ({ ...e })),
    attachments: initial.attachments.map(a => ({ ...a })),
  })

  function addEntry() {
    const nextRoll = tbl.entries.length > 0
      ? Math.max(...tbl.entries.map(e => typeof e.roll === 'number' ? e.roll : e.roll[1])) + 1
      : 1
    setTbl(prev => ({
      ...prev,
      entries: [...prev.entries, { roll: nextRoll, description: '' }],
    }))
  }

  function updateEntry(index: number, updates: Partial<RandomTableEntry>) {
    setTbl(prev => {
      const entries = [...prev.entries]
      entries[index] = { ...entries[index], ...updates }
      return { ...prev, entries }
    })
  }

  function removeEntry(index: number) {
    setTbl(prev => ({ ...prev, entries: prev.entries.filter((_, i) => i !== index) }))
  }

  function addAttachment(attachment: TableAttachment) {
    const exists = tbl.attachments.some(a => a.type === attachment.type && a.id === attachment.id)
    if (!exists) {
      setTbl(prev => ({ ...prev, attachments: [...prev.attachments, attachment] }))
    }
  }

  function removeAttachment(index: number) {
    setTbl(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== index) }))
  }

  function getAttachmentLabel(a: TableAttachment): string {
    if (a.type === 'room') {
      const room = rooms.find(r => r.id === a.id)
      return room ? `#${room.number} ${room.name}` : 'Unknown room'
    }
    const map = maps.find(m => m.id === a.id)
    return map ? map.name : 'Unknown map'
  }

  const inputCls = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring'
  const isEncounter = tbl.kind === 'encounter'
  const isCustom = tbl.kind === 'custom'

  // Build attachment picker options — exclude already-attached
  const attachedRoomIds = new Set(tbl.attachments.filter(a => a.type === 'room').map(a => a.id))
  const attachedMapIds = new Set(tbl.attachments.filter(a => a.type === 'map').map(a => a.id))
  const availableRooms = rooms.filter(r => !attachedRoomIds.has(r.id))
  const availableMaps = maps.filter(m => !attachedMapIds.has(m.id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="text-xl font-bold mb-4">{initial.name || t('campaign.tables.new')}</h2>

        <div className="space-y-4">
          {/* Name + Kind */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">{t('campaign.tables.editor.name')}</label>
              <input type="text" value={tbl.name} onChange={e => setTbl(prev => ({ ...prev, name: e.target.value }))} placeholder="Table name" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">{t('campaign.tables.editor.kind')}</label>
              <select value={tbl.kind} onChange={e => setTbl(prev => ({ ...prev, kind: e.target.value as TableKind }))} className={inputCls}>
                {KIND_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom kind label */}
          {isCustom && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">{t('campaign.tables.editor.customKind')}</label>
              <input type="text" value={tbl.customKind ?? ''} onChange={e => setTbl(prev => ({ ...prev, customKind: e.target.value || undefined }))} placeholder="e.g., Weather, Gossip" className={inputCls} />
            </div>
          )}

          {/* Dice Expression */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">{t('campaign.tables.editor.dice')}</label>
            <input type="text" value={tbl.diceExpression} onChange={e => setTbl(prev => ({ ...prev, diceExpression: e.target.value }))} placeholder="e.g., 1d6, 2d6" className={inputCls} />
          </div>

          {/* Attachments */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-muted-foreground">{t('campaign.tables.editor.attachments')}</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tbl.attachments.length === 0 && (
                <span className="text-xs text-muted-foreground">{t('campaign.tables.global')}</span>
              )}
              {tbl.attachments.map((a, i) => (
                <span key={`${a.type}-${a.id}`} className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">{a.type}</span>
                  {getAttachmentLabel(a)}
                  <button onClick={() => removeAttachment(i)} className="ml-0.5 text-red-400 hover:text-red-300">&times;</button>
                </span>
              ))}
            </div>
            {(availableRooms.length > 0 || availableMaps.length > 0) && (
              <select
                value=""
                onChange={e => {
                  const [type, id] = e.target.value.split(':')
                  if (type && id) addAttachment({ type: type as 'room' | 'map', id })
                }}
                className={inputCls}
              >
                <option value="">{t('campaign.tables.editor.attachTo')}</option>
                {availableRooms.length > 0 && (
                  <optgroup label="Rooms">
                    {availableRooms.map(r => (
                      <option key={r.id} value={`room:${r.id}`}>#{r.number} {r.name}</option>
                    ))}
                  </optgroup>
                )}
                {availableMaps.length > 0 && (
                  <optgroup label="Maps">
                    {availableMaps.map(m => (
                      <option key={m.id} value={`map:${m.id}`}>{m.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            )}
          </div>

          {/* Entries */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground">{t('campaign.tables.editor.entries')}</label>
              <button onClick={addEntry} className="text-xs text-primary hover:underline">+ {t('campaign.tables.editor.addEntry')}</button>
            </div>
            <div className="space-y-2">
              {tbl.entries.map((entry, i) => (
                <div key={i} className="flex gap-2 items-start rounded-lg border border-border/50 p-2">
                  <div className="w-14 shrink-0">
                    <input
                      type="number"
                      value={typeof entry.roll === 'number' ? entry.roll : entry.roll[0]}
                      onChange={e => updateEntry(i, { roll: parseInt(e.target.value) || 1 })}
                      className="w-full rounded border border-input bg-background px-2 py-1 text-center text-sm font-bold outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={entry.description}
                      onChange={e => updateEntry(i, { description: e.target.value })}
                      placeholder={t('campaign.tables.editor.description')}
                      rows={2}
                      className="w-full rounded border border-input bg-background px-2 py-1 text-xs outline-none resize-y"
                    />
                    {isEncounter && (
                      <input
                        type="text"
                        value={entry.quantity ?? ''}
                        onChange={e => updateEntry(i, { quantity: e.target.value || undefined })}
                        placeholder={`${t('campaign.tables.editor.quantity')} (e.g., 1d4+1)`}
                        className="mt-1 w-full rounded border border-input bg-background px-2 py-1 text-xs outline-none"
                      />
                    )}
                  </div>
                  <button onClick={() => removeEntry(i)} className="shrink-0 text-xs text-red-400 hover:text-red-300 mt-1">X</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent transition">Cancel</button>
          <button onClick={() => onSave(tbl)} disabled={!tbl.name.trim()} className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-40">Save Table</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Delete the old encounter table editor**

Delete `src/components/campaign/adventure/encounter-table-editor.tsx`.

- [ ] **Step 3: Verify in browser**

Open `http://localhost:3000/campaign/<id>/tables`. Click "+ New Table". Confirm:
- The editor modal opens with name, kind dropdown, dice expression fields
- Selecting "Custom" kind shows the custom kind label input
- The attachment picker shows rooms and maps from the campaign
- Adding/removing entries works
- Encounter kind shows quantity field per entry; other kinds do not
- Save and cancel buttons work

- [ ] **Step 4: Commit**

```bash
git add src/components/campaign/tables/table-editor.tsx
git rm src/components/campaign/adventure/encounter-table-editor.tsx
git commit -m "$(cat <<'EOF'
feat(tables): add generalized TableEditor component, remove old encounter editor

New editor supports kind selector, custom kind label, attachment picker,
and conditionally shows encounter-specific fields (quantity, monsterIds).
EOF
)"
```

---

## Task 10: Adventure Tab Cleanup

**Files:**
- Modify: `src/routes/campaign/$campaignId.adventure.tsx`

- [ ] **Step 1: Remove encounters tab and add reference link**

In `src/routes/campaign/$campaignId.adventure.tsx`:

1. Remove imports related to encounter tables:
   - Remove `createEmptyEncounterTable` from the defaults import
   - Remove `EncounterTableEditor` import
   - Remove `RandomEncounterTable` from the schema import

2. Remove encounter table store hooks:
   - Remove `addEncounterTable`, `updateEncounterTable`, `removeEncounterTable` from `useCampaignStore`

3. Remove encounter table state:
   - Remove `const [editingTable, setEditingTable] = useState<RandomEncounterTable | null>(null)`

4. Remove `saveEncounterTable` function

5. Update `AdventureTab` type — remove `'encounters'`:
   ```typescript
   type AdventureTab = 'rooms' | 'overview' | 'npcs' | 'shops'
   ```

6. Update `tabs` array — remove the encounters tab, add a reference entry:
   ```typescript
   const tabs: { key: AdventureTab; label: string }[] = [
     { key: 'rooms', label: `${t('campaign.adventure.rooms')} (${adv.rooms.length})` },
     { key: 'overview', label: t('campaign.adventure.overview') },
     { key: 'npcs', label: `${t('campaign.adventure.npcs')} (${adv.npcs.length})` },
     { key: 'shops', label: `${t('campaign.adventure.shops')} (${adv.stores.length})` },
   ]
   ```

7. Remove the entire `{tab === 'encounters' && (...)}` block (lines 200-226).

8. Add a reference link to the Tables tab somewhere visible. Add it below the tab bar:
   ```tsx
   {/* Tables reference link */}
   {(campaign.tables ?? []).filter(t => t.kind === 'encounter').length > 0 && (
     <div className="mb-4 rounded-lg border border-border/50 bg-accent/30 px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
       <span>{(campaign.tables ?? []).filter(t => t.kind === 'encounter').length} encounter tables</span>
       <Link to={`/campaign/${campaign.id}/tables`} className="text-primary hover:underline">{t('campaign.adventure.tablesRef')}</Link>
     </div>
   )}
   ```

   Note: You'll need to add `Link` to the imports from `@tanstack/react-router`.

- [ ] **Step 2: Verify in browser**

Open `http://localhost:3000/campaign/<id>/adventure`. Confirm:
- The "Encounters" tab is gone
- If the campaign has encounter tables, a reference link appears
- Clicking the link navigates to the Tables tab
- The remaining tabs (Rooms, Overview, NPCs, Shops) work correctly

- [ ] **Step 3: Commit**

```bash
git add src/routes/campaign/\$campaignId.adventure.tsx
git commit -m "$(cat <<'EOF'
feat(tables): remove encounters tab from adventure page, add Tables tab reference link
EOF
)"
```

---

## Task 11: PDF Rendering

**Files:**
- Modify: `src/lib/campaign/pdf/adventure-pdf.tsx`

- [ ] **Step 1: Update imports and helpers**

In `src/lib/campaign/pdf/adventure-pdf.tsx`:

1. Update the type import (line 3) — replace `RandomEncounterTable` with `RandomTable`:
   ```typescript
   import type { Campaign, AdventureRoom, AdventureNPC, AdventureStore, RandomTable, LoreChapter } from '@/schemas/campaign.ts'
   ```

2. Add new label entries to the `L` object:
   ```typescript
   tablesSection: 'Tablas Aleatorias',
   attachedTo: 'Asociada a',
   kindEncounter: 'Encuentro',
   kindLoot: 'Botín',
   kindEvent: 'Evento',
   kindCustom: 'Personalizado',
   result: 'Resultado',
   ```

3. Update `collectAllMonsterIds` to read from `campaign.tables` instead of `campaign.adventure.randomEncounters`:
   ```typescript
   function collectAllMonsterIds(campaign: Campaign): string[] {
     const ids = new Set<string>()
     for (const room of campaign.adventure.rooms) {
       for (const mid of room.monsterIds) ids.add(mid)
     }
     for (const table of (campaign.tables ?? [])) {
       for (const entry of table.entries) {
         if (entry.monsterIds) {
           for (const mid of entry.monsterIds) ids.add(mid)
         }
       }
     }
     return [...ids]
   }
   ```

- [ ] **Step 2: Replace EncounterTable component with RandomTablePDF**

Replace the `EncounterTable` component (lines 304-325) with:

```typescript
function getKindLabel(kind: string, customKind?: string): string {
  if (kind === 'custom' && customKind) return customKind
  const map: Record<string, string> = { encounter: L.kindEncounter, loot: L.kindLoot, event: L.kindEvent, custom: L.kindCustom }
  return map[kind] ?? kind
}

function getAttachmentNames(table: RandomTable, campaign: Campaign): string {
  return table.attachments.map(a => {
    if (a.type === 'room') {
      const room = campaign.adventure.rooms.find(r => r.id === a.id)
      return room ? `${room.number}. ${room.name} (Room)` : null
    }
    if (a.type === 'map') {
      const map = campaign.maps.find(m => m.id === a.id)
      return map ? `${map.name} (Map)` : null
    }
    return null
  }).filter(Boolean).join(' \u00B7 ')
}

function RandomTablePDF({ table, campaign }: { table: RandomTable; campaign: Campaign }) {
  const isEncounter = table.kind === 'encounter'
  const attachmentNames = getAttachmentNames(table, campaign)

  return (
    <View style={{ marginTop: 8 }} wrap={false}>
      <Text style={styles.subsectionHeader}>
        {table.name} ({table.diceExpression}, {getKindLabel(table.kind, table.customKind)})
      </Text>

      {attachmentNames ? (
        <View style={{ backgroundColor: '#EEEEEE', paddingVertical: 3, paddingHorizontal: 8, marginBottom: 4, borderRadius: 2 }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8, color: COLORS.darkGray }}>
            {L.attachedTo}: {attachmentNames}
          </Text>
        </View>
      ) : null}

      <View style={styles.rule} />

      <View style={styles.tableHeader}>
        <Text style={styles.tableCellHeaderSmall}>{L.roll}</Text>
        <Text style={styles.tableCellHeaderFlex}>{isEncounter ? L.encounter : L.result}</Text>
      </View>

      {table.entries.map((entry, i) => (
        <View key={i} style={i % 2 === 1 ? styles.tableRowAlt : styles.tableRow}>
          <Text style={styles.tableCellSmall}>{formatRollRange(entry.roll)}</Text>
          <Text style={styles.tableCellFlex}>
            {isEncounter && entry.quantity ? `${entry.quantity} ` : ''}{entry.description}
          </Text>
        </View>
      ))}
    </View>
  )
}
```

- [ ] **Step 3: Update OverviewPage**

In the `OverviewPage` component, replace the encounter table rendering (lines 271-279) to use `campaign.tables` filtered to encounters:

```typescript
          {(campaign.tables ?? []).filter(t => t.kind === 'encounter').length > 0 ? (
            <View>
              <Text style={styles.subsectionHeader}>{L.randomEncounters}</Text>
              {(campaign.tables ?? []).filter(t => t.kind === 'encounter').map(table => (
                <RandomTablePDF key={table.id} table={table} campaign={campaign} />
              ))}
            </View>
          ) : null}
```

- [ ] **Step 4: Add dedicated Tables section to the main document**

Add a `TablesPages` component and insert it in the `AdventurePDF` document after shops and before creature stats:

```typescript
function TablesPages({ campaign }: { campaign: Campaign }) {
  const tables = (campaign.tables ?? []).filter(t => t.kind !== 'encounter')
  if (tables.length === 0) return null

  // Group by kind
  const grouped: Record<string, RandomTable[]> = {}
  for (const table of tables) {
    const key = table.kind === 'custom' ? (table.customKind ?? 'Custom') : table.kind
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(table)
  }

  return (
    <Page size="LETTER" style={styles.page} wrap>
      <Text style={styles.sectionHeader}>{L.tablesSection}</Text>
      <View style={styles.ruleThick} />

      {Object.entries(grouped).map(([kind, kindTables]) => (
        <View key={kind}>
          {kindTables.map(table => (
            <RandomTablePDF key={table.id} table={table} campaign={campaign} />
          ))}
        </View>
      ))}
      <PageNumber />
    </Page>
  )
}
```

In the `AdventurePDF` main document component, add `TablesPages` after `ShopPages` and before `CreatureStatsPages`:

```typescript
      {campaign.adventure.stores.length > 0 ? (
        <ShopPages campaign={campaign} />
      ) : null}

      <TablesPages campaign={campaign} />

      <CreatureStatsPages campaign={campaign} />
```

- [ ] **Step 5: Update ContentsPage**

In `ContentsPage`, add a tables entry to the TOC. After the shops entry and before the creature stats entry:

```typescript
  const nonEncounterTables = (campaign.tables ?? []).filter(t => t.kind !== 'encounter')
  if (nonEncounterTables.length > 0) {
    entries.push({ title: L.tablesSection, pageHint: '' })
  }
```

- [ ] **Step 6: Add room table references in RoomBlock**

In the `RoomBlock` component, after the connections section, add a reference to attached tables:

```typescript
      {/* Tables attached to this room */}
      {(() => {
        const roomTables = (campaign.tables ?? []).filter(t => t.attachments.some(a => a.type === 'room' && a.id === room.id))
        if (roomTables.length === 0) return null
        return (
          <View style={styles.bulletRow}>
            <Text style={styles.bulletMarker}>{'\u2022'}</Text>
            <Text style={styles.bulletText}>
              <Text style={styles.bodyTextBold}>Tablas: </Text>
              {roomTables.map(t => t.name).join(', ')}
            </Text>
          </View>
        )
      })()}
```

Note: `RoomBlock` needs `campaign` prop. It already receives it.

- [ ] **Step 7: Verify PDF export**

In the browser, open a campaign with tables (create some tables of different kinds, attach some to rooms and maps). Export as PDF. Verify:
- Encounter tables still appear in the Overview section
- Non-encounter tables appear in a dedicated "Tablas Aleatorias" section
- Attachment bars show below table headers
- Room pages reference attached tables by name
- TOC includes the tables section

- [ ] **Step 8: Commit**

```bash
git add src/lib/campaign/pdf/adventure-pdf.tsx
git commit -m "$(cat <<'EOF'
feat(tables): generalize PDF rendering for all table kinds with attachment bar

Replace EncounterTable with RandomTablePDF. Add dedicated Tables section
for non-encounter tables. Show attachment bar below table headers.
Reference attached tables in room blocks.
EOF
)"
```

---

## Task 12: Update Campaign Overview Stats

**Files:**
- Modify: `src/routes/campaign/$campaignId.index.tsx`

- [ ] **Step 1: Add table count to stats grid**

In `src/routes/campaign/$campaignId.index.tsx`, add a table count variable after `mapCount` (line 30):

```typescript
  const tableCount = (campaign.tables ?? []).length
```

Add a `StatCard` for tables in the stats grid (after the maps card):

```typescript
        <StatCard label={t('campaign.tables.title')} value={tableCount} />
```

- [ ] **Step 2: Verify in browser**

Open a campaign's overview page. Confirm the stats grid shows the table count.

- [ ] **Step 3: Commit**

```bash
git add src/routes/campaign/\$campaignId.index.tsx
git commit -m "$(cat <<'EOF'
feat(tables): show table count in campaign overview stats grid
EOF
)"
```

---

## Task 13: Final Verification

- [ ] **Step 1: Run all tests**

Run: `cd "/Volumes/Content/projects/ShadowDark Engine/shadowdark-engine" && npx vitest run 2>&1`

Expected: All tests PASS. If any fail, fix them.

- [ ] **Step 2: Check TypeScript compiles cleanly**

Run: `cd "/Volumes/Content/projects/ShadowDark Engine/shadowdark-engine" && npx tsc --noEmit 2>&1 | head -30`

Expected: No errors.

- [ ] **Step 3: End-to-end browser verification**

In the browser at `http://localhost:3000`:
1. Create a new campaign
2. Navigate to the Tables tab
3. Create tables of each kind (encounter, loot, event, custom)
4. Attach tables to rooms and maps
5. Verify kind filtering works
6. Verify the adventure tab shows the reference link
7. Export as PDF — verify tables render correctly
8. Export as adventure JSON — verify tables are in the export
9. Import the exported JSON into a new campaign — verify tables survive the round-trip
10. Open a campaign that has old-format `randomEncounters` data (if you have one saved in localStorage) — verify it auto-migrates to `tables`

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore(tables): final cleanup and verification
EOF
)"
```
