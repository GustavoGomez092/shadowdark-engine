# Adventure Shops — Campaign Builder Integration

**Date:** 2026-04-12
**Status:** Approved

## Problem

Shops/stores can be created during live GM sessions (`GameStore` in `SessionState`) but cannot be pre-designed as part of a campaign adventure. Adventure creators have no way to define what shops exist in their world, what they sell, or where they're located.

## Decisions

| Decision | Choice |
|----------|--------|
| Item model | Hybrid — reference campaign content items OR custom inline items (`isCustom` flag) |
| Data location | `AdventureModule.stores[]` — alongside rooms, NPCs, encounters |
| UI location | New section within existing Adventure tab |
| Room/NPC linking | Optional `roomId` and `npcId` fields on each store |
| Relationship to `GameStore` | New `AdventureStore` type inspired by `GameStore` but without session fields (`isActive`), plus adventure-specific fields (`roomId`, `npcId`) |

## Architecture

### Data Model — `src/schemas/campaign.ts`

New `AdventureStore` interface added alongside existing adventure types:

```typescript
import type { StoreItem } from './stores.ts'

export type StoreType = 'general' | 'weapons' | 'armor' | 'magic' | 'potions' | 'tavern' | 'temple' | 'custom'

export interface AdventureStore {
  id: string
  name: string
  description: string
  keeperName?: string
  keeperAncestry?: string
  storeType: StoreType
  items: StoreItem[]
  roomId?: string    // optional link to AdventureRoom.id
  npcId?: string     // optional link to AdventureNPC.id
}
```

`StoreItem` is imported from `src/schemas/stores.ts` (reused as-is). Its key fields:
- `id`, `name`, `description`, `price` (gp, decimal for sp/cp), `quantity` (-1 = unlimited)
- `itemDefinitionId` — references weapons/armor/gear from campaign content
- `category` — item type from inventory system
- `slots` — encumbrance
- `isCustom` — true for inline items, false for catalog references

`AdventureModule` gains a `stores` array:

```typescript
export interface AdventureModule {
  hook: string
  overview: string
  targetLevel: [number, number]
  rooms: AdventureRoom[]
  randomEncounters: RandomEncounterTable[]
  npcs: AdventureNPC[]
  stores: AdventureStore[]  // NEW
}
```

### Zod Schema — `src/lib/campaign/schema.ts`

New schemas added:

```
StoreItemSchema
├── id: z.string()
├── itemDefinitionId: z.string().default('')
├── name: z.string().default('')
├── description: z.string().default('')
├── price: z.number().default(0)
├── quantity: z.number().default(-1)
├── category: z.string().default('gear')
├── slots: z.number().default(1)
├── isCustom: z.boolean().default(false)

AdventureStoreSchema
├── id: z.string()
├── name: z.string().default('')
├── description: z.string().default('')
├── keeperName: z.string().optional()
├── keeperAncestry: z.string().optional()
├── storeType: z.enum([...]).default('custom')
├── items: z.array(StoreItemSchema).default([])
├── roomId: z.string().optional()
├── npcId: z.string().optional()
```

`AdventureModuleSchema` updated:
```
stores: z.array(AdventureStoreSchema).default([])
```

This is fully backward-compatible — existing campaigns without `stores` get `[]` on import.

### Defaults — `src/lib/campaign/defaults.ts`

```typescript
export function createEmptyStore(): AdventureStore {
  return {
    id: generateId(),
    name: '',
    description: '',
    storeType: 'custom',
    items: [],
  }
}

export function createEmptyStoreItem(): StoreItem {
  return {
    id: generateId(),
    itemDefinitionId: '',
    name: '',
    description: '',
    price: 0,
    quantity: -1,
    category: 'gear',
    slots: 1,
    isCustom: true,
  }
}
```

`createEmptyCampaign` updated: `adventure.stores` defaults to `[]`.

### Campaign Store — `src/stores/campaign-store.ts`

Three new methods following existing room/NPC/encounter pattern:

```typescript
addStore: (store: AdventureStore) => void
updateStore: (id: string, updater: (s: AdventureStore) => void) => void
removeStore: (id: string) => void
```

Each method updates `state.campaign.adventure.stores` and triggers debounced save.

### Export/Import

