import { describe, it, expect } from 'vitest'
import {
  validateCampaign,
  validateAdventureDocument,
  AdventureRoomSchema,
  TrapDefinitionSchema,
  AdventureNPCSchema,
  RandomEncounterTableSchema,
  LoreDocumentSchema,
  CampaignMapSchema,
  DataPackContentSchema,
} from '../schema.ts'

// ========== Task 1: Core Campaign Validation ==========

describe('validateCampaign', () => {
  describe('valid campaigns', () => {
    it('accepts a full campaign with all fields', () => {
      const result = validateCampaign({
        id: 'test-id',
        name: 'Test Campaign',
        author: 'Test Author',
        version: '1.0',
        description: 'A test campaign',
        createdAt: 1000,
        updatedAt: 2000,
        content: {},
        adventure: {
          hook: 'A hook',
          overview: 'An overview',
          targetLevel: [1, 3],
          rooms: [],
          randomEncounters: [],
          npcs: [],
        },
        lore: { chapters: [] },
        maps: [],
      })
      expect(result.success).toBe(true)
      expect(result.data?.id).toBe('test-id')
      expect(result.data?.name).toBe('Test Campaign')
    })

    it('accepts minimal campaign (id + name) and fills defaults', () => {
      const result = validateCampaign({ id: 'min-id', name: 'Minimal' })
      expect(result.success).toBe(true)
      expect(result.data?.author).toBe('')
      expect(result.data?.version).toBe('1.0')
      expect(result.data?.description).toBe('')
      expect(result.data?.content).toEqual({})
      expect(result.data?.adventure).toEqual({
        hook: '',
        overview: '',
        targetLevel: [1, 3],
        rooms: [],
        randomEncounters: [],
        npcs: [],
      })
      expect(result.data?.lore).toEqual({ chapters: [] })
      expect(result.data?.maps).toEqual([])
      expect(typeof result.data?.createdAt).toBe('number')
      expect(typeof result.data?.updatedAt).toBe('number')
    })
  })

  describe('invalid campaigns', () => {
    it('rejects missing id', () => {
      const result = validateCampaign({ name: 'No ID' })
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
    })

    it('rejects missing name', () => {
      const result = validateCampaign({ id: 'has-id' })
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })

    it('rejects empty name', () => {
      const result = validateCampaign({ id: 'x', name: '' })
      expect(result.success).toBe(false)
    })

    it('rejects non-object input', () => {
      expect(validateCampaign(null).success).toBe(false)
      expect(validateCampaign('string').success).toBe(false)
      expect(validateCampaign(42).success).toBe(false)
    })

    it('rejects wrong types for fields', () => {
      const result = validateCampaign({
        id: 'x',
        name: 'Test',
        adventure: { targetLevel: 'high' },
      })
      expect(result.success).toBe(false)
    })
  })
})

// ========== Task 2: Nested Type Tests ==========

describe('AdventureRoomSchema', () => {
  it('accepts a fully populated room', () => {
    const result = AdventureRoomSchema.safeParse({
      id: 'room-1',
      number: 1,
      name: 'Entry Hall',
      description: 'A grand entrance',
      gmNotes: 'Secret passage behind the tapestry',
      monsterIds: ['goblin', 'skeleton'],
      treasure: '50 gp, a silver ring',
      traps: [{
        id: 'trap-1',
        name: 'Pit Trap',
        description: 'A concealed pit',
        trigger: 'pressure plate',
        effect: 'Fall 10 feet',
        detectionDC: 14,
        disarmDC: 12,
        damage: '1d6',
      }],
      connections: ['room-2', 'room-3'],
      mapId: 'map-1',
    })
    expect(result.success).toBe(true)
    expect(result.data!.name).toBe('Entry Hall')
    expect(result.data!.traps).toHaveLength(1)
    expect(result.data!.connections).toHaveLength(2)
  })

  it('fills defaults for optional fields', () => {
    const result = AdventureRoomSchema.safeParse({
      id: 'room-2',
      number: 2,
    })
    expect(result.success).toBe(true)
    expect(result.data!.name).toBe('')
    expect(result.data!.description).toBe('')
    expect(result.data!.gmNotes).toBe('')
    expect(result.data!.monsterIds).toEqual([])
    expect(result.data!.treasure).toBe('')
    expect(result.data!.traps).toEqual([])
    expect(result.data!.connections).toEqual([])
    expect(result.data!.mapId).toBeUndefined()
  })

  it('rejects room missing required id', () => {
    const result = AdventureRoomSchema.safeParse({ number: 1 })
    expect(result.success).toBe(false)
  })

  it('rejects room missing required number', () => {
    const result = AdventureRoomSchema.safeParse({ id: 'room-x' })
    expect(result.success).toBe(false)
  })
})

