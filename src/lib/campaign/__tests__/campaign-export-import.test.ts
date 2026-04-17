import { describe, it, expect, vi } from 'vitest'
import type { Campaign } from '@/schemas/campaign.ts'
import { exportAdventureDocument, exportAsDataPack } from '../export.ts'
import { parseCampaignFile } from '../import.ts'

// ── Test Fixture ──

function makeFullCampaign(): Campaign {
  return {
    id: 'campaign-full-001',
    name: 'The Cursed Mines of Khaz-Doral',
    author: 'Test Author',
    version: '1.2',
    description: 'A dangerous delve into the lost dwarven mines',
    createdAt: 1700000000000,
    updatedAt: 1700100000000,
    content: {
      monsters: [
        {
          id: 'skeleton-warrior',
          name: 'Skeleton Warrior',
          level: 2,
          ac: 13,
          hp: 12,
          attacks: [
            {
              name: 'Rusty Longsword',
              bonus: 2,
              damage: '1d8+1',
              range: 'close' as const,
            },
          ],
          movement: { normal: 'near' as const },
          stats: { STR: 14, DEX: 10, CON: 12, INT: 3, WIS: 6, CHA: 3 },
          alignment: 'chaotic' as const,
          abilities: [
            { name: 'Undead Resilience', description: 'Cannot be poisoned' },
          ],
          checksMorale: false,
          tags: ['undead'],
        },
      ],
      spells: [
        {
          id: 'burning-hands',
          name: 'Burning Hands',
          tier: 1 as const,
          class: 'wizard' as const,
          range: 'close' as const,
          duration: 'instant' as const,
          isFocus: false,
          description: 'A fan of flame erupts from your hands',
          effects: [{ type: 'damage', dice: '1d6', damageType: 'fire' }],
        },
      ],
      weapons: [
        {
          id: 'war-pick',
          name: 'War Pick',
          type: 'melee' as const,
          damage: 'd6' as const,
          range: 'close' as const,
          properties: [],
          cost: 5,
          slots: 1,
        },
      ],
    },
    tables: [
      {
        id: 'enc-mines',
        name: 'Mine Encounters',
        kind: 'encounter' as const,
        diceExpression: '1d6',
        entries: [
          { roll: [1, 2] as [number, number], description: 'Skeleton patrol', monsterIds: ['skeleton-warrior'], quantity: '1d4' },
          { roll: 3, description: 'Dripping water — false alarm' },
          { roll: [4, 5] as [number, number], description: 'Cave-in! DC 12 DEX save.' },
          { roll: 6, description: 'A lost miner\'s ghost (non-hostile)' },
        ],
        attachments: [],
      },
    ],
    adventure: {
      hook: 'The miners have gone missing and strange sounds echo from the depths.',
      overview: 'A two-level dungeon crawl through haunted dwarven mines.',
      targetLevel: [1, 3] as [number, number],
      rooms: [
        {
          id: 'room-entrance',
          number: 1,
          name: 'Mine Entrance',
          description: 'A collapsed wooden frame marks the mine entrance.',
          gmNotes: 'The entrance is unstable. DC 12 DEX or take 1d4 damage.',
          monsterIds: [],
          treasure: '',
          traps: [],
          connections: ['room-shaft'],
          mapId: 'map-mines',
        },
        {
          id: 'room-shaft',
          number: 2,
          name: 'Central Shaft',
          description: 'A deep vertical shaft with a rickety ladder.',
          gmNotes: 'Skeletons patrol here every 3 rounds.',
          monsterIds: ['skeleton-warrior'],
          treasure: '30 gp in a rotting sack',
          traps: [
            {
              id: 'trap-collapse',
              name: 'Ceiling Collapse',
              description: 'Loose rocks above',
              trigger: 'loud noise',
              effect: '2d6 damage, DC 14 DEX for half',
              detectionDC: 14,
              disarmDC: 16,
              damage: '2d6',
            },
          ],
          connections: ['room-entrance'],
          mapId: 'map-mines',
        },
      ],
      npcs: [
        {
          id: 'npc-foreman',
          name: 'Greta Ironhand',
          ancestry: 'dwarf',
          role: 'Mine Foreman',
          description: 'A stout dwarf with soot-covered hands.',
          personality: 'Gruff but fair. Distrusts outsiders.',
        },
        {
          id: 'npc-ghost',
          name: 'Wailing Thom',
          ancestry: 'human',
          role: 'Ghost',
          description: 'The translucent shade of a miner.',
          personality: 'Terrified and confused. Wants to be freed.',
          portraitPrompt: 'A ghostly miner with hollow eyes',
        },
      ],
      stores: [{
        id: 'store-1',
        name: 'Village Smithy',
        description: 'A forge near the town square.',
        keeperName: 'Durin',
        keeperAncestry: 'dwarf',
        storeType: 'weapons' as const,
        items: [
          {
            id: 'si-1',
            itemDefinitionId: 'shortsword',
            name: 'Shortsword',
            description: '',
            price: 7,
            quantity: -1,
            category: 'weapon' as const,
            slots: 1,
            isCustom: false,
          },
          {
            id: 'si-2',
            itemDefinitionId: '',
            name: 'Custom Blade',
            description: 'A unique blade.',
            price: 50,
            quantity: 1,
            category: 'weapon' as const,
            slots: 1,
            isCustom: true,
          },
        ],
        roomId: 'room-1',
        npcId: 'npc-1',
      }],
    },
    lore: {
      chapters: [
        {
          id: 'ch-history',
          title: 'The History of Khaz-Doral',
          sortOrder: 0,
          sections: [
            {
              id: 'sec-founding',
              title: 'Founding',
              content: 'Khaz-Doral was founded 300 years ago by the Ironhand clan.',
              sortOrder: 0,
            },
            {
              id: 'sec-fall',
              title: 'The Fall',
              content: 'A necromantic plague struck the mines, turning workers into undead.',
              sortOrder: 1,
            },
          ],
        },
      ],
    },
    maps: [
      {
        id: 'map-mines',
        name: 'Khaz-Doral Level 1',
        seed: 42,
        createdAt: 1700000000000,
        updatedAt: 1700050000000,
        width: 30,
        height: 20,
        cellSize: 40,
        wallThickness: 3,
        wallStyle: 'pointed',
        layers: [
          {
            id: 'layer-base',
            name: 'Base',
            visible: true,
            locked: false,
            cells: [
              {
                x: 0,
                y: 0,
                terrain: 'stone_floor',
                walls: {
                  north: 'wall',
                  east: 'door',
                  south: 'none',
                  west: 'wall',
                },
                features: [{ type: 'entry' }],
              },
            ],
          },
        ],
        labels: [
          {
            id: 'label-entrance',
            x: 1,
            y: 1,
            text: 'Entrance',
            fontSize: 12,
            color: '#ffffff',
          },
        ],
        markers: [
          {
            id: 'marker-room1',
            x: 0,
            y: 0,
            type: 'room_number',
            label: '1',
          },
        ],
      },
    ],
  }
}

