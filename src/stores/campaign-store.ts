import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Campaign, CampaignIndexEntry, AdventureRoom, AdventureNPC, RandomEncounterTable, AdventureStore, LoreChapter, LoreSection } from '@/schemas/campaign.ts'
import type { CampaignMap } from '@/schemas/map.ts'
import type { DataPackContent } from '@/lib/data/types.ts'
import { createEmptyCampaign } from '@/lib/campaign/defaults.ts'

const STORAGE_PREFIX = 'shadowdark'
const INDEX_KEY = `${STORAGE_PREFIX}:campaigns:index`
const SAVE_DEBOUNCE_MS = 500

interface CampaignStore {
  campaign: Campaign | null

  // Lifecycle
  createCampaign: (name: string, author?: string) => Campaign
  loadCampaign: (id: string) => boolean
  closeCampaign: () => void
  deleteCampaign: (id: string) => void

  // Metadata
  updateMeta: (updates: Partial<Pick<Campaign, 'name' | 'author' | 'version' | 'description'>>) => void

  // Content (DataPack items)
  updateContent: (updater: (content: DataPackContent) => void) => void

  // Adventure
  updateAdventure: (updater: (adv: Campaign['adventure']) => void) => void
  addRoom: (room: AdventureRoom) => void
  updateRoom: (id: string, updater: (r: AdventureRoom) => void) => void
  removeRoom: (id: string) => void
  addNPC: (npc: AdventureNPC) => void
  updateNPC: (id: string, updater: (n: AdventureNPC) => void) => void
  removeNPC: (id: string) => void
  addEncounterTable: (table: RandomEncounterTable) => void
  updateEncounterTable: (id: string, updater: (t: RandomEncounterTable) => void) => void
  removeEncounterTable: (id: string) => void
  addStore: (store: AdventureStore) => void
  updateStore: (id: string, updater: (s: AdventureStore) => void) => void
  removeStore: (id: string) => void

  // Lore
  addChapter: (chapter: LoreChapter) => void
  updateChapter: (id: string, updater: (c: LoreChapter) => void) => void
  removeChapter: (id: string) => void
  addSection: (chapterId: string, section: LoreSection) => void
  updateSection: (chapterId: string, sectionId: string, updater: (s: LoreSection) => void) => void
  removeSection: (chapterId: string, sectionId: string) => void

  // Maps
  addMap: (map: CampaignMap) => void
  updateMap: (id: string, updater: (m: CampaignMap) => void) => void
  removeMap: (id: string) => void

  // Persistence
  saveNow: () => void
  getSavedCampaigns: () => CampaignIndexEntry[]
  importCampaign: (campaign: Campaign) => string
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null

function loadFromStorage(id: string): Campaign | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}:campaign:${id}`)
    return raw ? JSON.parse(raw) as Campaign : null
  } catch { return null }
}

function saveToStorage(campaign: Campaign) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}:campaign:${campaign.id}`, JSON.stringify(campaign))
    updateIndex(campaign)
  } catch (err) {
    console.error('[Campaign Store] Save failed:', err)
  }
}

function debouncedSave(campaign: Campaign) {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    saveToStorage({ ...campaign, updatedAt: Date.now() })
  }, SAVE_DEBOUNCE_MS)
}

function updateIndex(campaign: Campaign) {
  try {
    const raw = localStorage.getItem(INDEX_KEY)
    const index: CampaignIndexEntry[] = raw ? JSON.parse(raw) : []
    const entry: CampaignIndexEntry = { id: campaign.id, name: campaign.name, author: campaign.author, updatedAt: Date.now() }
    const existing = index.findIndex(c => c.id === campaign.id)
    if (existing >= 0) index[existing] = entry
    else index.push(entry)
    localStorage.setItem(INDEX_KEY, JSON.stringify(index))
  } catch {}
}

function removeFromIndex(id: string) {
  try {
    const raw = localStorage.getItem(INDEX_KEY)
    const index: CampaignIndexEntry[] = raw ? JSON.parse(raw) : []
    localStorage.setItem(INDEX_KEY, JSON.stringify(index.filter(c => c.id !== id)))
  } catch {}
}

