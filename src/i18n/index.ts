// Import all locale JSON files statically (bundled, no lazy loading needed for 2 languages)
import enUi from './locales/en/ui.json'
import esUi from './locales/es/ui.json'

// Data overlays — Spanish translations for game content
import esMonsters from './locales/es/monsters.json'
import esSpells from './locales/es/spells.json'
import esClasses from './locales/es/classes.json'
import esGear from './locales/es/gear.json'
import esWeapons from './locales/es/weapons.json'
import esArmor from './locales/es/armor.json'
import esAncestries from './locales/es/ancestries.json'
import esBackgrounds from './locales/es/backgrounds.json'
import esDeities from './locales/es/deities.json'
import esTitles from './locales/es/titles.json'

const STORAGE_KEY = 'shadowdark:locale'
const SUPPORTED_LOCALES = ['en', 'es'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: 'English',
  es: 'Español',
}

// All UI translations indexed by locale
const UI_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: enUi,
  es: esUi,
}

// Data overlays: locale → category → id → { field: translated value }
type DataOverlay = Record<string, Record<string, Record<string, string>>>

const DATA_OVERLAYS: Record<string, DataOverlay> = {
  es: {
    monsters: esMonsters,
    spells: esSpells,
    classes: esClasses,
    gear: esGear,
    weapons: esWeapons,
    armor: esArmor,
    ancestries: esAncestries,
    backgrounds: esBackgrounds,
    deities: esDeities,
    titles: esTitles,
  },
}

// ========== Locale State ==========

let currentLocale: SupportedLocale = 'en'
const listeners = new Set<() => void>()

function detectLocale(): SupportedLocale {
  if (typeof window === 'undefined') return 'en'
  // Check localStorage first
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && SUPPORTED_LOCALES.includes(stored as SupportedLocale)) {
    return stored as SupportedLocale
  }
  // Check browser language
  const browserLang = navigator.language.slice(0, 2)
  if (SUPPORTED_LOCALES.includes(browserLang as SupportedLocale)) {
    return browserLang as SupportedLocale
  }
  return 'en'
}

// Initialize on load
currentLocale = detectLocale()

export function getLocale(): SupportedLocale {
  return currentLocale
}

export function setLocale(locale: SupportedLocale) {
  if (!SUPPORTED_LOCALES.includes(locale)) return
  currentLocale = locale
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, locale)
  }
  listeners.forEach(fn => fn())
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function getAvailableLocales(): SupportedLocale[] {
  return [...SUPPORTED_LOCALES]
}

// ========== Translation Function ==========

/**
 * Translate a UI string key. Falls back: current locale → English → key itself.
 */
export function t(key: string, fallback?: string): string {
  const localeStrings = UI_TRANSLATIONS[currentLocale]
  if (localeStrings?.[key]) return localeStrings[key]
  // Fallback to English
  if (currentLocale !== 'en') {
    const enStrings = UI_TRANSLATIONS['en']
    if (enStrings?.[key]) return enStrings[key]
  }
  return fallback ?? key
}

/**
 * Translate with interpolation. Replaces {{name}} placeholders.
 * Example: ti('greeting', { name: 'Kingler' }) → "Hello, Kingler!"
 */
export function ti(key: string, vars: Record<string, string | number>): string {
  let result = t(key)
  for (const [k, v] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v))
  }
  return result
}

// ========== Data Translation ==========

/**
 * Translate game data fields. Falls back to the original English value.
 * Usage: tData('monsters', 'goblin', 'name', 'Goblin') → "Trasgo" (es) or "Goblin" (en)
 */
export function tData(category: string, id: string, field: string, fallback: string): string {
  if (currentLocale === 'en') return fallback
  const overlay = DATA_OVERLAYS[currentLocale]
  if (!overlay) return fallback
  const categoryData = overlay[category]
  if (!categoryData) return fallback
  const itemData = categoryData[id]
  if (!itemData) return fallback
  return itemData[field] ?? fallback
}

/**
 * Translate nested game data (e.g., class features, nested within a class).
 * Usage: tDataNested('classes', 'fighter', ['features', 'hauler', 'name'], 'Hauler')
 */
export function tDataNested(category: string, id: string, path: string[], fallback: string): string {
  if (currentLocale === 'en') return fallback
  const overlay = DATA_OVERLAYS[currentLocale]
  if (!overlay) return fallback
  const categoryData = overlay[category]
  if (!categoryData) return fallback
  let current: unknown = categoryData[id]
  for (const key of path) {
    if (!current || typeof current !== 'object') return fallback
    current = (current as Record<string, unknown>)[key]
  }
  return typeof current === 'string' ? current : fallback
}