// ========== Task 3: Export Tests ==========

describe('exportAdventureDocument', () => {
  it('includes format and exportedAt', () => {
    const campaign = makeFullCampaign()
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now)

    const doc = exportAdventureDocument(campaign)

    expect(doc.format).toBe('shadowdark-adventure-v1')
    expect(doc.exportedAt).toBe(now)

    vi.restoreAllMocks()
  })

  it('includes all campaign fields', () => {
    const campaign = makeFullCampaign()
    const doc = exportAdventureDocument(campaign)

    expect(doc.id).toBe(campaign.id)
    expect(doc.name).toBe(campaign.name)
    expect(doc.author).toBe(campaign.author)
    expect(doc.version).toBe(campaign.version)
    expect(doc.description).toBe(campaign.description)
    expect(doc.createdAt).toBe(campaign.createdAt)
    expect(doc.updatedAt).toBe(campaign.updatedAt)
    expect(doc.content).toEqual(campaign.content)
    expect(doc.adventure).toEqual(campaign.adventure)
    expect(doc.lore).toEqual(campaign.lore)
    expect(doc.maps).toEqual(campaign.maps)
  })

  it('does NOT include unexpected properties from the campaign', () => {
    const campaign = makeFullCampaign()
    // Add an internal property that should NOT be in the export
    const tainted = campaign as Campaign & { _internal: string }
    tainted._internal = 'should-not-appear'

    const doc = exportAdventureDocument(tainted)
    const keys = Object.keys(doc)

    expect(keys).not.toContain('_internal')
    expect((doc as unknown as Record<string, unknown>)._internal).toBeUndefined()
  })

  it('returns an object matching AdventureDocument shape', () => {
    const campaign = makeFullCampaign()
    const doc = exportAdventureDocument(campaign)

    const expectedKeys = [
      'format', 'exportedAt', 'id', 'name', 'author', 'version',
      'description', 'createdAt', 'updatedAt', 'content', 'tables',
      'adventure', 'lore', 'maps',
    ]
    expect(Object.keys(doc).sort()).toEqual(expectedKeys.sort())
  })
})

