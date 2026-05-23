import type { Character } from '@/schemas/character.ts'

const ENGINE_VERSION = '1.0.0'

export interface CharacterExport {
  format: 'shadowdark-character-v1'
  exportedAt: number
  engineVersion: string
  character: Character
}

/** Wrap a character in a portable, versioned export envelope. */
export function exportCharacter(character: Character): CharacterExport {
  return {
    format: 'shadowdark-character-v1',
    exportedAt: Date.now(),
    engineVersion: ENGINE_VERSION,
    character,
  }
}

/** A filesystem-safe, descriptive filename like `thorin-the-bold-lvl3.json`. */
export function characterFilename(character: Character): string {
  const slug = character.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'character'
  return `${slug}-lvl${character.level}.json`
}

/** Trigger a browser download of a JSON object. */
export function downloadCharacter(character: Character): void {
  const json = JSON.stringify(exportCharacter(character), null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = characterFilename(character)
  a.click()
  URL.revokeObjectURL(url)
}
