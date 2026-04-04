import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { SessionState, ConnectedPlayer, ChatMessage, PlayerVisibleState, PublicCharacterInfo } from '@/schemas/session.ts'
import { SCHEMA_VERSION, getHpStatus } from '@/schemas/session.ts'
import type { Character } from '@/schemas/character.ts'
import type { MonsterInstance } from '@/schemas/monsters.ts'
import type { GameStore } from '@/schemas/stores.ts'
import type { DiceRollResult } from '@/schemas/dice.ts'
import type { DangerLevel } from '@/schemas/reference.ts'
import type { LightState } from '@/schemas/light.ts'
import type { CombatState } from '@/schemas/combat.ts'
import { generateRoomCode } from '@/lib/utils/id.ts'
import { computeCharacterValues } from '@/lib/rules/character.ts'

const STORAGE_PREFIX = 'shadowdark'
const ACTIVE_SESSION_KEY = `${STORAGE_PREFIX}:active-session`
const SAVE_DEBOUNCE_MS = 300

interface SessionStore {
  // State
  session: SessionState | null
  isActive: boolean

  // Session lifecycle
  createSession: (name: string, password?: string) => SessionState
  loadSession: (id: string) => boolean
  endSession: () => void

  // Characters
  addCharacter: (character: Character) => void
  updateCharacter: (id: string, updater: (c: Character) => void) => void
  removeCharacter: (id: string) => void

  // Players
  addPlayer: (player: ConnectedPlayer) => void
  updatePlayer: (peerId: string, updates: Partial<ConnectedPlayer>) => void
  removePlayer: (peerId: string) => void

  // Monsters
  addMonster: (monster: MonsterInstance) => void
  updateMonster: (id: string, updater: (m: MonsterInstance) => void) => void
  removeMonster: (id: string) => void

  // Combat
  setCombat: (combat: CombatState | null) => void

  // Light
  setLight: (light: LightState) => void

  // Danger level
  setDangerLevel: (level: DangerLevel) => void

  // Active turn
  setActiveTurnId: (id: string | null) => void

  // Stores
  addStore: (store: GameStore) => void
  updateStore: (id: string, updater: (s: GameStore) => void) => void
  removeStore: (id: string) => void

  // Chat
  addChatMessage: (message: ChatMessage) => void

  // Rolls
  addRoll: (roll: DiceRollResult) => void

  // GM Notes
  setGmNotes: (notes: string) => void

  // State filtering
  getPlayerVisibleState: (peerId: string) => PlayerVisibleState | null

  // Persistence
  saveNow: () => void

