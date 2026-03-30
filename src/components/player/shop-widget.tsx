import { useState } from 'react'
import type { Character } from '@/schemas/character.ts'
import type { PublicStoreInfo } from '@/schemas/session.ts'
import type { StoreItem } from '@/schemas/stores.ts'
import { getWeapon } from '@/data/weapons.ts'
import { getArmor } from '@/data/armor.ts'
import { getGear } from '@/data/gear.ts'

function formatCost(gp: number): string {
  if (gp >= 1) return `${gp} gp`
  if (gp >= 0.1) return `${Math.round(gp * 10)} sp`
  return `${Math.round(gp * 100)} cp`
}

function getItemDetails(item: StoreItem): string | null {
  const defId = item.itemDefinitionId
  if (!defId) return null

  const weapon = getWeapon(defId)
  if (weapon) {
    const props = weapon.properties.length > 0 ? weapon.properties.map(p => p.replace('_', '-')).join(', ') : ''
    return `${weapon.type} · ${weapon.damage}${weapon.versatileDamage ? '/' + weapon.versatileDamage : ''} · ${weapon.range}${props ? ' · ' + props : ''}`
  }

  const armor = getArmor(defId)
  if (armor) {
    const ac = armor.type === 'shield' ? '+2' : `${armor.acBase}${armor.addDex ? ' + DEX' : ''}`
    const penalties = [
      armor.stealthPenalty && 'stealth disadv.',
      armor.swimPenalty === 'disadvantage' && 'swim disadv.',
      armor.swimPenalty === 'cannot' && 'no swim',
      armor.isMithral && 'mithral',
    ].filter(Boolean).join(', ')
    return `AC ${ac}${penalties ? ' · ' + penalties : ''}`
  }

  const gear = getGear(defId)
  if (gear) return gear.description

  return null
}

interface Props {
  store: PublicStoreInfo
  character: Character
  onBuy: (storeId: string, itemId: string, itemName: string, price: number) => void
  onSell: (storeId: string, itemId: string, itemName: string, sellPrice: number) => void
}

export function ShopWidget({ store, character, onBuy, onSell }: Props) {
  const [tab, setTab] = useState<'buy' | 'sell'>('buy')
  const [search, setSearch] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const gold = character.inventory.coins.gp + character.inventory.coins.sp / 10 + character.inventory.coins.cp / 100

  const filteredItems = store.items.filter(i =>
    !search || i.name.toLowerCase().includes(search.toLowerCase())
  )

  const sellableItems = character.inventory.items.filter(i => !i.equipped)

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">🏪 {store.name}</h3>
          <span className="text-xs text-muted-foreground">{store.items.length} items for sale</span>
        </div>
        <span className="text-sm font-bold text-amber-400">{character.inventory.coins.gp} gp</span>
      </div>

      <div className="flex gap-1 rounded-lg border border-border p-0.5 mb-3">
        <button
          onClick={() => setTab('buy')}
          className={`flex-1 rounded-md py-1 text-xs font-semibold transition ${
            tab === 'buy' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >Buy</button>
        <button
          onClick={() => setTab('sell')}
          className={`flex-1 rounded-md py-1 text-xs font-semibold transition ${
            tab === 'sell' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >Sell</button>
      </div>

      {tab === 'buy' && (
        <>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search items..."
            className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs mb-2 outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="max-h-64 space-y-0.5 overflow-y-auto">
            {filteredItems.map(item => {
              const canAfford = gold >= item.price
              const details = getItemDetails(item)
              const isHovered = hoveredId === item.id

              return (
                <div
                  key={item.id}
                  className="rounded-lg px-2 py-1.5 text-xs hover:bg-accent/50 transition"
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{item.name}</span>
                      <span className="ml-1 text-muted-foreground">{item.slots}s</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{formatCost(item.price)}</span>
                      <button
                        onClick={() => onBuy(store.id, item.id, item.name, item.price)}
                        disabled={!canAfford}
                        className="rounded bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary hover:bg-primary/25 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      >
                        Buy
                      </button>
                    </div>
                  </div>
                  {isHovered && details && (
                    <p className="mt-0.5 text-[10px] text-muted-foreground leading-relaxed">{details}</p>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {tab === 'sell' && (
        <div className="max-h-64 space-y-0.5 overflow-y-auto">
          {sellableItems.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No items to sell (equipped items can't be sold)</p>
          ) : (
            sellableItems.map(item => {
              const sellPrice = Math.max(1, Math.floor(item.slots * 2))
              return (
                <div key={item.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs">
                  <div>
                    <span className="font-medium">{item.name}</span>
                    {item.quantity > 1 && <span className="ml-1 text-muted-foreground">x{item.quantity}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400">{sellPrice} gp</span>
                    <button
                      onClick={() => onSell(store.id, item.id, item.name, sellPrice)}
                      className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400 hover:bg-amber-500/25 transition"
                    >
                      Sell
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
