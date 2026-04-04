import { useState, useMemo } from 'react'
import type { GameStore, StoreItem, StoreType } from '@/schemas/stores.ts'
import type { ItemCategory } from '@/schemas/inventory.ts'
import { WEAPONS, ARMOR, GEAR, getItemPackId, getPackColor } from '@/data/index.ts'
import { useDataRegistry } from '@/hooks/use-data-registry.ts'
import { dataRegistry } from '@/lib/data/registry.ts'
import { generateId } from '@/lib/utils/id.ts'
import { useLocale } from '@/hooks/use-locale.ts'

type CatalogItem = { id: string; name: string; price: number; category: ItemCategory; slots: number }

// Filter items by store type
function getItemsForStoreType(storeType: StoreType, allItems: CatalogItem[]) {
  switch (storeType) {
    case 'weapons': return allItems.filter(i => i.category === 'weapon')
    case 'armor': return allItems.filter(i => i.category === 'armor' || i.category === 'shield')
    case 'magic': return allItems.filter(i => i.category === 'magic_item')
    case 'potions': return allItems.filter(i => i.category === 'consumable')
    case 'tavern': return allItems.filter(i => i.category === 'ration' || i.category === 'consumable' || i.category === 'gear')
    case 'temple': return allItems.filter(i => i.category === 'consumable' || i.category === 'magic_item' || i.name.toLowerCase().includes('holy'))
    case 'general': return allItems
    case 'custom': return allItems
    default: return allItems
  }
}

