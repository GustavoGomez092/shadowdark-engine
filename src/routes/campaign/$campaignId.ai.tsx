import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useCampaignStore } from '@/stores/campaign-store.ts'
import { useLocale } from '@/hooks/use-locale.ts'
import { useAISettings } from '@/hooks/use-ai-settings.ts'
import { AIClient } from '@/lib/ai/client.ts'
import { buildCampaignSystemPrompt, CAMPAIGN_PURPOSE_LABELS, CAMPAIGN_PURPOSE_ICONS } from '@/lib/ai/campaign-prompts.ts'
import type { CampaignAIPurpose } from '@/lib/ai/campaign-prompts.ts'

export const Route = createFileRoute('/campaign/$campaignId/ai')({
  component: CampaignAIPage,
})

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

function CampaignAIPage() {
  const { t } = useLocale()
  const campaign = useCampaignStore(s => s.campaign)
  const { activeProvider } = useAISettings()

  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [activePurpose, setActivePurpose] = useState<CampaignAIPurpose>('general_campaign')
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streamingText])

  const handleSend = useCallback(async (text?: string) => {
    const prompt = (text ?? inputValue).trim()
    if (!prompt || isGenerating || !activeProvider || !campaign) return

    setInputValue('')
    setError(null)
    setIsGenerating(true)
    setStreamingText('')

    const userMsg: Message = { role: 'user', content: prompt, timestamp: Date.now() }
    setMessages(prev => [...prev, userMsg])

    try {
      const client = new AIClient(activeProvider)
      const systemPrompt = buildCampaignSystemPrompt(activePurpose, campaign)

      const allMessages = [
        ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content: prompt },
      ]

      abortRef.current = new AbortController()
      let fullResponse = ''

      await client.stream(
        systemPrompt,
        allMessages,
        (chunk) => {
          fullResponse += chunk
          setStreamingText(fullResponse)
        },
        abortRef.current.signal,
      )

      setMessages(prev => [...prev, { role: 'assistant', content: fullResponse, timestamp: Date.now() }])
      setStreamingText('')
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Generation failed')
      }
    } finally {
      setIsGenerating(false)
      abortRef.current = null
    }
  }, [inputValue, isGenerating, activeProvider, campaign, messages, activePurpose])

  function handleAbort() {
    abortRef.current?.abort()
    setIsGenerating(false)
    if (streamingText) {
      setMessages(prev => [...prev, { role: 'assistant', content: streamingText, timestamp: Date.now() }])
      setStreamingText('')
    }
  }

  function handleQuickAction(purpose: CampaignAIPurpose) {
    setActivePurpose(purpose)
    setMessages([])
    const defaultPrompts: Record<CampaignAIPurpose, string> = {
      lore_generation: 'Generate background lore for this campaign world',
      room_description: 'Describe a new room for this dungeon',
      npc_backstory: 'Create an interesting NPC for this adventure',
      monster_stats: 'Design a custom monster appropriate for this adventure',
      encounter_composition: 'Design an encounter for the party',
      treasure_table: 'Create a treasure table for this adventure',
      general_campaign: '',
    }
    if (defaultPrompts[purpose]) {
      handleSend(defaultPrompts[purpose])
    }
  }

  if (!campaign) return null

  const purposes = Object.keys(CAMPAIGN_PURPOSE_LABELS) as CampaignAIPurpose[]

  return (
    <main className="mx-auto max-w-3xl px-3 py-4 sm:px-4 sm:py-8 flex flex-col h-[calc(100vh-120px)]">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('campaign.nav.ai')}</h1>
        {messages.length > 0 && (
          <button onClick={() => { setMessages([]); setStreamingText('') }} className="text-xs text-muted-foreground hover:text-foreground">
            Clear
          </button>
        )}
      </div>

      {/* No provider configured */}
      {!activeProvider ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-sm text-muted-foreground">Configure an AI provider in Settings to use the AI helper.</p>
          <button onClick={() => navigate({ to: '/gm/settings' })} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            Open Settings
          </button>
        </div>
      ) : (
        <>
          {/* Quick Actions (when no messages) */}
          {messages.length === 0 && !isGenerating && (
            <div className="mb-4 rounded-xl border border-border bg-card p-4">
              <p className="mb-3 text-xs font-semibold text-muted-foreground">Quick Actions</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {purposes.filter(p => p !== 'general_campaign').map(purpose => (
                  <button
                    key={purpose}
                    onClick={() => handleQuickAction(purpose)}
                    className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2 text-left text-xs transition hover:bg-accent"
                  >
                    <span>{CAMPAIGN_PURPOSE_ICONS[purpose]}</span>
                    <span className="truncate">{CAMPAIGN_PURPOSE_LABELS[purpose]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active purpose badge */}
          {messages.length > 0 && (
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{CAMPAIGN_PURPOSE_ICONS[activePurpose]}</span>
              <span className="font-medium">{CAMPAIGN_PURPOSE_LABELS[activePurpose]}</span>
              <span>· {messages.length} messages</span>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto mb-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
                <div className={`inline-block max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user' ? 'bg-primary/10' : 'bg-accent'
                }`}>
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {isGenerating && (
              <div className="text-left">
                <div className="inline-block max-w-[85%] rounded-lg bg-accent px-3 py-2 text-sm">
                  {streamingText ? (
                    <div className="whitespace-pre-wrap break-words">{streamingText}<span className="ml-0.5 animate-pulse">|</span></div>
                  ) : (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                      <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Ask the AI to help with your campaign..."
              rows={1}
              className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
            />
            {isGenerating ? (
              <button onClick={handleAbort} className="shrink-0 rounded-lg bg-red-500/80 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-500">Stop</button>
            ) : (
              <button onClick={() => handleSend()} disabled={!inputValue.trim()} className="shrink-0 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-40">Send</button>
            )}
          </div>
        </>
      )}
    </main>
  )
}
