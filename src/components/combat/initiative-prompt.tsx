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
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (combat.initiativeDeadline == null) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [combat.initiativeDeadline])

  if (!me) return null
  if (dismissed) return null

  // Check `!= null` (not `!== undefined`) because P2P JSON serialization
  // converts `undefined` → `null` between GM and player.
  const hasRolled = me.initiativeRoll != null
  const advantageLocked = hasInitiativeAdvantage(myCharacter)
  const dexMod = me.initiativeBonus

  // Result view — shown after the player rolls (or auto-rolls). Stays visible
  // until the player clicks Continue, so they can actually see what they got.
  if (hasRolled) {
    return (
      <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-amber-400">
              {t('combat.initiativeResult')}
            </p>
            <p className="text-xs text-amber-300">
              d20 {dexMod >= 0 ? `+ ${dexMod}` : `− ${Math.abs(dexMod)}`} ({t('combat.dexLabel')})
              {me.initiativeRolledByAuto && ` · ${t('combat.autoRolled')}`}
            </p>
          </div>
          <p className="text-5xl font-mono font-bold text-amber-400">{me.initiativeRoll}</p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="w-full rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-black hover:opacity-90 transition"
        >
          {t('combat.continue')}
        </button>
      </div>
    )
  }

  // Roll view — only shown while the deadline is live and the player hasn't rolled.
  if (combat.initiativeDeadline == null) return null

  const secondsLeft = Math.max(0, Math.ceil((combat.initiativeDeadline - now) / 1000))

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