  // Session list
  getSavedSessions: () => { id: string; name: string; lastPlayed: number }[]
  deleteSession: (id: string) => void
  importSession: (session: SessionState) => string
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null

function setActiveSessionId(id: string | null) {
  try {
    if (id) localStorage.setItem(ACTIVE_SESSION_KEY, id)
    else localStorage.removeItem(ACTIVE_SESSION_KEY)
  } catch {}
}

function getActiveSessionId(): string | null {
  try { return localStorage.getItem(ACTIVE_SESSION_KEY) } catch { return null }
}

function loadSessionFromStorage(id: string): SessionState | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}:session:${id}`)
    return raw ? JSON.parse(raw) as SessionState : null
  } catch { return null }
}

function debouncedSave(session: SessionState) {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    try {
      const key = `${STORAGE_PREFIX}:session:${session.room.id}`
      localStorage.setItem(key, JSON.stringify({ ...session, meta: { ...session.meta, lastSavedAt: Date.now() } }))
      // Update index
      updateSessionIndex(session)
    } catch (err) {
      console.error('[Session Store] Save failed:', err)
    }
  }, SAVE_DEBOUNCE_MS)
}

function updateSessionIndex(session: SessionState) {
  const indexKey = `${STORAGE_PREFIX}:sessions:index`
  try {
    const raw = localStorage.getItem(indexKey)
    const index: { id: string; name: string; lastPlayed: number }[] = raw ? JSON.parse(raw) : []
    const existing = index.findIndex(s => s.id === session.room.id)
    const entry = { id: session.room.id, name: session.room.name, lastPlayed: Date.now() }
    if (existing >= 0) {
      index[existing] = entry
    } else {
      index.push(entry)
    }
    localStorage.setItem(indexKey, JSON.stringify(index))
  } catch (err) {
    console.error('[Session Store] Index update failed:', err)
  }
}

// Auto-load active session on init (client only)
const activeId = typeof window !== 'undefined' ? getActiveSessionId() : null
const initialSession = activeId ? loadSessionFromStorage(activeId) : null

export const useSessionStore = create<SessionStore>()(
  immer((set, get) => ({
    session: initialSession,
    isActive: initialSession !== null,

    createSession: (name, password) => {
      const roomId = generateRoomCode()
      const session: SessionState = {
        schemaVersion: SCHEMA_VERSION,
        room: {
          id: roomId,
          name,
          password,
          createdAt: Date.now(),
          gmPeerId: '', // set when peer connects
          maxPlayers: 6,
        },
        characters: {},
        players: {},
        activeMonsters: {},
        combat: null,
        light: {
          timers: [],
          isInDarkness: true,
          isPaused: true,
        },
        dangerLevel: 'safe',
        crawlingRoundsSinceCheck: 0,
        activeTurnId: null,
        activeEncounters: [],
        stores: [],
        chatLog: [],
        rollHistory: [],
        gmNotes: '',
        aiConversations: [],
        settings: { torchDurationMinutes: 60, lanternDurationMinutes: 60, campfireDurationMinutes: 480 },
        meta: {
          lastSavedAt: Date.now(),
          totalPlayTimeMs: 0,
          sessionNumber: 1,
        },
      }

      set(state => {
        state.session = session
        state.isActive = true
      })

      setActiveSessionId(session.room.id)
      debouncedSave(session)
      return session
    },

    loadSession: (id) => {
      try {
        const key = `${STORAGE_PREFIX}:session:${id}`
        const raw = localStorage.getItem(key)
        if (!raw) return false
        const session = JSON.parse(raw) as SessionState
        set(state => {
          state.session = session
          state.isActive = true
        })
        setActiveSessionId(id)
        return true
      } catch {
        return false
      }
    },

    endSession: () => {
      const s = get().session
      if (s) debouncedSave(s)
      setActiveSessionId(null)
      set(state => {
        state.session = null
        state.isActive = false
      })
    },

    addCharacter: (character) => {
      set(state => {
        if (!state.session) return
        state.session.characters[character.id] = character
      })
      const s = get().session
      if (s) debouncedSave(s)
    },

    updateCharacter: (id, updater) => {
      set(state => {
        if (!state.session?.characters[id]) return
        updater(state.session.characters[id])
        // Recompute derived values after any character mutation
        const char = state.session.characters[id]
        try {
          char.computed = computeCharacterValues(char as any)
        } catch { /* ignore if computation fails during partial update */ }
      })
      const s = get().session
      if (s) debouncedSave(s)
    },

    removeCharacter: (id) => {
      set(state => {
        if (!state.session) return
        delete state.session.characters[id]
      })
      const s = get().session
      if (s) debouncedSave(s)
    },

    addPlayer: (player) => {
      set(state => {
        if (!state.session) return
        state.session.players[player.peerId] = player
      })
      const s = get().session
      if (s) debouncedSave(s)
    },

    updatePlayer: (peerId, updates) => {
      set(state => {
        if (!state.session?.players[peerId]) return
        Object.assign(state.session.players[peerId], updates)
      })
      const s = get().session
      if (s) debouncedSave(s)
    },

    removePlayer: (peerId) => {
      set(state => {
        if (!state.session) return
        delete state.session.players[peerId]
      })
      const s = get().session
      if (s) debouncedSave(s)
    },

    addMonster: (monster) => {
      set(state => {
        if (!state.session) return
        state.session.activeMonsters[monster.id] = monster
      })
      const s = get().session
      if (s) debouncedSave(s)
    },

    updateMonster: (id, updater) => {
      set(state => {
        if (!state.session?.activeMonsters[id]) return
        updater(state.session.activeMonsters[id])
      })
      const s = get().session
      if (s) debouncedSave(s)
    },

    removeMonster: (id) => {
      set(state => {
        if (!state.session) return
        delete state.session.activeMonsters[id]
      })
      const s = get().session
      if (s) debouncedSave(s)
    },

    setCombat: (combat) => {
      set(state => {
        if (!state.session) return
        state.session.combat = combat
      })
      const s = get().session
      if (s) debouncedSave(s)
    },

    setLight: (light) => {
      set(state => {
        if (!state.session) return
        state.session.light = light
      })
      const s = get().session
      if (s) debouncedSave(s)
    },

    setActiveTurnId: (id) => {
      set(state => {
        if (!state.session) return
        state.session.activeTurnId = id
      })
      const s = get().session
      if (s) debouncedSave(s)
    },

    setDangerLevel: (level) => {
      set(state => {
        if (!state.session) return
        state.session.dangerLevel = level
      })
      const s = get().session
      if (s) debouncedSave(s)
    },

    addStore: (store) => {
      set(state => {
        if (!state.session) return
        state.session.stores.push(store)
      })
      const s = get().session
      if (s) debouncedSave(s)
    },

    updateStore: (id, updater) => {
      set(state => {
        if (!state.session) return
        const store = state.session.stores.find(s => s.id === id)
        if (store) updater(store)
      })
      const s = get().session
      if (s) debouncedSave(s)
    },

    removeStore: (id) => {
      set(state => {
        if (!state.session) return
        state.session.stores = state.session.stores.filter(s => s.id !== id)
      })
      const s = get().session
      if (s) debouncedSave(s)
    },

    addChatMessage: (message) => {
      set(state => {
        if (!state.session) return
        state.session.chatLog.push(message)
        // Keep last 500 messages
        if (state.session.chatLog.length > 500) {
          state.session.chatLog = state.session.chatLog.slice(-500)
        }
      })
      const s = get().session
      if (s) debouncedSave(s)
    },

    addRoll: (roll) => {
      set(state => {
        if (!state.session) return
        state.session.rollHistory.push(roll)
        // Keep last 200 rolls
        if (state.session.rollHistory.length > 200) {
          state.session.rollHistory = state.session.rollHistory.slice(-200)
        }
      })
      const s = get().session
      if (s) debouncedSave(s)
    },

    setGmNotes: (notes) => {
      set(state => {
        if (!state.session) return
        state.session.gmNotes = notes
      })
      const s = get().session
      if (s) debouncedSave(s)
    },

    getPlayerVisibleState: (peerId) => {
      const session = get().session
      if (!session) return null

      const player = session.players[peerId]
      if (!player) return null

      const myCharacter = player.characterId ? session.characters[player.characterId] ?? null : null

      // Only show characters assigned to other connected players
      const assignedCharIds = new Set(
        Object.values(session.players)
          .filter(p => p.peerId !== peerId && p.characterId)
          .map(p => p.characterId!)
      )
      const otherCharacters: PublicCharacterInfo[] = Object.values(session.characters)
        .filter(c => c.id !== player.characterId && assignedCharIds.has(c.id))
        .map(c => ({
          id: c.id,
          name: c.name,
          ancestry: c.ancestry,
          class: c.class,
          level: c.level,
          alignment: c.alignment,
          hpStatus: getHpStatus(c.currentHp, c.maxHp, c.isDying),
          isDying: c.isDying,
          hasDeathTimer: c.isDying && !!c.deathTimer,
          conditions: c.conditions,
          isInCombat: session.combat?.combatants.some(cb => cb.referenceId === c.id) ?? false,
        }))

      return {
        room: { id: session.room.id, name: session.room.name },
        currentRoomCode: session.room.gmPeerId,
        myCharacter,
        otherCharacters,
        combat: session.combat,
        light: session.light,
        activeTurnId: session.activeTurnId,
        visibleMonsters: Object.values(session.activeMonsters)
          .filter(m => !m.isDefeated)
          .map(m => ({
            id: m.id,
            name: m.name,
            hpStatus: getHpStatus(m.currentHp, m.maxHp, false),
            conditions: m.conditions,
            rangeBand: m.rangeBand,
          })),
        chatLog: session.chatLog.filter(m => m.isPublic || m.senderId === peerId || m.whisperTo === peerId),
        recentRolls: session.rollHistory.slice(-50),
        activeStore: session.stores.find(s => s.isActive) ? (() => {
          const s = session.stores.find(st => st.isActive)!
          return { id: s.id, name: s.name, description: s.description, items: s.items }
        })() : undefined,
      }
    },

    saveNow: () => {
      const s = get().session
      if (!s) return
      if (saveTimeout) clearTimeout(saveTimeout)
      const key = `${STORAGE_PREFIX}:session:${s.room.id}`
      localStorage.setItem(key, JSON.stringify({ ...s, meta: { ...s.meta, lastSavedAt: Date.now() } }))
      updateSessionIndex(s)
    },

    getSavedSessions: () => {
      try {
        const raw = localStorage.getItem(`${STORAGE_PREFIX}:sessions:index`)
        return raw ? JSON.parse(raw) : []
      } catch {
        return []
      }
    },

    deleteSession: (id) => {
      try {
        localStorage.removeItem(`${STORAGE_PREFIX}:session:${id}`)
        const raw = localStorage.getItem(`${STORAGE_PREFIX}:sessions:index`)
        if (raw) {
          const index = JSON.parse(raw).filter((s: { id: string }) => s.id !== id)
          localStorage.setItem(`${STORAGE_PREFIX}:sessions:index`, JSON.stringify(index))
        }
      } catch (err) {
        console.error('[Session Store] Delete failed:', err)
      }
    },

    importSession: (session) => {
      try {
        const key = `${STORAGE_PREFIX}:session:${session.room.id}`
        localStorage.setItem(key, JSON.stringify(session))
        updateSessionIndex(session)
        return session.room.id
      } catch (err) {
        console.error('[Session Store] Import failed:', err)
        return session.room.id
      }
    },
  }))
)
