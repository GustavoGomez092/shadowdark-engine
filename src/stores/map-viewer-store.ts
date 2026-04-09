/**
 * Map Viewer Store
 *
 * Manages the GM-side map viewer state: active map, tokens, explored cells.
 * Persisted alongside the session in localStorage.
 */

import { create } from 'zustand'
import type { MapToken, MapViewerState } from '@/schemas/map-viewer.ts'

interface MapViewerStoreState {
  state: MapViewerState

  // Actions
  setState: (state: MapViewerState) => void
  setActiveMap: (mapId: string | null) => void
  addToken: (token: MapToken) => void
  removeToken: (id: string) => void
  moveToken: (id: string, gridX: number, gridY: number) => void
  updateToken: (id: string, updates: Partial<MapToken>) => void
  updateExploredCells: (newCells: string[]) => void
  reset: () => void
}

const EMPTY_STATE: MapViewerState = {
  activeMapId: null,
  tokens: [],
  exploredCells: [],
}

export const useMapViewerStore = create<MapViewerStoreState>((set) => ({
  state: { ...EMPTY_STATE },

  setState: (newState) => set({ state: newState }),

  setActiveMap: (mapId) => set(prev => ({
    state: {
      ...prev.state,
      activeMapId: mapId,
      tokens: mapId === prev.state.activeMapId ? prev.state.tokens : [],
      exploredCells: mapId === prev.state.activeMapId ? prev.state.exploredCells : [],
    },
  })),

  addToken: (token) => set(prev => ({
    state: { ...prev.state, tokens: [...prev.state.tokens, token] },
  })),

  removeToken: (id) => set(prev => ({
    state: { ...prev.state, tokens: prev.state.tokens.filter(t => t.id !== id) },
  })),

  moveToken: (id, gridX, gridY) => set(prev => ({
    state: {
      ...prev.state,
      tokens: prev.state.tokens.map(t => t.id === id ? { ...t, gridX, gridY } : t),
    },
  })),

  updateToken: (id, updates) => set(prev => ({
    state: {
      ...prev.state,
      tokens: prev.state.tokens.map(t => t.id === id ? { ...t, ...updates } : t),
    },
  })),

  updateExploredCells: (newCells) => set(prev => {
    const existing = new Set(prev.state.exploredCells)
    let changed = false
    for (const cell of newCells) {
      if (!existing.has(cell)) {
        existing.add(cell)
        changed = true
      }
    }
    if (!changed) return prev
    return { state: { ...prev.state, exploredCells: Array.from(existing) } }
  }),

  reset: () => set({ state: { ...EMPTY_STATE } }),
}))