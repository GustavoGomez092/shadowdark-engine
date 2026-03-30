import { useState } from 'react'
import type { GameStore, StoreItem, StoreType } from '@/schemas/stores.ts'
import type { ItemCategory } from '@/schemas/inventory.ts'
import { WEAPONS, ARMOR, GEAR } from '@/data/index.ts'
import { generateId } from '@/lib/utils/id.ts'

// Build full catalog with categories
const ALL_ITEMS = [
  ...WEAPONS.map(w => ({ id: w.id, name: w.name, price: w.cost, category: 'weapon' as ItemCategory, slots: w.slots })),
  ...ARMOR.map(a => ({ id: a.id, name: a.name, price: a.cost, category: 'armor' as ItemCategory, slots: a.slots })),
  ...GEAR.map(g => ({ id: g.id, name: g.name, price: g.cost, category: g.category, slots: g.slots })),
]

// Filter items by store type
function getItemsForStoreType(storeType: StoreType) {
  switch (storeType) {
    case 'weapons': return ALL_ITEMS.filter(i => i.category === 'weapon')
    case 'armor': return ALL_ITEMS.filter(i => i.category === 'armor' || i.category === 'shield')
    case 'magic': return ALL_ITEMS.filter(i => i.category === 'magic_item')
    case 'potions': return ALL_ITEMS.filter(i => i.category === 'consumable')
    case 'tavern': return ALL_ITEMS.filter(i => i.category === 'ration' || i.category === 'consumable' || i.category === 'gear')
    case 'temple': return ALL_ITEMS.filter(i => i.category === 'consumable' || i.category === 'magic_item' || i.name.toLowerCase().includes('holy'))
    case 'general': return ALL_ITEMS
    case 'custom': return ALL_ITEMS
    default: return ALL_ITEMS
  }
}

function makeStoreItems(items: typeof ALL_ITEMS): StoreItem[] {
  return items.map(item => ({
    id: generateId(),
    itemDefinitionId: item.id,
    name: item.name,
    description: '',
    price: item.price,
    quantity: -1,
    category: item.category,
    slots: item.slots,
    isCustom: false,
  }))
}

function formatCost(gp: number): string {
  if (gp >= 1) return `${gp} gp`
  if (gp >= 0.1) return `${Math.round(gp * 10)} sp`
  return `${Math.round(gp * 100)} cp`
}

interface Props {
  stores: GameStore[]
  onAddStore: (store: GameStore) => void
  onUpdateStore: (id: string, updater: (s: GameStore) => void) => void
  onRemoveStore: (id: string) => void
}

