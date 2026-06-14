import { describe, it, expect } from 'vitest'
import { computeCharacterValues } from '../character.ts'
import { npcToCharacter } from '@/lib/character/npc-to-character.ts'
import type { AdventureNPC } from '@/schemas/campaign.ts'

const npc: AdventureNPC = {
  id: 'n', name: 'Guard', ancestry: 'human', role: '', description: '', personality: '',
  stats: { level: 2, ac: 15, hp: 12, attacks: [], movement: { normal: 'near' },
    stats: { STR: 12, DEX: 8, CON: 12, INT: 10, WIS: 10, CHA: 10 }, alignment: 'neutral', abilities: [] },
}

describe('computeCharacterValues for NPCs', () => {
  it('uses the authored statblock AC, not armor/DEX-derived AC', () => {
    const character = npcToCharacter(npc)
    // DEX 8 (mod -1) with no armor would give AC 9; statblock says 15
    expect(computeCharacterValues(character).ac).toBe(15)
  })
})
