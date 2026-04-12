# Adventure Shops — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add pre-designed shops/stores to the campaign adventure builder, with Zod validation, Zustand store methods, and a shop editor UI in the Adventure tab.

**Architecture:** New `AdventureStore` type in campaign schema, Zod validation with lenient defaults (backward-compatible), store CRUD in campaign-store, modal shop editor component, and a "Shops" tab in the adventure page. Items reuse `StoreItem` from `schemas/stores.ts`.

**Tech Stack:** TypeScript, Zod 4.3.6, Zustand + Immer, React 19, Tailwind CSS v4, Vitest

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/schemas/campaign.ts` | **MODIFY** — Add `AdventureStore` interface, add `stores` to `AdventureModule` |
| `src/lib/campaign/schema.ts` | **MODIFY** — Add `StoreItemSchema`, `AdventureStoreSchema`, update `AdventureModuleSchema` |
| `src/lib/campaign/defaults.ts` | **MODIFY** — Add `createEmptyStore()`, `createEmptyStoreItem()`, update empty campaign |
| `src/stores/campaign-store.ts` | **MODIFY** — Add `addStore`, `updateStore`, `removeStore` methods |
| `src/components/campaign/adventure/store-editor.tsx` | **CREATE** — Modal shop editor component |
| `src/routes/campaign/$campaignId.adventure.tsx` | **MODIFY** — Add "Shops" tab to adventure page |
| `src/lib/campaign/__tests__/campaign-schema.test.ts` | **MODIFY** — Add store validation tests |
| `src/lib/campaign/__tests__/campaign-export-import.test.ts` | **MODIFY** — Update fixture, add store round-trip tests |

---

### Task 1: Data Model — AdventureStore Type + Zod Schema

**Files:**
- Modify: `src/schemas/campaign.ts`
- Modify: `src/lib/campaign/schema.ts`
- Modify: `src/lib/campaign/defaults.ts`
- Test: `src/lib/campaign/__tests__/campaign-schema.test.ts`

- [ ] **Step 1: Write failing tests for store validation**

Append to `src/lib/campaign/__tests__/campaign-schema.test.ts`, inside the `describe('nested validation', ...)` block (after the existing `content arrays` describe):

```typescript
  describe('adventure stores', () => {
    it('accepts a campaign with a fully populated store', () => {
      const result = validateCampaign({
        id: 'store-test',
        name: 'Store Test',
        adventure: {
          stores: [{
            id: 'store-1',
            name: 'Village Blacksmith',
            description: 'A smoky forge near the town square.',
            keeperName: 'Durin',
            keeperAncestry: 'dwarf',
            storeType: 'weapons',
            items: [
              {
                id: 'si-1',
                itemDefinitionId: 'shortsword',
                name: 'Shortsword',
                description: '',
                price: 7,
                quantity: -1,
                category: 'weapon',
                slots: 1,
                isCustom: false,
              },
              {
                id: 'si-2',
                itemDefinitionId: '',
                name: 'Durin\'s Special Blade',
                description: 'A custom masterwork sword.',
                price: 50,
                quantity: 1,
                category: 'weapon',
                slots: 1,
                isCustom: true,
              },
            ],
            roomId: 'room-1',
            npcId: 'npc-1',
          }],
        },
      })
      expect(result.success).toBe(true)
      expect(result.data?.adventure.stores).toHaveLength(1)
      expect(result.data?.adventure.stores[0].name).toBe('Village Blacksmith')
      expect(result.data?.adventure.stores[0].items).toHaveLength(2)
      expect(result.data?.adventure.stores[0].roomId).toBe('room-1')
      expect(result.data?.adventure.stores[0].npcId).toBe('npc-1')
    })

    it('fills defaults for store fields', () => {
      const result = validateCampaign({
        id: 'store-defaults',
        name: 'Store Defaults',
        adventure: {
          stores: [{ id: 'store-1' }],
        },
      })
      expect(result.success).toBe(true)
      const store = result.data?.adventure.stores[0]
      expect(store?.name).toBe('')
      expect(store?.description).toBe('')
      expect(store?.storeType).toBe('custom')
      expect(store?.items).toEqual([])
      expect(store?.roomId).toBeUndefined()
      expect(store?.npcId).toBeUndefined()
    })

    it('fills defaults for store item fields', () => {
      const result = validateCampaign({
        id: 'si-defaults',
        name: 'SI Defaults',
        adventure: {
          stores: [{
            id: 'store-1',
            items: [{ id: 'si-1' }],
          }],
        },
      })
      expect(result.success).toBe(true)
      const item = result.data?.adventure.stores[0].items[0]
      expect(item?.name).toBe('')
      expect(item?.price).toBe(0)
      expect(item?.quantity).toBe(-1)
      expect(item?.category).toBe('gear')
      expect(item?.slots).toBe(1)
      expect(item?.isCustom).toBe(false)
    })

    it('accepts all store types', () => {
      const types = ['general', 'weapons', 'armor', 'magic', 'potions', 'tavern', 'temple', 'custom']
      for (const storeType of types) {
        const result = validateCampaign({
          id: `type-${storeType}`,
          name: 'Type Test',
          adventure: {
            stores: [{ id: 'store-1', storeType }],
          },
        })
        expect(result.success).toBe(true)
        expect(result.data?.adventure.stores[0].storeType).toBe(storeType)
      }
    })

    it('backward compat — campaign without stores gets empty array', () => {
      const result = validateCampaign({
        id: 'no-stores',
        name: 'No Stores',
        adventure: {
          hook: 'Test',
          overview: '',
          targetLevel: [1, 3],
          rooms: [],
          randomEncounters: [],
          npcs: [],
          // no stores field
        },
      })
      expect(result.success).toBe(true)
      expect(result.data?.adventure.stores).toEqual([])
    })
  })
