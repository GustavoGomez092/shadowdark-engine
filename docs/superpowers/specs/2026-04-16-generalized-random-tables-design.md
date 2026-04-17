# Generalized Random Tables

**Date:** 2026-04-16
**Status:** Approved
**Scope:** Campaign creator — schema, store, UI, PDF, export/import, tests, i18n

## Problem

The campaign creator only supports encounter tables (`RandomEncounterTable`) as a flat array inside `adventure.randomEncounters`. These tables:

- Cannot represent non-encounter content (gossip, loot, events, etc.)
- Cannot be attached to rooms or maps
- Are buried inside the adventure tab instead of being a first-class resource
- Have no kind/type differentiation

## Solution

Generalize the table system into a top-level campaign resource (`campaign.tables`) with a `kind` field, multi-attachment support, and a dedicated Tables tab in the campaign editor.

---

## 1. Schema

### New Types

```typescript
type TableKind = 'encounter' | 'loot' | 'event' | 'custom'

interface TableAttachment {
  type: 'room' | 'map'
  id: string
}

interface RandomTable {
  id: string
  name: string
  kind: TableKind
  customKind?: string           // label when kind === 'custom'
  diceExpression: string        // e.g. "1d6", "2d8"
  entries: RandomTableEntry[]
  attachments: TableAttachment[] // empty = global table
}

interface RandomTableEntry {
  roll: number | [number, number]
  description: string
  monsterIds?: string[]         // used by encounter tables
  quantity?: string             // used by encounter tables
}
```

### Campaign Interface Change

```typescript
interface Campaign {
  id: string
  name: string
  author: string
  version: string
  description: string
  createdAt: number
  updatedAt: number
  content: DataPackContent
  tables: RandomTable[]          // NEW — replaces adventure.randomEncounters
  adventure: AdventureModule     // randomEncounters field removed
  lore: LoreDocument
  maps: CampaignMap[]
}
```

### Removed Types

- `RandomEncounterTable` — replaced by `RandomTable`
- `RandomEncounterEntry` — replaced by `RandomTableEntry`
- `adventure.randomEncounters` field removed from `AdventureModule`

---

## 2. Campaign Store

### Removed Methods

- `addEncounterTable`
- `updateEncounterTable`
- `removeEncounterTable`

### New Methods

| Method | Signature | Behavior |
|--------|-----------|----------|
| `addTable` | `(table: RandomTable) => void` | Push to `campaign.tables` |
| `updateTable` | `(id: string, updater: (t: RandomTable) => void) => void` | Immer-style update by ID |
| `removeTable` | `(id: string) => void` | Filter out by ID |
| `attachTable` | `(tableId: string, attachment: TableAttachment) => void` | Push to table's `attachments` (skip if duplicate) |
| `detachTable` | `(tableId: string, attachment: TableAttachment) => void` | Remove matching attachment |

### Migration on Load

Inside `loadCampaign()`, after loading from localStorage:

1. If `campaign.adventure.randomEncounters` has entries and `campaign.tables` is undefined/missing:
   - Map each old `RandomEncounterTable` to a new `RandomTable` with `kind: 'encounter'`, `attachments: []`
   - Assign to `campaign.tables`
   - Delete `campaign.adventure.randomEncounters`
   - Save immediately so migration only runs once
2. If `campaign.tables` already exists, do nothing.

### Factory Function

`createEmptyTable(kind: TableKind)` returns:
```typescript
{
  id: generateId(),
  name: '',
  kind,
  diceExpression: '1d6',
  entries: [],
  attachments: [],
}
```

---

## 3. Route & Navigation

### New Route

File: `src/routes/campaign/$campaignId.tables.tsx`

### Navigation Update

In `campaign-header.tsx`, add to `NAV_ITEMS` after "content" and before "adventure":

```typescript
{ key: 'campaign.nav.tables', href: '/campaign/$campaignId/tables', matchEnd: false }
```

### Tables Tab Page Layout

- **Top bar:** "New Table" button + kind filter dropdown (All / Encounter / Loot / Event / Custom)
- **Table list:** Each row shows: name, kind badge (color-coded), dice expression, attachment count, entry count
- **Actions:** Click row to open editor modal. Delete button per row.

### Adventure Tab Cleanup

- Remove the encounter tables sub-tab from `$campaignId.adventure.tsx`
- Replace with a read-only summary line linking to the Tables tab, e.g. "3 encounter tables — Manage in Tables tab"

---

## 4. Table Editor Component

Refactor `encounter-table-editor.tsx` into `components/campaign/tables/table-editor.tsx`.

### Editor Modal Fields

