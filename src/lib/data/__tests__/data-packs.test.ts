import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { validateDataPack } from '../validator.ts'
import { dataRegistry } from '../registry.ts'
import type { DataPack } from '../types.ts'
import { MONSTERS, SPELLS, getMonster, getSpell, getItemPackId, getPackColor } from '@/data/index.ts'
import { sortPackFirst } from '@/lib/data/sort.ts'

// ========== Test Fixtures ==========

function makeMonster(overrides: Partial<{ id: string; name: string; level: number }> = {}) {
  return {
    id: overrides.id ?? 'test-dragon',
    name: overrides.name ?? 'Test Dragon',
    level: overrides.level ?? 10,
    ac: 18,
    hp: 50,
    attacks: [{ name: 'Bite', bonus: 7, damage: '2d10+4', range: 'close' as const }],
    movement: { normal: 'near' as const },
    stats: { STR: 18, DEX: 12, CON: 16, INT: 8, WIS: 10, CHA: 14 },
    alignment: 'chaotic' as const,
    abilities: [{ name: 'Fire Breath', description: 'Breathes fire in a near cone' }],
    checksMorale: false,
    tags: ['dragon', 'test'],
  }
}

function makeSpell(overrides: Partial<{ id: string; name: string; tier: number }> = {}) {
  return {
    id: overrides.id ?? 'test-fireball',
    name: overrides.name ?? 'Test Fireball',
    tier: overrides.tier ?? 3,
    class: 'wizard' as const,
    range: 'far' as const,
    duration: 'instant' as const,
    isFocus: false,
    description: 'A ball of fire',
    effects: [{ type: 'damage', dice: '4d6' }],
  }
}

function makeValidPack(overrides: Partial<DataPack> = {}): DataPack {
  return {
    id: overrides.id ?? 'test-pack',
    name: overrides.name ?? 'Test Pack',
    author: overrides.author ?? 'Test Author',
    version: overrides.version ?? '1.0',
    description: overrides.description ?? 'A test pack',
    data: overrides.data ?? {
      monsters: [makeMonster()],
    },
  }
}

// ========== Cleanup ==========

// Track packs added during tests for cleanup
const addedPackIds: string[] = []

function addTestPack(pack: DataPack) {
  const result = dataRegistry.addPack(pack)
  if (result.success) addedPackIds.push(pack.id)
  return result
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  // Remove all packs added during the test
  for (const id of addedPackIds) {
    dataRegistry.removePack(id)
  }
  addedPackIds.length = 0
  localStorage.clear()
})

// ========== Validator Tests ==========

