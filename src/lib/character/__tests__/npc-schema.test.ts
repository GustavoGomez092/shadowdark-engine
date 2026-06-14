import { describe, it, expect } from 'vitest'
import { validateCharacter } from '../schema.ts'
import { npcToCharacter } from '../npc-to-character.ts'
import type { AdventureNPC } from '@/schemas/campaign.ts'

const npc: AdventureNPC = {
  id: 'n', name: 'Doffin', ancestry: 'halfling', role: 'Light-bearer', description: '', personality: 'Nervous',
  stats: { level: 1, ac: 11, hp: 4, attacks: [{ name: 'Dagger', bonus: 1, damage: '1d4', range: 'close' }],
    stats: { STR: 8, DEX: 13, CON: 10, INT: 10, WIS: 9, CHA: 12 }, alignment: 'neutral',
    abilities: [{ name: 'Steady Light', description: 'Carries a lantern.' }] },
}

describe('validateCharacter preserves NPC fields', () => {
  it('keeps isNpc and the embedded statblock through validation', () => {
    const c = npcToCharacter(npc)
    const r = validateCharacter(c)
    expect(r.success).toBe(true)
    expect(r.character?.isNpc).toBe(true)
    expect(r.character?.npc?.ac).toBe(11)
    expect(r.character?.npc?.attacks).toEqual([{ name: 'Dagger', bonus: 1, damage: '1d4', range: 'close' }])
    expect(r.character?.npc?.abilities[0].name).toBe('Steady Light')
  })
})
