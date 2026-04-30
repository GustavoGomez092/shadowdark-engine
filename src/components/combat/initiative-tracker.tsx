import { useEffect, useState } from 'react'
import type { CombatState, Combatant } from '@/schemas/combat.ts'
import { useLocale } from '@/hooks/use-locale.ts'

interface Props {
  combat: CombatState
  onAdvanceTurn?: () => void
  onEndCombat?: () => void
  onForceRoll?: (combatantId: string) => void
  isGM: boolean
}

function useCountdown(deadline: number | undefined): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (deadline == null) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [deadline])
  if (deadline == null) return 0
  return Math.max(0, Math.ceil((deadline - now) / 1000))
}

export function InitiativeTracker({ combat, onAdvanceTurn, onEndCombat, onForceRoll, isGM }: Props) {
  const { t, ti } = useLocale()
  const isInitiativePhase = combat.phase === 'initiative'
  const secondsLeft = useCountdown(isInitiativePhase ? combat.initiativeDeadline : undefined)
  const currentId = combat.initiativeOrder[combat.currentTurnIndex]

  const orderedRows: Combatant[] = isInitiativePhase
    ? combat.combatants
    : combat.initiativeOrder
        .map(id => combat.combatants.find(c => c.id === id))
        .filter((c): c is Combatant => !!c)

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">
          {isInitiativePhase
            ? ti('combat.rollForInitiativeWithCountdown', { seconds: secondsLeft })
            : ti('combat.combatRound', { round: combat.roundNumber })}
        </h2>
        {isGM && !isInitiativePhase && (
          <div className="flex gap-2">
            {onAdvanceTurn && (
              <button
                onClick={onAdvanceTurn}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition"
              >
                {t('combat.nextTurn')}
              </button>
            )}
            {onEndCombat && (
              <button
                onClick={onEndCombat}
                className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent transition"
              >
                {t('combat.endCombat')}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-1">
        {orderedRows.map((combatant, index) => {
          const isCurrent = !isInitiativePhase && combatant.id === currentId
          const isPC = combatant.type === 'pc'
          const unrolled = combatant.initiativeRoll === undefined
          return (
            <div
              key={combatant.id}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                combatant.isDefeated ? 'opacity-30 line-through' :
                isCurrent ? 'bg-primary/15 border border-primary/30' :
                'border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                {!isInitiativePhase && (
                  <span className="w-6 text-center text-xs font-mono text-muted-foreground">{index + 1}</span>
                )}
                <span className={`h-2 w-2 rounded-full ${isPC ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={`font-medium ${isCurrent ? 'text-primary' : ''}`}>{combatant.name}</span>
                {combatant.initiativeRolledByAuto && (
                  <span className="text-[10px] text-muted-foreground italic">{t('combat.autoRolled')}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {unrolled ? (
                  <span className="text-xs text-muted-foreground italic">{t('combat.rolling')}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Init: {combatant.initiativeRoll}</span>
                )}
                {isInitiativePhase && isGM && unrolled && isPC && onForceRoll && (
                  <button
                    onClick={() => onForceRoll(combatant.id)}
                    className="rounded-md border border-border px-2 py-0.5 text-[10px] hover:bg-accent"
                    title={t('combat.rollForThem')}
                  >
                    {t('combat.rollInitiative')}
                  </button>
                )}
                {isCurrent && !combatant.isDefeated && (
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">{t('combat.active')}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('combat.combatLog')}</p>
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