describe('TrapDefinitionSchema', () => {
  it('fills default DCs of 12', () => {
    const result = TrapDefinitionSchema.safeParse({ id: 'trap-1' })
    expect(result.success).toBe(true)
    expect(result.data!.detectionDC).toBe(12)
    expect(result.data!.disarmDC).toBe(12)
  })

  it('accepts custom DCs', () => {
    const result = TrapDefinitionSchema.safeParse({
      id: 'trap-2',
      name: 'Poison Dart',
      detectionDC: 16,
      disarmDC: 18,
      damage: '1d4 + poison',
    })
    expect(result.success).toBe(true)
    expect(result.data!.detectionDC).toBe(16)
    expect(result.data!.disarmDC).toBe(18)
    expect(result.data!.damage).toBe('1d4 + poison')
  })

  it('fills default empty strings for text fields', () => {
    const result = TrapDefinitionSchema.safeParse({ id: 'trap-3' })
    expect(result.success).toBe(true)
    expect(result.data!.name).toBe('')
    expect(result.data!.description).toBe('')
    expect(result.data!.trigger).toBe('')
    expect(result.data!.effect).toBe('')
  })
})

describe('AdventureNPCSchema', () => {
  it('defaults ancestry to human', () => {
    const result = AdventureNPCSchema.safeParse({ id: 'npc-1' })
    expect(result.success).toBe(true)
    expect(result.data!.ancestry).toBe('human')
  })

  it('accepts NPC with stats object', () => {
    const result = AdventureNPCSchema.safeParse({
      id: 'npc-2',
      name: 'Bartok the Bold',
      ancestry: 'dwarf',
      role: 'blacksmith',
      stats: { STR: 16, DEX: 10, CON: 14, INT: 12, WIS: 8, CHA: 10 },
    })
    expect(result.success).toBe(true)
    expect(result.data!.name).toBe('Bartok the Bold')
    expect(result.data!.ancestry).toBe('dwarf')
    expect(result.data!.stats).toBeDefined()
  })

  it('fills default empty strings for text fields', () => {
    const result = AdventureNPCSchema.safeParse({ id: 'npc-3' })
    expect(result.success).toBe(true)
    expect(result.data!.name).toBe('')
    expect(result.data!.role).toBe('')
    expect(result.data!.description).toBe('')
    expect(result.data!.personality).toBe('')
  })

  it('accepts optional portraitPrompt', () => {
    const result = AdventureNPCSchema.safeParse({
      id: 'npc-4',
      portraitPrompt: 'A grizzled dwarven blacksmith',
    })
    expect(result.success).toBe(true)
    expect(result.data!.portraitPrompt).toBe('A grizzled dwarven blacksmith')
  })
})

