// Import all locale JSON files statically (bundled, no lazy loading needed for 2 languages)
import enUi from './locales/en/ui.json'
import esUi from './locales/es/ui.json'

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
 * Example: t('greeting', { name: 'Kingler' }) → "Hello, Kingler!"
 */
export function ti(key: string, vars: Record<string, string | number>): string {
  let result = t(key)
  for (const [k, v] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v))
  }
  return result
}
