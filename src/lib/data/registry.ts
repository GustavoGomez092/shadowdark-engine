import type { MonsterDefinition } from '@/schemas/monsters.ts'
import type { SpellDefinition } from '@/schemas/spells.ts'
import type { WeaponDefinition, ArmorDefinition, GearDefinition } from '@/schemas/inventory.ts'
import type { BackgroundDefinition, DeityDefinition, LanguageDefinition, TitleDefinition } from '@/schemas/reference.ts'
import type { AncestryDefinition, ClassDefinition } from '@/schemas/character.ts'
import type { DataPack, DataPackMeta, AddPackResult } from './types.ts'
import { validateDataPack } from './validator.ts'

// Core data imports
import { MONSTERS as CORE_MONSTERS } from '@/data/monsters.ts'
import { SPELLS as CORE_SPELLS } from '@/data/spells.ts'
import { WEAPONS as CORE_WEAPONS } from '@/data/weapons.ts'
import { ARMOR as CORE_ARMOR } from '@/data/armor.ts'
import { GEAR as CORE_GEAR, CRAWLING_KIT } from '@/data/gear.ts'
import { BACKGROUNDS as CORE_BACKGROUNDS } from '@/data/backgrounds.ts'
import { DEITIES as CORE_DEITIES } from '@/data/deities.ts'
import { LANGUAGES as CORE_LANGUAGES } from '@/data/languages.ts'
import { ANCESTRIES as CORE_ANCESTRIES } from '@/data/ancestries.ts'
import { CLASSES as CORE_CLASSES } from '@/data/classes.ts'
import { TITLES as CORE_TITLES } from '@/data/titles.ts'

const STORAGE_KEY = 'shadowdark:data-packs'

function mergeById<T extends { id: string }>(core: T[], custom: T[]): T[] {
  const map = new Map<string, T>()
  for (const item of core) map.set(item.id, item)
  for (const item of custom) map.set(item.id, item) // custom overrides
  return Array.from(map.values())
}

function replaceInPlace<T>(target: T[], source: T[]): void {
  target.length = 0
  target.push(...source)
}

function buildIndex<T extends { id: string }>(items: T[]): Map<string, T> {
  const map = new Map<string, T>()
  for (const item of items) map.set(item.id, item)
  return map
}

class DataRegistry {
  // Merged arrays
  monsters: MonsterDefinition[] = []
  spells: SpellDefinition[] = []
  weapons: WeaponDefinition[] = []
  armor: ArmorDefinition[] = []
  gear: GearDefinition[] = []
  backgrounds: BackgroundDefinition[] = []
  deities: DeityDefinition[] = []
  languages: LanguageDefinition[] = []
  ancestries: AncestryDefinition[] = []
  classes: ClassDefinition[] = []
  titles: TitleDefinition[] = CORE_TITLES
  crawlingKit = CRAWLING_KIT

  // Indexed lookups
  private monsterIndex = new Map<string, MonsterDefinition>()
  private spellIndex = new Map<string, SpellDefinition>()
  private weaponIndex = new Map<string, WeaponDefinition>()
  private armorIndex = new Map<string, ArmorDefinition>()
  private gearIndex = new Map<string, GearDefinition>()
  private backgroundIndex = new Map<string, BackgroundDefinition>()
  private deityIndex = new Map<string, DeityDefinition>()
  private languageIndex = new Map<string, LanguageDefinition>()
  private ancestryIndex = new Map<string, AncestryDefinition>()
  private classIndex = new Map<string, ClassDefinition>()

  // Item-to-pack tracking
  private itemPackMap = new Map<string, string>()

  // Pack management
  private packs: DataPack[] = []
  private packMetas: DataPackMeta[] = []

  // Change listeners
  private listeners: Set<() => void> = new Set()

  constructor() {
    this.loadCustomPacks()
    this.rebuild()
  }

  // ========== Lookups ==========

  getMonster(id: string) { return this.monsterIndex.get(id) }
  getSpell(id: string) { return this.spellIndex.get(id) }
  getWeapon(id: string) { return this.weaponIndex.get(id) }
  getArmor(id: string) { return this.armorIndex.get(id) }
  getGear(id: string) { return this.gearIndex.get(id) }
  getBackground(id: string) { return this.backgroundIndex.get(id) }
  getDeity(id: string) { return this.deityIndex.get(id) }
  getLanguage(id: string) { return this.languageIndex.get(id) }
  getAncestry(id: string) { return this.ancestryIndex.get(id) }
  getClass(id: string) { return this.classIndex.get(id) }