**No changes needed to `export.ts` or `import.ts`.** Stores are nested inside `adventure`, which is already exported/imported as a whole object. The Zod schema update handles validation and defaults automatically.

### Adventure Tab UI — `src/routes/campaign/$campaignId.adventure.tsx`

New "Shops" accordion section added after Encounter Tables, following the same UI pattern:

- Section header with "Add Shop" button
- List of shops showing: name, store type badge, item count, linked room/NPC names
- Click to expand/select a shop for editing
- Remove button per shop

### Shop Editor — `src/components/campaign/adventure/store-editor.tsx`

Editor component for a single store:

**Store Info:**
- Name text input
- Store type dropdown (general, weapons, armor, magic, potions, tavern, temple, custom)
- Description textarea
- Keeper name (optional text input)
- Keeper ancestry (optional text input)

**Links:**
- Room dropdown — populated from `adventure.rooms`, shows "None" + room names
- NPC dropdown — populated from `adventure.npcs`, shows "None" + NPC names

**Items:**
- "Add from Content" button — opens a picker showing weapons/armor/gear from `campaign.content`
  - Selecting an item creates a `StoreItem` with `isCustom: false`, `itemDefinitionId` set, price from definition's `cost`
- "Add Custom Item" button — creates an inline `StoreItem` with `isCustom: true`
- Item list showing: name, category badge, price (formatted as gp/sp/cp), quantity, slots
- Each item is editable inline: name, price, quantity, description
- Remove button per item

**Price formatting** follows existing pattern from `shop-widget.tsx`:
- >= 1: "X gp"
- >= 0.1: "X sp"
- < 0.1: "X cp"

## Test Strategy

### Unit Tests — `src/lib/campaign/__tests__/campaign-schema.test.ts`

Add to existing test file:

| Test | What it verifies |
|------|-----------------|
| Valid store with all fields | Full AdventureStore passes validation |
| Store defaults | Missing fields get correct defaults (storeType: 'custom', items: [], etc.) |
| Store with items (catalog ref) | StoreItem with isCustom: false validates |
| Store with items (custom inline) | StoreItem with isCustom: true validates |
| Store with room/NPC links | Optional roomId/npcId accepted |
| Backward compat — no stores field | Existing campaign JSON without `stores` gets `[]` default |

### Integration Tests — `src/lib/campaign/__tests__/campaign-export-import.test.ts`

| Test | What it verifies |
|------|-----------------|
| Update `makeFullCampaign()` | Fixture includes 1 store with 2 items (1 catalog, 1 custom) |
| Store round-trip | Export → import preserves store data, items, links |
| Backward compat round-trip | Old campaign JSON (no stores) imports with empty stores array |

### Existing tests updated
- Assertions on `adventure` structure updated to include `stores: []` where applicable

## File Changes

### New Files
| Path | Purpose |
|------|---------|
| `src/components/campaign/adventure/store-editor.tsx` | Shop editor component for individual store |

### Modified Files
| Path | Change |
|------|--------|
| `src/schemas/campaign.ts` | Add `StoreType`, `AdventureStore`, add `stores` to `AdventureModule` |
| `src/lib/campaign/schema.ts` | Add `StoreItemSchema`, `AdventureStoreSchema`, update `AdventureModuleSchema` |
| `src/lib/campaign/defaults.ts` | Add `createEmptyStore()`, `createEmptyStoreItem()`, update empty campaign |
| `src/stores/campaign-store.ts` | Add `addStore`, `updateStore`, `removeStore` methods |
| `src/routes/campaign/$campaignId.adventure.tsx` | Add Shops section with store list |
| `src/lib/campaign/__tests__/campaign-schema.test.ts` | Add store validation tests |
| `src/lib/campaign/__tests__/campaign-export-import.test.ts` | Update fixture + round-trip tests |

### Unchanged
| Path | Why |
|------|-----|
| `src/lib/campaign/export.ts` | Stores flow through `adventure` object automatically |
| `src/lib/campaign/import.ts` | Zod schema handles validation; `parseCampaignFile` unchanged |
| `src/schemas/stores.ts` | `StoreItem` reused as-is; `GameStore` not modified |
| `src/components/gm/store-editor.tsx` | Live session editor, not affected |
