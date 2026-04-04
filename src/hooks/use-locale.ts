import { useSyncExternalStore } from 'react'
import { getLocale, setLocale, subscribe, t, ti, getAvailableLocales } from '@/i18n/index.ts'
import type { SupportedLocale } from '@/i18n/index.ts'

let version = 0
subscribe(() => { version++ })

function getSnapshot() {
  return version
}

function getServerSnapshot() {
  return 0
}

/**
 * React hook for i18n. Returns translation functions and locale management.
 * Re-renders the component when the locale changes.
 */
export function useLocale() {
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  return {
    t,
    ti,
    locale: getLocale(),
    setLocale: setLocale as (locale: SupportedLocale) => void,
    availableLocales: getAvailableLocales(),
  }
}
