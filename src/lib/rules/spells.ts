import type { SpellCastResult } from '@/schemas/spells.ts'
import type { Character } from '@/schemas/character.ts'
import { rollDice } from '@/lib/dice/roller.ts'
import { generateId } from '@/lib/utils/id.ts'
import { getSpellDC } from '@/schemas/reference.ts'
import { getAbilityModifier } from '@/schemas/reference.ts'
import { getSpell } from '@/data/spells.ts'
import { getClass } from '@/data/classes.ts'
import { computeEffectiveStats } from './character.ts'
import { WIZARD_MISHAPS_TIER_1_2 } from '@/data/tables/wizard-mishaps.ts'

export function resolveSpellCast(
  character: Character,
  spellId: string,
  options?: { usingScroll?: boolean; usingWand?: boolean }
): SpellCastResult {
  const spell = getSpell(spellId)
  if (!spell) throw new Error(`Unknown spell: ${spellId}`)

  const classDef = getClass(character.class)
  const castStat = classDef?.spellcasting?.stat ?? 'INT'
  const stats = computeEffectiveStats(character)
  let bonus = getAbilityModifier(stats[castStat])

  // Add spellcasting talent bonuses
  for (const talent of character.talents) {
    if (talent.mechanic.type === 'spellcasting_bonus') {
      bonus += talent.mechanic.amount
    }
  }

  // Elf farsight spellcasting bonus
  if (character.ancestry === 'elf' && character.elfChoice === 'spellcasting') {
    bonus += 1
  }

  // Check if this spell has advantage (e.g., Magic Missile or from talent)
  const knownSpell = character.spells.knownSpells.find(ks => ks.spellId === spellId)
  const hasAdvantage = spell.hasAdvantage || (knownSpell?.hasAdvantage ?? false)

  const dc = getSpellDC(spell.tier)
  const roll = rollDice('1d20', {
    rolledBy: character.id,
    purpose: 'spell_check',
    advantage: hasAdvantage,
  })

  const total = roll.total + bonus
  const isNat20 = roll.dice[0].isNat20
  const isNat1 = roll.dice[0].isNat1
  const success = isNat20 || (!isNat1 && total >= dc)

  // Determine mishap for wizards on nat 1
  let mishap = undefined
  if (isNat1 && character.class === 'wizard') {
    const mishapRoll = rollDice('1d12')
    mishap = WIZARD_MISHAPS_TIER_1_2.find(m => m.roll === mishapRoll.total) ?? WIZARD_MISHAPS_TIER_1_2[0]
  }

  // Penance for priests on nat 1
  const penanceRequired = isNat1 && character.class === 'priest'

  // Spell lost on failure or nat 1
  const spellLost = !success || isNat1

  // Scroll/wand effects
  let scrollConsumed = undefined
  let wandEffect: 'stops_working' | 'breaks' | undefined = undefined

  if (options?.usingScroll) {
    scrollConsumed = true // always consumed
  }

  if (options?.usingWand) {
    if (isNat1) wandEffect = 'breaks'
    else if (!success) wandEffect = 'stops_working'
  }

  return {
    id: generateId(),
    characterId: character.id,
    spellId,
    rollTotal: total,
    dc,
    success,
    isNat20,
    isNat1,
    mishap,
    penanceRequired,
    spellLost: options?.usingScroll || options?.usingWand ? false : spellLost,
    scrollConsumed,
    wandEffect,
  }
}

export function resolveFocusCheck(
  character: Character,
  spellId: string,
): { maintained: boolean; isNat1: boolean; rollTotal: number } {
  const spell = getSpell(spellId)
  if (!spell) return { maintained: false, isNat1: false, rollTotal: 0 }

  const classDef = getClass(character.class)
  const castStat = classDef?.spellcasting?.stat ?? 'INT'
  const stats = computeEffectiveStats(character)
  let bonus = getAbilityModifier(stats[castStat])

  for (const talent of character.talents) {
    if (talent.mechanic.type === 'spellcasting_bonus') {
      bonus += talent.mechanic.amount
    }
  }

  const dc = getSpellDC(spell.tier)
  const roll = rollDice('1d20', { rolledBy: character.id, purpose: 'focus_check' })
  const total = roll.total + bonus
  const isNat1 = roll.dice[0].isNat1
  const maintained = !isNat1 && total >= dc

  return { maintained, isNat1, rollTotal: total }
}
