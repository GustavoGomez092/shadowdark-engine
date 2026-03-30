import { create } from 'zustand'
import type { PlayerVisibleState } from '@/schemas/session.ts'

const STORAGE_KEY = 'shadowdark:player'

interface PlayerConnectionInfo {
  roomCode: string
  displayName: string
  password?: string
  characterId?: string
}

interface PlayerStore {
  state: PlayerVisibleState | null
  characterId: string | null
  displayName: string | null
  connectionInfo: PlayerConnectionInfo | null
  hydrated: boolean

  hydrate: () => void
  setState: (state: PlayerVisibleState) => void
  setCharacterId: (id: string) => void
  setDisplayName: (name: string) => void
  saveConnectionInfo: (info: PlayerConnectionInfo) => void
  getConnectionInfo: () => PlayerConnectionInfo | null
  reset: () => void
}

function loadFromStorage(): { connectionInfo: PlayerConnectionInfo | null; state: PlayerVisibleState | null } {
  if (typeof window === 'undefined') return { connectionInfo: null, state: null }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { connectionInfo: null, state: null }
    const data = JSON.parse(raw)
    return {
      connectionInfo: data.connectionInfo ?? null,
      state: data.lastState ?? null,
    }
  } catch {
    return { connectionInfo: null, state: null }
  }
}

function saveToStorage(connectionInfo: PlayerConnectionInfo | null, state: PlayerVisibleState | null) {
  if (typeof window === 'undefined') return
  try {
    if (!connectionInfo) {
      localStorage.removeItem(STORAGE_KEY)
      return
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      connectionInfo,
      lastState: state,
    }))
  } catch (err) {
    console.error('[Player Store] Save failed:', err)
  }
}

// Start empty — hydrate on client only to avoid SSR mismatch
export const usePlayerStore = create<PlayerStore>()((set, get) => ({
  state: null,
  characterId: null,
  displayName: null,
  connectionInfo: null,
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return
    const { connectionInfo, state } = loadFromStorage()
    set({
      connectionInfo,
      state,
      characterId: connectionInfo?.characterId ?? null,
      displayName: connectionInfo?.displayName ?? null,
      hydrated: true,
    })
  },

  setState: (state) => {
    set({ state })
    const info = get().connectionInfo
    if (info) saveToStorage(info, state)
  },

  setCharacterId: (id) => {
    set({ characterId: id })
    const info = get().connectionInfo
    if (info) {
      const updated = { ...info, characterId: id }
      set({ connectionInfo: updated })
      saveToStorage(updated, get().state)
    }
  },

  setDisplayName: (name) => set({ displayName: name }),

  saveConnectionInfo: (info) => {
    set({ connectionInfo: info, displayName: info.displayName, characterId: info.characterId ?? null })
    saveToStorage(info, get().state)
  },

  getConnectionInfo: () => get().connectionInfo,

  reset: () => {
    set({ state: null, characterId: null, displayName: null, connectionInfo: null })
    if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY)
  },
}))
