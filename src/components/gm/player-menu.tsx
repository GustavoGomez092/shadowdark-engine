import { useState, useRef, useEffect } from 'react'
import type { Character } from '@/schemas/character.ts'
import { WEAPONS, ARMOR, GEAR, getItemPackId } from '@/data/index.ts'
import { useDataRegistry } from '@/hooks/use-data-registry.ts'
import { dataRegistry } from '@/lib/data/registry.ts'
import { createInventoryItem } from '@/lib/rules/inventory.ts'
import type { InventoryItem } from '@/schemas/inventory.ts'
import { useLocale } from '@/hooks/use-locale.ts'

interface Props {
  character: Character | null
  playerName: string
  onUpdateHp: (delta: number) => void
  onUpdateXp: (delta: number) => void
  onAddGold: (amount: number) => void
  onAddItem: (item: InventoryItem) => void
  onRemoveItem: (itemId: string) => void
  onAdjustQuantity: (itemId: string, delta: number) => void
  onToggleLuckToken: () => void
  onKick: () => void
}

export function PlayerMenu({ character, playerName: _playerName, onUpdateHp, onUpdateXp, onAddGold, onAddItem, onRemoveItem, onAdjustQuantity, onToggleLuckToken, onKick }: Props) {
  const { t, ti } = useLocale()
  useDataRegistry()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'actions' | 'addItem' | 'removeItem'>('actions')
  const [itemSearch, setItemSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const itemPacks = dataRegistry.getPacks().filter(p => p.enabled && (p.counts.weapons + p.counts.armor + p.counts.gear) > 0)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!character) {
    return (
      <div className="relative" ref={menuRef}>
        <button onClick={() => setOpen(!open)} className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent">⋮</button>
        {open && (
          <div className="absolute right-0 top-8 z-50 w-48 rounded-lg border border-border bg-card p-2 shadow-lg">
            <button onClick={() => { onKick(); setOpen(false) }} className="w-full rounded px-3 py-1.5 text-left text-xs text-red-400 hover:bg-red-500/10">
              {t('gm.kickPlayer')}
            </button>
          </div>
        )}
      </div>
    )
  }

  const allItems = [
    ...WEAPONS.map(w => ({ id: w.id, name: w.name, category: 'weapon' as const, slots: w.slots })),
    ...ARMOR.map(a => ({ id: a.id, name: a.name, category: 'armor' as const, slots: a.slots })),
    ...GEAR.map(g => ({ id: g.id, name: g.name, category: g.category, slots: g.slots })),
  ]
  let sourceFilteredItems = allItems
  if (sourceFilter === 'core') sourceFilteredItems = sourceFilteredItems.filter(i => !getItemPackId(i.id))
  else if (sourceFilter !== 'all') sourceFilteredItems = sourceFilteredItems.filter(i => getItemPackId(i.id) === sourceFilter)

  const filteredItems = itemSearch
    ? sourceFilteredItems.filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase()))
    : sourceFilteredItems

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={() => { setOpen(!open); setTab('actions') }} className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-accent">⋮</button>

      {open && (
        <div className="absolute right-0 top-8 z-50 w-72 rounded-xl border border-border bg-card shadow-xl">
          {/* Header */}
          <div className="border-b border-border px-3 py-2">
            <span className="text-xs font-semibold">{character.name}</span>
            <span className="ml-1 text-[10px] text-muted-foreground capitalize">Lv{character.level} {character.class}</span>
          </div>

          {/* Tab Buttons */}
          <div className="flex border-b border-border">
            {(['actions', 'addItem', 'removeItem'] as const).map(tb => (
              <button
                key={tb}
                onClick={() => setTab(tb)}
                className={`flex-1 py-1.5 text-[10px] font-semibold uppercase transition ${tab === tb ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {tb === 'actions' ? t('player.menu.actions') : tb === 'addItem' ? t('player.menu.addItem') : t('player.menu.items')}
              </button>
            ))}
          </div>

          <div className="max-h-64 overflow-y-auto p-2">
            {tab === 'actions' && (
              <div className="space-y-2">
                {/* HP */}
                <div>
                  <p className="text-[9px] uppercase text-muted-foreground font-semibold mb-1">{ti('player.menu.hp', { current: character.currentHp, max: character.maxHp })}</p>
                  <div className="flex gap-1">
                    {[-5, -1, 1, 5].map(d => (
                      <button key={d} onClick={() => onUpdateHp(d)} className={`flex-1 rounded py-1 text-xs font-bold transition ${d < 0 ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}>
                        {d > 0 ? `+${d}` : d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* XP */}
                <div>
                  <p className="text-[9px] uppercase text-muted-foreground font-semibold mb-1">{ti('player.menu.xp', { current: character.xp, max: character.level * 10 })}</p>
                  <div className="flex gap-1">
                    {[1, 3, 5].map(d => (
                      <button key={d} onClick={() => onUpdateXp(d)} className="flex-1 rounded bg-primary/10 py-1 text-xs font-bold text-primary hover:bg-primary/20 transition">
                        +{d} XP
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gold */}
                <div>
                  <p className="text-[9px] uppercase text-muted-foreground font-semibold mb-1">{ti('player.menu.gold', { amount: character.inventory.coins.gp })}</p>
                  <div className="flex gap-1">
                    {[5, 10, 25, 50].map(d => (
                      <button key={d} onClick={() => onAddGold(d)} className="flex-1 rounded bg-amber-500/10 py-1 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition">
                        +{d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Luck Token */}
                <div>
                  <p className="text-[9px] uppercase text-muted-foreground font-semibold mb-1">{t('player.menu.luckToken')}</p>
                  <button
                    onClick={onToggleLuckToken}
                    className={`w-full rounded py-1.5 text-xs font-bold transition ${
                      character.hasLuckToken
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                        : 'bg-secondary text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10'
                    }`}
                  >
                    {character.hasLuckToken ? `★ ${t('player.menu.hasLuckToken')}` : `☆ ${t('player.menu.grantLuckToken')}`}
                  </button>
                </div>

                {/* Kick */}
                <button onClick={() => { onKick(); setOpen(false) }} className="w-full rounded py-1.5 text-xs text-red-400 border border-red-500/20 hover:bg-red-500/10 transition mt-1">
                  {t('gm.kickPlayer')}
                </button>
              </div>
            )}

            {tab === 'addItem' && (
              <div>
                {itemPacks.length > 0 && (
                  <select
                    value={sourceFilter}
                    onChange={e => setSourceFilter(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs outline-none mb-2"
                  >
                    <option value="all">{t('common.allSources')}</option>
                    <option value="core">{t('common.coreOnly')}</option>
                    {itemPacks.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
                <input
                  type="text"
                  value={itemSearch}
                  onChange={e => setItemSearch(e.target.value)}
                  placeholder={t('player.menu.searchItems')}
                  className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs mb-2 outline-none focus:ring-1 focus:ring-ring"
                />
                <div className="space-y-0.5">
                  {filteredItems.slice(0, 20).map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        const newItem = createInventoryItem(item.id, item.name, item.category, item.slots)
                        onAddItem(newItem)
                      }}
                      className="w-full flex justify-between rounded px-2 py-1 text-xs hover:bg-accent transition"
                    >
                      <span>{item.name}</span>
                      <span className="text-muted-foreground">{item.slots}s</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tab === 'removeItem' && (
              <div>
                {character.inventory.items.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">{t('common.noItems')}</p>
                ) : (
                  <div className="space-y-0.5">
                    {character.inventory.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between rounded px-2 py-1 text-xs">
                        <span className="truncate flex-1 mr-1">
                          {item.name}
                          {item.equipped && <span className="ml-1 text-primary">(E)</span>}
                          {item.quantity > 1 && <span className="ml-1 text-muted-foreground">x{item.quantity}</span>}
                        </span>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {(item.category === 'ammo' || item.category === 'ration' || item.quantity > 1) && (
                            <>
                              <button onClick={() => onAdjustQuantity(item.id, -1)} className="rounded bg-red-500/10 px-1 py-0.5 text-[9px] font-bold text-red-400 hover:bg-red-500/20" title="Remove 1">-1</button>
                              <button onClick={() => onAdjustQuantity(item.id, 1)} className="rounded bg-green-500/10 px-1 py-0.5 text-[9px] font-bold text-green-400 hover:bg-green-500/20" title="Add 1">+1</button>
                            </>
                          )}
                          <button onClick={() => onRemoveItem(item.id)} className="text-red-400 hover:text-red-300 ml-0.5" title="Remove all">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
