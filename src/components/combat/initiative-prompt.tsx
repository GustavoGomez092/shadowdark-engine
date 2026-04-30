import { useEffect, useState } from 'react'
import { DiceRoller } from '@/components/dice/dice-roller.tsx'
import type { Character } from '@/schemas/character.ts'
import type { CombatState, Combatant } from '@/schemas/combat.ts'
import { useLocale } from '@/hooks/use-locale.ts'

interface Props {
  combat: CombatState
  myCharacter: Character
  onRoll: (total: number, isNat20: boolean, isNat1: boolean) => void
}

function findMyCombatant(combat: CombatState, characterId: string): Combatant | undefined {
  return combat.combatants.find(c => c.type === 'pc' && c.referenceId === characterId)
}

function hasInitiativeAdvantage(character: Character): boolean {
  return character.talents.some(t => t.mechanic.type === 'initiative_advantage')
}

export function InitiativePrompt({ combat, myCharacter, onRoll }: Props) {
  const { t } = useLocale()
  const me = findMyCombatant(combat, myCharacter.id)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (combat.initiativeDeadline == null) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [combat.initiativeDeadline])

  if (!me || me.initiativeRoll !== undefined) return null
  if (combat.initiativeDeadline == null) return null

  const secondsLeft = Math.max(0, Math.ceil((combat.initiativeDeadline - now) / 1000))
  const advantageLocked = hasInitiativeAdvantage(myCharacter)
  const dexMod = me.initiativeBonus

  return (
    <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-amber-400">{t('combat.rollForInitiative')}</p>
          <p className="text-xs text-amber-300">
            d20 {dexMod >= 0 ? `+ ${dexMod}` : `− ${Math.abs(dexMod)}`} ({t('combat.dexLabel')})
            {advantageLocked && ` · ${t('combat.advantage')}`}
          </p>
        </div>
        <p className="text-2xl font-mono font-bold text-amber-400">{secondsLeft}s</p>
      </div>
      <DiceRoller
        characterName={myCharacter.name}
        compact
        lockedDie="d20"
        onRoll={(result) => {
          const total = result.total + dexMod
          onRoll(total, result.dice[0]?.isNat20 ?? false, result.dice[0]?.isNat1 ?? false)
        }}
      />
    </div>
  )
}
