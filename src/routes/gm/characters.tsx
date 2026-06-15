import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { CharacterCreator } from '@/components/character/character-creator.tsx'
import { CharacterSheet } from '@/components/character/character-sheet.tsx'
import { CharacterImportButton } from '@/components/character/character-import-button.tsx'
import { AddNpcDialog } from '@/components/gm/add-npc-dialog.tsx'
import { GmItemPanel } from '@/components/gm/gm-item-panel.tsx'
import type { Character } from '@/schemas/character.ts'
import type { InventoryItem } from '@/schemas/inventory.ts'
import { useSessionStore } from '@/stores/session-store.ts'
import { computeCharacterValues, restCharacter } from '@/lib/rules/character.ts'
import { equipItem, unequipItem, removeItem } from '@/lib/rules/inventory.ts'
import { lightTorch, lightLantern, lightCampfire } from '@/lib/rules/light-actions.ts'
import { getPotionHealing } from '@/schemas/reference.ts'
import { rollDice } from '@/lib/dice/roller.ts'
import { createActionLog } from '@/lib/utils/action-log.ts'
import { gmPeer } from '@/lib/peer/gm-peer-singleton.ts'
import { useLocale } from '@/hooks/use-locale.ts'

export const Route = createFileRoute('/gm/characters')({
  component: GMCharactersPage,
})

