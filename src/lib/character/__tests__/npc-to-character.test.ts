import { describe, it, expect } from 'vitest'
import { npcToCharacter } from '../npc-to-character.ts'
import type { AdventureNPC } from '@/schemas/campaign.ts'

const WRENNA: AdventureNPC = {
  id: 'npc-sister-wrenna',
  name: 'Hermana Wrenna',
  ancestry: 'human',
  role: 'Mercenaria — Médica de Campo',
  description: '',
  personality: 'Sombría, firme y calladamente furiosa.',
  portraitPrompt: 'Una médica de campo humana, agotada.',
  stats: {
    level: 1, ac: 12, hp: 7,
    attacks: [{ name: 'Bastón', bonus: 1, damage: '1d6', range: 'close' }],
    movement: { normal: 'near' },
    stats: { STR: 9, DEX: 11, CON: 12, INT: 12, WIS: 14, CHA: 10 },
    alignment: 'lawful',
    abilities: [{ name: 'Misericordia', description: 'Cura a un aliado a 0 PG.' }],
    tags: ['humanoide', 'mercenario'],
  },
}

describe('npcToCharacter', () => {
  it('flags the result as an NPC', () => {
    expect(npcToCharacter(WRENNA).isNpc).toBe(true)
  })

  it('carries core fields from the NPC', () => {
    const c = npcToCharacter(WRENNA)
    expect(c.name).toBe('Hermana Wrenna')
    expect(c.ancestry).toBe('human')
    expect(c.alignment).toBe('lawful')
    expect(c.level).toBe(1)
    expect(c.baseStats).toEqual({ STR: 9, DEX: 11, CON: 12, INT: 12, WIS: 14, CHA: 10 })
    expect(c.maxHp).toBe(7)
    expect(c.currentHp).toBe(7)
  })

  it('embeds the authored statblock verbatim under .npc', () => {
    const { npc } = npcToCharacter(WRENNA)
    expect(npc?.ac).toBe(12)
    expect(npc?.attacks).toEqual([{ name: 'Bastón', bonus: 1, damage: '1d6', range: 'close' }])
    expect(npc?.abilities).toEqual([{ name: 'Misericordia', description: 'Cura a un aliado a 0 PG.' }])
    expect(npc?.movement).toEqual({ normal: 'near' })
    expect(npc?.role).toBe('Mercenaria — Médica de Campo')
    expect(npc?.personality).toBe('Sombría, firme y calladamente furiosa.')
    expect(npc?.portraitPrompt).toBe('Una médica de campo humana, agotada.')
  })

  it('starts with empty inventory, spells, and talents', () => {
    const c = npcToCharacter(WRENNA)
    expect(c.inventory.items).toEqual([])
    expect(c.spells.knownSpells).toEqual([])
    expect(c.talents).toEqual([])
  })

  it('produces a fresh unique id and unassigned player', () => {
    const a = npcToCharacter(WRENNA)
    const b = npcToCharacter(WRENNA)
    expect(a.id).toBeTruthy()
    expect(a.id).not.toBe(b.id)
    expect(a.playerId).toBe('')
  })

  it('clamps a level-0 NPC to level 1 (Character minimum)', () => {
    const lvl0: AdventureNPC = { ...WRENNA, stats: { ...WRENNA.stats, level: 0, hp: 4 } }
    expect(npcToCharacter(lvl0).level).toBe(1)
  })

  it('falls back to human + neutral when the NPC lacks valid ancestry/alignment', () => {
    const bare: AdventureNPC = { id: 'x', name: 'X', ancestry: 'sentient fungus', role: '', description: '', personality: '', stats: { hp: 3, stats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 } } }
    const c = npcToCharacter(bare)
    expect(c.ancestry).toBe('human')
    expect(c.alignment).toBe('neutral')
    expect(c.level).toBe(1)
    expect(c.maxHp).toBe(3)
    expect(c.npc?.ac).toBe(10) // default AC when unspecified
  })
})