describe('RandomEncounterTableSchema', () => {
  it('accepts table with single-roll entries', () => {
    const result = RandomEncounterTableSchema.safeParse({
      id: 'table-1',
      name: 'Forest Encounters',
      diceExpression: '1d6',
      entries: [
        { roll: 1, description: 'Wolves', monsterIds: ['wolf'], quantity: '2d4' },
        { roll: 2, description: 'Nothing happens' },
      ],
    })
    expect(result.success).toBe(true)
    expect(result.data!.entries).toHaveLength(2)
    expect(result.data!.entries[0].roll).toBe(1)
  })

  it('accepts table with range-roll entries', () => {
    const result = RandomEncounterTableSchema.safeParse({
      id: 'table-2',
      entries: [
        { roll: [1, 3], description: 'Goblins', monsterIds: ['goblin'] },
        { roll: [4, 6], description: 'Bandits' },
      ],
    })
    expect(result.success).toBe(true)
    expect(result.data!.entries[0].roll).toEqual([1, 3])
  })

  it('fills defaults for name and diceExpression', () => {
    const result = RandomEncounterTableSchema.safeParse({ id: 'table-3' })
    expect(result.success).toBe(true)
    expect(result.data!.name).toBe('Random Encounters')
    expect(result.data!.diceExpression).toBe('1d6')
    expect(result.data!.entries).toEqual([])
  })

  it('rejects entry with missing description', () => {
    const result = RandomEncounterTableSchema.safeParse({
      id: 'table-4',
      entries: [{ roll: 1 }], // missing description
    })
    expect(result.success).toBe(false)
  })

  it('rejects entry with missing roll', () => {
    const result = RandomEncounterTableSchema.safeParse({
      id: 'table-5',
      entries: [{ description: 'Something' }], // missing roll
    })
    expect(result.success).toBe(false)
  })
})

describe('LoreDocumentSchema', () => {
  it('accepts lore with chapters and sections', () => {
    const result = LoreDocumentSchema.safeParse({
      chapters: [
        {
          id: 'ch-1',
          title: 'The Kingdom of Aldor',
          sortOrder: 0,
          sections: [
            {
              id: 'sec-1',
              title: 'History',
              content: 'Long ago...',
              sortOrder: 0,
            },
            {
              id: 'sec-2',
              title: 'Geography',
              content: 'Mountains to the north...',
              sortOrder: 1,
            },
          ],
        },
      ],
    })
    expect(result.success).toBe(true)
    expect(result.data!.chapters).toHaveLength(1)
    expect(result.data!.chapters[0].sections).toHaveLength(2)
    expect(result.data!.chapters[0].title).toBe('The Kingdom of Aldor')
  })

  it('defaults to empty chapters', () => {
    const result = LoreDocumentSchema.safeParse({})
    expect(result.success).toBe(true)
    expect(result.data!.chapters).toEqual([])
  })

  it('fills defaults for chapter fields', () => {
    const result = LoreDocumentSchema.safeParse({
      chapters: [{ id: 'ch-1' }],
    })
    expect(result.success).toBe(true)
    expect(result.data!.chapters[0].title).toBe('')
    expect(result.data!.chapters[0].sortOrder).toBe(0)
    expect(result.data!.chapters[0].sections).toEqual([])
  })

  it('fills defaults for section fields', () => {
    const result = LoreDocumentSchema.safeParse({
      chapters: [{
        id: 'ch-1',
        sections: [{ id: 'sec-1' }],
      }],
    })
    expect(result.success).toBe(true)
    const section = result.data!.chapters[0].sections[0]
    expect(section.title).toBe('')
    expect(section.content).toBe('')
    expect(section.sortOrder).toBe(0)
  })
})