```

Also update the existing "accepts minimal campaign" test to include `stores: []` in the expected adventure default:

Change line that asserts adventure default from:
```typescript
      expect(result.data?.adventure).toEqual({
        hook: '',
        overview: '',
        targetLevel: [1, 3],
        rooms: [],
        randomEncounters: [],
        npcs: [],
      })
```
to:
```typescript
      expect(result.data?.adventure).toEqual({
        hook: '',
        overview: '',
        targetLevel: [1, 3],
        rooms: [],
        randomEncounters: [],
        npcs: [],
        stores: [],
      })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd shadowdark-engine && npx vitest run src/lib/campaign/__tests__/campaign-schema.test.ts`
Expected: FAIL — `stores` not in schema yet.

- [ ] **Step 3: Add AdventureStore to campaign.ts**

In `src/schemas/campaign.ts`, add the import and types. After the `RandomEncounterEntry` interface (line 79), add:

```typescript
import type { StoreItem } from './stores.ts'

// ── Adventure Stores ──

export type AdventureStoreType = 'general' | 'weapons' | 'armor' | 'magic' | 'potions' | 'tavern' | 'temple' | 'custom'

export interface AdventureStore {
  id: string
  name: string
  description: string
  keeperName?: string
  keeperAncestry?: string
  storeType: AdventureStoreType
  items: StoreItem[]
  roomId?: string
  npcId?: string
}
```

Add `stores: AdventureStore[]` to the `AdventureModule` interface:

```typescript
export interface AdventureModule {
  hook: string
  overview: string
  targetLevel: [number, number]
  rooms: AdventureRoom[]
  randomEncounters: RandomEncounterTable[]
  npcs: AdventureNPC[]
  stores: AdventureStore[]
}
```

- [ ] **Step 4: Add Zod schemas for stores**

In `src/lib/campaign/schema.ts`, add after the `RandomEncounterTableSchema` (before `// ── Adventure Module ──`):

