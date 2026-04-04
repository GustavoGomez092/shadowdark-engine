import { describe, it, expect } from 'vitest'
import { buildSystemPrompt, buildGameContext, PURPOSE_LABELS, PURPOSE_ICONS } from '../prompts.ts'
import type { AIGameContext, AIPurpose } from '@/schemas/ai.ts'
import type { SessionState } from '@/schemas/session.ts'

const ALL_PURPOSES: AIPurpose[] = [
  'encounter_description', 'npc_dialogue', 'adventure_hook', 'ruling_help',
  'treasure_description', 'store_generation', 'room_description', 'trap_description', 'general',
]

function makeContext(overrides: Partial<AIGameContext> = {}): AIGameContext {
  return {
    partyLevel: 3,
    partySize: 4,
    partyMembers: [
      { name: 'Gareth', ancestry: 'human', class: 'fighter', level: 3 },
      { name: 'Elara', ancestry: 'elf', class: 'wizard', level: 3 },
    ],
    partyAncestries: ['human', 'elf'],
    partyClasses: ['fighter', 'wizard'],
    inCombat: false,
    isInDarkness: false,
    ...overrides,
  }
}

function makeMinimalSession(): SessionState {
  return {
    room: { id: 'test', name: 'Test', createdAt: 0, gmPeerId: 'gm', maxPlayers: 4 },
    characters: {},
    players: {},
    activeMonsters: {},
    combat: null,
    light: { timers: [], isInDarkness: false, isPaused: false },
    dangerLevel: 'unsafe',
    stores: [],
    chatLog: [],
    rollHistory: [],
    gmNotes: '',
    aiConversations: [],
    settings: { torchDurationMinutes: 60, lanternDurationMinutes: 60, campfireDurationMinutes: 480 },
    meta: { lastSavedAt: 0, totalPlayTimeMs: 0, sessionNumber: 1 },
  }
}

describe('PURPOSE_LABELS', () => {
  it('has a label for every purpose', () => {
    for (const p of ALL_PURPOSES) {
      expect(PURPOSE_LABELS[p]).toBeDefined()
      expect(typeof PURPOSE_LABELS[p]).toBe('string')
    }
  })
})

describe('PURPOSE_ICONS', () => {
  it('has an icon for every purpose', () => {
    for (const p of ALL_PURPOSES) {
      expect(PURPOSE_ICONS[p]).toBeDefined()
    }
  })
})

describe('buildSystemPrompt', () => {
  it('includes base prompt for each purpose', () => {
    for (const purpose of ALL_PURPOSES) {
      const prompt = buildSystemPrompt(purpose, makeContext())
      expect(prompt.length).toBeGreaterThan(50)
    }
  })

  it('includes party info with character names', () => {
    const prompt = buildSystemPrompt('general', makeContext())
    expect(prompt).toContain('Gareth (Level 3 human fighter)')
    expect(prompt).toContain('Elara (Level 3 elf wizard)')
    expect(prompt).toContain('avg level 3')
  })

  it('includes combat info when in combat', () => {
    const prompt = buildSystemPrompt('encounter_description', makeContext({
      inCombat: true,
      activeMonsters: [
        { name: 'Goblin', level: 1, ac: 11, currentHp: 4, maxHp: 4, attacks: ['Club +1 (1d4)'], abilities: [], tags: ['humanoid'] },
        { name: 'Orc Chief', level: 5, ac: 16, currentHp: 30, maxHp: 30, attacks: ['Greataxe +5 (1d12+3)'], abilities: [], tags: ['humanoid'] },
      ],
    }))
    expect(prompt).toContain('EXACTLY 2 enem')
    expect(prompt).toContain('Goblin (Level 1')
    expect(prompt).toContain('Orc Chief (Level 5')
  })

  it('includes darkness state', () => {
    const prompt = buildSystemPrompt('room_description', makeContext({ isInDarkness: true }))
    expect(prompt).toContain('TOTAL DARKNESS')
  })

  it('includes danger level', () => {
    const prompt = buildSystemPrompt('general', makeContext({ currentDangerLevel: 'deadly' }))
    expect(prompt).toContain('deadly')
  })

  it('includes recent events', () => {
    const prompt = buildSystemPrompt('general', makeContext({
      recentEvents: ['Player took 5 damage', 'Torch went out'],
    }))
    expect(prompt).toContain('Player took 5 damage')
    expect(prompt).toContain('Torch went out')
  })

  it('appends custom prompt', () => {
    const prompt = buildSystemPrompt('general', makeContext(), 'This is a pirate campaign')
    expect(prompt).toContain('ADDITIONAL INSTRUCTIONS')
    expect(prompt).toContain('pirate campaign')
  })

  it('skips empty context sections', () => {
    const prompt = buildSystemPrompt('general', makeContext({
      partySize: 0,
      partyClasses: [],
      partyAncestries: [],
    }))
    expect(prompt).not.toContain('Party:')
    expect(prompt).not.toContain('Classes:')
  })
})

describe('buildGameContext', () => {
  it('returns empty context for empty session', () => {
    const ctx = buildGameContext(makeMinimalSession())
    expect(ctx.partySize).toBe(0)
    expect(ctx.partyLevel).toBe(0)
    expect(ctx.inCombat).toBe(false)
    expect(ctx.isInDarkness).toBe(false)
  })

  it('computes party stats from characters', () => {
    const session = makeMinimalSession()
    session.characters = {
      'c1': { id: 'c1', playerId: 'p1', name: 'Gareth', ancestry: 'human', class: 'fighter', level: 3 } as SessionState['characters'][string],
      'c2': { id: 'c2', playerId: 'p2', name: 'Elara', ancestry: 'elf', class: 'wizard', level: 5 } as SessionState['characters'][string],
    }
    const ctx = buildGameContext(session)
    expect(ctx.partySize).toBe(2)
    expect(ctx.partyLevel).toBe(4) // (3+5)/2
    expect(ctx.partyAncestries).toContain('human')
    expect(ctx.partyAncestries).toContain('elf')
    expect(ctx.partyClasses).toContain('fighter')
    expect(ctx.partyClasses).toContain('wizard')
  })

  it('detects active combat', () => {
    const session = makeMinimalSession()
    session.combat = { phase: 'active', combatants: [], initiativeOrder: [], currentTurnIndex: 0, roundNumber: 1, log: [] }
    const ctx = buildGameContext(session)
    expect(ctx.inCombat).toBe(true)
  })

  it('extracts active monster details (non-defeated only)', () => {
    const session = makeMinimalSession()
    session.activeMonsters = {
      'm1': { id: 'm1', definitionId: 'goblin', name: 'Goblin', currentHp: 5, maxHp: 5, conditions: [], isDefeated: false },
      'm2': { id: 'm2', definitionId: 'goblin', name: 'Goblin 2', currentHp: 0, maxHp: 5, conditions: [], isDefeated: true },
    }
    const ctx = buildGameContext(session)
    expect(ctx.activeMonsters).toHaveLength(1)
    expect(ctx.activeMonsters![0].name).toBe('Goblin')
    expect(ctx.activeMonsters![0].currentHp).toBe(5)
  })

  it('reads darkness state', () => {
    const session = makeMinimalSession()
    session.light.isInDarkness = true
    const ctx = buildGameContext(session)
    expect(ctx.isInDarkness).toBe(true)
  })
})
