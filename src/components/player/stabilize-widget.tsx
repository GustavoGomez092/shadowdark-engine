import { useState } from 'react'
import { rollDice } from '@/lib/dice/roller.ts'
import { getAbilityModifier } from '@/schemas/reference.ts'
import type { PublicCharacterInfo } from '@/schemas/session.ts'
import type { Character } from '@/schemas/character.ts'

interface StabilizeWidgetProps {
  myCharacter: Character
  dyingAllies: PublicCharacterInfo[]
  isMyTurn: boolean
  onStabilize: (targetId: string, roll: number, intMod: number, total: number, success: boolean, targetName: string, intScore: number) => void
}

export function StabilizeWidget({ myCharacter, dyingAllies, isMyTurn, onStabilize }: StabilizeWidgetProps) {
  const [selectedTarget, setSelectedTarget] = useState(dyingAllies[0]?.id ?? '')

  // Keep selection valid if ally list changes
  const validTarget = dyingAllies.find(a => a.id === selectedTarget) ? selectedTarget : dyingAllies[0]?.id ?? ''
  if (validTarget !== selectedTarget) setSelectedTarget(validTarget)

  function handleStabilize() {
    if (!validTarget) return
    const target = dyingAllies.find(a => a.id === validTarget)
    if (!target) return

    const intScore = myCharacter.computed.effectiveStats.INT
    const intMod = getAbilityModifier(intScore)
    const roll = rollDice('1d20')
    const total = roll.total + intMod
    const success = total >= 15

    onStabilize(validTarget, roll.total, intMod, total, success, target.name, intScore)
  }

  return (
    <div className="rounded-xl border border-red-500/30 bg-card p-4">
      <h2 className="mb-2 text-sm font-semibold text-red-400">Stabilize Ally</h2>
      <p className="mb-3 text-[11px] text-muted-foreground">
        DC 15 INT check to stop a dying ally's death timer.
      </p>

      {dyingAllies.length === 1 ? (
        <div className="mb-3 text-sm font-medium">
          <span className="text-red-400 animate-pulse">{dyingAllies[0].name}</span>
          <span className="ml-1.5 text-xs text-muted-foreground">({dyingAllies[0].class})</span>
        </div>
      ) : (
        <select
          value={validTarget}
          onChange={e => setSelectedTarget(e.target.value)}
          className="mb-3 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
        >
          {dyingAllies.map(ally => (
            <option key={ally.id} value={ally.id}>
              {ally.name} ({ally.class})
            </option>
          ))}
        </select>
      )}

      <button
        onClick={handleStabilize}
        disabled={!isMyTurn || !validTarget}
        className="w-full rounded-lg bg-red-600 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isMyTurn ? 'Attempt Stabilize' : 'Wait for your turn'}
      </button>
    </div>
  )
}