| Field | Type | Notes |
|-------|------|-------|
| Name | Text input | Required |
| Kind | Select dropdown | Encounter, Loot, Event, Custom |
| Custom Kind | Text input | Shown only when kind === 'custom' |
| Dice Expression | Text input | e.g. "1d6", "2d8" |
| Attachments | Chip list + picker | Shows current attachments as removable chips. "Attach to..." button opens a picker listing campaign rooms and maps. |
| Entries | Dynamic list | Roll number, description textarea, delete button. When kind === 'encounter': additional monsterIds multi-select and quantity input per entry. |
| Add Entry | Button | Auto-increments roll number |

### Attachment Picker

A small inline dropdown/popover listing:
- All rooms from `campaign.adventure.rooms` (labeled by room number + name)
- All maps from `campaign.maps` (labeled by map name)

Selecting an item calls `attachTable`. Already-attached items are grayed out or hidden.

---

## 5. Zod Validation & Import/Export

### New Zod Schemas

In `src/lib/campaign/schema.ts`:

```typescript
const TableAttachmentSchema = z.object({
  type: z.enum(['room', 'map']),
  id: z.string(),
})

const RandomTableEntrySchema = z.object({
  roll: z.union([z.number(), z.tuple([z.number(), z.number()])]),
  description: z.string(),
  monsterIds: z.array(z.string()).optional(),
  quantity: z.string().optional(),
}).passthrough()

const RandomTableSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  kind: z.enum(['encounter', 'loot', 'event', 'custom']).default('encounter'),
  customKind: z.string().optional(),
  diceExpression: z.string().default('1d6'),
  entries: z.array(RandomTableEntrySchema).default([]),
  attachments: z.array(TableAttachmentSchema).default([]),
}).passthrough()
```

### Removed Schemas

- `RandomEncounterTableSchema`
- `RandomEncounterEntrySchema`
- `randomEncounters` field from `AdventureModuleSchema`

### Export

- `exportAdventureDocument()` includes `campaign.tables` in the exported JSON
- `exportAsDataPack()` unchanged (data packs are for content, not tables)

### Import

In `parseCampaignFile()`:

