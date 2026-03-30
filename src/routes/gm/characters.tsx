import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { CharacterCreator } from '@/components/character/character-creator.tsx'
import { CharacterSheet } from '@/components/character/character-sheet.tsx'
import type { Character } from '@/schemas/character.ts'
import { useSessionStore } from '@/stores/session-store.ts'
import { computeCharacterValues, restCharacter } from '@/lib/rules/character.ts'
import { equipItem, unequipItem, removeItem } from '@/lib/rules/inventory.ts'
import { gmPeer } from '@/lib/peer/gm-peer-singleton.ts'

export const Route = createFileRoute('/gm/characters')({
  component: GMCharactersPage,
})

function GMCharactersPage() {
  const session = useSessionStore(s => s.session)
  const addCharacter = useSessionStore(s => s.addCharacter)
  const updateCharacter = useSessionStore(s => s.updateCharacter)
  const [showCreator, setShowCreator] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const characters = session ? Object.values(session.characters) : []
  const selected = selectedId && session ? session.characters[selectedId] ?? null : null

  function handleCharacterCreated(character: Character) {
    addCharacter(character)
    setSelectedId(character.id)
    setShowCreator(false)
  }

  function updateChar(id: string, updater: (c: Character) => Character) {
    updateCharacter(id, (draft) => {
      const updated = updater({ ...draft } as Character)
      Object.assign(draft, { ...updated, computed: computeCharacterValues(updated) })
    })
    // Broadcast to players so they see updates in real time
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
        <h1 className="text-3xl font-bold">Characters</h1>
        <button
          onClick={() => setShowCreator(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
        >
          + New Character
        </button>
      </div>

      {characters.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
          <p className="mb-4 text-lg text-muted-foreground">No characters yet</p>
          <button
            onClick={() => setShowCreator(true)}
            className="rounded-lg bg-primary px-6 py-2 font-semibold text-primary-foreground hover:opacity-90 transition"
          >
            Create First Character
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
                    {c.ancestry} {c.class} · Lv {c.level}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    HP: {c.currentHp}/{c.maxHp}
                  </div>
                  {assignedPlayer ? (
                    <span className="mt-1.5 inline-block rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-medium text-primary">🎮 {assignedPlayer.displayName}</span>
                  ) : (
                    <span className="mt-1.5 inline-block rounded-full bg-secondary px-2 py-0.5 text-[9px] text-muted-foreground">Available</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Character sheet */}
          <div>
            {selected ? (
              <CharacterSheet
                character={selected}
                isEditable
                onHpChange={(delta) => {
                  updateChar(selected.id, c => ({
                    ...c,
                    currentHp: Math.max(0, Math.min(c.maxHp, c.currentHp + delta)),
                    isDying: c.currentHp + delta <= 0,
                  }))
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
            ) : (
              <div className="flex items-center justify-center rounded-xl border border-dashed border-border py-16">
                <p className="text-muted-foreground">Select a character to view their sheet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
