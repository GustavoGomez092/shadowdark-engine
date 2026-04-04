import { useState, useMemo } from 'react'
import type {
  Character,
  AppliedTalent,
  TalentTableEntry,
  TalentMechanic,
  AbilityScore,
  ClassDefinition,
} from '@/schemas/character.ts'
import type { SpellDefinition } from '@/schemas/spells.ts'
import type { DieType } from '@/schemas/dice.ts'
import { getAbilityModifier } from '@/schemas/reference.ts'
import { rollDice } from '@/lib/dice/roller.ts'
import { DiceRoller } from '@/components/dice/dice-roller.tsx'
import { gainsTalentAtLevel, computeEffectiveStats } from '@/lib/rules/character.ts'
import { getClass, getTitle, getSpellsByClassAndTier, getSpell } from '@/data/index.ts'
import { generateId } from '@/lib/utils/id.ts'
import { useLocale } from '@/hooks/use-locale.ts'

// ========== Types ==========

interface LevelUpWizardProps {
  character: Character
  onComplete: (updates: { hpRoll: number; talent?: AppliedTalent; newSpellIds?: string[] }) => void
  onCancel: () => void
}

type Step = 'announce' | 'hp' | 'talent' | 'spells' | 'summary'

interface HpRollState {
  roll1: number
  roll2?: number // only for dwarves (advantage)
  chosenRoll: number
  hpGain: number
}

interface TalentRollState {
  rollTotal: number
  dice: number[]
  matchedEntry: TalentTableEntry
}

// ========== Helpers ==========

function matchTalentEntry(table: TalentTableEntry[], rollResult: number): TalentTableEntry | undefined {
  return table.find(entry => {
    if (typeof entry.roll === 'number') {
      return rollResult === entry.roll
    }
    const [min, max] = entry.roll
    return rollResult >= min && rollResult <= max
  })
}