1. If imported JSON has `adventure.randomEncounters` but no `tables` — run migration (same logic as store load)
2. If it has `tables` — validate with `RandomTableSchema` directly
3. Orphaned attachments (referencing IDs not found in the campaign's rooms/maps) are silently dropped

### Backward Compatibility

Old campaign JSON files with `adventure.randomEncounters` import cleanly because migration runs during parsing. No manual user action needed.

---

## 6. PDF Rendering

### Tables Section

In `adventure-pdf.tsx`, tables are rendered in a dedicated "Random Tables" section after rooms and before creature stats.

**Grouping order:** Encounter > Loot > Event > Custom

**Per-table layout:**

1. **Header row:** Table name + dice expression + kind label in parentheses. Bold, full-width.
2. **Attachment bar:** A lightly shaded row below the header with a pin/link icon and attachment names, e.g. `Throne Hall (Room) · Level 1 (Map)`. Same font size as entry text, distinct background color. Prominent and easy to spot. Only rendered if the table has attachments.
3. **Entry rows:** Two-column table (Roll | Result) with alternating row colors. Encounter entries show quantity + description + monster names. Other kinds show description only.

### Room Pages

When rendering a room that has tables attached to it, include a reference line: "Tables: Tavern Gossip, Random Encounters" — names only, not the full table content.

---

## 7. Testing

### Test Files

#### `src/lib/campaign/__tests__/tables-migration.test.ts`

| Test | Description |
|------|-------------|
| Migrates old format | Campaign with `adventure.randomEncounters` produces `campaign.tables` with `kind: 'encounter'`, `attachments: []` |
| Preserves new format | Campaign with `tables` already present is left untouched |
| Handles both fields | If both `tables` and `adventure.randomEncounters` exist, `tables` wins, old field dropped |
| Empty array | Empty `randomEncounters` produces empty `tables` |

#### `src/lib/campaign/__tests__/tables-export-import.test.ts`

| Test | Description |
|------|-------------|
| Round-trip all kinds | Export campaign with encounter, loot, event, custom tables → import → all match |
| Attachments preserved | Export with attachments → import → attachments intact |
| Old format import | Import JSON with `adventure.randomEncounters` → correct `tables` via migration |
| New format import | Import JSON with `tables` → loads directly |
| Orphaned attachments dropped | Attachments referencing non-existent rooms/maps are removed on import |
| Entry fields preserved | Roll ranges `[min, max]`, monsterIds, quantity, description survive round-trip |
| Custom kind preserved | `customKind` label survives round-trip |

#### `src/lib/campaign/__tests__/tables-schema.test.ts`

| Test | Description |
|------|-------------|
| Valid table passes | Well-formed table validates successfully |
| Defaults applied | Missing optional fields get correct defaults |
| Invalid kind rejected | Non-enum kind value fails validation |
| Invalid attachment type rejected | Attachment with bad type fails |
| Passthrough fields | Extra fields on entries don't break validation |

#### `src/lib/campaign/__tests__/tables-store.test.ts`

| Test | Description |
|------|-------------|
| addTable | Pushes to `campaign.tables` |
| updateTable | Modifies correct table by ID |
| removeTable | Filters out by ID |
| attachTable | Pushes to attachments array |
| detachTable | Removes matching attachment |
| No duplicate attach | Attaching same target twice doesn't duplicate |

---

## 8. i18n

### New Translation Keys

**Navigation:**
- `campaign.nav.tables` — "Tables" / "Tablas"

**Tables tab:**
- `campaign.tables.title` — "Random Tables" / "Tablas Aleatorias"
- `campaign.tables.new` — "New Table" / "Nueva Tabla"
- `campaign.tables.empty` — "No tables yet" / "Sin tablas aún"
- `campaign.tables.filterAll` — "All" / "Todas"
- `campaign.tables.global` — "Global" / "Global"
- `campaign.tables.deleteConfirm` — "Delete this table?" / "Eliminar esta tabla?"

**Kind labels:**
- `campaign.tables.kind.encounter` — "Encounter" / "Encuentro"
- `campaign.tables.kind.loot` — "Loot" / "Botín"
- `campaign.tables.kind.event` — "Event" / "Evento"
- `campaign.tables.kind.custom` — "Custom" / "Personalizado"

**Editor:**
- `campaign.tables.editor.name` — "Table Name" / "Nombre de Tabla"
- `campaign.tables.editor.kind` — "Kind" / "Tipo"
- `campaign.tables.editor.customKind` — "Custom Kind Label" / "Etiqueta Personalizada"
- `campaign.tables.editor.dice` — "Dice Expression" / "Expresión de Dados"
- `campaign.tables.editor.attachments` — "Attached To" / "Asociada A"
- `campaign.tables.editor.attachTo` — "Attach to..." / "Asociar a..."
- `campaign.tables.editor.entries` — "Entries" / "Entradas"
- `campaign.tables.editor.addEntry` — "Add Entry" / "Agregar Entrada"
- `campaign.tables.editor.roll` — "Roll" / "Tirada"
- `campaign.tables.editor.description` — "Description" / "Descripción"
- `campaign.tables.editor.quantity` — "Quantity" / "Cantidad"
- `campaign.tables.editor.monsters` — "Monsters" / "Monstruos"

**PDF:**
- `campaign.tables.pdf.section` — "Random Tables" / "Tablas Aleatorias"
- `campaign.tables.pdf.attachedTo` — "Attached to" / "Asociada a"

**Adventure tab reference:**
- `campaign.adventure.tablesRef` — "Manage tables in the Tables tab" / "Administrar tablas en la pestaña Tablas"

---

## Files Changed

| File | Action |
|------|--------|
| `src/schemas/campaign.ts` | Modify — new types, remove old encounter types, add `tables` to Campaign |
| `src/lib/campaign/schema.ts` | Modify — new Zod schemas, remove old encounter schemas |
| `src/lib/campaign/defaults.ts` | Modify — `createEmptyTable()`, remove `createEmptyEncounterTable()` |
| `src/stores/campaign-store.ts` | Modify — new table methods, remove encounter methods, migration logic |
| `src/routes/campaign/$campaignId.tables.tsx` | Create — new Tables tab page |
| `src/components/campaign/tables/table-editor.tsx` | Create — generalized editor (replaces encounter-table-editor) |
| `src/components/campaign/adventure/encounter-table-editor.tsx` | Delete — replaced by table-editor |
| `src/routes/campaign/$campaignId.adventure.tsx` | Modify — remove encounter sub-tab, add reference link |
| `src/components/campaign/campaign-header.tsx` | Modify — add Tables nav item |
| `src/lib/campaign/export.ts` | Modify — include `tables` in adventure export |
| `src/lib/campaign/import.ts` | Modify — migration logic, orphaned attachment cleanup |
| `src/lib/campaign/pdf/adventure-pdf.tsx` | Modify — generalized table rendering, attachment bar, room references |
| `src/i18n/locales/en/ui.json` | Modify — add new keys |
| `src/i18n/locales/es/ui.json` | Modify — add new keys |
| `src/lib/campaign/__tests__/tables-migration.test.ts` | Create |
| `src/lib/campaign/__tests__/tables-export-import.test.ts` | Create |
| `src/lib/campaign/__tests__/tables-schema.test.ts` | Create |
| `src/lib/campaign/__tests__/tables-store.test.ts` | Create |