export const useCampaignStore = create<CampaignStore>()(
  immer((set, get) => ({
    campaign: null,

    createCampaign: (name, author) => {
      const campaign = createEmptyCampaign(name, author)
      set(state => { state.campaign = campaign })
      saveToStorage(campaign)
      return campaign
    },

    loadCampaign: (id) => {
      const campaign = loadFromStorage(id)
      if (!campaign) return false
      // Backfill fields added after initial campaign creation
      if (!campaign.adventure.stores) campaign.adventure.stores = []
      set(state => { state.campaign = campaign })
      return true
    },

    closeCampaign: () => {
      const c = get().campaign
      if (c) saveToStorage({ ...c, updatedAt: Date.now() })
      set(state => { state.campaign = null })
    },

    deleteCampaign: (id) => {
      try { localStorage.removeItem(`${STORAGE_PREFIX}:campaign:${id}`) } catch {}
      removeFromIndex(id)
      if (get().campaign?.id === id) set(state => { state.campaign = null })
    },

    updateMeta: (updates) => {
      set(state => {
        if (!state.campaign) return
        Object.assign(state.campaign, updates)
      })
      const c = get().campaign
      if (c) debouncedSave(c)
    },

    updateContent: (updater) => {
      set(state => {
        if (!state.campaign) return
        updater(state.campaign.content)
      })
      const c = get().campaign
      if (c) debouncedSave(c)
    },

    updateAdventure: (updater) => {
      set(state => {
        if (!state.campaign) return
        updater(state.campaign.adventure)
      })
      const c = get().campaign
      if (c) debouncedSave(c)
    },

    addRoom: (room) => {
      set(state => { state.campaign?.adventure.rooms.push(room) })
      const c = get().campaign; if (c) debouncedSave(c)
    },
    updateRoom: (id, updater) => {
      set(state => {
        const r = state.campaign?.adventure.rooms.find(r => r.id === id)
        if (r) updater(r)
      })
      const c = get().campaign; if (c) debouncedSave(c)
    },
    removeRoom: (id) => {
      set(state => {
        if (!state.campaign) return
        state.campaign.adventure.rooms = state.campaign.adventure.rooms.filter(r => r.id !== id)
      })
      const c = get().campaign; if (c) debouncedSave(c)
    },

    addNPC: (npc) => {
      set(state => { state.campaign?.adventure.npcs.push(npc) })
      const c = get().campaign; if (c) debouncedSave(c)
    },
    updateNPC: (id, updater) => {
      set(state => {
        const n = state.campaign?.adventure.npcs.find(n => n.id === id)
        if (n) updater(n)
      })
      const c = get().campaign; if (c) debouncedSave(c)
    },
    removeNPC: (id) => {
      set(state => {
        if (!state.campaign) return
        state.campaign.adventure.npcs = state.campaign.adventure.npcs.filter(n => n.id !== id)
      })
      const c = get().campaign; if (c) debouncedSave(c)
    },

    addEncounterTable: (table) => {
      set(state => { state.campaign?.adventure.randomEncounters.push(table) })
      const c = get().campaign; if (c) debouncedSave(c)
    },
    updateEncounterTable: (id, updater) => {
      set(state => {
        const t = state.campaign?.adventure.randomEncounters.find(t => t.id === id)
        if (t) updater(t)
      })
      const c = get().campaign; if (c) debouncedSave(c)
    },
    removeEncounterTable: (id) => {
      set(state => {
        if (!state.campaign) return
        state.campaign.adventure.randomEncounters = state.campaign.adventure.randomEncounters.filter(t => t.id !== id)
      })
      const c = get().campaign; if (c) debouncedSave(c)
    },

    addStore: (store) => {
      set(state => {
        if (!state.campaign) return
        if (!state.campaign.adventure.stores) state.campaign.adventure.stores = []
        state.campaign.adventure.stores.push(store)
      })
      const c = get().campaign; if (c) debouncedSave(c)
    },
    updateStore: (id, updater) => {
      set(state => {
        const s = state.campaign?.adventure.stores?.find(s => s.id === id)
        if (s) updater(s)
      })
      const c = get().campaign; if (c) debouncedSave(c)
    },
    removeStore: (id) => {
      set(state => {
        if (!state.campaign) return
        if (!state.campaign.adventure.stores) return
        state.campaign.adventure.stores = state.campaign.adventure.stores.filter(s => s.id !== id)
      })
      const c = get().campaign; if (c) debouncedSave(c)
    },

    addChapter: (chapter) => {
      set(state => { state.campaign?.lore.chapters.push(chapter) })
      const c = get().campaign; if (c) debouncedSave(c)
    },
    updateChapter: (id, updater) => {
      set(state => {
        const ch = state.campaign?.lore.chapters.find(ch => ch.id === id)
        if (ch) updater(ch)
      })
      const c = get().campaign; if (c) debouncedSave(c)
    },
    removeChapter: (id) => {
      set(state => {
        if (!state.campaign) return
        state.campaign.lore.chapters = state.campaign.lore.chapters.filter(ch => ch.id !== id)
      })
      const c = get().campaign; if (c) debouncedSave(c)
    },

    addSection: (chapterId, section) => {
      set(state => {
        const ch = state.campaign?.lore.chapters.find(ch => ch.id === chapterId)
        if (ch) ch.sections.push(section)
      })
      const c = get().campaign; if (c) debouncedSave(c)
    },
    updateSection: (chapterId, sectionId, updater) => {
      set(state => {
        const ch = state.campaign?.lore.chapters.find(ch => ch.id === chapterId)
        const s = ch?.sections.find(s => s.id === sectionId)
        if (s) updater(s)
      })
      const c = get().campaign; if (c) debouncedSave(c)
    },
    removeSection: (chapterId, sectionId) => {
      set(state => {
        const ch = state.campaign?.lore.chapters.find(ch => ch.id === chapterId)
        if (ch) ch.sections = ch.sections.filter(s => s.id !== sectionId)
      })
      const c = get().campaign; if (c) debouncedSave(c)
    },

    addMap: (map) => {
      set(state => { state.campaign?.maps.push(map) })
      const c = get().campaign; if (c) debouncedSave(c)
    },
    updateMap: (id, updater) => {
      set(state => {
        const m = state.campaign?.maps.find(m => m.id === id)
        if (m) updater(m)
      })
      const c = get().campaign; if (c) debouncedSave(c)
    },
    removeMap: (id) => {
      set(state => {
        if (!state.campaign) return
        state.campaign.maps = state.campaign.maps.filter(m => m.id !== id)
      })
      const c = get().campaign; if (c) debouncedSave(c)
    },

    saveNow: () => {
      const c = get().campaign
      if (c) {
        if (saveTimeout) clearTimeout(saveTimeout)
        saveToStorage({ ...c, updatedAt: Date.now() })
      }
    },

    getSavedCampaigns: () => {
      try {
        const raw = localStorage.getItem(INDEX_KEY)
        return raw ? JSON.parse(raw) as CampaignIndexEntry[] : []
      } catch { return [] }
    },

    importCampaign: (campaign) => {
      set(state => { state.campaign = campaign })
      saveToStorage(campaign)
      return campaign.id
    },
  }))
)