describe('CampaignMapSchema', () => {
  it('accepts a full map with layers, labels, and markers', () => {
    const result = CampaignMapSchema.safeParse({
      id: 'map-1',
      name: 'Dungeon Level 1',
      seed: 12345,
      createdAt: 1000,
      updatedAt: 2000,
      width: 40,
      height: 30,
      cellSize: 40,
      wallThickness: 3,
      wallStyle: 'pointed',
      layers: [{
        id: 'layer-1',
        name: 'Base',
        visible: true,
        locked: false,
        cells: [{
          x: 0,
          y: 0,
          terrain: 'stone_floor',
          walls: {
            north: 'wall',
            east: 'door',
            south: 'none',
            west: 'wall',
          },
          features: [{ type: 'stairs', direction: 'down' }],
        }],
      }],
      labels: [{
        id: 'label-1',
        x: 5,
        y: 5,
        text: 'Entry',
        fontSize: 14,
        color: '#ffffff',
      }],
      markers: [{
        id: 'marker-1',
        x: 10,
        y: 10,
        type: 'room_number',
        label: '1',
      }],
    })
    expect(result.success).toBe(true)
    expect(result.data!.layers).toHaveLength(1)
    expect(result.data!.layers[0].cells).toHaveLength(1)
    expect(result.data!.labels).toHaveLength(1)
    expect(result.data!.markers).toHaveLength(1)
  })

  it('fills defaults for layers, labels, markers', () => {
    const result = CampaignMapSchema.safeParse({
      id: 'map-2',
      name: 'Empty Map',
      width: 20,
      height: 20,
      cellSize: 32,
    })
    expect(result.success).toBe(true)
    expect(result.data!.layers).toEqual([])
    expect(result.data!.labels).toEqual([])
    expect(result.data!.markers).toEqual([])
  })

  it('rejects map missing required width', () => {
    const result = CampaignMapSchema.safeParse({
      id: 'map-3',
      name: 'Bad Map',
      height: 20,
      cellSize: 32,
    })
    expect(result.success).toBe(false)
  })

  it('accepts map cells with split terrain', () => {
    const result = CampaignMapSchema.safeParse({
      id: 'map-4',
      name: 'Split Map',
      width: 10,
      height: 10,
      cellSize: 40,
      layers: [{
        id: 'layer-1',
        name: 'Base',
        visible: true,
        locked: false,
        cells: [{
          x: 0,
          y: 0,
          terrain: 'stone_floor',
          walls: { north: 'wall', east: 'wall', south: 'wall', west: 'wall' },
          features: [],
          split: 'TLBR',
          splitTerrain: 'water',
        }],
      }],
    })
    expect(result.success).toBe(true)
    expect(result.data!.layers[0].cells[0].split).toBe('TLBR')
    expect(result.data!.layers[0].cells[0].splitTerrain).toBe('water')
  })

  it('accepts all marker types', () => {
    const markerTypes = ['room_number', 'monster', 'npc', 'treasure', 'trap', 'note'] as const
    for (const type of markerTypes) {
      const result = CampaignMapSchema.safeParse({
        id: `map-marker-${type}`,
        name: 'Marker Test',
        width: 10,
        height: 10,
        cellSize: 40,
        markers: [{ id: `m-${type}`, x: 0, y: 0, type, label: type }],
      })
      expect(result.success).toBe(true)
    }
  })

  it('accepts all wall types', () => {
    const wallTypes = ['none', 'wall', 'door', 'secret_door', 'window', 'arch'] as const
    for (const wt of wallTypes) {
      const result = CampaignMapSchema.safeParse({
        id: `map-wall-${wt}`,
        name: 'Wall Test',
        width: 10,
        height: 10,
        cellSize: 40,
        layers: [{
          id: 'layer-1',
          name: 'Base',
          visible: true,
          locked: false,
          cells: [{
            x: 0, y: 0, terrain: 'stone_floor',
            walls: { north: wt, east: wt, south: wt, west: wt },
            features: [],
          }],
        }],
      })
      expect(result.success).toBe(true)
    }
  })

  it('accepts all cell feature types', () => {
    const featureTypes = ['stairs', 'entry', 'exit', 'trap', 'furniture'] as const
    for (const ft of featureTypes) {
      const result = CampaignMapSchema.safeParse({
        id: `map-feat-${ft}`,
        name: 'Feature Test',
        width: 10,
        height: 10,
        cellSize: 40,
        layers: [{
          id: 'layer-1',
          name: 'Base',
          visible: true,
          locked: false,
          cells: [{
            x: 0, y: 0, terrain: 'stone_floor',
            walls: { north: 'none', east: 'none', south: 'none', west: 'none' },
            features: [{ type: ft }],
          }],
        }],
      })
      expect(result.success).toBe(true)
    }
  })
})

