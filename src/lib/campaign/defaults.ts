import { generateId } from '@/lib/utils/id.ts'
import type { Campaign, AdventureRoom, AdventureNPC, TrapDefinition, RandomEncounterTable, LoreChapter, LoreSection } from '@/schemas/campaign.ts'
import type { CampaignMap } from '@/schemas/map.ts'

export function createEmptyCampaign(name: string, author: string = ''): Campaign {
  return {
    id: generateId(),
    name,
    author,
    version: '1.0',
    description: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    content: {},
    adventure: {
      hook: '',
      overview: '',
      targetLevel: [1, 3],
      rooms: [],
      randomEncounters: [],
      npcs: [],
    },
    lore: { chapters: [] },
    maps: [],
  }
}

export function createEmptyRoom(number: number): AdventureRoom {
  return {
    id: generateId(),
    number,
    name: `Room ${number}`,
    description: '',
    gmNotes: '',
    monsterIds: [],
    treasure: '',
    traps: [],
    connections: [],
  }
}

export function createEmptyNPC(): AdventureNPC {
  return {
    id: generateId(),
    name: '',
    ancestry: 'human',
    role: '',
    description: '',
    personality: '',
  }
}

export function createEmptyTrap(): TrapDefinition {
  return {
    id: generateId(),
    name: '',
    description: '',
    trigger: '',
    effect: '',
    detectionDC: 12,
    disarmDC: 12,
  }
}

export function createEmptyEncounterTable(): RandomEncounterTable {
  return {
    id: generateId(),
    name: 'Random Encounters',
    diceExpression: '1d6',
    entries: [],
  }
}

export function createEmptyChapter(): LoreChapter {
  return {
    id: generateId(),
    title: 'New Chapter',
    sortOrder: 0,
    sections: [],
  }
}

export function createEmptySection(): LoreSection {
  return {
    id: generateId(),
    title: 'New Section',
    content: '',
    sortOrder: 0,
  }
}

export function createEmptyMap(name: string = 'Dungeon Map', seed: number = 0): CampaignMap {
  return {
    id: generateId(),
    name,
    seed,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    dungeonData: null,
  }
}
