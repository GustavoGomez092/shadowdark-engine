import type { AISettings } from '@/schemas/ai.ts'
import { DEFAULT_AI_SETTINGS } from '@/schemas/ai.ts'

const STORAGE_KEY = 'shadowdark:ai-settings'

export function loadAISettings(): AISettings {
  if (typeof window === 'undefined') return DEFAULT_AI_SETTINGS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      // Merge with defaults to handle new fields added in updates
      return { ...DEFAULT_AI_SETTINGS, ...parsed }
    }
  } catch (err) {
    console.error('[AI] Failed to load settings:', err)
  }
  return { ...DEFAULT_AI_SETTINGS }
}

export function saveAISettings(settings: AISettings): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (err) {
    console.error('[AI] Failed to save settings:', err)
  }
}