  // Filtered lookups
  getSpellsByClass(spellClass: 'wizard' | 'priest' | 'witch' | 'seer') {
    return this.spells.filter(s => s.class === spellClass)
  }
  getSpellsByTier(tier: number) {
    return this.spells.filter(s => s.tier === tier)
  }
  getSpellsByClassAndTier(spellClass: 'wizard' | 'priest' | 'witch' | 'seer', tier: number) {
    return this.spells.filter(s => s.class === spellClass && s.tier === tier)
  }
  getMonstersByTag(tag: string) {
    return this.monsters.filter(m => m.tags.includes(tag))
  }
  getMonstersByLevel(level: number) {
    return this.monsters.filter(m => m.level === level)
  }
  getDeitiesByAlignment(alignment: string) {
    return this.deities.filter(d => d.alignment === alignment)
  }
  getTitle(characterClass: string, alignment: string, level: number): string {
    const entry = this.titles.find(
      t => t.class === characterClass && t.alignment === alignment && level >= t.levelRange[0] && level <= t.levelRange[1]
    )
    return entry?.title ?? 'Adventurer'
  }
  get commonLanguages() { return this.languages.filter(l => l.rarity === 'common') }
  get rareLanguages() { return this.languages.filter(l => l.rarity === 'rare') }

  // ========== Pack Tracking ==========

  getItemPackId(itemId: string): string | undefined {
    return this.itemPackMap.get(itemId)
  }

  getPackColor(packId: string): string | undefined {
    return this.packMetas.find(p => p.id === packId)?.color
  }

  setPackColor(packId: string, color: string | undefined) {
    const pack = this.packs.find(p => p.id === packId)
    if (!pack) return
    pack.color = color || undefined
    this.saveCustomPacks()
    this.rebuild()
    this.notify()
  }

  // ========== Pack Management ==========

  addPack(pack: DataPack): AddPackResult {
    const validation = validateDataPack(pack)
    if (!validation.valid) {
      return { success: false, error: validation.errors.join('; ') }
    }

    // Detect ID conflicts
    const warnings = this.detectConflicts(pack)

    // Default enabled to true if not set
    if (pack.enabled === undefined) pack.enabled = true

    // Remove existing pack with same ID
    this.packs = this.packs.filter(p => p.id !== pack.id)
    this.packs.push(pack)
    this.saveCustomPacks()
    this.rebuild()
    this.notify()
    return { success: true, warnings: warnings.length > 0 ? warnings : undefined }
  }

  removePack(packId: string) {
    this.packs = this.packs.filter(p => p.id !== packId)
    this.saveCustomPacks()
    this.rebuild()
    this.notify()
  }

  getPacks(): DataPackMeta[] {
    return this.packMetas
  }

  getPackById(packId: string): DataPack | undefined {
    return this.packs.find(p => p.id === packId)
  }

  exportPack(packId: string): string | null {
    const pack = this.packs.find(p => p.id === packId)
    if (!pack) return null
    // Strip 'enabled' from export so it defaults to true on reimport
    const { enabled: _, ...exportable } = pack
    return JSON.stringify(exportable, null, 2)
  }

  togglePack(packId: string) {
    const pack = this.packs.find(p => p.id === packId)
    if (!pack) return
    pack.enabled = pack.enabled === false ? true : false
    this.saveCustomPacks()
    this.rebuild()
    this.notify()
  }

  // ========== Change Notification ==========

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private notify() {
    this.listeners.forEach(fn => fn())
  }

  // ========== Internal ==========

  private detectConflicts(pack: DataPack): string[] {
    const warnings: string[] = []
    const coreData: Record<string, { id: string; name: string }[]> = {
      monsters: CORE_MONSTERS, spells: CORE_SPELLS, weapons: CORE_WEAPONS,
      armor: CORE_ARMOR, gear: CORE_GEAR, backgrounds: CORE_BACKGROUNDS,
      deities: CORE_DEITIES, languages: CORE_LANGUAGES,
      ancestries: CORE_ANCESTRIES, classes: CORE_CLASSES,
    }

    for (const [key, items] of Object.entries(pack.data)) {
      if (!Array.isArray(items)) continue
      const core = coreData[key]
      if (!core) continue
      const coreIds = new Set(core.map(c => c.id))

      for (const item of items) {
        if (coreIds.has(item.id)) {
          const coreName = core.find(c => c.id === item.id)?.name
          warnings.push(`${key}: "${item.name}" overrides core "${coreName ?? item.id}"`)
        }
      }

      // Check other packs
      for (const otherPack of this.packs) {
        if (otherPack.id === pack.id) continue
        const otherItems = otherPack.data[key as keyof typeof otherPack.data]
        if (!Array.isArray(otherItems)) continue
        const otherIds = new Set(otherItems.map((i: { id: string }) => i.id))
        for (const item of items) {
          if (otherIds.has(item.id)) {
            warnings.push(`${key}: "${item.name}" overrides same ID from pack "${otherPack.name}"`)
          }
        }
      }
    }

    return warnings
  }