```typescript
// ── Store Item ──

export const StoreItemSchema = z.object({
  id: z.string(),
  itemDefinitionId: z.string().default(''),
  name: z.string().default(''),
  description: z.string().default(''),
  price: z.number().default(0),
  quantity: z.number().default(-1),
  category: z.string().default('gear'),
  slots: z.number().default(1),
  isCustom: z.boolean().default(false),
}).passthrough()

// ── Adventure Store ──

export const AdventureStoreSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  description: z.string().default(''),
  keeperName: z.string().optional(),
  keeperAncestry: z.string().optional(),
  storeType: z.enum(['general', 'weapons', 'armor', 'magic', 'potions', 'tavern', 'temple', 'custom']).default('custom'),
  items: z.array(StoreItemSchema).default([]),
  roomId: z.string().optional(),
  npcId: z.string().optional(),
}).passthrough()
```

Update `AdventureModuleSchema` to add `stores`:

```typescript
export const AdventureModuleSchema = z.object({
  hook: z.string().default(''),
  overview: z.string().default(''),
  targetLevel: z.tuple([z.number(), z.number()]).default([1, 3]),
  rooms: z.array(AdventureRoomSchema).default([]),
  randomEncounters: z.array(RandomEncounterTableSchema).default([]),
  npcs: z.array(AdventureNPCSchema).default([]),
  stores: z.array(AdventureStoreSchema).default([]),
}).passthrough()
```

Update the `CampaignSchema` adventure default to include `stores: []`:

```typescript
  adventure: AdventureModuleSchema.default({
    hook: '',
    overview: '',
    targetLevel: [1, 3] as [number, number],
    rooms: [],
    randomEncounters: [],
    npcs: [],
    stores: [],
  }),
```

- [ ] **Step 5: Update defaults.ts**

In `src/lib/campaign/defaults.ts`, add the import and factory functions:

Add to imports:
```typescript
import type { AdventureStore } from '@/schemas/campaign.ts'
import type { StoreItem } from '@/schemas/stores.ts'
```

Add after `createEmptyEncounterTable`:
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

Update `createEmptyCampaign` to include `stores: []` in the adventure:
```typescript
    adventure: {
      hook: '',
      overview: '',
      targetLevel: [1, 3],
      rooms: [],
      randomEncounters: [],
      npcs: [],
      stores: [],
    },
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd shadowdark-engine && npx vitest run src/lib/campaign/__tests__/campaign-schema.test.ts`
Expected: All tests PASS.

- [ ] **Step 7: Run full test suite for regressions**

Run: `cd shadowdark-engine && npx vitest run`
Expected: All tests PASS (some existing assertions about adventure defaults may need the `stores: []` added — fix them if they fail).

- [ ] **Step 8: Commit**

```bash
git add src/schemas/campaign.ts src/lib/campaign/schema.ts src/lib/campaign/defaults.ts src/lib/campaign/__tests__/campaign-schema.test.ts
git commit -m "feat(campaign): add AdventureStore type with Zod validation and lenient defaults"
```

---

### Task 2: Campaign Store Methods + Integration Tests

**Files:**
- Modify: `src/stores/campaign-store.ts`
- Modify: `src/lib/campaign/__tests__/campaign-export-import.test.ts`

- [ ] **Step 1: Write failing integration tests for store round-trips**

In `src/lib/campaign/__tests__/campaign-export-import.test.ts`, update the `makeFullCampaign()` fixture to include a store. Add this to the `adventure` object in the fixture, after the `npcs` array:

```typescript
      stores: [{
        id: 'store-1',
        name: 'Village Smithy',
        description: 'A forge near the town square.',
        keeperName: 'Durin',
        keeperAncestry: 'dwarf',
        storeType: 'weapons' as const,
        items: [
          {
            id: 'si-1',
            itemDefinitionId: 'shortsword',
            name: 'Shortsword',
            description: '',
            price: 7,
            quantity: -1,
            category: 'weapon' as const,
            slots: 1,
            isCustom: false,
          },
          {
            id: 'si-2',
            itemDefinitionId: '',
            name: 'Custom Blade',
            description: 'A unique blade.',
            price: 50,
            quantity: 1,
            category: 'weapon' as const,
            slots: 1,
            isCustom: true,
          },
        ],
        roomId: 'room-1',
        npcId: 'npc-1',
      }],
```

Add these tests to the `parseCampaignFile` describe block, inside the `round-trip` section:

