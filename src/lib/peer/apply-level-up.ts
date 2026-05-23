import type { Character } from '@/schemas/character.ts'
import type { KnownSpell } from '@/schemas/spells.ts'
import { levelUpCharacter, type StatIncrease } from '@/lib/rules/character.ts'
import type { AppliedTalent } from '@/schemas/character.ts'

export interface PlayerLevelUpFields {
  hpRoll: number
  talent?: AppliedTalent
  newSpellIds?: string[]
  statIncreases?: StatIncrease[]
}

/**
 * Apply a player's completed level-up to their character, returning a NEW character.
 *
 * Built immutably on purpose: the session store is an Immer store and its state is
 * deep-frozen, so the previous approach of pushing onto `character.spells.knownSpells`
 * threw — which silently blocked every caster (the only classes that send newSpellIds)
 * from leveling up.
 */
export function applyPlayerLevelUp(character: Character, fields: PlayerLevelUpFields): Character {
  const updated = levelUpCharacter(character, fields.hpRoll, fields.talent, fields.statIncreases)

  if (!fields.newSpellIds || fields.newSpellIds.length === 0) return updated

  const learned: KnownSpell[] = fields.newSpellIds.map(spellId => ({
    spellId, isAvailable: true, source: 'class', hasAdvantage: false,
  }))

  return {
    ...updated,
    spells: {
      ...updated.spells,
      knownSpells: [...updated.spells.knownSpells, ...learned],
    },
  }
}
