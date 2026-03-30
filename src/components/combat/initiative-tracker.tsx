import type { CombatState } from '@/schemas/combat.ts'

interface Props {
  combat: CombatState
  onAdvanceTurn: () => void
  onEndCombat: () => void
  isGM: boolean
}

export function InitiativeTracker({ combat, onAdvanceTurn, onEndCombat, isGM }: Props) {
  const currentId = combat.initiativeOrder[combat.currentTurnIndex]

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Combat — Round {combat.roundNumber}</h2>
        {isGM && (
          <div className="flex gap-2">
            <button
              onClick={onAdvanceTurn}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition"
            >
              Next Turn
            </button>
            <button
              onClick={onEndCombat}
              className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent transition"
            >
              End Combat
            </button>
          </div>
        )}
      </div>

      <div className="space-y-1">
        {combat.initiativeOrder.map((id, index) => {
          const combatant = combat.combatants.find(c => c.id === id)
          if (!combatant) return null
          const isCurrent = id === currentId
          const isPC = combatant.type === 'pc'

          return (
            <div
              key={id}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                combatant.isDefeated ? 'opacity-30 line-through' :
                isCurrent ? 'bg-primary/15 border border-primary/30' :
                'border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center text-xs font-mono text-muted-foreground">{index + 1}</span>
                <span className={`h-2 w-2 rounded-full ${isPC ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={`font-medium ${isCurrent ? 'text-primary' : ''}`}>{combatant.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Init: {combatant.initiativeRoll}</span>
                {isCurrent && !combatant.isDefeated && (
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">Active</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Combat Log (last 5 entries) */}
      <div className="mt-3 border-t border-border pt-3">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Combat Log</p>
        <div className="max-h-32 space-y-0.5 overflow-y-auto">
          {combat.log.slice(-8).map(entry => (
            <p key={entry.id} className="text-xs text-muted-foreground">
              <span className="text-muted-foreground/60">R{entry.round}</span> {entry.message}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}
