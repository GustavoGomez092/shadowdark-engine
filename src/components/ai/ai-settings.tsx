import { useState, useEffect } from 'react'
import { useAISettings } from '@/hooks/use-ai-settings.ts'
import type { AIProviderType } from '@/schemas/ai.ts'

export function AISettingsPanel() {
  const {
    settings,
    updateSettings,
    activeProvider,
    addProvider,
    removeProvider,
    setActiveProvider,
    isOllamaAvailable,
    ollamaModels,
    detectOllama,
    isDetecting,
  } = useAISettings()

  // Local state for generation settings — only saved on explicit "Save"
  const [temperature, setTemperature] = useState(settings.temperature)
  const [maxTokens, setMaxTokens] = useState(settings.maxTokens)
  const [enableStreaming, setEnableStreaming] = useState(settings.enableStreaming)
  const [customSystemPrompt, setCustomSystemPrompt] = useState(settings.customSystemPrompt ?? '')
  const [saved, setSaved] = useState(false)

  // Sync local state when settings load from localStorage on mount/refresh
  useEffect(() => {
    setTemperature(settings.temperature)
    setMaxTokens(settings.maxTokens)
    setEnableStreaming(settings.enableStreaming)
    setCustomSystemPrompt(settings.customSystemPrompt ?? '')
  }, [settings.temperature, settings.maxTokens, settings.enableStreaming, settings.customSystemPrompt])

  function saveGenerationSettings() {
    updateSettings({
      temperature,
      maxTokens,
      enableStreaming,
      customSystemPrompt: customSystemPrompt.trim() || undefined,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const [showAddForm, setShowAddForm] = useState(false)
  const [formType, setFormType] = useState<AIProviderType>('ollama')
  const [formName, setFormName] = useState('')
  const [formEndpoint, setFormEndpoint] = useState('http://localhost:11434')
  const [formApiKey, setFormApiKey] = useState('')
  const [formModel, setFormModel] = useState('')
  const [formIsFree, setFormIsFree] = useState(true)

  function resetForm() {
    setFormName('')
    setFormEndpoint(formType === 'ollama' ? 'http://localhost:11434' : 'https://api.openai.com')
    setFormApiKey('')
    setFormModel('')
    setFormIsFree(formType === 'ollama')
  }

  function handleTypeChange(type: AIProviderType) {
    setFormType(type)
    setFormEndpoint(type === 'ollama' ? 'http://localhost:11434' : 'https://api.openai.com')
    setFormIsFree(type === 'ollama')
    setFormModel('')
  }

  function handleAdd() {
    if (!formName.trim() || !formModel.trim()) return
    addProvider({
      name: formName.trim(),
      type: formType,
      endpoint: formEndpoint.trim(),
      apiKey: formType === 'openai-compatible' ? formApiKey.trim() : undefined,
      model: formModel.trim(),
      isFree: formIsFree,
    })
    resetForm()
    setShowAddForm(false)
  }

  const hasOllamaProvider = settings.providers.some((p) => p.type === 'ollama')

  return (
    <div className="space-y-6">
      {/* Provider Setup */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 font-semibold">AI Provider Setup</h2>

        {/* Ollama Detection Banner */}
        {isOllamaAvailable ? (
          <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-green-400">
              <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
              Ollama detected!
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {ollamaModels.length} model{ollamaModels.length !== 1 ? 's' : ''} available:{' '}
              {ollamaModels.map((m) => m.name).join(', ')}
            </p>
            {!hasOllamaProvider && (
              <button
                onClick={detectOllama}
                className="mt-2 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition"
              >
                Use Ollama
              </button>
            )}
          </div>
        ) : isDetecting ? (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Checking for Ollama...
          </div>
        ) : (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">
              Ollama not detected. Install Ollama for free local AI.
            </p>
            <button
              onClick={detectOllama}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition"
            >
              Re-detect
            </button>
          </div>
        )}

        {/* Configured Providers List */}
        {settings.providers.length > 0 && (
          <div className="mb-4 space-y-2">
            {settings.providers.map((provider) => (
              <div
                key={provider.id}
                className={`flex items-center justify-between rounded-lg border p-3 text-sm transition ${
                  provider.id === settings.activeProviderId
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border bg-muted/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  {provider.id === settings.activeProviderId && (
                    <span className="inline-block h-2 w-2 rounded-full bg-primary" title="Active" />
                  )}
                  <div>
                    <span className="font-medium">{provider.name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          provider.type === 'ollama'
                            ? 'bg-green-500/15 text-green-400'
                            : 'bg-blue-500/15 text-blue-400'
                        }`}
                      >
                        {provider.type === 'ollama' ? 'Ollama' : 'OpenAI'}
                      </span>
                      <span className="text-xs text-muted-foreground">{provider.model}</span>
                      <span className="text-[10px] text-muted-foreground">{provider.endpoint}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {provider.id !== settings.activeProviderId && (
                    <button
                      onClick={() => setActiveProvider(provider.id)}
                      className="rounded border border-border px-2 py-1 text-xs hover:bg-accent transition"
                    >
                      Activate
                    </button>
                  )}
                  <button
                    onClick={() => removeProvider(provider.id)}
                    className="rounded border border-red-500/30 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 transition"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Provider Toggle */}
        <button
          onClick={() => {
            setShowAddForm(!showAddForm)
            if (!showAddForm) resetForm()
          }}
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent transition"
        >
          {showAddForm ? 'Cancel' : 'Add Provider'}
        </button>

        {/* Add Provider Form */}
        {showAddForm && (
          <div className="mt-4 space-y-3 rounded-lg border border-border bg-muted/20 p-4">
            {/* Type Selector */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleTypeChange('ollama')}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    formType === 'ollama'
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border hover:bg-accent'
                  }`}
                >
                  Ollama
                </button>
                <button
                  onClick={() => handleTypeChange('openai-compatible')}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    formType === 'openai-compatible'
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border hover:bg-accent'
                  }`}
                >
                  OpenAI-compatible
                </button>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={formType === 'ollama' ? 'My Ollama' : 'OpenAI'}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            {/* Endpoint */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Endpoint URL</label>
              <input
                type="text"
                value={formEndpoint}
                onChange={(e) => setFormEndpoint(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary"
              />
            </div>

            {/* API Key (OpenAI only) */}
            {formType === 'openai-compatible' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">API Key</label>
                <input
                  type="password"
                  value={formApiKey}
                  onChange={(e) => setFormApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary"
                />
              </div>
            )}

            {/* Model */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Model</label>
              {formType === 'ollama' && ollamaModels.length > 0 ? (
                <select
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="">Select a model...</option>
                  {ollamaModels.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value)}
                  placeholder={formType === 'ollama' ? 'llama3.2' : 'gpt-4o-mini'}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              )}
            </div>

            {/* Is Free */}
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={formIsFree}
                onChange={(e) => setFormIsFree(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <span>Free provider (no per-token charges)</span>
            </label>

            {/* Paid Provider Warning */}
            {!formIsFree && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-400">
                This provider charges per token. API calls will cost money.
              </div>
            )}

            {/* Add Button */}
            <button
              onClick={handleAdd}
              disabled={!formName.trim() || !formModel.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Provider
            </button>
          </div>
        )}
      </div>

      {/* Generation Settings + Custom Prompt + Save */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-1 font-semibold">Generation Settings</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Control how AI responses are generated.
        </p>

        <div className="space-y-4">
          {/* Temperature */}
          <div>
            <label className="mb-1.5 flex items-center justify-between text-sm">
              <span>Temperature</span>
              <span className="font-mono text-xs text-muted-foreground">{temperature.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>Precise (0.0)</span>
              <span>Creative (2.0)</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div>
            <label className="mb-1.5 flex items-center justify-between text-sm">
              <span>Max Tokens</span>
              <span className="font-mono text-xs text-muted-foreground">{maxTokens}</span>
            </label>
            <input
              type="number"
              min={100}
              max={4000}
              step={100}
              value={maxTokens}
              onChange={(e) => {
                const val = parseInt(e.target.value)
                if (!isNaN(val) && val >= 100 && val <= 4000) {
                  setMaxTokens(val)
                }
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono outline-none focus:border-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>100</span>
              <span>4000</span>
            </div>
          </div>

          {/* Streaming Toggle */}
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={enableStreaming}
              onChange={(e) => setEnableStreaming(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            <span>Enable streaming responses</span>
          </label>
        </div>

        {/* Custom System Prompt */}
        <div className="mt-6 border-t border-border pt-4">
          <h3 className="mb-1 font-semibold text-sm">Custom System Prompt</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Appended to all AI prompts. Use for campaign-specific context, world lore, or tone preferences.
          </p>
          <textarea
            value={customSystemPrompt}
            onChange={(e) => setCustomSystemPrompt(e.target.value)}
            placeholder="e.g. The campaign is set in a grim, low-magic world called Duskhollow..."
            rows={4}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary resize-y"
          />
        </div>

        {/* Save Button */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={saveGenerationSettings}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
          >
            Save Settings
          </button>
          {saved && <span className="text-xs text-green-400">Saved!</span>}
        </div>
      </div>

      {/* Token Usage */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 font-semibold">Token Usage</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Session tokens used:</span>
            <span className="font-mono">{settings.tokenUsage.session.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Lifetime tokens used:</span>
            <span className="font-mono">{settings.tokenUsage.lifetime.toLocaleString()}</span>
          </div>
        </div>
        <button
          onClick={() =>
            updateSettings({
              tokenUsage: { ...settings.tokenUsage, session: 0 },
            })
          }
          className="mt-3 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition"
        >
          Reset session counter
        </button>
      </div>
    </div>
  )
}
