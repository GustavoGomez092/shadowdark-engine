import { useState } from 'react'
import type { Character } from '@/schemas/character.ts'
import { useLocale } from '@/hooks/use-locale.ts'

interface Props {
  character: Character
  isInDarkness: boolean
  hasActiveLight: boolean
  isPaused: boolean
  onLightTorch: (itemId: string) => void
  onLightLantern: (lanternId: string, oilId: string) => void
  onLightCampfire: (torchIds: string[]) => void
}

type ConfirmAction =
  | { type: 'torch'; itemId: string; remaining: number }
  | { type: 'lantern'; lanternId: string; oilId: string; oilRemaining: number }
  | { type: 'campfire'; torchIds: string[]; remaining: number }
  | null

export function LightControls({ character, isInDarkness, hasActiveLight, isPaused, onLightTorch, onLightLantern, onLightCampfire }: Props) {
  const { t } = useLocale()
  const [confirm, setConfirm] = useState<ConfirmAction>(null)

  const torches = character.inventory.items.filter(i =>
    i.category === 'light_source' && i.name.toLowerCase().includes('torch')
  )
  const lanterns = character.inventory.items.filter(i =>
    i.category === 'light_source' && i.name.toLowerCase().includes('lantern')
  )
  const oilFlasks = character.inventory.items.filter(i =>
    i.definitionId === 'oil-flask' || i.name.toLowerCase().includes('oil')
  )

  const canLightTorch = torches.length > 0
  const canLightLantern = lanterns.length > 0 && oilFlasks.length > 0
  const canMakeCampfire = torches.length >= 3
  const hasAnyAction = canLightTorch || canLightLantern || canMakeCampfire

  function executeConfirm() {
    if (!confirm) return
    switch (confirm.type) {
      case 'torch': onLightTorch(confirm.itemId); break
      case 'lantern': onLightLantern(confirm.lanternId, confirm.oilId); break
      case 'campfire': onLightCampfire(confirm.torchIds); break
    }
    setConfirm(null)
  }

  // Confirmation
  if (confirm) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-card p-3">
        <p className="text-xs font-bold text-amber-400 mb-2">
          {confirm.type === 'torch' ? 'Light Torch?' : confirm.type === 'lantern' ? 'Light Lantern?' : 'Make Campfire?'}
        </p>
        <div className="text-[11px] text-muted-foreground space-y-0.5 mb-3">
          {confirm.type === 'torch' && <p>Consumes 1 torch. {confirm.remaining} remaining after.</p>}
          {confirm.type === 'lantern' && <p>Consumes 1 oil flask. Lantern stays. {confirm.oilRemaining} oil remaining.</p>}
          {confirm.type === 'campfire' && <p>Consumes 3 torches. Burns up to 8 hours. {confirm.remaining} torches remaining.</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={executeConfirm} className="flex-1 rounded-lg bg-primary py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90">Confirm</button>
          <button onClick={() => setConfirm(null)} className="flex-1 rounded-lg border border-border py-1.5 text-xs hover:bg-accent">Cancel</button>
        </div>
      </div>
    )
  }

  // Hide entirely when light system is paused (not crawling)
  if (isPaused) return null
  if (!hasAnyAction && !isInDarkness && !hasActiveLight) return null

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
      {/* Status */}
      {isInDarkness ? (
        <div className="rounded-lg bg-red-500/15 border border-red-500/30 p-2 text-center animate-pulse">
          <span className="text-xs font-bold text-red-400">🌑 {t('light.darknessWarning')}</span>
          <p className="text-[9px] text-red-400/70 mt-0.5">{t('light.darknessDescription')}</p>
        </div>
      ) : hasActiveLight ? (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-1.5 text-center">
          <span className="text-[10px] font-semibold text-amber-400">🔥 {t('light.lightActive')}</span>
        </div>
      ) : null}

      {/* Actions */}
      {canLightTorch && (
        <button
          onClick={() => setConfirm({ type: 'torch', itemId: torches[0].id, remaining: torches.length - 1 })}
          className="w-full rounded-lg border border-amber-500/30 bg-amber-500/10 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition flex items-center justify-center gap-1.5"
        >🔥 Light Torch ({torches.length})</button>
      )}
      {canLightLantern && (
        <button
          onClick={() => setConfirm({ type: 'lantern', lanternId: lanterns[0].id, oilId: oilFlasks[0].id, oilRemaining: oilFlasks.length - 1 })}
          className="w-full rounded-lg border border-amber-500/30 bg-amber-500/10 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition flex items-center justify-center gap-1.5"
        >🏮 Light Lantern ({oilFlasks.length} oil)</button>
      )}
      {canMakeCampfire && (
        <button
          onClick={() => setConfirm({ type: 'campfire', torchIds: torches.slice(0, 3).map(t => t.id), remaining: torches.length - 3 })}
          className="w-full rounded-lg border border-orange-500/30 bg-orange-500/10 py-1.5 text-xs font-semibold text-orange-400 hover:bg-orange-500/20 transition flex items-center justify-center gap-1.5"
        >🔥 Make Campfire (3 torches)</button>
      )}
    </div>
  )
}
