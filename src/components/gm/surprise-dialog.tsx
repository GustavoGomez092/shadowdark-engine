import { useState, useMemo } from 'react'
import type { Character } from '@/schemas/character.ts'
import type { MonsterInstance, MonsterDefinition } from '@/schemas/monsters.ts'
import { getCombatantsImmuneToSurprise } from '@/lib/rules/combat.ts'
import { useLocale } from '@/hooks/use-locale.ts'

type SideDefault = 'none' | 'party' | 'monsters'

interface Props {
  characters: Character[]
  monsters: { instance: MonsterInstance; definition: MonsterDefinition }[]
  onCancel: () => void
  onConfirm: (selection: { surprisedCharacterIds: string[]; surprisedMonsterInstanceIds: string[] }) => void
}

export function SurpriseDialog({ characters, monsters, onCancel, onConfirm }: Props) {
  const { t } = useLocale()
  const immunity = useMemo(() => getCombatantsImmuneToSurprise(characters, monsters), [characters, monsters])

  const [sideDefault, setSideDefault] = useState<SideDefault>('none')
  const [charChecked, setCharChecked] = useState<Record<string, boolean>>({})
  const [monsterChecked, setMonsterChecked] = useState<Record<string, boolean>>({})

  function applyDefault(side: SideDefault) {
    setSideDefault(side)
    const charImmune = new Set(immunity.characterIds)
    const monsterImmune = new Set(immunity.monsterInstanceIds)
    const newCharChecked: Record<string, boolean> = {}
    for (const c of characters) {
      newCharChecked[c.id] = side === 'party' && !charImmune.has(c.id)
    }
    const newMonsterChecked: Record<string, boolean> = {}
    for (const m of monsters) {
      newMonsterChecked[m.instance.id] = side === 'monsters' && !monsterImmune.has(m.instance.id)
    }
    setCharChecked(newCharChecked)
    setMonsterChecked(newMonsterChecked)
  }

  function toggleChar(id: string) {
    if (immunity.characterIds.includes(id)) return
    setCharChecked(prev => ({ ...prev, [id]: !prev[id] }))
  }
  function toggleMonster(id: string) {
    if (immunity.monsterInstanceIds.includes(id)) return
    setMonsterChecked(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function handleConfirm() {
    const surprisedCharacterIds = Object.entries(charChecked).filter(([, v]) => v).map(([k]) => k)
    const surprisedMonsterInstanceIds = Object.entries(monsterChecked).filter(([, v]) => v).map(([k]) => k)
    onConfirm({ surprisedCharacterIds, surprisedMonsterInstanceIds })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-bold">{t('combat.surprise')}</h2>

        <p className="mb-2 text-sm font-semibold">{t('combat.surpriseTitle')}</p>
        <div className="mb-4 flex gap-2">
          {(['none', 'party', 'monsters'] as const).map(side => (
            <button
              key={side}
              onClick={() => applyDefault(side)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                sideDefault === side
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border hover:bg-accent'
              }`}
            >
              {t(`combat.surprise${side === 'none' ? 'Nobody' : side === 'party' ? 'Party' : 'Monsters'}`)}
            </button>
          ))}
        </div>

        <p className="mb-2 text-sm font-semibold">{t('combat.combatants')}</p>
        <div className="mb-4 max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border/50 p-2">
          {characters.map(c => {
            const immune = immunity.characterIds.includes(c.id)
            return (
              <label key={c.id} className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${immune ? 'opacity-50' : 'cursor-pointer hover:bg-accent'}`}>
                <input
                  type="checkbox"
                  checked={!!charChecked[c.id]}
                  disabled={immune}
                  onChange={() => toggleChar(c.id)}
                />
                <span className="flex-1">{c.name}</span>
                {immune && <span className="text-[10px] uppercase text-muted-foreground">{t('combat.cantBeSurprised')}</span>}
              </label>
            )
          })}
          {monsters.map(m => {
            const immune = immunity.monsterInstanceIds.includes(m.instance.id)
            return (
              <label key={m.instance.id} className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${immune ? 'opacity-50' : 'cursor-pointer hover:bg-accent'}`}>
                <input
                  type="checkbox"
                  checked={!!monsterChecked[m.instance.id]}
                  disabled={immune}
                  onChange={() => toggleMonster(m.instance.id)}
                />
                <span className="flex-1">{m.instance.name}</span>
                {immune && <span className="text-[10px] uppercase text-muted-foreground">{t('combat.cantBeSurprised')}</span>}
              </label>
            )
          })}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent transition"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black hover:opacity-90 transition"
          >
            {t('combat.rollInitiative')}
          </button>
        </div>
      </div>
    </div>
  )
}
