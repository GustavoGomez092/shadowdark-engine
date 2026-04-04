/**
 * Zod validation schemas for data pack content.
 * These validate the required fields that the app actually uses
 * while allowing extra fields via passthrough() for homebrew extensions.
 */
import { z } from 'zod'

const rangeCategorySchema = z.enum(['close', 'near', 'far'])
const alignmentSchema = z.enum(['lawful', 'neutral', 'chaotic'])
const abilityScoresSchema = z.object({
  STR: z.number(),
  DEX: z.number(),
  CON: z.number(),
  INT: z.number(),
  WIS: z.number(),
  CHA: z.number(),
}).passthrough()

// ========== Monsters ==========

const monsterAttackSchema = z.object({
  name: z.string(),
  bonus: z.number(),
  damage: z.string(),
  range: rangeCategorySchema,
}).passthrough()

const monsterMovementSchema = z.object({
  normal: rangeCategorySchema,
}).passthrough()

const monsterAbilitySchema = z.object({
  name: z.string(),
  description: z.string(),
}).passthrough()

export const monsterDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.number(),
  ac: z.number(),
  hp: z.number(),
  attacks: z.array(monsterAttackSchema),
  movement: monsterMovementSchema,
  stats: abilityScoresSchema,
  alignment: alignmentSchema,
  abilities: z.array(monsterAbilitySchema),
  checksMorale: z.boolean(),
  tags: z.array(z.string()),
}).passthrough()

// ========== Spells ==========

const spellEffectSchema = z.object({
  type: z.string(),
}).passthrough()

export const spellDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  tier: z.number().int().min(1).max(5),
  class: z.string(),
  range: z.string(),
  duration: z.string(),
  isFocus: z.boolean(),
  description: z.string(),
  effects: z.array(spellEffectSchema),
}).passthrough()

// ========== Weapons ==========

export const weaponDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['melee', 'ranged']),
  damage: z.string(),
  range: rangeCategorySchema,
  properties: z.array(z.string()),
  cost: z.number(),
  slots: z.number(),
}).passthrough()

// ========== Armor ==========

export const armorDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  acBase: z.number(),
  addDex: z.boolean(),
  stealthPenalty: z.boolean(),
  swimPenalty: z.enum(['none', 'disadvantage', 'cannot']),
  cost: z.number(),
  slots: z.number(),
  isMithral: z.boolean(),
}).passthrough()

// ========== Gear ==========

export const gearDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  cost: z.number(),
  slots: z.number(),
  description: z.string(),
}).passthrough()

// ========== Backgrounds ==========

export const backgroundDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
}).passthrough()

// ========== Deities ==========

export const deityDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  alignment: alignmentSchema,
  domain: z.string(),
  description: z.string(),
}).passthrough()

// ========== Languages ==========

export const languageDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  rarity: z.enum(['common', 'rare']),
  typicalSpeakers: z.string(),
}).passthrough()

// ========== Ancestries ==========

const ancestryMechanicSchema = z.object({
  type: z.string(),
}).passthrough()

export const ancestryDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  traitName: z.string(),
  traitDescription: z.string(),
  mechanics: z.array(ancestryMechanicSchema),
  languages: z.array(z.string()),
}).passthrough()

// ========== Classes ==========

const classFeatureSchema = z.object({
  name: z.string(),
  level: z.number(),
  description: z.string(),
  mechanic: z.object({ type: z.string() }).passthrough(),
}).passthrough()

const talentTableEntrySchema = z.object({
  roll: z.union([z.number(), z.tuple([z.number(), z.number()])]),
  description: z.string(),
  mechanic: z.object({ type: z.string() }).passthrough(),
}).passthrough()

export const classDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  hitDie: z.string(),
  weaponProficiencies: z.array(z.string()),
  armorProficiencies: z.array(z.string()),
  features: z.array(classFeatureSchema),
  talentTable: z.array(talentTableEntrySchema),
}).passthrough()

// ========== Schema map for data pack validation ==========

export const DATA_PACK_SCHEMAS: Record<string, z.ZodType> = {
  monsters: z.array(monsterDefinitionSchema),
  spells: z.array(spellDefinitionSchema),
  weapons: z.array(weaponDefinitionSchema),
  armor: z.array(armorDefinitionSchema),
  gear: z.array(gearDefinitionSchema),
  backgrounds: z.array(backgroundDefinitionSchema),
  deities: z.array(deityDefinitionSchema),
  languages: z.array(languageDefinitionSchema),
  ancestries: z.array(ancestryDefinitionSchema),
  classes: z.array(classDefinitionSchema),
}
