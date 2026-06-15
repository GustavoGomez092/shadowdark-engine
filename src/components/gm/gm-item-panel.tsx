import { useMemo, useState } from 'react'
import type { Character } from '@/schemas/character.ts'
import type { LightState } from '@/schemas/light.ts'
import type { InventoryItem, ItemCategory } from '@/schemas/inventory.ts'
import { WEAPONS, ARMOR, GEAR } from '@/data/index.ts'
import { createInventoryItem } from '@/lib/rules/inventory.ts'
import { LightControls } from '@/components/player/light-controls.tsx'

interface Props {
  character: Character
  lightState: LightState
  onEquip: (itemId: string) => void
  onUnequip: (itemId: string) => void
  onDrop: (itemId: string) => void
  onUse: (itemId: string) => void
  onGiveItem: (item: InventoryItem) => void
  onLightTorch: (itemId: string) => void
  onLightLantern: (lanternId: string, oilId: string) => void
  onLightCampfire: (torchIds: string[]) => void
}

/**
 * GM-side item management for the selected character (player OR NPC): equip,
 * unequip, drop, use consumables, add items from the catalog, and ignite
 * torches/lanterns/campfires — the same things players can do, plus "give item"
 * so empty-inventory NPCs can be outfitted.
 */
export function GmItemPanel({ character, lightState, onEquip, onUnequip, onDrop, onUse, onGiveItem, onLightTorch, onLightLantern, onLightCampfire }: Props) {
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const catalog = useMemo(() => [
    ...WEAPONS.map(w => ({ definitionId: w.id, name: w.name, category: 'weapon' as ItemCategory, slots: w.slots })),
    ...ARMOR.map(a => ({ definitionId: a.id, name: a.name, category: 'armor' as ItemCategory, slots: a.slots })),
    ...GEAR.map(g => ({ definitionId: g.id, name: g.name, category: g.category as ItemCategory, slots: g.slots })),
  ], [])

  const filtered = catalog.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase())).slice(0, 40)
  const items = character.inventory.items

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Items <span className="text-muted-foreground">({items.length})</span></h3>
        <button onClick={() => setShowAdd(v => !v)} className="rounded-lg border border-border px-3 py-1 text-xs hover:bg-accent">+ Add item</button>
      </div>

      <LightControls
        character={character}
        isInDarkness={lightState.isInDarkness}
        hasActiveLight={lightState.timers.some(t => t.isActive && !t.isExpired && t.carrierId === character.id)}
        isPaused={lightState.isPaused}
        onLightTorch={onLightTorch}
        onLightLantern={onLightLantern}
        onLightCampfire={onLightCampfire}
      />

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No items. Use “Add item” to give them gear (e.g. a torch, lantern, oil flask).</p>
      ) : (
        <div className="space-y-1">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-2 rounded-lg border border-border/50 px-2 py-1 text-sm">
              <span className="flex-1 truncate">
                {item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ''}{item.equipped ? ' ⚔️' : ''}
              </span>
              {(item.category === 'weapon' || item.category === 'armor' || item.category === 'shield') && (
                <button onClick={() => item.equipped ? onUnequip(item.id) : onEquip(item.id)} className="text-[10px] text-muted-foreground hover:text-foreground">
                  {item.equipped ? 'Unequip' : 'Equip'}
                </button>
              )}
              {item.category === 'consumable' && (
                <button onClick={() => onUse(item.id)} className="text-[10px] text-primary hover:underline">Use</button>
              )}
              <button onClick={() => onDrop(item.id)} className="text-[10px] text-muted-foreground hover:text-red-400">Drop</button>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="space-y-2 rounded-lg border border-border/60 p-2">
          <input value={search} onChange={e => setSearch(e.target.value)} autoFocus
            placeholder="Search catalog — torch, lantern, oil, sword…"
            className="w-full rounded-lg border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring" />
          <div className="max-h-48 space-y-0.5 overflow-y-auto">
            {filtered.map(c => (
              <button key={c.definitionId} onClick={() => onGiveItem(createInventoryItem(c.definitionId, c.name, c.category, c.slots))}
                className="flex w-full items-center justify-between rounded px-2 py-1 text-xs hover:bg-accent">
                <span>{c.name}</span><span className="capitalize text-muted-foreground">{c.category.replace('_', ' ')}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
