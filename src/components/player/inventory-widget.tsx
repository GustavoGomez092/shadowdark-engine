import { useState } from 'react'
import type { Character } from '@/schemas/character.ts'
import { useLocale } from '@/hooks/use-locale.ts'

interface Props {
  character: Character
  isInDarkness: boolean
  hasActiveLight: boolean
  onLightTorch: (itemId: string) => void
  onLightLantern: (lanternId: string, oilId: string) => void
  onLightCampfire: (torchIds: string[]) => void
  onDropItem: (itemId: string, itemName: string) => void
}

type ConfirmAction =
  | { type: 'drop'; itemId: string; itemName: string; slots: number }
  | { type: 'torch'; itemId: string }
  | { type: 'lantern'; lanternId: string; oilId: string }
  | { type: 'campfire'; torchIds: string[] }
  | null

export function InventoryWidget({ character, isInDarkness, hasActiveLight, onLightTorch, onLightLantern, onLightCampfire, onDropItem }: Props) {
  const { t, ti } = useLocale()
  const c = character
  const usedSlots = c.computed.usedGearSlots
  const maxSlots = c.computed.gearSlots
  const isOver = usedSlots > maxSlots
  const [confirm, setConfirm] = useState<ConfirmAction>(null)

  const torches = c.inventory.items.filter(i =>
    i.category === 'light_source' && i.name.toLowerCase().includes('torch')
  )
  const lanterns = c.inventory.items.filter(i =>
    i.category === 'light_source' && i.name.toLowerCase().includes('lantern')
  )
  const oilFlasks = c.inventory.items.filter(i =>
    i.definitionId === 'oil-flask' || i.name.toLowerCase().includes('oil')
  )

  const canLightTorch = torches.length > 0
  const canLightLantern = lanterns.length > 0 && oilFlasks.length > 0
  const canMakeCampfire = torches.length >= 3

  function executeConfirm() {
    if (!confirm) return
    switch (confirm.type) {
      case 'drop': onDropItem(confirm.itemId, confirm.itemName); break
      case 'torch': onLightTorch(confirm.itemId); break
      case 'lantern': onLightLantern(confirm.lanternId, confirm.oilId); break
      case 'campfire': onLightCampfire(confirm.torchIds); break
    }
    setConfirm(null)
  }

  // Confirmation dialog
  if (confirm) {
    const afterSlots = confirm.type === 'drop' ? usedSlots - confirm.slots :
      confirm.type === 'torch' ? usedSlots - 1 :
      confirm.type === 'lantern' ? usedSlots - 1 :
      confirm.type === 'campfire' ? usedSlots - 3 : usedSlots

    return (
      <div className="rounded-xl border border-amber-500/30 bg-card p-3">
        <p className="text-xs font-bold text-amber-400 mb-2">
          {confirm.type === 'drop' ? t('light.dropItem') :
           confirm.type === 'torch' ? t('light.lightTorchConfirm') :
           confirm.type === 'lantern' ? t('light.lightLanternConfirm') : t('light.makeCampfireConfirm')}
        </p>
        <div className="text-[11px] text-muted-foreground space-y-1 mb-3">
          {confirm.type === 'drop' && <p>Drop <span className="text-foreground font-medium">{confirm.itemName}</span> — it will be lost.</p>}
          {confirm.type === 'torch' && <p>Consumes <span className="text-foreground font-medium">1 torch</span>. {torches.length - 1} remaining after.</p>}
          {confirm.type === 'lantern' && <p>Consumes <span className="text-foreground font-medium">1 oil flask</span>. Lantern stays. {oilFlasks.length - 1} oil remaining.</p>}
          {confirm.type === 'campfire' && <p>Consumes <span className="text-foreground font-medium">3 torches</span>. Burns up to 8 hours. {torches.length - 3} torches remaining.</p>}
          <p>Slots: {usedSlots}/{maxSlots} → <span className="text-primary font-medium">{afterSlots}/{maxSlots}</span></p>
        </div>
        <div className="flex gap-2">
          <button onClick={executeConfirm} className="flex-1 rounded-lg bg-primary py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition">
            {t('common.confirm')}
          </button>
          <button onClick={() => setConfirm(null)} className="flex-1 rounded-lg border border-border py-1.5 text-xs hover:bg-accent transition">
            {t('common.cancel')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      {isInDarkness ? (
        <div className="mb-2 rounded-lg bg-red-500/15 border border-red-500/30 p-2 text-center animate-pulse">
          <span className="text-xs font-bold text-red-400">🌑 {t('light.darknessWarning')}</span>
          <p className="text-[9px] text-red-400/70 mt-0.5">{t('light.darknessDescription')}</p>
        </div>
      ) : hasActiveLight ? (
        <div className="mb-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-1.5 text-center">
          <span className="text-[10px] font-semibold text-amber-400">🔥 {t('light.lightActive')}</span>
        </div>
      ) : null}

      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">{t('character.inventory')}</h3>
        <span className={`text-xs font-mono ${isOver ? 'text-red-400 font-bold' : 'text-muted-foreground'}`}>
          {usedSlots}/{maxSlots}
        </span>
      </div>

      <div className="h-1 w-full rounded-full bg-secondary mb-2">
        <div
          className={`h-1 rounded-full transition-all ${isOver ? 'bg-red-500' : 'bg-primary'}`}
          style={{ width: `${Math.min(100, (usedSlots / maxSlots) * 100)}%` }}
        />
      </div>

      <div className="flex gap-2 text-xs mb-2">
        <span className="font-medium text-amber-400">{c.inventory.coins.gp} gp</span>
        <span className="text-muted-foreground">{c.inventory.coins.sp} sp</span>
        <span className="text-muted-foreground">{c.inventory.coins.cp} cp</span>
      </div>

      {/* Light Actions */}
      <div className="space-y-1 mb-2">
        {canLightTorch && (
          <button
            onClick={() => setConfirm({ type: 'torch', itemId: torches[0].id })}
            className="w-full rounded-lg border border-amber-500/30 bg-amber-500/10 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition flex items-center justify-center gap-1.5"
          >
            🔥 {ti('light.lightTorch', { count: torches.length })}
          </button>
        )}
        {canLightLantern && (
          <button
            onClick={() => setConfirm({ type: 'lantern', lanternId: lanterns[0].id, oilId: oilFlasks[0].id })}
            className="w-full rounded-lg border border-amber-500/30 bg-amber-500/10 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition flex items-center justify-center gap-1.5"
          >
            🏮 {ti('light.lightLantern', { count: oilFlasks.length })}
          </button>
        )}
        {canMakeCampfire && (
          <button
            onClick={() => setConfirm({ type: 'campfire', torchIds: torches.slice(0, 3).map(t => t.id) })}
            className="w-full rounded-lg border border-orange-500/30 bg-orange-500/10 py-1.5 text-xs font-semibold text-orange-400 hover:bg-orange-500/20 transition flex items-center justify-center gap-1.5"
          >
            🔥 {t('light.makeCampfire')}
          </button>
        )}
      </div>

      {/* Item list */}
      <div className="space-y-0.5 max-h-40 overflow-y-auto">
        {c.inventory.items.length === 0 ? (
          <p className="text-[10px] text-muted-foreground">{t('common.noItems')}</p>
        ) : (
          c.inventory.items.map(item => (
            <div key={item.id} className="flex items-center justify-between text-[11px] py-0.5 group">
              <span className="truncate">
                {item.name}
                {item.equipped && <span className="ml-0.5 text-primary font-bold">{t('character.equipped')}</span>}
                {item.magicBonus ? <span className="ml-0.5 text-purple-400">+{item.magicBonus}</span> : null}
              </span>
              <div className="flex items-center gap-1 ml-1 shrink-0">
                <span className="text-muted-foreground">
                  {item.quantity > 1 ? `x${item.quantity} ` : ''}{item.slots}s
                </span>
                <button
                  onClick={() => setConfirm({ type: 'drop', itemId: item.id, itemName: item.name, slots: item.slots })}
                  className="opacity-0 group-hover:opacity-100 rounded text-[9px] text-red-400 hover:text-red-300 px-0.5 transition-opacity"
                  title={t('common.drop')}
                >✕</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
