import type { DataPackContent } from '@/lib/data/types.ts'
import type { MonsterDefinition } from '@/schemas/monsters.ts'
import type { CampaignMap } from '@/schemas/map.ts'

// ── Campaign ──

export interface Campaign {
  id: string
  name: string
  author: string
  version: string
  description: string
  createdAt: number
  updatedAt: number
  content: DataPackContent
  adventure: AdventureModule
  lore: LoreDocument
  maps: CampaignMap[]
}

// ── Adventure Module ──

export interface AdventureModule {
  hook: string
  overview: string
  targetLevel: [number, number]
  rooms: AdventureRoom[]
  randomEncounters: RandomEncounterTable[]
  npcs: AdventureNPC[]
}

export interface AdventureRoom {
  id: string
  number: number
  name: string
  description: string
  gmNotes: string
  monsterIds: string[]
  treasure: string
  traps: TrapDefinition[]
  connections: string[]
  mapId?: string
}

export interface TrapDefinition {
  id: string
  name: string
  description: string
  trigger: string
  effect: string
  detectionDC: number
  disarmDC: number
  damage?: string
}

export interface AdventureNPC {
  id: string
  name: string
  ancestry: string
  role: string
  description: string
  personality: string
  stats?: Partial<MonsterDefinition>
  portraitPrompt?: string
}

export interface RandomEncounterTable {
  id: string
  name: string
  diceExpression: string
  entries: RandomEncounterEntry[]
}

export interface RandomEncounterEntry {
  roll: number | [number, number]
  description: string
  monsterIds?: string[]
  quantity?: string
}

// ── Lore Document ──

export interface LoreDocument {
  chapters: LoreChapter[]
}

export interface LoreChapter {
  id: string
  title: string
  sortOrder: number
  sections: LoreSection[]
}

export interface LoreSection {
  id: string
  title: string
  content: string
  sortOrder: number
}

// ── Campaign Index Entry ──

export interface CampaignIndexEntry {
  id: string
  name: string
  author: string
  updatedAt: number
}