```typescript
    it('round-trips adventure stores through export/import', () => {
      const original = makeFullCampaign()
      const doc = exportAdventureDocument(original)
      const result = parseCampaignFile(doc)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.campaign.adventure.stores).toHaveLength(1)
      const store = result.campaign.adventure.stores[0]
      expect(store.name).toBe('Village Smithy')
      expect(store.storeType).toBe('weapons')
      expect(store.items).toHaveLength(2)
      expect(store.items[0].isCustom).toBe(false)
      expect(store.items[1].isCustom).toBe(true)
      expect(store.roomId).toBe('room-1')
      expect(store.npcId).toBe('npc-1')
    })

    it('imports old campaign JSON without stores field (backward compat)', () => {
      const result = parseCampaignFile({
        id: 'old-campaign',
        name: 'Old Campaign',
        adventure: {
          hook: 'Old hook',
          overview: '',
          targetLevel: [1, 3],
          rooms: [],
          randomEncounters: [],
          npcs: [],
          // no stores field
        },
      })
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.campaign.adventure.stores).toEqual([])
    })
```

Also update the existing rich round-trip test assertion to check stores count:
```typescript
      expect(result.campaign?.adventure.stores).toHaveLength(1)
```

And update the empty round-trip test's original campaign to include `stores: []` in the adventure object.

- [ ] **Step 2: Run tests to verify failures**

Run: `cd shadowdark-engine && npx vitest run src/lib/campaign/__tests__/campaign-export-import.test.ts`
Expected: Some FAIL — `stores` not in existing fixture types.

- [ ] **Step 3: Add store methods to campaign-store.ts**

In `src/stores/campaign-store.ts`, add the type import:

```typescript
import type { Campaign, CampaignIndexEntry, AdventureRoom, AdventureNPC, RandomEncounterTable, LoreChapter, LoreSection, AdventureStore } from '@/schemas/campaign.ts'
```

Add the method signatures to the `CampaignStore` interface (after `removeEncounterTable`):

```typescript
  addStore: (store: AdventureStore) => void
  updateStore: (id: string, updater: (s: AdventureStore) => void) => void
  removeStore: (id: string) => void
```

Add the implementations (after `removeEncounterTable` implementation, before `addChapter`):

```typescript
    addStore: (store) => {
      set(state => { state.campaign?.adventure.stores.push(store) })
      const c = get().campaign; if (c) debouncedSave(c)
    },
    updateStore: (id, updater) => {
      set(state => {
        const s = state.campaign?.adventure.stores.find(s => s.id === id)
        if (s) updater(s)
      })
      const c = get().campaign; if (c) debouncedSave(c)
    },
    removeStore: (id) => {
      set(state => {
        if (!state.campaign) return
        state.campaign.adventure.stores = state.campaign.adventure.stores.filter(s => s.id !== id)
      })
      const c = get().campaign; if (c) debouncedSave(c)
    },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd shadowdark-engine && npx vitest run`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stores/campaign-store.ts src/lib/campaign/__tests__/campaign-export-import.test.ts
git commit -m "feat(campaign): add store CRUD methods and round-trip tests"
```

---

### Task 3: Shop Editor Component

**Files:**
- Create: `src/components/campaign/adventure/store-editor.tsx`

- [ ] **Step 1: Create the store editor component**

Create `src/components/campaign/adventure/store-editor.tsx`:

```typescript
import { useState } from 'react'
import type { AdventureStore, AdventureStoreType, AdventureRoom, AdventureNPC } from '@/schemas/campaign.ts'
import type { StoreItem } from '@/schemas/stores.ts'
import type { ItemCategory } from '@/schemas/inventory.ts'
import { createEmptyStoreItem } from '@/lib/campaign/defaults.ts'
import { generateId } from '@/lib/utils/id.ts'
import { WEAPONS, ARMOR, GEAR } from '@/data/index.ts'
import { useMemo } from 'react'

type CatalogItem = { id: string; name: string; price: number; category: ItemCategory; slots: number }

function formatCost(gp: number): string {
  if (gp >= 1) return `${gp} gp`
  if (gp >= 0.1) return `${Math.round(gp * 10)} sp`
  return `${Math.round(gp * 100)} cp`
}

