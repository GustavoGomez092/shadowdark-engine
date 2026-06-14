import { z } from 'zod'
import type { Character } from '@/schemas/character.ts'

// TypeScript interfaces in src/schemas remain the canonical types. These Zod
// schemas exist only to validate untrusted JSON at the import boundary.

const ABILITY_SCORE = z.enum(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'])
const ANCESTRY = z.enum(['dwarf', 'elf', 'goblin', 'halfling', 'half-orc', 'human', 'kobold'])
const CHARACTER_CLASS = z.enum([
  'fighter', 'priest', 'thief', 'wizard', 'bard', 'ranger', 'warlock', 'witch',
  'knight-of-st-ydris', 'seer', 'basilisk-warrior', 'desert-rider', 'pit-fighter',
  'sea-wolf', 'ras-godai',
])
const ALIGNMENT = z.enum(['lawful', 'neutral', 'chaotic'])

const AbilityScoresSchema = z.object({
  STR: z.number(), DEX: z.number(), CON: z.number(),
  INT: z.number(), WIS: z.number(), CHA: z.number(),
})

const StatModificationSchema = z.object({
  id: z.string(),
  stat: ABILITY_SCORE,
  amount: z.number(),
  source: z.string(),
  permanent: z.boolean(),
  expiresAt: z.number().optional(),
})

const DeathTimerSchema = z.object({
  totalRounds: z.number(),
  roundsRemaining: z.number(),
  startedAt: z.number(),
})

const ActiveConditionSchema = z.object({
  id: z.string(),
  condition: z.string(),
  source: z.string(),
  duration: z.number().optional(),
  appliedAt: z.number(),
})

const AppliedTalentSchema = z.object({
  id: z.string(),
  levelGained: z.number(),
  rollResult: z.number(),
  mechanic: z.any(),
  description: z.string(),
  choices: z.record(z.string(), z.string()).optional(),
})

const InventoryItemSchema = z.object({
  id: z.string(),
  definitionId: z.string(),
  name: z.string(),
  category: z.string(),
  slots: z.number(),
  quantity: z.number(),
  equipped: z.boolean(),
  isIdentified: z.boolean(),
  magicBonus: z.number().optional(),
  notes: z.string().optional(),
  weapon: z.any().optional(),
  armor: z.any().optional(),
  magic: z.any().optional(),
  consumable: z.any().optional(),
  lightSource: z.any().optional(),
})

const InventoryStateSchema = z.object({
  items: z.array(InventoryItemSchema).default([]),
  coins: z.object({ gp: z.number(), sp: z.number(), cp: z.number() })
    .default({ gp: 0, sp: 0, cp: 0 }),
})

const KnownSpellSchema = z.object({
  spellId: z.string(),
  isAvailable: z.boolean(),
  source: z.enum(['class', 'scroll', 'talent']),
  hasAdvantage: z.boolean(),
})

const CharacterSpellStateSchema = z.object({
  knownSpells: z.array(KnownSpellSchema).default([]),
  activeFocusSpell: z.any().optional(),
  penances: z.array(z.any()).default([]),
})

export const CharacterSchema = z.object({
  id: z.string().min(1),
  playerId: z.string(),
  name: z.string().min(1),
  ancestry: ANCESTRY,
  class: CHARACTER_CLASS,
  level: z.number().int().min(1).max(10),
  xp: z.number().int().min(0),
  alignment: ALIGNMENT,
  background: z.string().default(''),
  deity: z.string().optional(),
  title: z.string().default(''),
  languages: z.array(z.string()).default([]),
  baseStats: AbilityScoresSchema,
  statModifications: z.array(StatModificationSchema).default([]),
  maxHp: z.number(),
  currentHp: z.number(),
  isDying: z.boolean().default(false),
  deathTimer: DeathTimerSchema.optional(),
  inventory: InventoryStateSchema,
  spells: CharacterSpellStateSchema,
  conditions: z.array(ActiveConditionSchema).default([]),
  talents: z.array(AppliedTalentSchema).default([]),
  ancestryTraitUsed: z.boolean().default(false),
  elfChoice: z.enum(['ranged', 'spellcasting']).optional(),
  hasLuckToken: z.boolean().default(false),
  weaponMasteries: z.array(z.string()).default([]),
  notes: z.string().default(''),
  isNpc: z.boolean().optional(),
  npc: z.object({
    ac: z.number(),
    attacks: z.array(z.any()).default([]),
    abilities: z.array(z.any()).default([]),
    movement: z.any().optional(),
    role: z.string().optional(),
    personality: z.string().optional(),
    portraitPrompt: z.string().optional(),
  }).optional(),
  computed: z.any().optional(), // recomputed on import; not trusted
})

export const CharacterExportSchema = z.object({
  format: z.literal('shadowdark-character-v1'),
  exportedAt: z.number(),
  engineVersion: z.string().optional(),
  character: CharacterSchema,
})

export interface ValidationResult {
  success: boolean
  character?: Character
  errors?: string[]
}

function formatErrors(error: z.ZodError): string[] {
  return error.issues.map(issue => {
    const path = issue.path.join('.')
    return path ? `${path}: ${issue.message}` : issue.message
  })
}

/** Validate a parsed `Character` object. */
export function validateCharacter(data: unknown): ValidationResult {
  const result = CharacterSchema.safeParse(data)
  if (result.success) return { success: true, character: result.data as unknown as Character }
  return { success: false, errors: formatErrors(result.error) }
}

/** Validate a `shadowdark-character-v1` export envelope. */
export function validateCharacterExport(data: unknown): ValidationResult {
  const result = CharacterExportSchema.safeParse(data)
  if (result.success) return { success: true, character: result.data.character as unknown as Character }
  return { success: false, errors: formatErrors(result.error) }
}
