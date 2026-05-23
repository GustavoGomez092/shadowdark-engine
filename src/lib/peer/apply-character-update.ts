import type { Character } from '@/schemas/character.ts'

/** The subset of character fields a player is allowed to update directly. */
export interface PlayerCharacterUpdateFields {
  notes?: string
}

/**
 * Apply a player-originated character update in place (Immer-draft friendly).
 * Only whitelisted, player-writable fields are touched.
 */
export function applyCharacterUpdate(character: Character, updates: PlayerCharacterUpdateFields): void {
  if (updates.notes !== undefined) {
    character.notes = updates.notes
  }
}