describe('validateDataPack', () => {
  it('accepts a valid pack', () => {
    const result = validateDataPack(makeValidPack())
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.pack).toBeDefined()
  })

  it('rejects non-object input', () => {
    expect(validateDataPack(null).valid).toBe(false)
    expect(validateDataPack('string').valid).toBe(false)
    expect(validateDataPack(42).valid).toBe(false)
  })

  it('rejects missing metadata fields', () => {
    const result = validateDataPack({ data: { monsters: [] } })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('"id"'))).toBe(true)
    expect(result.errors.some(e => e.includes('"name"'))).toBe(true)
    expect(result.errors.some(e => e.includes('"author"'))).toBe(true)
    expect(result.errors.some(e => e.includes('"version"'))).toBe(true)
  })

  it('rejects missing data object', () => {
    const result = validateDataPack({ id: 'x', name: 'x', author: 'x', version: '1' })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('"data"'))).toBe(true)
  })

  it('rejects unknown data keys', () => {
    const result = validateDataPack({
      id: 'x', name: 'x', author: 'x', version: '1',
      data: { potions: [] },
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('potions'))).toBe(true)
  })

  it('rejects non-array data values', () => {
    const result = validateDataPack({
      id: 'x', name: 'x', author: 'x', version: '1',
      data: { monsters: 'not-an-array' },
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('must be an array'))).toBe(true)
  })

  it('validates monster required fields via Zod', () => {
    const result = validateDataPack({
      id: 'x', name: 'x', author: 'x', version: '1',
      data: {
        monsters: [{ id: 'bad', name: 'Bad Monster' }], // missing level, ac, hp, etc.
      },
    })
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('validates spell required fields via Zod', () => {
    const result = validateDataPack({
      id: 'x', name: 'x', author: 'x', version: '1',
      data: {
        spells: [{ id: 'bad', name: 'Bad Spell' }], // missing tier, class, range, etc.
      },
    })
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('validates spell tier range (1-5)', () => {
    const result = validateDataPack({
      id: 'x', name: 'x', author: 'x', version: '1',
      data: {
        spells: [{
          ...makeSpell(),
          tier: 99, // invalid tier
        }],
      },
    })
    expect(result.valid).toBe(false)
  })

  it('accepts a pack with valid monsters and spells', () => {
    const result = validateDataPack({
      id: 'full', name: 'Full Pack', author: 'Me', version: '1.0',
      data: {
        monsters: [makeMonster()],
        spells: [makeSpell()],
      },
    })
    expect(result.valid).toBe(true)
  })

  it('accepts an empty data object (no content categories)', () => {
    const result = validateDataPack({
      id: 'empty', name: 'Empty', author: 'Me', version: '1.0',
      data: {},
    })
    expect(result.valid).toBe(true)
  })

  it('preserves extra fields via passthrough', () => {
    const pack = {
      id: 'extra', name: 'Extra', author: 'Me', version: '1.0',
      data: {
        monsters: [{
          ...makeMonster(),
          customField: 'should be preserved',
        }],
      },
    }
    const result = validateDataPack(pack)
    expect(result.valid).toBe(true)
  })
})

// ========== Registry Tests ==========

describe('DataRegistry', () => {
  describe('initial state', () => {
    it('has core monsters loaded', () => {
      expect(dataRegistry.monsters.length).toBeGreaterThan(100)
    })

    it('has core spells loaded', () => {
      expect(dataRegistry.spells.length).toBeGreaterThan(50)
    })

    it('can look up a core monster by ID', () => {
      const goblin = dataRegistry.getMonster('goblin')
      expect(goblin).toBeDefined()
      expect(goblin!.name).toBe('Goblin')
    })

    it('starts with no custom packs', () => {
      expect(dataRegistry.getPacks()).toHaveLength(0)
    })
  })

  describe('addPack', () => {
    it('adds custom monsters to the registry', () => {
      const before = dataRegistry.monsters.length
      const result = addTestPack(makeValidPack())
      expect(result.success).toBe(true)
      expect(dataRegistry.monsters.length).toBe(before + 1)
    })

    it('makes custom monsters accessible via getMonster()', () => {
      addTestPack(makeValidPack())
      const dragon = dataRegistry.getMonster('test-dragon')
      expect(dragon).toBeDefined()
      expect(dragon!.name).toBe('Test Dragon')
      expect(dragon!.level).toBe(10)
    })

    it('rejects invalid packs', () => {
      const result = dataRegistry.addPack({
        id: 'bad', name: 'Bad', author: 'X', version: '1',
        data: { monsters: [{ id: 'x', name: 'X' }] }, // missing required fields
      } as DataPack)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('replaces existing pack with same ID', () => {
      addTestPack(makeValidPack({
        data: { monsters: [makeMonster({ name: 'Version 1' })] },
      }))
      expect(dataRegistry.getMonster('test-dragon')!.name).toBe('Version 1')

      addTestPack(makeValidPack({
        data: { monsters: [makeMonster({ name: 'Version 2' })] },
      }))
      expect(dataRegistry.getMonster('test-dragon')!.name).toBe('Version 2')
      expect(dataRegistry.getPacks()).toHaveLength(1)
    })

    it('returns warnings when overriding core data', () => {
      const result = addTestPack(makeValidPack({
        data: {
          monsters: [makeMonster({ id: 'goblin', name: 'Homebrew Goblin' })],
        },
      }))
      expect(result.success).toBe(true)
      expect(result.warnings).toBeDefined()
      expect(result.warnings!.some(w => w.includes('overrides core'))).toBe(true)
    })

    it('returns warnings when overriding another pack', () => {
      addTestPack(makeValidPack({
        id: 'pack-a',
        data: { monsters: [makeMonster({ id: 'shared-monster', name: 'Pack A Monster' })] },
      }))
      const result = addTestPack(makeValidPack({
        id: 'pack-b',
        data: { monsters: [makeMonster({ id: 'shared-monster', name: 'Pack B Monster' })] },
      }))
      expect(result.warnings).toBeDefined()
      expect(result.warnings!.some(w => w.includes('pack "Test Pack"'))).toBe(true)
    })
  })

  describe('removePack', () => {
    it('removes custom data from the registry', () => {
      addTestPack(makeValidPack())
      expect(dataRegistry.getMonster('test-dragon')).toBeDefined()

      dataRegistry.removePack('test-pack')
      addedPackIds.splice(addedPackIds.indexOf('test-pack'), 1) // already removed
      expect(dataRegistry.getMonster('test-dragon')).toBeUndefined()
    })

    it('restores core data that was overridden', () => {
      const originalGoblin = dataRegistry.getMonster('goblin')!
      const originalHp = originalGoblin.hp

      addTestPack(makeValidPack({
        data: { monsters: [makeMonster({ id: 'goblin', name: 'Custom Goblin' })] },
      }))
      expect(dataRegistry.getMonster('goblin')!.name).toBe('Custom Goblin')

      dataRegistry.removePack('test-pack')
      addedPackIds.splice(addedPackIds.indexOf('test-pack'), 1)
      expect(dataRegistry.getMonster('goblin')!.name).toBe('Goblin')
      expect(dataRegistry.getMonster('goblin')!.hp).toBe(originalHp)
    })
  })

  describe('togglePack', () => {
    it('disables a pack (removes its data from merged results)', () => {
      addTestPack(makeValidPack())
      expect(dataRegistry.getMonster('test-dragon')).toBeDefined()

      dataRegistry.togglePack('test-pack')
      expect(dataRegistry.getMonster('test-dragon')).toBeUndefined()
      expect(dataRegistry.getPacks()[0].enabled).toBe(false)
    })

    it('re-enables a disabled pack', () => {
      addTestPack(makeValidPack())
      dataRegistry.togglePack('test-pack') // disable
      dataRegistry.togglePack('test-pack') // re-enable
      expect(dataRegistry.getMonster('test-dragon')).toBeDefined()
      expect(dataRegistry.getPacks()[0].enabled).toBe(true)
    })

    it('does nothing for non-existent pack ID', () => {
      const before = dataRegistry.monsters.length
      dataRegistry.togglePack('nonexistent')
      expect(dataRegistry.monsters.length).toBe(before)
    })
  })

  describe('exportPack', () => {
    it('returns JSON string for existing pack', () => {
      addTestPack(makeValidPack())
      const json = dataRegistry.exportPack('test-pack')
      expect(json).toBeTruthy()
      const parsed = JSON.parse(json!)
      expect(parsed.id).toBe('test-pack')
      expect(parsed.name).toBe('Test Pack')
    })

    it('strips enabled field from export', () => {
      addTestPack(makeValidPack())
      const json = dataRegistry.exportPack('test-pack')
      const parsed = JSON.parse(json!)
      expect(parsed.enabled).toBeUndefined()
    })

    it('returns null for non-existent pack', () => {
      expect(dataRegistry.exportPack('nonexistent')).toBeNull()
    })
  })

  describe('getPacks (metadata)', () => {
    it('returns correct counts', () => {
      addTestPack(makeValidPack({
        data: {
          monsters: [makeMonster(), makeMonster({ id: 'test-dragon-2', name: 'Dragon 2' })],
          spells: [makeSpell()],
        },
      }))
      const metas = dataRegistry.getPacks()
      expect(metas).toHaveLength(1)
      expect(metas[0].counts.monsters).toBe(2)
      expect(metas[0].counts.spells).toBe(1)
      expect(metas[0].counts.weapons).toBe(0)
      expect(metas[0].enabled).toBe(true)
    })
  })

  describe('change notifications', () => {
    it('fires listener on addPack', () => {
      const listener = vi.fn()
      const unsub = dataRegistry.subscribe(listener)
      addTestPack(makeValidPack())
      expect(listener).toHaveBeenCalledTimes(1)
      unsub()
    })

    it('fires listener on removePack', () => {
      addTestPack(makeValidPack())
      const listener = vi.fn()
      const unsub = dataRegistry.subscribe(listener)
      dataRegistry.removePack('test-pack')
      addedPackIds.splice(addedPackIds.indexOf('test-pack'), 1)
      expect(listener).toHaveBeenCalledTimes(1)
      unsub()
    })

    it('fires listener on togglePack', () => {
      addTestPack(makeValidPack())
      const listener = vi.fn()
      const unsub = dataRegistry.subscribe(listener)
      dataRegistry.togglePack('test-pack')
      expect(listener).toHaveBeenCalledTimes(1)
      unsub()
    })

    it('unsubscribe stops notifications', () => {
      const listener = vi.fn()
      const unsub = dataRegistry.subscribe(listener)
      unsub()
      addTestPack(makeValidPack())
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('array reference stability', () => {
    it('monsters array reference stays the same after addPack', () => {
      const ref = dataRegistry.monsters
      addTestPack(makeValidPack())
      expect(dataRegistry.monsters).toBe(ref)
    })

    it('monsters array content updates in-place', () => {
      const ref = dataRegistry.monsters
      const before = ref.length
      addTestPack(makeValidPack())
      expect(ref.length).toBe(before + 1)
      expect(ref.find(m => m.id === 'test-dragon')).toBeDefined()
    })
  })

  describe('localStorage persistence', () => {
    it('saves packs to localStorage on add', () => {
      addTestPack(makeValidPack())
      const stored = localStorage.getItem('shadowdark:data-packs')
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored!)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].id).toBe('test-pack')
    })

    it('clears pack from localStorage on remove', () => {
      addTestPack(makeValidPack())
      dataRegistry.removePack('test-pack')
      addedPackIds.splice(addedPackIds.indexOf('test-pack'), 1)
      const stored = localStorage.getItem('shadowdark:data-packs')
      const parsed = JSON.parse(stored!)
      expect(parsed).toHaveLength(0)
    })
  })
})

// ========== data/index.ts Export Tests ==========

describe('data/index.ts exports', () => {
  it('MONSTERS references the same array as dataRegistry.monsters', () => {
    expect(MONSTERS).toBe(dataRegistry.monsters)
  })

  it('SPELLS references the same array as dataRegistry.spells', () => {
    expect(SPELLS).toBe(dataRegistry.spells)
  })

  it('getMonster() goes through registry (finds custom data)', () => {
    addTestPack(makeValidPack())
    const dragon = getMonster('test-dragon')
    expect(dragon).toBeDefined()
    expect(dragon!.name).toBe('Test Dragon')
  })

  it('getSpell() goes through registry (finds custom data)', () => {
    addTestPack(makeValidPack({
      data: { spells: [makeSpell()] },
    }))
    const spell = getSpell('test-fireball')
    expect(spell).toBeDefined()
    expect(spell!.name).toBe('Test Fireball')
  })

  it('MONSTERS array updates when pack is added', () => {
    const before = MONSTERS.length
    addTestPack(makeValidPack())
    expect(MONSTERS.length).toBe(before + 1)
    expect(MONSTERS.find(m => m.id === 'test-dragon')).toBeDefined()
  })
})

// ========== Pack Tracking Tests ==========

describe('item-to-pack tracking', () => {
  it('getItemPackId returns pack ID for custom items', () => {
    addTestPack(makeValidPack())
    expect(getItemPackId('test-dragon')).toBe('test-pack')
  })

  it('getItemPackId returns undefined for core items', () => {
    expect(getItemPackId('goblin')).toBeUndefined()
  })

  it('getItemPackId clears when pack is removed', () => {
    addTestPack(makeValidPack())
    expect(getItemPackId('test-dragon')).toBe('test-pack')
    dataRegistry.removePack('test-pack')
    addedPackIds.splice(addedPackIds.indexOf('test-pack'), 1)
    expect(getItemPackId('test-dragon')).toBeUndefined()
  })

  it('getItemPackId clears when pack is disabled', () => {
    addTestPack(makeValidPack())
    dataRegistry.togglePack('test-pack')
    expect(getItemPackId('test-dragon')).toBeUndefined()
    dataRegistry.togglePack('test-pack') // re-enable
    expect(getItemPackId('test-dragon')).toBe('test-pack')
  })
})

// ========== Pack Color Tests ==========

describe('pack color', () => {
  it('getPackColor returns undefined when no color set', () => {
    addTestPack(makeValidPack())
    expect(getPackColor('test-pack')).toBeUndefined()
  })

  it('setPackColor sets and persists color', () => {
    addTestPack(makeValidPack())
    dataRegistry.setPackColor('test-pack', '#ff6b35')
    expect(getPackColor('test-pack')).toBe('#ff6b35')
    expect(dataRegistry.getPacks()[0].color).toBe('#ff6b35')
  })

  it('setPackColor clears color with undefined', () => {
    addTestPack(makeValidPack())
    dataRegistry.setPackColor('test-pack', '#ff6b35')
    dataRegistry.setPackColor('test-pack', undefined)
    expect(getPackColor('test-pack')).toBeUndefined()
  })

  it('color from pack JSON is preserved', () => {
    const pack = makeValidPack()
    pack.color = '#00ff00'
    addTestPack(pack)
    expect(getPackColor('test-pack')).toBe('#00ff00')
  })
})

// ========== Sort Helper Tests ==========

describe('sortPackFirst', () => {
  it('sorts pack items before core items', () => {
    addTestPack(makeValidPack())
    const items = [
      { id: 'goblin' },     // core
      { id: 'test-dragon' }, // pack
      { id: 'aboleth' },     // core
    ]
    const sorted = sortPackFirst(items)
    expect(sorted[0].id).toBe('test-dragon')
    expect(sorted[1].id).toBe('goblin')
    expect(sorted[2].id).toBe('aboleth')
  })

  it('preserves order within same group', () => {
    const items = [
      { id: 'goblin' },
      { id: 'aboleth' },
      { id: 'bandit' },
    ]
    const sorted = sortPackFirst(items)
    expect(sorted.map(i => i.id)).toEqual(['goblin', 'aboleth', 'bandit'])
  })

  it('does not mutate the original array', () => {
    const items = [{ id: 'goblin' }, { id: 'aboleth' }]
    const sorted = sortPackFirst(items)
    expect(sorted).not.toBe(items)
  })
})
