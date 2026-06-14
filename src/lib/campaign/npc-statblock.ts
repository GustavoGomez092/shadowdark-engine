import type { MonsterDefinition, MonsterAttack, MonsterAbility, MonsterMovement } from '@/schemas/monsters.ts'
import type { AbilityScores } from '@/schemas/character.ts'
import type { Alignment } from '@/schemas/reference.ts'

/** The editable subset of an NPC statblock (a focused view of MonsterDefinition). */
export interface NpcStats {
  level: number
  ac: number
  hp: number
  alignment: Alignment
  movement: MonsterMovement
  stats: AbilityScores
  attacks: MonsterAttack[]
  abilities: MonsterAbility[]
}

const DEFAULT_STATS: AbilityScores = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }

/**
 * Return a complete, editable NPC statblock — defaults filled in for anything
 * the source NPC didn't specify, while preserving everything it did. Used to
 * give the NPC editor a stable object to bind its statblock fields to.
 */
export function ensureNpcStats(stats?: Partial<MonsterDefinition>): NpcStats {
  const s = stats ?? {}
  return {
    level: s.level ?? 1,
    ac: s.ac ?? 12,
    hp: s.hp ?? 6,
    alignment: (s.alignment as Alignment) ?? 'neutral',
    movement: { normal: s.movement?.normal ?? 'near' },
    stats: { ...DEFAULT_STATS, ...(s.stats ?? {}) },
    attacks: s.attacks ? s.attacks.map(a => ({ ...a })) : [],
    abilities: s.abilities ? s.abilities.map(a => ({ ...a })) : [],
  }
}