export function StoreEditor({ stores, onAddStore, onUpdateStore, onRemoveStore }: Props) {
  const [showCreate, setShowCreate] = useState(false)
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)
  const [catalogSearch, setCatalogSearch] = useState('')

  const selectedStore = stores.find(s => s.id === selectedStoreId)

  function handleCreateStore(name: string, storeType: StoreType) {
    // Auto-populate with items matching store type
    const defaultItems = getItemsForStoreType(storeType)
    const store: GameStore = {
      id: generateId(),
      name,
      description: '',
      storeType,
      items: makeStoreItems(defaultItems),
      isActive: false,
    }
    onAddStore(store)
    setSelectedStoreId(store.id)
    setShowCreate(false)
  }

  function addItemToStore(storeId: string, item: Omit<StoreItem, 'id'>) {
    onUpdateStore(storeId, (s) => {
      s.items.push({ ...item, id: generateId() })
    })
  }

  function removeItemFromStore(storeId: string, itemId: string) {
    onUpdateStore(storeId, (s) => {
      s.items = s.items.filter(i => i.id !== itemId)
    })
  }

  function toggleStoreActive(storeId: string) {
    onUpdateStore(storeId, (s) => {
      s.isActive = !s.isActive
    })
  }

  // Items already in the store (by definitionId) to avoid duplicates in catalog
  const storeItemIds = new Set(selectedStore?.items.map(i => i.itemDefinitionId) ?? [])

  // Catalog filtered by search and excluding already-added items
  const catalogItems = ALL_ITEMS
    .filter(i => !storeItemIds.has(i.id))
    .filter(i => !catalogSearch || i.name.toLowerCase().includes(catalogSearch.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Stores</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
        >
          + New Store
        </button>
      </div>

      {showCreate && <CreateStoreForm onCreate={handleCreateStore} onCancel={() => setShowCreate(false)} />}

      {stores.length === 0 && !showCreate ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <p className="text-muted-foreground">No stores created yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[250px_1fr]">
          <div className="space-y-1">
            {stores.map(s => (
              <button
                key={s.id}
                onClick={() => { setSelectedStoreId(s.id); setCatalogSearch('') }}
                className={`w-full rounded-lg border p-3 text-left transition ${
                  selectedStoreId === s.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{s.name}</span>
                  <span className={`h-2 w-2 rounded-full ${s.isActive ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                </div>
                <span className="text-xs text-muted-foreground capitalize">{s.storeType} · {s.items.length} items</span>
              </button>
            ))}
          </div>

          {selectedStore && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">{selectedStore.name}</h3>
                  <span className="text-xs text-muted-foreground capitalize">{selectedStore.storeType} store · {selectedStore.items.length} items</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleStoreActive(selectedStore.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      selectedStore.isActive ? 'bg-green-500/20 text-green-400' : 'border border-border hover:bg-accent'
                    }`}
                  >
                    {selectedStore.isActive ? 'Active' : 'Inactive'}
                  </button>
                  {!selectedStore.isActive && (
                    <button
                      onClick={() => { onRemoveStore(selectedStore.id); setSelectedStoreId(null) }}
                      className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Store items */}
              <div className="mb-4 max-h-64 space-y-1 overflow-y-auto">
                {selectedStore.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items. Add from the catalog below.</p>
                ) : (
                  selectedStore.items.map(item => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-1.5 text-sm group">
                      <div>
                        <span className="font-medium">{item.name}</span>
                        <span className="ml-2 text-muted-foreground">{formatCost(item.price)}</span>
                      </div>
                      <button
                        onClick={() => removeItemFromStore(selectedStore.id, item.id)}
                        className="text-xs text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add from catalog */}
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Add from catalog</p>
                  <span className="text-[10px] text-muted-foreground">{catalogItems.length} available</span>
                </div>
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={e => setCatalogSearch(e.target.value)}
                  placeholder="Search items..."
                  className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs mb-2 outline-none focus:ring-1 focus:ring-ring"
                />
                <div className="max-h-48 space-y-0.5 overflow-y-auto">
                  {catalogItems.slice(0, 30).map(item => (
                    <button
                      key={item.id}
                      onClick={() => addItemToStore(selectedStore.id, {
                        itemDefinitionId: item.id,
                        name: item.name,
                        description: '',
                        price: item.price,
                        quantity: -1,
                        category: item.category,
                        slots: item.slots,
                        isCustom: false,
                      })}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-xs hover:bg-accent transition"
                    >
                      <span>{item.name}</span>
                      <span className="text-muted-foreground">{formatCost(item.price)}</span>
                    </button>
                  ))}
                  {catalogItems.length > 30 && (
                    <p className="text-[10px] text-muted-foreground text-center py-1">Search to find more...</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CreateStoreForm({ onCreate, onCancel }: { onCreate: (name: string, type: StoreType) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [storeType, setStoreType] = useState<StoreType>('general')

  const previewCount = getItemsForStoreType(storeType).length

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Store name..."
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <div>
        <p className="mb-1.5 text-xs text-muted-foreground">Store type — auto-populates matching items</p>
        <div className="flex flex-wrap gap-2">
          {(['general', 'weapons', 'armor', 'magic', 'potions', 'tavern', 'temple', 'custom'] as StoreType[]).map(t => (
            <button
              key={t}
              onClick={() => setStoreType(t)}
              className={`rounded-lg px-3 py-1 text-xs capitalize transition ${
                storeType === t ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-accent'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          {storeType === 'custom' ? 'Empty store — add items manually' : `Will start with ${previewCount} items`}
        </p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => name.trim() && onCreate(name.trim(), storeType)} disabled={!name.trim()} className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
          Create
        </button>
        <button onClick={onCancel} className="rounded-lg border border-border px-4 py-1.5 text-sm hover:bg-accent">Cancel</button>
      </div>
    </div>
  )
}