describe('exportAsDataPack', () => {
  it('exports correct DataPack structure', () => {
    const campaign = makeFullCampaign()
    const pack = exportAsDataPack(campaign)

    expect(pack.id).toBe(campaign.id)
    expect(pack.name).toBe(campaign.name)
    expect(pack.author).toBe(campaign.author)
    expect(pack.version).toBe(campaign.version)
    expect(pack.description).toBe(campaign.description)
    expect(pack.data).toEqual(campaign.content)
  })

  it('does not include adventure, lore, or maps', () => {
    const campaign = makeFullCampaign()
    const pack = exportAsDataPack(campaign)
    const keys = Object.keys(pack)

    expect(keys).not.toContain('adventure')
    expect(keys).not.toContain('lore')
    expect(keys).not.toContain('maps')
    expect(keys).not.toContain('createdAt')
    expect(keys).not.toContain('updatedAt')
  })

  it('maps campaign.content to pack.data', () => {
    const campaign = makeFullCampaign()
    const pack = exportAsDataPack(campaign)

    expect(pack.data).toBe(campaign.content)
    expect(pack.data.monsters).toHaveLength(1)
    expect(pack.data.spells).toHaveLength(1)
    expect(pack.data.weapons).toHaveLength(1)
  })
})

// ========== Task 4: Import Tests ==========