function GMCharactersPage() {
  const { t } = useLocale()
  const session = useSessionStore(s => s.session)
  const addCharacter = useSessionStore(s => s.addCharacter)
  const updateCharacter = useSessionStore(s => s.updateCharacter)
  const setLight = useSessionStore(s => s.setLight)
  const addChatMessage = useSessionStore(s => s.addChatMessage)
  const [showCreator, setShowCreator] = useState(false)
  const [showAddNpc, setShowAddNpc] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const characters = session ? Object.values(session.characters) : []
  const selected = selectedId && session ? session.characters[selectedId] ?? null : null

  function handleCharacterCreated(character: Character) {
    addCharacter(character)
    setSelectedId(character.id)
    setShowCreator(false)
  }

  function handleCharacterImported(character: Character) {
    addCharacter(character)
    setSelectedId(character.id)
    setTimeout(() => gmPeer.broadcastStateSync(), 50)
  }

  function handleNpcsAdded(npcChars: Character[]) {
    for (const c of npcChars) addCharacter(c)
    if (npcChars[0]) setSelectedId(npcChars[0].id)
    setTimeout(() => gmPeer.broadcastStateSync(), 50)
  }

  function updateChar(id: string, updater: (c: Character) => Character) {
    updateCharacter(id, (draft) => {
      const updated = updater({ ...draft } as Character)
      Object.assign(draft, { ...updated, computed: computeCharacterValues(updated) })
    })
    // Broadcast to players so they see updates in real time
    setTimeout(() => gmPeer.broadcastStateSync(), 50)
  }

  function giveItem(charId: string, item: InventoryItem) {
    // createInventoryItem already minted an id; addItem re-mints, so push directly.
    updateChar(charId, c => ({ ...c, inventory: { ...c.inventory, items: [...c.inventory.items, item] } }))
    const name = session?.characters[charId]?.name ?? 'Someone'
    addChatMessage(createActionLog(`GM gave ${item.name} to ${name}`))
  }

  function useItem(charId: string, itemId: string) {
    const s = useSessionStore.getState().session
    const char = s?.characters[charId]
    const item = char?.inventory.items.find(i => i.id === itemId)
    if (!char || !item || item.category !== 'consumable') return

    if (item.definitionId === 'potion-healing') {
      const expr = getPotionHealing(char.level)
      const total = rollDice(expr, { rolledBy: char.name, purpose: 'manual' }).total
      const newHp = Math.min(char.maxHp, char.currentHp + total)
      const healed = newHp - char.currentHp
      updateChar(charId, c => {
        const items = c.inventory.items.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0)
        const backUp = newHp > 0 && c.isDying
        return { ...c, currentHp: newHp, isDying: backUp ? false : c.isDying, deathTimer: backUp ? undefined : c.deathTimer, inventory: { ...c.inventory, items } }
      })
      addChatMessage(createActionLog(`${char.name} drank ${item.name} 🧪 (${expr} → ${total}, healed ${healed} HP)`))
    } else {
      updateChar(charId, c => {
        const items = c.inventory.items.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0)
        return { ...c, inventory: { ...c.inventory, items } }
      })
      addChatMessage(createActionLog(`${char.name} used ${item.name}`))
    }
  }

  function doLight(charId: string, kind: 'torch' | 'lantern' | 'campfire', args: { itemId?: string; oilId?: string; torchIds?: string[] }) {
    const s = useSessionStore.getState().session
    const char = s?.characters[charId]
    if (!s || !char) return

    let result: { character: Character; light: typeof s.light }
    let label: string
    if (kind === 'torch') {
      result = lightTorch(char, s.light, args.itemId!, (s.settings?.torchDurationMinutes ?? 60) * 60000)
      label = `${char.name} lit a torch 🔥`
    } else if (kind === 'lantern') {
      result = lightLantern(char, s.light, args.oilId!, (s.settings?.lanternDurationMinutes ?? 60) * 60000)
      label = `${char.name} lit a lantern 🏮`
    } else {
      result = lightCampfire(char, s.light, args.torchIds!, (s.settings?.campfireDurationMinutes ?? 480) * 60000)
      label = `${char.name} made a campfire 🔥`
    }

    updateCharacter(charId, (draft) => {
      Object.assign(draft, { ...result.character, computed: computeCharacterValues(result.character) })
    })
    setLight(result.light)
    addChatMessage(createActionLog(label))
    setTimeout(() => gmPeer.broadcastStateSync(), 50)
  }

  if (showCreator) {
    return (
      <CharacterCreator
        playerId="gm"
        onComplete={handleCharacterCreated}
        onCancel={() => setShowCreator(false)}
      />
    )
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('gm.characters')}</h1>
        <div className="flex items-start gap-2">
          <CharacterImportButton onImported={handleCharacterImported} />
          <button
            onClick={() => setShowAddNpc(true)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:border-primary/50 transition"
          >
            Add NPC
          </button>
          <button
            onClick={() => setShowCreator(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
          >
            {t('gm.newCharacter')}
          </button>
        </div>
      </div>

      {showAddNpc && (
        <AddNpcDialog onClose={() => setShowAddNpc(false)} onAdd={handleNpcsAdded} />
      )}

      {characters.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <p className="mb-4 text-lg text-muted-foreground">{t('gm.noCharactersYet')}</p>
          <button
            onClick={() => setShowCreator(true)}
            className="rounded-lg bg-primary px-6 py-2 font-semibold text-primary-foreground hover:opacity-90 transition"
          >
            {t('gm.createFirstCharacter')}
          </button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Character list sidebar */}
          <div className="space-y-2">
            {characters.map(c => {
              const assignedPlayer = session ? Object.values(session.players).find(p => p.characterId === c.id) : null
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    selectedId === c.id
                      ? 'border-primary bg-primary/5 ring-2 ring-primary'
                      : 'border-border bg-card hover:border-primary/50'
                  }`}
                >
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {c.ancestry} {c.isNpc ? 'NPC' : c.class} · Lv {c.level}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    HP: {c.currentHp}/{c.maxHp}
                  </div>
                  {assignedPlayer ? (
                    <span className="mt-1.5 inline-block rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-medium text-primary">🎮 {assignedPlayer.displayName}</span>
                  ) : (
                    <span className="mt-1.5 inline-block rounded-full bg-secondary px-2 py-0.5 text-[9px] text-muted-foreground">{t('gm.available')}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Character sheet */}
          <div>
            {selected ? (
              <div className="space-y-6">
              <CharacterSheet
                character={selected}
                isEditable
                hideInventory
                onHpChange={(delta) => {
                  const newHp = Math.max(0, Math.min(selected.maxHp, selected.currentHp + delta))
                  const nowDying = newHp <= 0
                  const wasDying = selected.isDying

                  if (nowDying && !wasDying) {
                    updateChar(selected.id, c => ({
                      ...c,
                      currentHp: newHp,
                      isDying: true,
                      deathTimer: undefined,
                    }))
                  } else if (!nowDying && wasDying) {
                    updateChar(selected.id, c => ({
                      ...c,
                      currentHp: newHp,
                      isDying: false,
                      deathTimer: undefined,
                    }))
                  } else {
                    updateChar(selected.id, c => ({
                      ...c,
                      currentHp: newHp,
                      isDying: nowDying,
                    }))
                  }
                }}
                onToggleLuckToken={() => {
                  updateChar(selected.id, c => ({
                    ...c,
                    hasLuckToken: !c.hasLuckToken,
                  }))
                }}
                onEquipItem={(itemId) => {
                  updateChar(selected.id, c => ({
                    ...c,
                    inventory: equipItem(c.inventory, itemId),
                  }))
                }}
                onUnequipItem={(itemId) => {
                  updateChar(selected.id, c => ({
                    ...c,
                    inventory: unequipItem(c.inventory, itemId),
                  }))
                }}
                onDropItem={(itemId) => {
                  updateChar(selected.id, c => ({
                    ...c,
                    inventory: removeItem(c.inventory, itemId),
                  }))
                }}
                onAdjustQuantity={(itemId, delta) => {
                  updateChar(selected.id, c => {
                    const item = c.inventory.items.find(i => i.id === itemId)
                    if (!item) return c
                    const newQty = item.quantity + delta
                    if (newQty <= 0) {
                      return { ...c, inventory: { ...c.inventory, items: c.inventory.items.filter(i => i.id !== itemId) } }
                    }
                    return { ...c, inventory: { ...c.inventory, items: c.inventory.items.map(i => i.id === itemId ? { ...i, quantity: newQty } : i) } }
                  })
                }}
                onNotesChange={(notes) => {
                  updateChar(selected.id, c => ({ ...c, notes }))
                }}
                onRest={() => {
                  updateChar(selected.id, c => restCharacter(c))
                }}
              />
              {session && (
                <GmItemPanel
                  character={selected}
                  lightState={session.light}
                  onEquip={(itemId) => updateChar(selected.id, c => ({ ...c, inventory: equipItem(c.inventory, itemId) }))}
                  onUnequip={(itemId) => updateChar(selected.id, c => ({ ...c, inventory: unequipItem(c.inventory, itemId) }))}
                  onDrop={(itemId) => updateChar(selected.id, c => ({ ...c, inventory: removeItem(c.inventory, itemId) }))}
                  onUse={(itemId) => useItem(selected.id, itemId)}
                  onGiveItem={(item) => giveItem(selected.id, item)}
                  onLightTorch={(itemId) => doLight(selected.id, 'torch', { itemId })}
                  onLightLantern={(_lanternId, oilId) => doLight(selected.id, 'lantern', { oilId })}
                  onLightCampfire={(torchIds) => doLight(selected.id, 'campfire', { torchIds })}
                />
              )}
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-xl border border-dashed border-border py-16">
                <p className="text-muted-foreground">{t('gm.selectCharacterToView')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
