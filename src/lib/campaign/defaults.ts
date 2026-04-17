import { generateId } from '@/lib/utils/id.ts'
import type { Campaign, AdventureRoom, AdventureNPC, TrapDefinition, RandomTable, TableKind, AdventureStore, LoreChapter, LoreSection } from '@/schemas/campaign.ts'
import type { StoreItem } from '@/schemas/stores.ts'
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
    tables: [],
    adventure: {
      hook: '',
      overview: '',
      targetLevel: [1, 3],
      rooms: [],
      npcs: [],
      stores: [],
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

export function createEmptyTable(kind: TableKind = 'encounter'): RandomTable {
  return {
    id: generateId(),
    name: '',
    kind,
    diceExpression: '1d6',
    entries: [],
    attachments: [],
  }
}

export function createEmptyStore(): AdventureStore {
  return {
    id: generateId(),
    name: '',
    description: '',
    storeType: 'custom',
    items: [],
  }
}

export function createEmptyStoreItem(): StoreItem {
  return {
    id: generateId(),
    itemDefinitionId: '',
    name: '',
    description: '',
    price: 0,
    quantity: -1,
    category: 'gear',
    slots: 1,
    isCustom: true,
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
    width: 40,
    height: 30,
    cellSize: 40,
    layers: [{
      id: generateId(),
      name: 'Base',
      visible: true,
      locked: false,
      cells: [],
    }],
    labels: [],
    markers: [],
    dungeonData: null,
  }
}
