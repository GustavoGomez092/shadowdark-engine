import { useState, useEffect, useCallback } from 'react'
import type { AISettings, AIProviderConfig, OllamaModel } from '@/schemas/ai.ts'
import { DEFAULT_AI_SETTINGS } from '@/schemas/ai.ts'
import { loadAISettings, saveAISettings } from '@/lib/ai/settings.ts'
import { AIClient } from '@/lib/ai/client.ts'
import { generateId } from '@/lib/utils/id.ts'

export function useAISettings() {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_AI_SETTINGS)
  const [isOllamaAvailable, setIsOllamaAvailable] = useState(false)
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([])
  const [isDetecting, setIsDetecting] = useState(false)

  // Derive active provider from current settings
  const activeProvider = settings.providers.find(
    (p) => p.id === settings.activeProviderId,
  )

  // --- Settings mutations ----------------------------------------------------

  const updateSettings = useCallback(
    (partial: Partial<AISettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...partial }
        saveAISettings(next)
        return next
      })
    },
    [],
  )

  const addProvider = useCallback(
    (provider: Omit<AIProviderConfig, 'id'>) => {
      setSettings((prev) => {
        const newProvider: AIProviderConfig = { ...provider, id: generateId() }
        const next: AISettings = {
          ...prev,
          providers: [...prev.providers, newProvider],
        }
        // If this is the first provider, auto-activate it
        if (!prev.activeProviderId) {
          next.activeProviderId = newProvider.id
        }
        saveAISettings(next)
        return next
      })
    },
    [],
  )

  const removeProvider = useCallback(
    (id: string) => {
      setSettings((prev) => {
        const next: AISettings = {
          ...prev,
          providers: prev.providers.filter((p) => p.id !== id),
        }
        // Clear active provider if it was removed
        if (prev.activeProviderId === id) {
          next.activeProviderId = next.providers[0]?.id
        }
        saveAISettings(next)
        return next
      })
    },
    [],
  )

  const updateProvider = useCallback(
    (id: string, partial: Partial<AIProviderConfig>) => {
      setSettings((prev) => {
        const next: AISettings = {
          ...prev,
          providers: prev.providers.map((p) =>
            p.id === id ? { ...p, ...partial } : p,
          ),
        }
        saveAISettings(next)
        return next
      })
    },
    [],
  )

  const setActiveProvider = useCallback(
    (id: string) => {
      setSettings((prev) => {
        const next: AISettings = { ...prev, activeProviderId: id }
        saveAISettings(next)
        return next
      })
    },
    [],
  )

  // --- Ollama detection ------------------------------------------------------

  const detectOllama = useCallback(async () => {
    setIsDetecting(true)
    try {
      const models = await AIClient.detectOllama()

      if (models && models.length > 0) {
        setIsOllamaAvailable(true)
        setOllamaModels(models)

        // Auto-create an Ollama provider if one doesn't already exist
        setSettings((prev) => {
          const hasOllama = prev.providers.some((p) => p.type === 'ollama')
          if (hasOllama) return prev

          const newProvider: AIProviderConfig = {
            id: generateId(),
            name: 'Ollama (Local)',
            type: 'ollama',
            endpoint: 'http://localhost:11434',
            model: models[0].name,
            isFree: true,
          }

          const next: AISettings = {
            ...prev,
            providers: [...prev.providers, newProvider],
            activeProviderId: prev.activeProviderId ?? newProvider.id,
          }
          saveAISettings(next)
          return next
        })
      } else {
        setIsOllamaAvailable(false)
        setOllamaModels([])
      }
    } catch {
      setIsOllamaAvailable(false)
      setOllamaModels([])
    } finally {
      setIsDetecting(false)
    }
  }, [])

  // --- Initialisation --------------------------------------------------------

  useEffect(() => {
    const loaded = loadAISettings()
    setSettings(loaded)

    if (loaded.ollamaAutoDetect) {
      detectOllama()
    }
    // detectOllama is stable (useCallback with no deps), safe to include
  }, [detectOllama])

  return {
    settings,
    updateSettings,
    activeProvider,
    addProvider,
    removeProvider,
    updateProvider,
    setActiveProvider,
    isOllamaAvailable,
    ollamaModels,
    detectOllama,
    isDetecting,
  }
}
