import { useState, useEffect, useRef, useCallback } from 'react'
import { rollDice } from '@/lib/dice/roller.ts'
import { useLocale } from '@/hooks/use-locale.ts'
import type { DiceRollResult, DieType } from '@/schemas/dice.ts'

interface Props {
  characterName?: string
  onRoll?: (result: DiceRollResult) => void
  compact?: boolean
  lockedDie?: DieType  // Lock to a specific die, hide selector and controls
  diceCount?: number   // Roll multiple dice at once (default 1). Shows each die with animation.
}

const DIE_OPTIONS: { type: DieType; max: number; label: string }[] = [
  { type: 'd4', max: 4, label: 'd4' },
  { type: 'd6', max: 6, label: 'd6' },
  { type: 'd8', max: 8, label: 'd8' },
  { type: 'd10', max: 10, label: 'd10' },
  { type: 'd12', max: 12, label: 'd12' },
  { type: 'd20', max: 20, label: 'd20' },
  { type: 'd100', max: 100, label: 'd100' },
]

type RollMode = 'advantage' | 'normal' | 'disadvantage'
type Phase = 'idle' | 'rolling' | 'result'

export function DiceRoller({ characterName, onRoll, compact = false, lockedDie, diceCount = 1 }: Props) {
  const { t, ti } = useLocale()
  const count = Math.max(1, diceCount)
  const [selectedDie, setSelectedDie] = useState<DieType>(lockedDie ?? 'd20')
  const [modifier, setModifier] = useState(0)
  const [rollMode, setRollMode] = useState<RollMode>('normal')
  const [phase, setPhase] = useState<Phase>('idle')
  const [displayNumbers, setDisplayNumbers] = useState<number[]>(() => Array(count).fill(20))
  const [finalValues, setFinalValues] = useState<number[]>([])
  const [lastRoll, setLastRoll] = useState<DiceRollResult | null>(null)
  const [resultClass, setResultClass] = useState('')
  const cycleRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const rollTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const dieMax = DIE_OPTIONS.find(d => d.type === selectedDie)?.max ?? 20

  // Idle cycling — soft number animation when ready to roll
  useEffect(() => {
    if (phase !== 'idle') return
    cycleRef.current = setInterval(() => {
      setDisplayNumbers(prev => prev.map(() => Math.floor(Math.random() * dieMax) + 1))
    }, 80)
    return () => { if (cycleRef.current) clearInterval(cycleRef.current) }
  }, [phase, dieMax, count])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cycleRef.current) clearInterval(cycleRef.current)
      rollTimeoutsRef.current.forEach(clearTimeout)
    }
  }, [])

  const handleSelectDie = useCallback((die: DieType) => {
    setSelectedDie(die)
    setPhase('idle')
    setResultClass('')
    setLastRoll(null)
    setFinalValues([])
  }, [])

  const handleRoll = useCallback(() => {
    if (phase === 'rolling') return

    // Stop idle cycling
    if (cycleRef.current) clearInterval(cycleRef.current)
    rollTimeoutsRef.current.forEach(clearTimeout)
    rollTimeoutsRef.current = []

    setPhase('rolling')
    setResultClass('')
    setFinalValues([])

    // Phase 1: Spin-up — fast cycling (30ms)
    let interval = 30
    let step = 0
    const maxSteps = 25

    const spinCycle = () => {
      setDisplayNumbers(prev => prev.map(() => Math.floor(Math.random() * dieMax) + 1))
      step++

      if (step < 8) {
        interval = 30
      } else if (step < 16) {
        interval = 50 + (step - 8) * 15
      } else if (step < maxSteps) {
        interval = 120 + (step - 16) * 30
      } else {
        // Land — do the actual roll
        const expr = modifier !== 0
          ? `${count}${selectedDie}${modifier > 0 ? '+' : ''}${modifier}`
          : `${count}${selectedDie}`

        const result = rollDice(expr, {
          rolledBy: characterName ?? 'unknown',
          purpose: 'manual',
          advantage: rollMode === 'advantage',
          disadvantage: rollMode === 'disadvantage',
        })

        const values = result.dice.map(d => d.value)
        setDisplayNumbers(values.length >= count ? values.slice(0, count) : [...values, ...Array(count - values.length).fill(0)])
        setFinalValues(values)
        setLastRoll(result)
        setPhase('result')

        const isNat20 = result.dice[0]?.isNat20
        const isNat1 = result.dice[0]?.isNat1

        if (isNat20) {
          setResultClass('dice-bounce-in dice-glow-green')
        } else if (isNat1) {
          setResultClass('dice-shake dice-glow-red')
        } else {
          setResultClass('dice-bounce-in')
        }

        onRoll?.(result)

        const t = setTimeout(() => {
          setResultClass('')
          setPhase('idle')
        }, 3000)
        rollTimeoutsRef.current.push(t)
        return
      }

      const t = setTimeout(spinCycle, interval)
      rollTimeoutsRef.current.push(t)
    }

    spinCycle()
  }, [phase, selectedDie, modifier, rollMode, dieMax, characterName, onRoll, count])

  const isNat20 = lastRoll?.dice[0]?.isNat20
  const isNat1 = lastRoll?.dice[0]?.isNat1
  const isMulti = count > 1

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Result Display */}
      <div className="relative px-4 pt-5 pb-4 text-center">
        {/* Subtle background glow */}
        <div className={`absolute inset-0 opacity-20 transition-all duration-500 ${
          phase === 'result' && isNat20 ? 'bg-gradient-to-b from-green-500/30 to-transparent' :
          phase === 'result' && isNat1 ? 'bg-gradient-to-b from-red-500/30 to-transparent' :
          ''
        }`} />

        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1 relative">
          {phase === 'rolling' ? t('dice.rolling') : phase === 'result' ? t('dice.lastRoll') : t('dice.ready')}
        </p>

        {isMulti ? (
          /* Multi-dice display: show each die side by side */
          <div className={`relative ${resultClass}`}>
            <div className="flex items-center justify-center gap-2 mb-1">
              {displayNumbers.map((num, i) => (
                <span key={i} className="contents">
                  {i > 0 && <span className="text-muted-foreground/50 text-lg font-bold">+</span>}
                  <div className={`rounded-lg border px-3 py-1 min-w-[3rem] text-center transition-colors duration-200 ${
                    phase === 'result' ? 'border-primary/40 bg-primary/10' : 'border-border/50'
                  }`}>
                    <span className={`font-bold tabular-nums text-2xl ${
                      phase === 'idle' ? 'text-muted-foreground/40 dice-cycling' :
                      phase === 'rolling' ? 'text-foreground/60' :
                      'text-primary'
                    }`}>{num}</span>
                  </div>
                </span>
              ))}
              {phase === 'result' && (
                <>
                  <span className="text-muted-foreground/50 text-lg font-bold">=</span>
                  <span className={`font-bold tabular-nums text-3xl text-primary`}>
                    {finalValues.reduce((a, b) => a + b, 0) + modifier}
                  </span>
                </>
              )}
            </div>
          </div>
        ) : (
          /* Single die display */
          <div className={`relative ${resultClass}`}>
            <span className={`font-bold tabular-nums transition-colors duration-200 ${
              compact ? 'text-4xl' : 'text-6xl'
            } ${
              phase === 'idle' ? 'text-muted-foreground/40 dice-cycling' :
              phase === 'rolling' ? 'text-foreground/60' :
              isNat20 ? 'text-green-400' :
              isNat1 ? 'text-red-400' :
              'text-primary'
            }`}>
              {displayNumbers[0]}
            </span>
          </div>
        )}

        {/* Die type + special labels */}
        <div className="mt-1 flex items-center justify-center gap-2 relative">
          <DieIcon type={selectedDie} size={14} className="text-primary" />
          <span className="text-xs text-muted-foreground">{isMulti ? `${count}${selectedDie}` : selectedDie}</span>
          {modifier !== 0 && <span className="text-xs text-muted-foreground">{modifier > 0 ? '+' : ''}{modifier}</span>}
          {rollMode !== 'normal' && <span className="text-[10px] uppercase text-amber-400">{rollMode === 'advantage' ? t('dice.advantage') : t('dice.disadvantage')}</span>}
        </div>

        {/* Nat 20/1 flash text */}
        {phase === 'result' && isNat20 && (
          <p className="mt-1 text-xs font-black uppercase tracking-wider text-green-400 dice-glow-green">{t('dice.natural20')}</p>
        )}
        {phase === 'result' && isNat1 && (
          <p className="mt-1 text-xs font-black uppercase tracking-wider text-red-400 dice-glow-red">{t('dice.natural1')}</p>
        )}

        {/* Alternate roll display for advantage/disadvantage */}
        {phase === 'result' && lastRoll?.alternateTotal != null && (
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {ti('dice.otherRoll', { value: lastRoll.alternateTotal })}
          </p>
        )}
      </div>

      {/* Die Type Selector (hidden when locked) */}
      {!lockedDie && (
        <div className="px-3 pb-3">
          <div className="flex justify-center gap-1">
            {DIE_OPTIONS.map(d => (
              <button
                key={d.type}
                onClick={() => handleSelectDie(d.type)}
                className={`flex flex-col items-center gap-0.5 rounded-lg p-2 transition ${
                  selectedDie === d.type
                    ? 'bg-primary/15 border border-primary/40 text-primary'
                    : 'border border-transparent text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <DieIcon type={d.type} size={compact ? 16 : 20} />
                <span className="text-[9px] font-semibold">{d.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Roll Mode + Modifier (hidden when locked) */}
      {!compact && !lockedDie && (
        <div className="px-3 pb-3 flex items-center justify-between gap-3">
          {/* Roll Mode */}
          <div className="flex gap-0.5 rounded-lg border border-border p-0.5">
            {([['advantage', t('dice.advantage')], ['normal', t('dice.normal')], ['disadvantage', t('dice.disadvantage')]] as const).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setRollMode(mode)}
                className={`rounded-md px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                  rollMode === mode
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Modifier */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setModifier(m => Math.max(-10, m - 1))}
              className="rounded-md border border-border px-2 py-1 text-xs font-bold hover:bg-accent transition"
            >−</button>
            <span className="w-8 text-center font-mono text-sm font-bold">
              {modifier >= 0 ? `+${modifier}` : modifier}
            </span>
            <button
              onClick={() => setModifier(m => Math.min(10, m + 1))}
              className="rounded-md border border-border px-2 py-1 text-xs font-bold hover:bg-accent transition"
            >+</button>
          </div>
        </div>
      )}

      {/* ROLL Button */}
      <div className="px-3 pb-3">
        <button
          onClick={handleRoll}
          disabled={phase === 'rolling'}
          className={`w-full rounded-lg py-3 text-sm font-bold uppercase tracking-widest transition flex items-center justify-center gap-2 ${
            phase === 'rolling'
              ? 'bg-primary/50 text-primary-foreground/50 cursor-wait'
              : 'bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98]'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="opacity-80">
            <path d="M6.5 2L2 14h3.5l1-2.5h3l1 2.5H14L9.5 2H6.5zM7.5 9L8 6.5 8.5 9H7.5z" fill="currentColor"/>
          </svg>
          {phase === 'rolling' ? t('dice.rollingButton') : t('dice.rollButton')}
        </button>
      </div>
    </div>
  )
}

// ========== Die Icon SVGs ==========

function DieIcon({ type, size = 20, className = '' }: { type: DieType; size?: number; className?: string }) {
  const s = size
  const half = s / 2
  const p = 2 // padding

  switch (type) {
    case 'd4': // Triangle
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className={className}>
          <polygon points={`${half},${p} ${s-p},${s-p} ${p},${s-p}`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      )
    case 'd6': // Square
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className={className}>
          <rect x={p} y={p} width={s-p*2} height={s-p*2} rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )
    case 'd8': // Diamond
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className={className}>
          <polygon points={`${half},${p} ${s-p},${half} ${half},${s-p} ${p},${half}`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      )
    case 'd10': // Kite/pointed
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className={className}>
          <polygon points={`${half},${p} ${s-p},${half*0.7} ${s-p*1.5},${s-p} ${p*1.5},${s-p} ${p},${half*0.7}`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      )
    case 'd12': // Hexagon
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className={className}>
          <polygon points={`${half},${p} ${s-p*1.2},${half*0.55} ${s-p*1.2},${half*1.45} ${half},${s-p} ${p*1.2},${half*1.45} ${p*1.2},${half*0.55}`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      )
    case 'd20': // Pentagon
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className={className}>
          <polygon points={`${half},${p} ${s-p},${half*0.75} ${s-p*1.5},${s-p} ${p*1.5},${s-p} ${p},${half*0.75}`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      )
    case 'd100': // Two circles
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className={className}>
          <circle cx={half-2} cy={half} r={half-p-1} fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx={half+2} cy={half} r={half-p-1} fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )
    default:
      return null
  }
}
