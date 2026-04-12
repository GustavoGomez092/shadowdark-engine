import { useState, useMemo } from 'react'
import type { AdventureStore, AdventureStoreType, AdventureRoom, AdventureNPC } from '@/schemas/campaign.ts'
import type { StoreItem } from '@/schemas/stores.ts'
import type { ItemCategory } from '@/schemas/inventory.ts'
import { createEmptyStoreItem } from '@/lib/campaign/defaults.ts'
import { generateId } from '@/lib/utils/id.ts'
import { WEAPONS, ARMOR, GEAR } from '@/data/index.ts'

type CatalogItem = { id: string; name: string; price: number; category: ItemCategory; slots: number }

const STORE_TYPES: AdventureStoreType[] = ['general', 'weapons', 'armor', 'magic', 'potions', 'tavern', 'temple', 'custom']

function formatCost(gp: number): string {
  if (gp >= 1) return `${gp} gp`
  if (gp >= 0.1) return `${Math.round(gp * 10)} sp`
  return `${Math.round(gp * 100)} cp`
}

interface Props {
  store: AdventureStore
  rooms: AdventureRoom[]
  npcs: AdventureNPC[]
  onSave: (store: AdventureStore) => void
  onCancel: () => void
}

export function StoreEditor({ store: initial, rooms, npcs, onSave, onCancel }: Props) {
  const [s, setS] = useState<AdventureStore>({ ...initial, items: initial.items.map(i => ({ ...i })) })
  const [showCatalog, setShowCatalog] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState('')

  const update = <K extends keyof AdventureStore>(k: K, v: AdventureStore[K]) => setS(p => ({ ...p, [k]: v }))
  const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"

  const allItems = useMemo<CatalogItem[]>(() => [
    ...WEAPONS.map(w => ({ id: w.id, name: w.name, price: w.cost, category: 'weapon' as ItemCategory, slots: w.slots })),
    ...ARMOR.map(a => ({ id: a.id, name: a.name, price: a.cost, category: 'armor' as ItemCategory, slots: a.slots })),
    ...GEAR.map(g => ({ id: g.id, name: g.name, price: g.cost, category: g.category, slots: g.slots })),
  ], [WEAPONS, ARMOR, GEAR])

  const storeItemDefIds = new Set(s.items.filter(i => i.itemDefinitionId).map(i => i.itemDefinitionId))

  const catalogItems = allItems.filter(i =>
    !catalogSearch || i.name.toLowerCase().includes(catalogSearch.toLowerCase())
  )

  function addCatalogItem(item: CatalogItem) {
    setS(p => ({
      ...p,
      items: [...p.items, {
        id: generateId(),
        itemDefinitionId: item.id,
        name: item.name,
        description: '',
        price: item.price,
        quantity: -1,
        category: item.category,
        slots: item.slots,
        isCustom: false,
      }],
    }))
  }

  function addCustomItem() {
    setS(p => ({ ...p, items: [...p.items, createEmptyStoreItem()] }))
  }

  function updateItem(id: string, patch: Partial<StoreItem>) {
    setS(p => ({
      ...p,
      items: p.items.map(i => i.id === id ? { ...i, ...patch } : i),
    }))
  }

  function removeItem(id: string) {
    setS(p => ({ ...p, items: p.items.filter(i => i.id !== id) }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="text-xl font-bold mb-4">{initial.name ? `Edit: ${initial.name}` : 'New Shop'}</h2>

        {/* Store Info */}
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Name *</label>
              <input type="text" value={s.name} onChange={e => update('name', e.target.value)} placeholder="e.g., The Rusty Blade" className={inputCls} />
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
            <textarea value={s.description} onChange={e => update('description', e.target.value)} rows={2} placeholder="A brief description of this shop..." className={inputCls + " resize-y"} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Keeper Name</label>
              <input type="text" value={s.keeperName ?? ''} onChange={e => update('keeperName', e.target.value || undefined)} placeholder="e.g., Brom the Smith" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Keeper Ancestry</label>
              <input type="text" value={s.keeperAncestry ?? ''} onChange={e => update('keeperAncestry', e.target.value || undefined)} placeholder="e.g., dwarf" className={inputCls} />
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">Links</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Room</label>
              <select value={s.roomId ?? ''} onChange={e => update('roomId', e.target.value || undefined)} className={inputCls}>
                <option value="">None</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">NPC</label>
              <select value={s.npcId ?? ''} onChange={e => update('npcId', e.target.value || undefined)} className={inputCls}>
                <option value="">None</option>
                {npcs.map(n => (
                  <option key={n.id} value={n.id}>{n.name || 'Unnamed NPC'}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">Items ({s.items.length})</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCatalog(v => !v)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  showCatalog ? 'bg-primary/15 text-primary border border-primary/30' : 'border border-border hover:bg-accent'
                }`}
              >
                {showCatalog ? 'Hide Catalog' : 'Add from Content'}
              </button>
              <button
                onClick={addCustomItem}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition"
              >
                + Custom Item
              </button>
            </div>
          </div>

          {/* Catalog Picker */}
          {showCatalog && (
            <div className="rounded-lg border border-border/50 p-2 space-y-2">
              <input
                type="text"
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                placeholder="Search items..."
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="max-h-[200px] space-y-0.5 overflow-y-auto">
                {catalogItems.map(item => {
                  const alreadyAdded = storeItemDefIds.has(item.id)
                  return (
                    <button
                      key={item.id}
                      disabled={alreadyAdded}
                      onClick={() => addCatalogItem(item)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-sm transition ${
                        alreadyAdded ? 'opacity-40 cursor-not-allowed' : 'hover:bg-accent'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-4 text-center text-xs ${alreadyAdded ? 'text-primary' : 'text-muted-foreground/30'}`}>
                          {alreadyAdded ? '\u2713' : '+'}
                        </span>
                        <span>{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground capitalize">{item.category.replace('_', ' ')}</span>
                        <span className="text-xs text-muted-foreground w-14 text-right">{formatCost(item.price)}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Item List */}
          {s.items.length > 0 ? (
            <div className="space-y-1">
              {s.items.map(item => (
                <div key={item.id} className="flex items-center gap-2 rounded-lg border border-border/50 bg-background p-2">
                  <div className="min-w-0 flex-1">
                    {item.isCustom ? (
                      <input
                        type="text"
                        value={item.name}
                        onChange={e => updateItem(item.id, { name: e.target.value })}
                        placeholder="Item name"
                        className="w-full rounded border border-input bg-transparent px-2 py-0.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                      />
                    ) : (
                      <span className="text-sm font-medium px-2">{item.name}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground capitalize shrink-0">{item.category.replace('_', ' ')}</span>
                  {item.isCustom && <span className="text-[10px] bg-amber-500/20 text-amber-400 rounded px-1 shrink-0">custom</span>}
                  <input
                    type="number"
                    value={item.price}
                    step={0.01}
                    min={0}
                    onChange={e => updateItem(item.id, { price: parseFloat(e.target.value) || 0 })}
                    className="w-16 rounded border border-input bg-transparent px-1.5 py-0.5 text-xs text-right outline-none focus:ring-1 focus:ring-ring"
                    title="Price (gp)"
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    min={-1}
                    onChange={e => updateItem(item.id, { quantity: parseInt(e.target.value) || -1 })}
                    className="w-14 rounded border border-input bg-transparent px-1.5 py-0.5 text-xs text-right outline-none focus:ring-1 focus:ring-ring"
                    title="Quantity (-1 = unlimited)"
                  />
                  <input
                    type="number"
                    value={item.slots}
                    min={0}
                    onChange={e => updateItem(item.id, { slots: parseInt(e.target.value) || 0 })}
                    className="w-12 rounded border border-input bg-transparent px-1.5 py-0.5 text-xs text-right outline-none focus:ring-1 focus:ring-ring"
                    title="Slots"
                  />
                  <button onClick={() => removeItem(item.id)} className="shrink-0 text-xs text-red-400 hover:text-red-300 ml-1">×</button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No items yet. Use the buttons above to add items.</p>
          )}
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
