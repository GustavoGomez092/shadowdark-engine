/**
 * Unified data exports — powered by the DataRegistry.
 * Core data (TypeScript) is merged with custom data packs (localStorage JSON).
 * All consumers import from here — no changes needed when packs are added/removed.
 */
import { dataRegistry } from '@/lib/data/registry.ts'

// ========== Arrays (live references to registry) ==========
// Note: these are getters so they always reflect the latest merged data

export const ANCESTRIES = dataRegistry.ancestries
export const CLASSES = dataRegistry.classes
export const SPELLS = dataRegistry.spells
export const WEAPONS = dataRegistry.weapons
export const ARMOR = dataRegistry.armor
export const GEAR = dataRegistry.gear
export const CRAWLING_KIT = dataRegistry.crawlingKit
export const MONSTERS = dataRegistry.monsters
export const DEITIES = dataRegistry.deities
export const LANGUAGES = dataRegistry.languages
export const COMMON_LANGUAGES = dataRegistry.commonLanguages
export const RARE_LANGUAGES = dataRegistry.rareLanguages
export const BACKGROUNDS = dataRegistry.backgrounds
export const TITLES = dataRegistry.titles

// ========== Lookup functions (indexed O(1)) ==========

export const getAncestry = (id: string) => dataRegistry.getAncestry(id)
export const getClass = (id: string) => dataRegistry.getClass(id)
export const getSpell = (id: string) => dataRegistry.getSpell(id)
export const getSpellsByClass = (c: 'wizard' | 'priest' | 'witch' | 'seer') => dataRegistry.getSpellsByClass(c)
export const getSpellsByTier = (t: number) => dataRegistry.getSpellsByTier(t)
export const getSpellsByClassAndTier = (c: 'wizard' | 'priest' | 'witch' | 'seer', t: number) => dataRegistry.getSpellsByClassAndTier(c, t)
export const getWeapon = (id: string) => dataRegistry.getWeapon(id)
export const getArmor = (id: string) => dataRegistry.getArmor(id)
export const getGear = (id: string) => dataRegistry.getGear(id)
export const getMonster = (id: string) => dataRegistry.getMonster(id)
export const getMonstersByTag = (tag: string) => dataRegistry.getMonstersByTag(tag)
export const getMonstersByLevel = (level: number) => dataRegistry.getMonstersByLevel(level)
export const getDeity = (id: string) => dataRegistry.getDeity(id)
export const getDeitiesByAlignment = (a: string) => dataRegistry.getDeitiesByAlignment(a)
export const getLanguage = (id: string) => dataRegistry.getLanguage(id)
export const getBackground = (id: string) => dataRegistry.getBackground(id)
export const getTitle = (cls: string, align: string, level: number) => dataRegistry.getTitle(cls, align, level)

// ========== Pack tracking ==========

export const getItemPackId = (id: string) => dataRegistry.getItemPackId(id)
export const getPackColor = (packId: string) => dataRegistry.getPackColor(packId)
