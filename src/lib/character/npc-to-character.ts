import type { Character, Ancestry, AbilityScores } from '@/schemas/character.ts'
import type { AdventureNPC } from '@/schemas/campaign.ts'
import type { Alignment } from '@/schemas/reference.ts'
import { generateId } from '@/lib/utils/id.ts'
import { computeCharacterValues } from '@/lib/rules/character.ts'

const ANCESTRIES: Ancestry[] = ['dwarf', 'elf', 'goblin', 'halfling', 'half-orc', 'human', 'kobold']
const ALIGNMENTS: Alignment[] = ['lawful', 'neutral', 'chaotic']
const DEFAULT_STATS: AbilityScores = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }

/**
 * Build a Character from an adventure NPC, preserving the authored statblock
 * verbatim under `.npc` and flagging `isNpc`. No lossy class inference: the
 * `class` field is an inert placeholder (NPCs render a statblock sheet and take
 * AC/attacks from `.npc`, not from class/gear).
 */
export function npcToCharacter(npc: AdventureNPC): Character {
  const s = npc.stats ?? {}
  const ancestry: Ancestry = ANCESTRIES.includes(npc.ancestry as Ancestry) ? (npc.ancestry as Ancestry) : 'human'
  const alignment: Alignment = ALIGNMENTS.includes(s.alignment as Alignment) ? (s.alignment as Alignment) : 'neutral'
  const level = Math.max(1, s.level ?? 1)
  const maxHp = s.hp ?? 1

  const character: Character = {
    id: generateId(),
    playerId: '',
    name: npc.name,
    ancestry,
    class: 'fighter', // inert placeholder for NPCs
    level,
    xp: 0,
    alignment,
    background: npc.role ?? '',
    title: '',
    languages: [],
    baseStats: { ...DEFAULT_STATS, ...(s.stats ?? {}) },
    statModifications: [],
    maxHp,
    currentHp: maxHp,
    isDying: false,
    inventory: { items: [], coins: { gp: 0, sp: 0, cp: 0 } },
    spells: { knownSpells: [], penances: [] } as Character['spells'],
    conditions: [],
    talents: [],
    ancestryTraitUsed: false,
    hasLuckToken: false,
    weaponMasteries: [],
    notes: npc.description ?? '',
    isNpc: true,
    npc: {
      ac: s.ac ?? 10,
      attacks: s.attacks ?? [],
      abilities: s.abilities ?? [],
      movement: s.movement,
      role: npc.role,
      personality: npc.personality,
      portraitPrompt: npc.portraitPrompt,
    },
    computed: undefined as unknown as Character['computed'],
  }
  character.computed = computeCharacterValues(character)
  return character
}
