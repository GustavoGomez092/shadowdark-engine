/**
 * Zod validation schemas for campaign import/export.
 * These validate the full campaign structure including adventure,
 * lore, maps, and data-pack content — with lenient defaults for import.
 */
import { z } from 'zod'
import {
  monsterDefinitionSchema,
  spellDefinitionSchema,
  weaponDefinitionSchema,
  armorDefinitionSchema,
  gearDefinitionSchema,
  backgroundDefinitionSchema,
  deityDefinitionSchema,
  languageDefinitionSchema,
  ancestryDefinitionSchema,
  classDefinitionSchema,
} from '@/lib/data/schemas.ts'

// ── Result Types ──

export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: string[]
}

// ── Helper: format Zod errors into user-friendly strings ──

function formatZodErrors(error: z.ZodError): string[] {
  return error.issues.map(issue => {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'root'
    return `${path}: ${issue.message}`
  })
}

// ── Trap ──

export const TrapDefinitionSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  description: z.string().default(''),
  trigger: z.string().default(''),
  effect: z.string().default(''),
  detectionDC: z.number().default(12),
  disarmDC: z.number().default(12),
  damage: z.string().optional(),
}).passthrough()

// ── Adventure Room ──

export const AdventureRoomSchema = z.object({
  id: z.string(),
  number: z.number(),
  name: z.string().default(''),
  description: z.string().default(''),
  gmNotes: z.string().default(''),
  monsterIds: z.array(z.string()).default([]),
  treasure: z.string().default(''),
  traps: z.array(TrapDefinitionSchema).default([]),
  connections: z.array(z.string()).default([]),
  mapId: z.string().optional(),
}).passthrough()

// ── NPC ──

export const AdventureNPCSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  ancestry: z.string().default('human'),
  role: z.string().default(''),
  description: z.string().default(''),
  personality: z.string().default(''),
  stats: z.object({}).passthrough().optional(),
  portraitPrompt: z.string().optional(),
}).passthrough()

// ── Random Encounter Entry ──

export const RandomEncounterEntrySchema = z.object({
  roll: z.union([z.number(), z.tuple([z.number(), z.number()])]),
  description: z.string(),
  monsterIds: z.array(z.string()).optional(),
  quantity: z.string().optional(),
}).passthrough()

// ── Random Encounter Table ──

export const RandomEncounterTableSchema = z.object({
  id: z.string(),
  name: z.string().default('Random Encounters'),
  diceExpression: z.string().default('1d6'),
  entries: z.array(RandomEncounterEntrySchema).default([]),
}).passthrough()

// ── Adventure Module ──

export const AdventureModuleSchema = z.object({
  hook: z.string().default(''),
  overview: z.string().default(''),
  targetLevel: z.tuple([z.number(), z.number()]).default([1, 3]),
  rooms: z.array(AdventureRoomSchema).default([]),
  randomEncounters: z.array(RandomEncounterTableSchema).default([]),
  npcs: z.array(AdventureNPCSchema).default([]),
}).passthrough()

// ── Lore ──

export const LoreSectionSchema = z.object({
  id: z.string(),
  title: z.string().default(''),
  content: z.string().default(''),
  sortOrder: z.number().default(0),
}).passthrough()

export const LoreChapterSchema = z.object({
  id: z.string(),
  title: z.string().default(''),
  sortOrder: z.number().default(0),
  sections: z.array(LoreSectionSchema).default([]),
}).passthrough()

export const LoreDocumentSchema = z.object({
  chapters: z.array(LoreChapterSchema).default([]),
}).passthrough()

// ── Map ──

const CellFeatureSchema = z.object({
  type: z.enum(['stairs', 'entry', 'exit', 'trap', 'furniture']),
  direction: z.enum(['up', 'down']).optional(),
  variant: z.string().optional(),
}).passthrough()

const WallTypeSchema = z.enum(['none', 'wall', 'door', 'secret_door', 'window', 'arch'])

const MapCellSchema = z.object({
  x: z.number(),
  y: z.number(),
  terrain: z.string(),
  walls: z.object({
    north: WallTypeSchema,
    east: WallTypeSchema,
    south: WallTypeSchema,
    west: WallTypeSchema,
    diagTLBR: WallTypeSchema.optional(),
    diagTRBL: WallTypeSchema.optional(),
  }).passthrough(),
  features: z.array(CellFeatureSchema).default([]),
  split: z.enum(['TLBR', 'TRBL']).optional(),
  splitTerrain: z.string().optional(),
}).passthrough()

const MapLayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  visible: z.boolean(),
  locked: z.boolean(),
  cells: z.array(MapCellSchema).default([]),
}).passthrough()

const MapLabelSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  text: z.string(),
  fontSize: z.number(),
  color: z.string().optional(),
}).passthrough()

const MapMarkerSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  type: z.enum(['room_number', 'monster', 'npc', 'treasure', 'trap', 'note']),
  label: z.string(),
}).passthrough()

export const CampaignMapSchema = z.object({
  id: z.string(),
  name: z.string(),
  seed: z.number().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
  width: z.number(),
  height: z.number(),
  cellSize: z.number(),
  wallThickness: z.number().optional(),
  wallStyle: z.string().optional(),
  layers: z.array(MapLayerSchema).default([]),
  labels: z.array(MapLabelSchema).default([]),
  markers: z.array(MapMarkerSchema).default([]),
  dungeonData: z.any().optional(),
}).passthrough()

// ── DataPack Content ──

export const DataPackContentSchema = z.object({
  monsters: z.array(monsterDefinitionSchema).optional(),
  spells: z.array(spellDefinitionSchema).optional(),
  weapons: z.array(weaponDefinitionSchema).optional(),
  armor: z.array(armorDefinitionSchema).optional(),
  gear: z.array(gearDefinitionSchema).optional(),
  backgrounds: z.array(backgroundDefinitionSchema).optional(),
  deities: z.array(deityDefinitionSchema).optional(),
  languages: z.array(languageDefinitionSchema).optional(),
  ancestries: z.array(ancestryDefinitionSchema).optional(),
  classes: z.array(classDefinitionSchema).optional(),
}).passthrough()

// ── Campaign ──

export const CampaignSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  author: z.string().default(''),
  version: z.string().default('1.0'),
  description: z.string().default(''),
  createdAt: z.number().default(() => Date.now()),
  updatedAt: z.number().default(() => Date.now()),
  content: DataPackContentSchema.default({}),
  adventure: AdventureModuleSchema.default({
    hook: '',
    overview: '',
    targetLevel: [1, 3] as [number, number],
    rooms: [],
    randomEncounters: [],
    npcs: [],
  }),
  lore: LoreDocumentSchema.default({ chapters: [] }),
  maps: z.array(CampaignMapSchema).default([]),
}).passthrough()

// ── Adventure Document ──

export const AdventureDocumentSchema = z.object({
  format: z.literal('shadowdark-adventure-v1'),
  exportedAt: z.number(),
}).passthrough().and(CampaignSchema)

// ── Validation Functions ──

export function validateCampaign(data: unknown): ValidationResult<z.infer<typeof CampaignSchema>> {
  const result = CampaignSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: formatZodErrors(result.error) }
}

export function validateAdventureDocument(data: unknown): ValidationResult<z.infer<typeof AdventureDocumentSchema>> {
  const result = AdventureDocumentSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: formatZodErrors(result.error) }
}