describe('DataPackContentSchema', () => {
  it('accepts content with monsters', () => {
    const result = DataPackContentSchema.safeParse({
      monsters: [{
        id: 'goblin',
        name: 'Goblin',
        level: 1,
        ac: 11,
        hp: 5,
        attacks: [{ name: 'Shortsword', bonus: 1, damage: '1d6', range: 'close' }],
        movement: { normal: 'near' },
        stats: { STR: 8, DEX: 14, CON: 8, INT: 10, WIS: 8, CHA: 8 },
        alignment: 'chaotic',
        abilities: [],
        checksMorale: true,
        tags: ['goblinoid'],
      }],
    })
    expect(result.success).toBe(true)
    expect(result.data!.monsters).toHaveLength(1)
  })

  it('accepts content with spells', () => {
    const result = DataPackContentSchema.safeParse({
      spells: [{
        id: 'magic-missile',
        name: 'Magic Missile',
        tier: 1,
        class: 'wizard',
        range: 'far',
        duration: 'instant',
        isFocus: false,
        description: 'Launch a bolt of magic energy',
        effects: [{ type: 'damage' }],
      }],
    })
    expect(result.success).toBe(true)
    expect(result.data!.spells).toHaveLength(1)
  })

  it('accepts empty content', () => {
    const result = DataPackContentSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('rejects invalid monster (missing required fields)', () => {
    const result = DataPackContentSchema.safeParse({
      monsters: [{ id: 'bad', name: 'Bad' }], // missing level, ac, hp, etc.
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid spell (tier out of range)', () => {
    const result = DataPackContentSchema.safeParse({
      spells: [{
        id: 'bad-spell',
        name: 'Bad Spell',
        tier: 99,
        class: 'wizard',
        range: 'far',
        duration: 'instant',
        isFocus: false,
        description: 'A bad spell',
        effects: [],
      }],
    })
    expect(result.success).toBe(false)
  })
})

// ========== Task 2: Adventure Document Validation ==========

describe('validateAdventureDocument', () => {
  const validCampaign = {
    id: 'adv-1',
    name: 'Test Adventure',
    author: 'Test Author',
    version: '1.0',
    description: 'A test adventure',
    createdAt: 1000,
    updatedAt: 2000,
    content: {},
    adventure: {
      hook: 'A hook',
      overview: 'An overview',
      targetLevel: [1, 3],
      rooms: [],
      randomEncounters: [],
      npcs: [],
    },
    lore: { chapters: [] },
    maps: [],
  }

  it('accepts a valid adventure document', () => {
    const result = validateAdventureDocument({
      format: 'shadowdark-adventure-v1',
      exportedAt: Date.now(),
      ...validCampaign,
    })
    expect(result.success).toBe(true)
    expect(result.data?.format).toBe('shadowdark-adventure-v1')
    expect(result.data?.id).toBe('adv-1')
  })

  it('rejects wrong format string', () => {
    const result = validateAdventureDocument({
      format: 'wrong-format',
      exportedAt: Date.now(),
      ...validCampaign,
    })
    expect(result.success).toBe(false)
    expect(result.errors).toBeDefined()
  })

  it('rejects missing format field', () => {
    const result = validateAdventureDocument({
      exportedAt: Date.now(),
      ...validCampaign,
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing exportedAt field', () => {
    const result = validateAdventureDocument({
      format: 'shadowdark-adventure-v1',
      ...validCampaign,
    })
    expect(result.success).toBe(false)
  })

  it('rejects document missing campaign id', () => {
    const { id: _id, ...noCampaignId } = validCampaign
    const result = validateAdventureDocument({
      format: 'shadowdark-adventure-v1',
      exportedAt: Date.now(),
      ...noCampaignId,
    })
    expect(result.success).toBe(false)
  })

  it('rejects document missing campaign name', () => {
    const { name: _name, ...noCampaignName } = validCampaign
    const result = validateAdventureDocument({
      format: 'shadowdark-adventure-v1',
      exportedAt: Date.now(),
      ...noCampaignName,
    })
    expect(result.success).toBe(false)
  })
})