  private rebuild() {
    // Collect custom data from enabled packs only
    const enabledPacks = this.packs.filter(p => p.enabled !== false)
    const customMonsters: MonsterDefinition[] = []
    const customSpells: SpellDefinition[] = []
    const customWeapons: WeaponDefinition[] = []
    const customArmor: ArmorDefinition[] = []
    const customGear: GearDefinition[] = []
    const customBackgrounds: BackgroundDefinition[] = []
    const customDeities: DeityDefinition[] = []
    const customLanguages: LanguageDefinition[] = []
    const customAncestries: AncestryDefinition[] = []
    const customClasses: ClassDefinition[] = []

    for (const pack of enabledPacks) {
      if (pack.data.monsters) customMonsters.push(...pack.data.monsters)
      if (pack.data.spells) customSpells.push(...pack.data.spells)
      if (pack.data.weapons) customWeapons.push(...pack.data.weapons)
      if (pack.data.armor) customArmor.push(...pack.data.armor)
      if (pack.data.gear) customGear.push(...pack.data.gear)
      if (pack.data.backgrounds) customBackgrounds.push(...pack.data.backgrounds)
      if (pack.data.deities) customDeities.push(...pack.data.deities)
      if (pack.data.languages) customLanguages.push(...pack.data.languages)
      if (pack.data.ancestries) customAncestries.push(...pack.data.ancestries)
      if (pack.data.classes) customClasses.push(...pack.data.classes)
    }

    // Merge core + custom (mutate in-place to keep exported references stable)
    replaceInPlace(this.monsters, mergeById(CORE_MONSTERS, customMonsters))
    replaceInPlace(this.spells, mergeById(CORE_SPELLS, customSpells))
    replaceInPlace(this.weapons, mergeById(CORE_WEAPONS, customWeapons))
    replaceInPlace(this.armor, mergeById(CORE_ARMOR, customArmor))
    replaceInPlace(this.gear, mergeById(CORE_GEAR, customGear))
    replaceInPlace(this.backgrounds, mergeById(CORE_BACKGROUNDS, customBackgrounds))
    replaceInPlace(this.deities, mergeById(CORE_DEITIES, customDeities))
    replaceInPlace(this.languages, mergeById(CORE_LANGUAGES, customLanguages))
    replaceInPlace(this.ancestries, mergeById(CORE_ANCESTRIES, customAncestries))
    replaceInPlace(this.classes, mergeById(CORE_CLASSES, customClasses))

    // Build item-to-pack map
    this.itemPackMap.clear()
    for (const pack of enabledPacks) {
      const categories = ['monsters', 'spells', 'weapons', 'armor', 'gear', 'backgrounds', 'deities', 'languages', 'ancestries', 'classes'] as const
      for (const key of categories) {
        const items = pack.data[key]
        if (items) {
          for (const item of items) {
            this.itemPackMap.set(item.id, pack.id)
          }
        }
      }
    }

    // Build indexes
    this.monsterIndex = buildIndex(this.monsters)
    this.spellIndex = buildIndex(this.spells)
    this.weaponIndex = buildIndex(this.weapons)
    this.armorIndex = buildIndex(this.armor)
    this.gearIndex = buildIndex(this.gear)
    this.backgroundIndex = buildIndex(this.backgrounds)
    this.deityIndex = buildIndex(this.deities)
    this.languageIndex = buildIndex(this.languages)
    this.ancestryIndex = buildIndex(this.ancestries)
    this.classIndex = buildIndex(this.classes)

    // Build pack metas
    this.packMetas = this.packs.map(p => ({
      id: p.id,
      name: p.name,
      author: p.author,
      version: p.version,
      description: p.description,
      enabled: p.enabled !== false,
      color: p.color,
      counts: {
        monsters: p.data.monsters?.length ?? 0,
        spells: p.data.spells?.length ?? 0,
        weapons: p.data.weapons?.length ?? 0,
        armor: p.data.armor?.length ?? 0,
        gear: p.data.gear?.length ?? 0,
        backgrounds: p.data.backgrounds?.length ?? 0,
        deities: p.data.deities?.length ?? 0,
        languages: p.data.languages?.length ?? 0,
        ancestries: p.data.ancestries?.length ?? 0,
        classes: p.data.classes?.length ?? 0,
      },
      addedAt: Date.now(),
    }))
  }

  private loadCustomPacks() {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) this.packs = JSON.parse(raw)
    } catch (err) {
      console.error('[DataRegistry] Failed to load custom packs:', err)
      this.packs = []
    }
  }

  private saveCustomPacks() {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.packs))
    } catch (err) {
      console.error('[DataRegistry] Failed to save custom packs:', err)
    }
  }
}

// Global singleton
export const dataRegistry = new DataRegistry()