function formatMod(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`
}

function needsStatChoice(mechanic: TalentMechanic): boolean {
  return mechanic.type === 'stat_bonus' && mechanic.stats.length > 1
}

function isChooseTalentOrStats(mechanic: TalentMechanic): boolean {
  return mechanic.type === 'choose_talent_or_stats'
}

/** Determine the new spell slots opened at a given level. Returns an array of { tier, count } for each tier with new slots. */
function getNewSpellSlots(classDef: ClassDefinition, currentLevel: number, newLevel: number): { tier: number; count: number }[] {
  if (!classDef.spellsKnownByLevel) return []

  const currentSlots = classDef.spellsKnownByLevel[currentLevel - 1] ?? []
  const newSlots = classDef.spellsKnownByLevel[newLevel - 1] ?? []

  const result: { tier: number; count: number }[] = []
  for (let tier = 0; tier < newSlots.length; tier++) {
    const diff = (newSlots[tier] ?? 0) - (currentSlots[tier] ?? 0)
    if (diff > 0) {
      result.push({ tier: tier + 1, count: diff })
    }
  }
  return result
}

// ========== Component ==========

export function LevelUpWizard({ character, onComplete, onCancel }: LevelUpWizardProps) {
  const { t, ti, tData, tDataNested } = useLocale()
  const newLevel = character.level + 1
  const classDef = getClass(character.class)
  const effectiveStats = computeEffectiveStats(character)
  const conMod = getAbilityModifier(effectiveStats.CON)
  const isDwarf = character.ancestry === 'dwarf'
  const hitDie = classDef?.hitDie ?? 'd6'

  const oldTitle = getTitle(character.class, character.alignment, character.level)
  const newTitle = getTitle(character.class, character.alignment, newLevel)

  const hasTalentStep = gainsTalentAtLevel(newLevel)
  const newSpellSlots = useMemo(() => {
    if (!classDef?.spellcasting) return []
    return getNewSpellSlots(classDef, character.level, newLevel)
  }, [classDef, character.level, newLevel])
  const hasSpellStep = classDef?.spellcasting != null && newSpellSlots.length > 0

  // Build ordered step list
  const steps = useMemo<Step[]>(() => {
    const s: Step[] = ['announce', 'hp']
    if (hasTalentStep) s.push('talent')
    if (hasSpellStep) s.push('spells')
    s.push('summary')
    return s
  }, [hasTalentStep, hasSpellStep])

  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const currentStep = steps[currentStepIndex]

  // HP state
  const [hpRollState, setHpRollState] = useState<HpRollState | null>(null)

  // Talent state
  const [talentRollState, setTalentRollState] = useState<TalentRollState | null>(null)
  const [selectedStat, setSelectedStat] = useState<AbilityScore | null>(null)
  const [chooseTalentMode, setChooseTalentMode] = useState<'talent' | 'stats' | null>(null)
  const [chosenTalentIndex, setChosenTalentIndex] = useState<number | null>(null)
  const [statDistribution, setStatDistribution] = useState<Record<string, number>>({})

  // Spell state
  const [selectedSpells, setSelectedSpells] = useState<Record<string, string>>({}) // key: "tier-slotIndex" -> spellId

  // ========== Step Navigation ==========

  function goNext() {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(i => i + 1)
    }
  }

  // ========== HP Rolling ==========

  function handleRollHp() {
    const result1 = rollDice(`1${hitDie}`)
    const roll1 = result1.total

    if (isDwarf) {
      const result2 = rollDice(`1${hitDie}`)
      const roll2 = result2.total
      const chosenRoll = Math.max(roll1, roll2)
      const hpGain = Math.max(1, chosenRoll + conMod)
      setHpRollState({ roll1, roll2, chosenRoll, hpGain })
    } else {
      const hpGain = Math.max(1, roll1 + conMod)
      setHpRollState({ roll1, chosenRoll: roll1, hpGain })
    }
  }

  // ========== Talent Rolling ==========

  function handleRollTalent() {
    if (!classDef) return
    const result = rollDice('2d6')
    const matched = matchTalentEntry(classDef.talentTable, result.total)
    if (matched) {
      setTalentRollState({
        rollTotal: result.total,
        dice: result.dice.map(d => d.value),
        matchedEntry: matched,
      })
      // Reset choices
      setSelectedStat(null)
      setChooseTalentMode(null)
      setChosenTalentIndex(null)
      setStatDistribution({})
    }
  }

  function buildAppliedTalent(): AppliedTalent | undefined {
    if (!talentRollState) return undefined

    const { rollTotal, matchedEntry } = talentRollState
    const choices: Record<string, string> = {}

    if (chooseTalentMode === 'talent' && chosenTalentIndex !== null && classDef) {
      // Player chose a specific talent from the table
      const chosenEntry = classDef.talentTable[chosenTalentIndex]
      return {
        id: generateId(),
        levelGained: newLevel,
        rollResult: rollTotal,
        mechanic: chosenEntry.mechanic,
        description: chosenEntry.description,
        choices: { chosen: 'talent', talentIndex: String(chosenTalentIndex) },
      }
    }

    if (chooseTalentMode === 'stats') {
      // Player chose to distribute +2 to stats
      const distributed = Object.entries(statDistribution)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${k}+${v}`)
        .join(',')
      return {
        id: generateId(),
        levelGained: newLevel,
        rollResult: rollTotal,
        mechanic: matchedEntry.mechanic,
        description: matchedEntry.description,
        choices: { chosen: 'stats', distribution: distributed },
      }
    }

    if (needsStatChoice(matchedEntry.mechanic) && selectedStat) {
      choices.stat = selectedStat
    }

    return {
      id: generateId(),
      levelGained: newLevel,
      rollResult: rollTotal,
      mechanic: matchedEntry.mechanic,
      description: matchedEntry.description,
      choices: Object.keys(choices).length > 0 ? choices : undefined,
    }
  }

  function isTalentChoiceComplete(): boolean {
    if (!talentRollState) return false
    const { matchedEntry } = talentRollState

    if (isChooseTalentOrStats(matchedEntry.mechanic)) {
      if (!chooseTalentMode) return false
      if (chooseTalentMode === 'talent') return chosenTalentIndex !== null
      if (chooseTalentMode === 'stats') {
        const total = Object.values(statDistribution).reduce((sum, v) => sum + v, 0)
        return total === 2
      }
      return false
    }

    if (needsStatChoice(matchedEntry.mechanic)) {
      return selectedStat !== null
    }

    return true
  }

  // ========== Spells ==========

  function areAllSpellsFilled(): boolean {
    let totalRequired = 0
    for (const slot of newSpellSlots) {
      totalRequired += slot.count
    }
    const filled = Object.values(selectedSpells).filter(id => id !== '').length
    return filled >= totalRequired
  }

  // ========== Complete ==========

  function handleComplete() {
    if (!hpRollState) return

    const talent = hasTalentStep ? buildAppliedTalent() : undefined
    const newSpellIds = hasSpellStep
      ? Object.values(selectedSpells).filter(id => id !== '')
      : undefined

    onComplete({
      hpRoll: hpRollState.chosenRoll,
      talent,
      newSpellIds: newSpellIds && newSpellIds.length > 0 ? newSpellIds : undefined,
    })
  }

  // ========== Render Helpers ==========

  function renderStepIndicator() {
    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === currentStepIndex
                ? 'w-8 bg-primary'
                : i < currentStepIndex
                  ? 'w-2 bg-primary/60'
                  : 'w-2 bg-border'
            }`}
          />
        ))}
      </div>
    )
  }

  function renderAnnounceStep() {
    const className = classDef?.name ?? character.class
    const ancestryName = character.ancestry.charAt(0).toUpperCase() + character.ancestry.slice(1)

    return (
      <div className="text-center space-y-4">
        <div className="text-5xl mb-2">*</div>
        <h2 className="text-2xl font-bold text-foreground">
          {ti('character.levelUp.reachesLevel', { name: character.name, level: newLevel })}
        </h2>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>{ancestryName} {className}</p>
          <p>{ti('character.levelUp.hitDie', { die: hitDie })}</p>
        </div>
        {oldTitle !== newTitle && (
          <div className="rounded-lg bg-secondary p-3 text-sm">
            <span className="text-muted-foreground">{oldTitle}</span>
            <span className="mx-2 text-primary font-bold">&rarr;</span>
            <span className="text-foreground font-semibold">{newTitle}</span>
          </div>
        )}
        <button
          onClick={goNext}
          className="w-full rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground hover:opacity-90 transition"
        >
          {t('common.continue')}
        </button>
      </div>
    )
  }

  function renderHpStep() {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-bold mb-1">{ti('character.levelUp.rollHp', { die: hitDie })}</h3>
          <p className="text-sm text-muted-foreground">
            {ti('character.levelUp.conModifier', { mod: formatMod(conMod) })}
          </p>
          {isDwarf && (
            <p className="text-xs text-amber-400 mt-1">{t('character.levelUp.dwarfStout')}</p>
          )}
        </div>

        {!hpRollState ? (
          <DiceRoller
            lockedDie={hitDie as DieType}
            compact
            characterName={character.name}
            onRoll={(result) => {
              const roll1 = result.total
              if (isDwarf) {
                const result2 = rollDice(`1${hitDie}`)
                const roll2 = result2.total
                const chosenRoll = Math.max(roll1, roll2)
                const hpGain = Math.max(1, chosenRoll + conMod)
                setHpRollState({ roll1, roll2, chosenRoll, hpGain })
              } else {
                const hpGain = Math.max(1, roll1 + conMod)
                setHpRollState({ roll1, chosenRoll: roll1, hpGain })
              }
            }}
          />
        ) : (
          <div className="rounded-lg bg-secondary p-4 space-y-3">
            {isDwarf && hpRollState.roll2 !== undefined ? (
              <div className="text-center">
                <div className="flex items-center justify-center gap-4 mb-2">
                  <div className={`rounded-lg border px-4 py-2 text-center ${
                    hpRollState.roll1 >= hpRollState.roll2 ? 'border-primary bg-primary/10' : 'border-border opacity-50'
                  }`}>
                    <div className="text-xs text-muted-foreground">{t('character.levelUp.roll1')}</div>
                    <div className="text-2xl font-bold">{hpRollState.roll1}</div>
                  </div>
                  <div className={`rounded-lg border px-4 py-2 text-center ${
                    hpRollState.roll2 > hpRollState.roll1 ? 'border-primary bg-primary/10' : 'border-border opacity-50'
                  }`}>
                    <div className="text-xs text-muted-foreground">{t('character.levelUp.roll2')}</div>
                    <div className="text-2xl font-bold">{hpRollState.roll2}</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {ti('character.levelUp.bestRoll', { roll: hpRollState.chosenRoll, mod: formatMod(conMod), gain: hpRollState.hpGain })}
                </p>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">{hpRollState.roll1}</div>
                <p className="text-sm text-muted-foreground">
                  {ti('character.levelUp.rolledResult', { roll: hpRollState.roll1, mod: formatMod(conMod), gain: hpRollState.hpGain })}
                </p>
              </div>
            )}
            <div className="border-t border-border/50 pt-2 text-center text-sm">
              {t('character.levelUp.maxHp')} <span className="text-muted-foreground">{character.maxHp}</span>
              <span className="mx-2 text-primary font-bold">&rarr;</span>
              <span className="font-bold text-foreground">{character.maxHp + hpRollState.hpGain}</span>
            </div>
          </div>
        )}

        <button
          onClick={goNext}
          disabled={!hpRollState}
          className="w-full rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {t('common.continue')}
        </button>
      </div>
    )
  }

  function renderTalentStep() {
    if (!classDef) return null
    const className = tData('classes', classDef.id, 'name', classDef.name)

    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-bold mb-1">{ti('character.levelUp.rollTalentTable', { className })}</h3>
          <p className="text-xs text-muted-foreground">{t('character.levelUp.talentLevels')}</p>
        </div>

        {!talentRollState ? (
          <>
            {/* Show talent table for reference */}
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-secondary">
                    <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">{t('character.levelUp.rollColumn')}</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground">{t('character.levelUp.talentColumn')}</th>
                  </tr>
                </thead>
                <tbody>
                  {classDef.talentTable.map((entry, i) => {
                    const rollKey = typeof entry.roll === 'number' ? String(entry.roll) : `${entry.roll[0]}-${entry.roll[1]}`
                    return (
                    <tr key={i} className="border-t border-border/30">
                      <td className="px-2 py-1 text-muted-foreground whitespace-nowrap">
                        {rollKey}
                      </td>
                      <td className="px-2 py-1">{tDataNested('classes', classDef.id, ['talents', rollKey], entry.description)}</td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <DiceRoller
              lockedDie="d6"
              compact
              characterName={character.name}
              onRoll={() => handleRollTalent()}
            />
          </>
        ) : (
          <div className="space-y-3">
            {/* Roll result */}
            <div className="rounded-lg bg-secondary p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                {talentRollState.dice.map((d, i) => (
                  <span key={i} className="contents">
                    {i > 0 && <span className="text-muted-foreground font-bold">+</span>}
                    <div className="rounded-lg border border-primary/30 bg-primary/10 w-10 h-10 flex items-center justify-center text-lg font-bold">
                      {d}
                    </div>
                  </span>
                ))}
                <span className="mx-1 text-muted-foreground">=</span>
                <div className="text-2xl font-bold text-primary">{talentRollState.rollTotal}</div>
              </div>
              <p className="text-sm font-semibold">{(() => {
                const rk = typeof talentRollState.matchedEntry.roll === 'number' ? String(talentRollState.matchedEntry.roll) : `${talentRollState.matchedEntry.roll[0]}-${talentRollState.matchedEntry.roll[1]}`
                return tDataNested('classes', classDef?.id ?? '', ['talents', rk], talentRollState.matchedEntry.description)
              })()}</p>
            </div>

            {/* Stat choice picker */}
            {needsStatChoice(talentRollState.matchedEntry.mechanic) && talentRollState.matchedEntry.mechanic.type === 'stat_bonus' && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {ti('character.levelUp.chooseStatToIncrease', { amount: talentRollState.matchedEntry.mechanic.amount })}
                </label>
                <div className="flex gap-2">
                  {talentRollState.matchedEntry.mechanic.stats.map(stat => (
                    <button
                      key={stat}
                      onClick={() => setSelectedStat(stat)}
                      className={`flex-1 rounded-lg border py-2 text-center text-sm font-semibold transition ${
                        selectedStat === stat
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                      }`}
                    >
                      {stat}
                      <div className="text-[10px] opacity-70">{effectiveStats[stat]}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Choose talent or stats */}
            {isChooseTalentOrStats(talentRollState.matchedEntry.mechanic) && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('character.levelUp.chooseTalentOrStats')}
                </label>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setChooseTalentMode('talent'); setChosenTalentIndex(null); setStatDistribution({}) }}
                    className={`flex-1 rounded-lg border py-2 text-center text-sm font-semibold transition ${
                      chooseTalentMode === 'talent'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t('character.levelUp.pickATalent')}
                  </button>
                  <button
                    onClick={() => { setChooseTalentMode('stats'); setChosenTalentIndex(null); setStatDistribution({}) }}
                    className={`flex-1 rounded-lg border py-2 text-center text-sm font-semibold transition ${
                      chooseTalentMode === 'stats'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t('character.levelUp.plusTwoToStats')}
                  </button>
                </div>

                {chooseTalentMode === 'talent' && (
                  <div className="space-y-1">
                    {classDef.talentTable
                      .filter((_e, i) => i < classDef.talentTable.length - 1) // exclude the choose_talent_or_stats entry itself
                      .map((entry, i) => {
                        const rk = typeof entry.roll === 'number' ? String(entry.roll) : `${entry.roll[0]}-${entry.roll[1]}`
                        return (
                        <button
                          key={i}
                          onClick={() => setChosenTalentIndex(i)}
                          className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                            chosenTalentIndex === i
                              ? 'border-primary bg-primary/10 text-foreground'
                              : 'border-border/50 text-muted-foreground hover:text-foreground hover:border-foreground/30'
                          }`}
                        >
                          {tDataNested('classes', classDef?.id ?? '', ['talents', rk], entry.description)}
                        </button>
                        )
                      })}
                  </div>
                )}

                {chooseTalentMode === 'stats' && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {t('character.levelUp.distributePoints')}{' '}
                      {ti('character.levelUp.remaining', { count: 2 - Object.values(statDistribution).reduce((s, v) => s + v, 0) })}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as AbilityScore[]).map(stat => {
                        const current = statDistribution[stat] ?? 0
                        const totalDistributed = Object.values(statDistribution).reduce((s, v) => s + v, 0)
                        const canAdd = totalDistributed < 2
                        return (
                          <div key={stat} className="flex items-center gap-1 rounded-lg border border-border/50 px-2 py-1">
                            <span className="text-xs font-semibold w-8">{stat}</span>
                            <span className="text-xs text-muted-foreground flex-1">{effectiveStats[stat]}</span>
                            <button
                              onClick={() => setStatDistribution(d => ({ ...d, [stat]: Math.max(0, (d[stat] ?? 0) - 1) }))}
                              disabled={current === 0}
                              className="text-xs px-1 rounded hover:bg-accent disabled:opacity-30"
                            >
                              -
                            </button>
                            <span className="text-xs font-bold w-3 text-center text-primary">{current}</span>
                            <button
                              onClick={() => setStatDistribution(d => ({ ...d, [stat]: (d[stat] ?? 0) + 1 }))}
                              disabled={!canAdd}
                              className="text-xs px-1 rounded hover:bg-accent disabled:opacity-30"
                            >
                              +
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <button
          onClick={goNext}
          disabled={!talentRollState || !isTalentChoiceComplete()}
          className="w-full rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {t('common.continue')}
        </button>
      </div>
    )
  }

  function renderSpellsStep() {
    if (!classDef?.spellcasting) return null
    const spellList = classDef.spellcasting.spellList

    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-bold mb-1">{t('character.levelUp.learnNewSpells')}</h3>
          <p className="text-xs text-muted-foreground">
            {ti('character.levelUp.newSpellSlotsOpened', { level: newLevel })}
          </p>
        </div>

        {newSpellSlots.map(({ tier, count }) => {
          return Array.from({ length: count }, (_, slotIdx) => {
            const key = `${tier}-${slotIdx}`
            const currentSelection = selectedSpells[key] ?? ''

            // For filtering, exclude spells already selected in OTHER slots
            const otherSelected = Object.entries(selectedSpells)
              .filter(([k]) => k !== key)
              .map(([, v]) => v)
              .filter(v => v !== '')
            const knownIds = [...character.spells.knownSpells.map(s => s.spellId), ...otherSelected]
            const filteredSpells = getSpellsByClassAndTier(spellList, tier).filter(
              (s: SpellDefinition) => !knownIds.includes(s.id) || s.id === currentSelection
            )

            return (
              <div key={key} className="rounded-lg border border-border/50 p-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {ti('character.levelUp.newTierSpell', { tier })}
                </label>
                <select
                  value={currentSelection}
                  onChange={e => setSelectedSpells(prev => ({ ...prev, [key]: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">{t('character.levelUp.selectSpell')}</option>
                  {filteredSpells.map((spell: SpellDefinition) => (
                    <option key={spell.id} value={spell.id}>
                      {spell.name} {spell.isFocus ? '(Focus)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )
          })
        })}

        <button
          onClick={goNext}
          disabled={!areAllSpellsFilled()}
          className="w-full rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {t('common.continue')}
        </button>
      </div>
    )
  }

  function renderSummaryStep() {
    const talent = hasTalentStep ? buildAppliedTalent() : undefined
    const spellIds = hasSpellStep ? Object.values(selectedSpells).filter(id => id !== '') : []

    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-4xl mb-2">*</div>
          <h2 className="text-xl font-bold">{t('character.levelUp.complete')}</h2>
        </div>

        <div className="rounded-lg bg-secondary p-4 space-y-2 text-sm">
          {/* Level */}
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('character.levelUp.level')}</span>
            <span>
              <span className="text-muted-foreground">{character.level}</span>
              <span className="mx-2 text-primary font-bold">&rarr;</span>
              <span className="font-bold">{newLevel}</span>
            </span>
          </div>

          {/* Title */}
          {oldTitle !== newTitle && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('character.levelUp.title')}</span>
              <span>
                <span className="text-muted-foreground">{oldTitle}</span>
                <span className="mx-2 text-primary font-bold">&rarr;</span>
                <span className="font-bold">{newTitle}</span>
              </span>
            </div>
          )}

          {/* HP */}
          {hpRollState && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('character.levelUp.maxHp')}</span>
              <span>
                <span className="text-muted-foreground">{character.maxHp}</span>
                <span className="mx-2 text-primary font-bold">&rarr;</span>
                <span className="font-bold">{character.maxHp + hpRollState.hpGain}</span>
                <span className="text-xs text-muted-foreground ml-1">(+{hpRollState.hpGain})</span>
              </span>
            </div>
          )}

          {/* Talent */}
          {talent && (
            <div className="border-t border-border/50 pt-2 mt-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t('character.levelUp.talentGained')}</div>
              <p className="text-foreground">{talent.description}</p>
              {talent.choices?.stat && (
                <p className="text-xs text-primary mt-0.5">{ti('character.levelUp.chosenStat', { stat: talent.choices.stat })}</p>
              )}
              {talent.choices?.chosen === 'talent' && talent.choices?.talentIndex != null && classDef && (
                <p className="text-xs text-primary mt-0.5">
                  {ti('character.levelUp.chosenTalent', { talent: classDef.talentTable[Number(talent.choices.talentIndex)]?.description })}
                </p>
              )}
              {talent.choices?.chosen === 'stats' && talent.choices?.distribution && (
                <p className="text-xs text-primary mt-0.5">
                  {ti('character.levelUp.stats', { distribution: talent.choices.distribution })}
                </p>
              )}
            </div>
          )}

          {/* Spells */}
          {spellIds.length > 0 && (
            <div className="border-t border-border/50 pt-2 mt-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t('character.levelUp.spellsLearned')}</div>
              <ul className="space-y-0.5">
                {spellIds.map(id => {
                  const spell = getSpell(id)
                  return (
                    <li key={id} className="text-foreground">
                      {spell?.name ?? id}
                      {spell && <span className="text-xs text-muted-foreground ml-1">(Tier {spell.tier})</span>}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>

        <button
          onClick={handleComplete}
          className="w-full rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground hover:opacity-90 transition"
        >
          {t('character.levelUp.completeLevelUp')}
        </button>
      </div>
    )
  }

  // ========== Main Render ==========

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8">
      <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6">
        {renderStepIndicator()}

        {currentStep === 'announce' && renderAnnounceStep()}
        {currentStep === 'hp' && renderHpStep()}
        {currentStep === 'talent' && renderTalentStep()}
        {currentStep === 'spells' && renderSpellsStep()}
        {currentStep === 'summary' && renderSummaryStep()}

        {/* Cancel always available */}
        {currentStep !== 'summary' && (
          <button
            onClick={onCancel}
            className="mt-3 w-full rounded-lg border border-border py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition"
          >
            {t('common.cancel')}
          </button>
        )}
      </div>
    </div>
  )
}
