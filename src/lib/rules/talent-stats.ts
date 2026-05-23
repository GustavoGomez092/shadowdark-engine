import type { AbilityScore, TalentMechanic } from '@/schemas/character.ts'
import type { StatIncrease } from './character.ts'

export interface StatIncreaseChoice {
  /** The mechanic of the rolled talent entry. */
  mechanic: TalentMechanic
  /** For a `choose_talent_or_stats` roll: whether the player picked a talent or the +2 stats option. */
  chooseTalentMode: 'talent' | 'stats' | null
  /** When `chooseTalentMode === 'talent'`, the mechanic of the talent the player picked. */
  chosenTalentMechanic?: TalentMechanic
  /** The single stat chosen for a multi-option `stat_bonus`. */
  selectedStat: AbilityScore | null
  /** Point distribution for the +2-to-stats option. */
  statDistribution: Record<string, number>
}

function fromStatBonus(
  stats: AbilityScore[],
  amount: number,
  selectedStat: AbilityScore | null,
): StatIncrease[] {
  if (stats.length === 1) return [{ stat: stats[0], amount }]
  if (selectedStat && stats.includes(selectedStat)) return [{ stat: selectedStat, amount }]
  return []
}

/**
 * Resolve a player's level-up talent choice into concrete ability score increases.
 * These are applied as permanent stat modifications by `levelUpCharacter`.
 */
export function deriveStatIncreases(choice: StatIncreaseChoice): StatIncrease[] {
  const { mechanic, chooseTalentMode, chosenTalentMechanic, selectedStat, statDistribution } = choice

  if (mechanic.type === 'choose_talent_or_stats') {
    if (chooseTalentMode === 'stats') {
      return Object.entries(statDistribution)
        .filter(([, amount]) => amount > 0)
        .map(([stat, amount]) => ({ stat: stat as AbilityScore, amount }))
    }
    if (chooseTalentMode === 'talent' && chosenTalentMechanic?.type === 'stat_bonus') {
      return fromStatBonus(chosenTalentMechanic.stats, chosenTalentMechanic.amount, selectedStat)
    }
    return []
  }

  if (mechanic.type === 'stat_bonus') {
    return fromStatBonus(mechanic.stats, mechanic.amount, selectedStat)
  }

  return []
}
