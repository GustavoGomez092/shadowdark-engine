import type { Character } from '@/schemas/character.ts'
import { generateId } from '@/lib/utils/id.ts'
import { computeCharacterValues } from '@/lib/rules/character.ts'
import { getSpell, getWeapon, getArmor, getGear } from '@/data/index.ts'
import { validateCharacter, validateCharacterExport } from './schema.ts'

export interface CharacterImportResult {
  valid: boolean
  character?: Character
  warnings?: string[]
  errors?: string[]
}

// Item categories that are expected to resolve to an installed data-pack definition.
const RESOLVABLE_CATEGORIES = new Set(['weapon', 'armor', 'shield', 'gear', 'ammo', 'ration', 'light_source'])

function itemResolves(definitionId: string): boolean {
  return !!(getWeapon(definitionId) || getArmor(definitionId) || getGear(definitionId))
}

/**
 * Reset state that is meaningful only within a session, so an imported character
 * "arrives fresh" in its new game. Progression (level, XP, gear, spells, talents)
 * is preserved.
 */
function resetTransientState(character: Character): Character {
  return {
    ...character,
    id: generateId(),
    playerId: '',
    currentHp: character.maxHp,
    isDying: false,
    deathTimer: undefined,
    conditions: [],
    hasLuckToken: false,
    spells: { ...character.spells, activeFocusSpell: undefined },
  }
}

function collectWarnings(character: Character): string[] {
  const warnings: string[] = []
  for (const known of character.spells.knownSpells) {
    if (!getSpell(known.spellId)) {
      warnings.push(`Spell "${known.spellId}" not found in installed data packs.`)
    }
  }
  for (const item of character.inventory.items) {
    if (RESOLVABLE_CATEGORIES.has(item.category) && !itemResolves(item.definitionId)) {
      warnings.push(`Item "${item.name}" (${item.definitionId}) not found in installed data packs.`)
    }
  }
  return warnings
}

/**
 * Parse and validate an imported character (envelope or raw object), reset its
 * transient state, assign a fresh identity, and recompute derived values.
 * Unresolved spell/item references produce warnings but never block the import.
 */
export function parseCharacterImport(json: unknown): CharacterImportResult {
  const hasFormat = typeof json === 'object' && json !== null && 'format' in json
  const validation = hasFormat ? validateCharacterExport(json) : validateCharacter(json)

  if (!validation.success || !validation.character) {
    return { valid: false, errors: validation.errors ?? ['Invalid character data.'] }
  }

  const character = resetTransientState(validation.character)
  character.computed = computeCharacterValues(character)
  const warnings = collectWarnings(character)

  return { valid: true, character, warnings: warnings.length > 0 ? warnings : undefined }
}