const STORE_TYPES: AdventureStoreType[] = ['general', 'weapons', 'armor', 'magic', 'potions', 'tavern', 'temple', 'custom']

interface Props {
  store: AdventureStore
  rooms: AdventureRoom[]
  npcs: AdventureNPC[]
  onSave: (store: AdventureStore) => void
  onCancel: () => void
}

export function StoreEditor({ store: initial, rooms, npcs, onSave, onCancel }: Props) {
  const [s, setS] = useState<AdventureStore>({ ...initial, items: [...initial.items] })
  const update = <K extends keyof AdventureStore>(k: K, v: AdventureStore[K]) => setS(p => ({ ...p, [k]: v }))
  const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
  const [showCatalog, setShowCatalog] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState('')

  const catalogItems = useMemo<CatalogItem[]>(() => [
    ...WEAPONS.map(w => ({ id: w.id, name: w.name, price: w.cost, category: 'weapon' as ItemCategory, slots: w.slots })),
    ...ARMOR.map(a => ({ id: a.id, name: a.name, price: a.cost, category: 'armor' as ItemCategory, slots: a.slots })),
    ...GEAR.map(g => ({ id: g.id, name: g.name, price: g.cost, category: g.category, slots: g.slots })),
  ], [])

  const filteredCatalog = catalogItems.filter(i =>
    !catalogSearch || i.name.toLowerCase().includes(catalogSearch.toLowerCase())
  )

  const storeItemDefIds = new Set(s.items.map(i => i.itemDefinitionId).filter(Boolean))

  function addFromCatalog(item: CatalogItem) {
    const newItem: StoreItem = {
      id: generateId(),
      itemDefinitionId: item.id,
      name: item.name,
      description: '',
      price: item.price,
      quantity: -1,
      category: item.category,
      slots: item.slots,
      isCustom: false,
    }
    setS(p => ({ ...p, items: [...p.items, newItem] }))
  }

  function addCustomItem() {
    setS(p => ({ ...p, items: [...p.items, createEmptyStoreItem()] }))
  }

  function updateItem(itemId: string, updater: (item: StoreItem) => StoreItem) {
    setS(p => ({ ...p, items: p.items.map(i => i.id === itemId ? updater(i) : i) }))
  }

  function removeItem(itemId: string) {
    setS(p => ({ ...p, items: p.items.filter(i => i.id !== itemId) }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="text-xl font-bold mb-4">{initial.name ? `Edit: ${initial.name}` : 'New Shop'}</h2>

        <div className="space-y-4">
          {/* Store Info */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Shop Name *</label>
              <input type="text" value={s.name} onChange={e => update('name', e.target.value)} placeholder="e.g., Village Blacksmith" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Store Type</label>
              <select value={s.storeType} onChange={e => update('storeType', e.target.value as AdventureStoreType)} className={inputCls}>
                {STORE_TYPES.map(st => (
                  <option key={st} value={st}>{st.charAt(0).toUpperCase() + st.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Description</label>
            <textarea value={s.description} onChange={e => update('description', e.target.value)} rows={2} placeholder="What does this shop look like?" className={inputCls + " resize-y"} />
          </div>

          {/* Keeper */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Keeper Name</label>
              <input type="text" value={s.keeperName ?? ''} onChange={e => update('keeperName', e.target.value || undefined)} placeholder="e.g., Durin" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Keeper Ancestry</label>
              <input type="text" value={s.keeperAncestry ?? ''} onChange={e => update('keeperAncestry', e.target.value || undefined)} placeholder="e.g., dwarf" className={inputCls} />
            </div>
          </div>

          {/* Links */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Linked Room</label>
              <select value={s.roomId ?? ''} onChange={e => update('roomId', e.target.value || undefined)} className={inputCls}>
                <option value="">None</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name || `Room ${r.number}`}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Linked NPC</label>
              <select value={s.npcId ?? ''} onChange={e => update('npcId', e.target.value || undefined)} className={inputCls}>
                <option value="">None</option>
                {npcs.map(n => (
                  <option key={n.id} value={n.id}>{n.name || 'Unnamed NPC'}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-muted-foreground">Items ({s.items.length})</label>
              <div className="flex gap-2">
                <button onClick={() => setShowCatalog(!showCatalog)} className="rounded-lg border border-border px-3 py-1 text-xs hover:bg-accent transition">
                  {showCatalog ? 'Hide Catalog' : 'Add from Content'}
                </button>
                <button onClick={addCustomItem} className="rounded-lg border border-border px-3 py-1 text-xs hover:bg-accent transition">
                  + Custom Item
                </button>
              </div>
            </div>

            {/* Catalog Picker */}
            {showCatalog && (
              <div className="mb-3 rounded-lg border border-border bg-background p-2">
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={e => setCatalogSearch(e.target.value)}
                  placeholder="Search items..."
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring mb-2"
                />
                <div className="max-h-40 overflow-y-auto space-y-0.5">
                  {filteredCatalog.map(item => {
                    const inStore = storeItemDefIds.has(item.id)
                    return (
                      <button
                        key={item.id}
                        onClick={() => { if (!inStore) addFromCatalog(item) }}
                        disabled={inStore}
                        className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-sm transition ${
                          inStore ? 'opacity-40' : 'hover:bg-accent'
                        }`}
                      >
                        <span>{item.name}</span>
                        <span className="text-xs text-muted-foreground">{formatCost(item.price)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Item List */}
            {s.items.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No items yet</p>
            ) : (
              <div className="space-y-2">
                {s.items.map(item => (
                  <div key={item.id} className="rounded-lg border border-border bg-background p-2">
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="text"
                        value={item.name}
                        onChange={e => updateItem(item.id, i => ({ ...i, name: e.target.value }))}
                        placeholder="Item name"
                        className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
                      />
                      <span className="text-[10px] text-muted-foreground capitalize rounded-full bg-muted px-2 py-0.5">{item.category.replace('_', ' ')}</span>
                      {item.isCustom && <span className="text-[10px] text-amber-400 rounded-full bg-amber-500/10 px-2 py-0.5">custom</span>}
                      <button onClick={() => removeItem(item.id)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-24">
                        <label className="text-[10px] text-muted-foreground">Price (gp)</label>
                        <input
                          type="number"
                          value={item.price}
                          onChange={e => updateItem(item.id, i => ({ ...i, price: parseFloat(e.target.value) || 0 }))}
                          step="0.01"
                          min="0"
                          className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                      <div className="w-20">
                        <label className="text-[10px] text-muted-foreground">Qty (-1=∞)</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={e => updateItem(item.id, i => ({ ...i, quantity: parseInt(e.target.value) || -1 }))}
                          min="-1"
                          className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                      <div className="w-16">
                        <label className="text-[10px] text-muted-foreground">Slots</label>
                        <input
                          type="number"
                          value={item.slots}
                          onChange={e => updateItem(item.id, i => ({ ...i, slots: parseInt(e.target.value) || 1 }))}
                          min="0"
                          className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent transition">Cancel</button>
          <button onClick={() => onSave(s)} disabled={!s.name.trim()} className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-40">Save Shop</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd shadowdark-engine && npx tsc --noEmit 2>&1 | grep -i 'store-editor'`
Expected: No errors related to store-editor.tsx.

- [ ] **Step 3: Commit**

```bash
git add src/components/campaign/adventure/store-editor.tsx
git commit -m "feat(campaign): add shop editor component for adventure stores"
```

---

### Task 4: Adventure Tab — Shops Section

**Files:**
- Modify: `src/routes/campaign/$campaignId.adventure.tsx`

- [ ] **Step 1: Add Shops tab to the adventure page**

Update `src/routes/campaign/$campaignId.adventure.tsx`:

Add imports:
```typescript
import { createEmptyNPC, createEmptyEncounterTable, createEmptyStore } from '@/lib/campaign/defaults.ts'
import { StoreEditor } from '@/components/campaign/adventure/store-editor.tsx'
import type { AdventureNPC, RandomEncounterTable, AdventureStore } from '@/schemas/campaign.ts'
```

Update the `AdventureTab` type:
```typescript
type AdventureTab = 'overview' | 'npcs' | 'encounters' | 'shops'
```

Add store-related hooks inside `AdventureStructurePage`:
```typescript
  const addStore = useCampaignStore(s => s.addStore)
  const updateStoreStore = useCampaignStore(s => s.updateStore)
  const removeStore = useCampaignStore(s => s.removeStore)
```

Add state for editing store:
```typescript
  const [editingStore, setEditingStore] = useState<AdventureStore | null>(null)
```

Add save function:
```typescript
  function saveStore(store: AdventureStore) {
    const exists = adv.stores.find(s => s.id === store.id)
    if (exists) updateStoreStore(store.id, () => Object.assign(exists, store))
    else addStore(store)
    setEditingStore(null)
  }
```

Add the Shops tab to the `tabs` array:
```typescript
  const tabs: { key: AdventureTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'npcs', label: `NPCs (${adv.npcs.length})` },
    { key: 'encounters', label: `Encounters (${adv.randomEncounters.length})` },
    { key: 'shops', label: `Shops (${adv.stores.length})` },
  ]
```

Add the Shops tab content (after the encounters tab content, before `</main>`):

```tsx
      {/* Shops */}
      {tab === 'shops' && (
        <div>
          <div className="mb-4 flex justify-end">
            <button onClick={() => setEditingStore(createEmptyStore())} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition">+ New Shop</button>
          </div>
          {adv.stores.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-12 text-center">
              <p className="text-muted-foreground">No shops yet</p>
              <button onClick={() => setEditingStore(createEmptyStore())} className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition">Create First Shop</button>
            </div>
          ) : (
            <div className="space-y-2">
              {adv.stores.map(store => (
                <div key={store.id} onClick={() => setEditingStore(store)} className="flex items-center justify-between rounded-xl border border-border bg-card p-3 cursor-pointer hover:border-border/80 transition">
                  <div className="min-w-0 flex-1">
                    <span className="font-medium">{store.name || 'Unnamed Shop'}</span>
                    <p className="text-xs text-muted-foreground">
                      <span className="capitalize">{store.storeType}</span>
                      {' · '}{store.items.length} items
                      {store.keeperName && ` · ${store.keeperName}`}
                      {store.roomId && (() => {
                        const room = adv.rooms.find(r => r.id === store.roomId)
                        return room ? ` · ${room.name || `Room ${room.number}`}` : ''
                      })()}
                    </p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); removeStore(store.id) }} className="shrink-0 text-xs text-red-400 hover:text-red-300 ml-3">Delete</button>
                </div>
              ))}
            </div>
          )}
          {editingStore && (
            <StoreEditor
              store={editingStore}
              rooms={adv.rooms}
              npcs={adv.npcs}
              onSave={saveStore}
              onCancel={() => setEditingStore(null)}
            />
          )}
        </div>
      )}
```

- [ ] **Step 2: Run full test suite**

Run: `cd shadowdark-engine && npx vitest run`
Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/routes/campaign/$campaignId.adventure.tsx
git commit -m "feat(campaign): add Shops tab to adventure editor with store list and editor"
```

---

### Task 5: Final Verification

**Files:**
- All files from Tasks 1-4

- [ ] **Step 1: Run full test suite**

Run: `cd shadowdark-engine && npx vitest run --reporter=verbose`
Expected: All tests pass, including new store validation + round-trip tests.

- [ ] **Step 2: Run TypeScript type check**

Run: `cd shadowdark-engine && npx tsc --noEmit`
Expected: No new type errors.

- [ ] **Step 3: Visual verification (if dev server is running)**

Open `http://localhost:3000/campaign/` in a browser:
1. Create a new campaign
2. Go to Adventure tab → Shops tab
3. Create a shop, add items from catalog and custom items
4. Link to a room and NPC
5. Export as adventure document
6. Import the exported file
7. Verify shop data round-tripped correctly

- [ ] **Step 4: Final commit if any cleanup was needed**

```bash
git add -A
git commit -m "chore(campaign): final cleanup for adventure shops feature"
```
