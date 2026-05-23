import { useState } from 'react'
import { DiceRoller } from '@/components/dice/dice-roller.tsx'
import { useLocale } from '@/hooks/use-locale.ts'
import type { DieType, DiceRollResult } from '@/schemas/dice.ts'
import type { InventoryItem } from '@/schemas/inventory.ts'

interface Props {
  item: InventoryItem
  characterName: string
  currentHp: number
  maxHp: number
  /** Healing dice expression to roll, e.g. "1d6", "2d8". */
  expression: string
  onConfirm: (rollTotal: number, rollExpression: string) => void
  onCancel: () => void
}

function parseExpression(expr: string): { count: number; die: DieType } {
  const m = expr.match(/^(\d+)d(\d+)$/i)
  const count = m ? Math.max(1, parseInt(m[1], 10)) : 1
  const sides = m ? parseInt(m[2], 10) : 6
  const die: DieType = sides === 4 ? 'd4'
    : sides === 6 ? 'd6'
    : sides === 8 ? 'd8'
    : sides === 10 ? 'd10'
    : sides === 12 ? 'd12'
    : sides === 20 ? 'd20'
    : 'd100'
  return { count, die }
}

export function UsePotionDialog({ item, characterName, currentHp, maxHp, expression, onConfirm, onCancel }: Props) {
  const { t } = useLocale()
  const { count, die } = parseExpression(expression)
  const [rolled, setRolled] = useState<DiceRollResult | null>(null)
  const healPreview = rolled ? Math.min(maxHp - currentHp, rolled.total) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-xl border border-amber-500/30 bg-card p-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="mb-1 text-base font-bold text-amber-400">🧪 {item.name}</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          {rolled
            ? `${characterName} → +${healPreview} HP (${currentHp} → ${Math.min(maxHp, currentHp + rolled.total)} / ${maxHp})`
            : `Roll ${expression} to determine how much HP you regain.`}
        </p>

        <DiceRoller
          characterName={characterName}
          compact
          lockedDie={die}
          diceCount={count}
          onRoll={setRolled}
        />

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => rolled && onConfirm(rolled.total, expression)}
            disabled={!rolled}
            className="flex-1 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {rolled ? t('common.confirm') : t('dice.ready')}
          </button>
          <button
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-xs hover:bg-accent transition"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