function makeStoreItems(items: CatalogItem[]): StoreItem[] {
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
  const { t, ti } = useLocale()
  useDataRegistry()
  const allItems = useMemo<CatalogItem[]>(() => [
    ...WEAPONS.map(w => ({ id: w.id, name: w.name, price: w.cost, category: 'weapon' as ItemCategory, slots: w.slots })),
    ...ARMOR.map(a => ({ id: a.id, name: a.name, price: a.cost, category: 'armor' as ItemCategory, slots: a.slots })),
    ...GEAR.map(g => ({ id: g.id, name: g.name, price: g.cost, category: g.category, slots: g.slots })),
  ], [WEAPONS, ARMOR, GEAR])
  const [showCreate, setShowCreate] = useState(false)
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)
  const [catalogSearch, setCatalogSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const itemPacks = dataRegistry.getPacks().filter(p => p.enabled && (p.counts.weapons + p.counts.armor + p.counts.gear) > 0)

  const selectedStore = stores.find(s => s.id === selectedStoreId)

  function handleCreateStore(name: string, storeType: StoreType) {
    // Auto-populate with items matching store type
    const defaultItems = getItemsForStoreType(storeType, allItems)
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

  // Items already in the store (by definitionId)
  const storeItemIds = new Set(selectedStore?.items.map(i => i.itemDefinitionId) ?? [])

  // Catalog filtered by source and search (shows all items, in-store items are togglable)
  let sourceFilteredItems = allItems
  if (sourceFilter === 'core') sourceFilteredItems = sourceFilteredItems.filter(i => !getItemPackId(i.id))
  else if (sourceFilter !== 'all') sourceFilteredItems = sourceFilteredItems.filter(i => getItemPackId(i.id) === sourceFilter)

  const catalogItems = sourceFilteredItems
    .filter(i => !catalogSearch || i.name.toLowerCase().includes(catalogSearch.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t('store.stores')}</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
        >
          {t('store.newStore')}
        </button>
      </div>

      {showCreate && <CreateStoreForm allItems={allItems} onCreate={handleCreateStore} onCancel={() => setShowCreate(false)} />}

      {stores.length === 0 && !showCreate ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <p className="text-muted-foreground">{t('store.noStoresCreated')}</p>
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
              {/* Header */}
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">{selectedStore.name}</h3>
                  <span className="text-xs text-muted-foreground capitalize">{selectedStore.storeType} store · {selectedStore.items.length} items in stock</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleStoreActive(selectedStore.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      selectedStore.isActive ? 'bg-green-500/20 text-green-400' : 'border border-border hover:bg-accent'
                    }`}
                  >
                    {selectedStore.isActive ? t('store.active') : t('store.inactive')}
                  </button>
                  {!selectedStore.isActive && (
                    <button
                      onClick={() => { onRemoveStore(selectedStore.id); setSelectedStoreId(null) }}
                      className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
                    >
                      {t('common.delete')}
                    </button>
                  )}
                </div>
              </div>

              {/* Search & Filters */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={e => setCatalogSearch(e.target.value)}
                  placeholder={t('store.searchItems')}
                  className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
                {itemPacks.length > 0 && (
                  <select
                    value={sourceFilter}
                    onChange={e => setSourceFilter(e.target.value)}
                    className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm outline-none"
                  >
                    <option value="all">{t('common.allSources')}</option>
                    <option value="core">{t('common.coreOnly')}</option>
                    {itemPacks.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Full Item List */}
              <div className="max-h-[480px] space-y-0.5 overflow-y-auto rounded-lg border border-border/50 p-1">
                {catalogItems.length === 0 && storeItemIds.size === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">{t('store.noItemsMatchFilters')}</p>
                ) : (
                  <>
                    {catalogItems.map(item => {
                      const inStore = storeItemIds.has(item.id)
                      const packId = getItemPackId(item.id)
                      const packColor = packId ? getPackColor(packId) : undefined
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (inStore) {
                              const storeItem = selectedStore.items.find(si => si.itemDefinitionId === item.id)
                              if (storeItem) removeItemFromStore(selectedStore.id, storeItem.id)
                            } else {
                              addItemToStore(selectedStore.id, {
                                itemDefinitionId: item.id,
                                name: item.name,
                                description: '',
                                price: item.price,
                                quantity: -1,
                                category: item.category,
                                slots: item.slots,
                                isCustom: false,
                              })
                            }
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-sm transition ${
                            inStore
                              ? 'bg-primary/10 text-foreground'
                              : 'hover:bg-accent'
                          }`}
                          style={packColor ? { borderLeftColor: packColor, borderLeftWidth: '3px', borderLeftStyle: 'solid' } : undefined}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-4 text-center text-xs ${inStore ? 'text-primary' : 'text-muted-foreground/30'}`}>
                              {inStore ? '\u2713' : '+'}
                            </span>
                            <span className={inStore ? 'font-medium' : ''}>{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground capitalize">{item.category.replace('_', ' ')}</span>
                            <span className="text-xs text-muted-foreground w-14 text-right">{formatCost(item.price)}</span>
                          </div>
                        </button>
                      )
                    })}
                  </>
                )}
              </div>
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                {ti('store.clickToAddRemove', { inStock: catalogItems.filter(i => storeItemIds.has(i.id)).length, total: catalogItems.length })}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CreateStoreForm({ allItems, onCreate, onCancel }: { allItems: CatalogItem[]; onCreate: (name: string, type: StoreType) => void; onCancel: () => void }) {
  const { t, ti } = useLocale()
  const [name, setName] = useState('')
  const [storeType, setStoreType] = useState<StoreType>('general')

  const previewCount = getItemsForStoreType(storeType, allItems).length

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder={t('store.storeNamePlaceholder')}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <div>
        <p className="mb-1.5 text-xs text-muted-foreground">{t('store.storeTypeDescription')}</p>
        <div className="flex flex-wrap gap-2">
          {(['general', 'weapons', 'armor', 'magic', 'potions', 'tavern', 'temple', 'custom'] as StoreType[]).map(st => (
            <button
              key={st}
              onClick={() => setStoreType(st)}
              className={`rounded-lg px-3 py-1 text-xs capitalize transition ${
                storeType === st ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-accent'
              }`}
            >
              {t(`store.storeType.${st}`)}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          {storeType === 'custom' ? t('store.emptyStoreDescription') : ti('store.willStartWith', { count: previewCount })}
        </p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => name.trim() && onCreate(name.trim(), storeType)} disabled={!name.trim()} className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {t('common.create')}
        </button>
        <button onClick={onCancel} className="rounded-lg border border-border px-4 py-1.5 text-sm hover:bg-accent">{t('common.cancel')}</button>
      </div>
    </div>
  )
}