describe('parseCampaignFile', () => {
  describe('format detection', () => {
    it('detects adventure document format and parses it', () => {
      const campaign = makeFullCampaign()
      const doc = exportAdventureDocument(campaign)

      const result = parseCampaignFile(doc)

      expect(result.success).toBe(true)
      expect(result.campaign).toBeDefined()
      expect(result.campaign!.id).toBe(campaign.id)
      expect(result.campaign!.name).toBe(campaign.name)
    })

    it('detects raw campaign format and parses it', () => {
      const campaign = makeFullCampaign()

      const result = parseCampaignFile(campaign)

      expect(result.success).toBe(true)
      expect(result.campaign).toBeDefined()
      expect(result.campaign!.id).toBe(campaign.id)
      expect(result.campaign!.name).toBe(campaign.name)
    })
  })

  describe('metadata stripping', () => {
    it('strips format and exportedAt from adventure document result', () => {
      const campaign = makeFullCampaign()
      const doc = exportAdventureDocument(campaign)

      const result = parseCampaignFile(doc)

      expect(result.success).toBe(true)
      const resultObj = result.campaign as unknown as Record<string, unknown>
      expect(resultObj.format).toBeUndefined()
      expect(resultObj.exportedAt).toBeUndefined()
    })
  })

  describe('round-trip: empty campaign', () => {
    it('export then import produces identical campaign', () => {
      const emptyCampaign: Campaign = {
        id: 'empty-001',
        name: 'Empty Campaign',
        author: '',
        version: '1.0',
        description: '',
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
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

      const doc = exportAdventureDocument(emptyCampaign)
      const result = parseCampaignFile(doc)

      expect(result.success).toBe(true)
      expect(result.campaign!.id).toBe(emptyCampaign.id)
      expect(result.campaign!.name).toBe(emptyCampaign.name)
      expect(result.campaign!.author).toBe(emptyCampaign.author)
      expect(result.campaign!.version).toBe(emptyCampaign.version)
      expect(result.campaign!.description).toBe(emptyCampaign.description)
      expect(result.campaign!.createdAt).toBe(emptyCampaign.createdAt)
      expect(result.campaign!.updatedAt).toBe(emptyCampaign.updatedAt)
      expect(result.campaign!.content).toEqual(emptyCampaign.content)
      expect(result.campaign!.adventure).toEqual(emptyCampaign.adventure)
      expect(result.campaign!.lore).toEqual(emptyCampaign.lore)
      expect(result.campaign!.maps).toEqual(emptyCampaign.maps)
    })
  })

  describe('round-trip: rich campaign', () => {
    it('all fields preserved through export and import', () => {
      const campaign = makeFullCampaign()
      const doc = exportAdventureDocument(campaign)
      const result = parseCampaignFile(doc)

      expect(result.success).toBe(true)
      const imported = result.campaign!

      // Top-level fields
      expect(imported.id).toBe(campaign.id)
      expect(imported.name).toBe(campaign.name)
      expect(imported.author).toBe(campaign.author)
      expect(imported.version).toBe(campaign.version)
      expect(imported.description).toBe(campaign.description)
      expect(imported.createdAt).toBe(campaign.createdAt)
      expect(imported.updatedAt).toBe(campaign.updatedAt)

      // Content
      expect(imported.content.monsters).toHaveLength(1)
      expect(imported.content.monsters![0].name).toBe('Skeleton Warrior')
      expect(imported.content.spells).toHaveLength(1)
      expect(imported.content.spells![0].name).toBe('Burning Hands')
      expect(imported.content.weapons).toHaveLength(1)
      expect(imported.content.weapons![0].name).toBe('War Pick')

      // Adventure
      expect(imported.adventure.hook).toBe(campaign.adventure.hook)
      expect(imported.adventure.overview).toBe(campaign.adventure.overview)
      expect(imported.adventure.targetLevel).toEqual([1, 3])
      expect(imported.adventure.rooms).toHaveLength(2)
      expect(imported.adventure.rooms[0].name).toBe('Mine Entrance')
      expect(imported.adventure.rooms[1].traps).toHaveLength(1)
      expect(imported.adventure.rooms[1].traps[0].name).toBe('Ceiling Collapse')
      expect(imported.tables).toHaveLength(1)
      expect(imported.tables[0].entries).toHaveLength(4)
      expect(imported.adventure.npcs).toHaveLength(2)
      expect(imported.adventure.npcs[0].name).toBe('Greta Ironhand')
      expect(imported.adventure.npcs[1].portraitPrompt).toBe('A ghostly miner with hollow eyes')

      // Stores
      expect(imported.adventure.stores).toHaveLength(1)

      // Lore
      expect(imported.lore.chapters).toHaveLength(1)
      expect(imported.lore.chapters[0].title).toBe('The History of Khaz-Doral')
      expect(imported.lore.chapters[0].sections).toHaveLength(2)

      // Maps
      expect(imported.maps).toHaveLength(1)
      expect(imported.maps[0].name).toBe('Khaz-Doral Level 1')
      expect(imported.maps[0].layers).toHaveLength(1)
      expect(imported.maps[0].labels).toHaveLength(1)
      expect(imported.maps[0].markers).toHaveLength(1)
    })
  })

  describe('lenient import', () => {
    it('JSON with only id and name fills defaults', () => {
      const result = parseCampaignFile({ id: 'lenient-001', name: 'Lenient Test' })

      expect(result.success).toBe(true)
      expect(result.campaign!.id).toBe('lenient-001')
      expect(result.campaign!.name).toBe('Lenient Test')
      expect(result.campaign!.author).toBe('')
      expect(result.campaign!.version).toBe('1.0')
      expect(result.campaign!.description).toBe('')
      expect(typeof result.campaign!.createdAt).toBe('number')
      expect(typeof result.campaign!.updatedAt).toBe('number')
      expect(result.campaign!.content).toEqual({})
      expect(result.campaign!.tables).toEqual([])
      expect(result.campaign!.adventure).toEqual({
        hook: '',
        overview: '',
        targetLevel: [1, 3],
        rooms: [],
        npcs: [],
        stores: [],
      })
      expect(result.campaign!.lore).toEqual({ chapters: [] })
      expect(result.campaign!.maps).toEqual([])
    })
  })

  describe('round-trip: adventure stores', () => {
    it('round-trips adventure stores through export/import', () => {
      const original = makeFullCampaign()
      const doc = exportAdventureDocument(original)
      const result = parseCampaignFile(doc)
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.campaign.adventure.stores).toHaveLength(1)
      const store = result.campaign.adventure.stores[0]
      expect(store.name).toBe('Village Smithy')
      expect(store.storeType).toBe('weapons')
      expect(store.items).toHaveLength(2)
      expect(store.items[0].isCustom).toBe(false)
      expect(store.items[1].isCustom).toBe(true)
      expect(store.roomId).toBe('room-1')
      expect(store.npcId).toBe('npc-1')
    })

    it('imports old campaign JSON without stores field (backward compat)', () => {
      const result = parseCampaignFile({
        id: 'old-campaign',
        name: 'Old Campaign',
        adventure: {
          hook: 'Old hook',
          overview: '',
          targetLevel: [1, 3],
          rooms: [],
          npcs: [],
        },
      })
      expect(result.success).toBe(true)
      if (!result.success) return
      expect(result.campaign.adventure.stores).toEqual([])
    })
  })

  describe('error handling', () => {
    it('rejects null', () => {
      const result = parseCampaignFile(null)
      expect(result.success).toBe(false)
      expect(result.errors).toContain('Input must be a JSON object')
    })

    it('rejects undefined', () => {
      const result = parseCampaignFile(undefined)
      expect(result.success).toBe(false)
      expect(result.errors).toContain('Input must be a JSON object')
    })

    it('rejects a string', () => {
      const result = parseCampaignFile('not an object')
      expect(result.success).toBe(false)
      expect(result.errors).toContain('Input must be a JSON object')
    })

    it('rejects a number', () => {
      const result = parseCampaignFile(42)
      expect(result.success).toBe(false)
      expect(result.errors).toContain('Input must be a JSON object')
    })

    it('rejects an array', () => {
      const result = parseCampaignFile([1, 2, 3])
      expect(result.success).toBe(false)
      expect(result.errors).toContain('Input must be a JSON object')
    })

    it('rejects missing id', () => {
      const result = parseCampaignFile({ name: 'No ID' })
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
    })

    it('rejects missing name', () => {
      const result = parseCampaignFile({ id: 'no-name' })
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors!.length).toBeGreaterThan(0)
    })

    it('rejects wrong format value', () => {
      const result = parseCampaignFile({
        format: 'some-other-format-v2',
        id: 'x',
        name: 'Test',
      })
      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors![0]).toContain('Unrecognized format')
      expect(result.errors![0]).toContain('some-other-format-v2')
    })
  })
})
