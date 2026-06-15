import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useSessionStore } from '@/stores/session-store.ts'
import { GMHeader } from '@/components/gm/gm-header.tsx'
import { AIPanel } from '@/components/ai/ai-panel.tsx'
import { dataRegistry } from '@/lib/data/registry.ts'
import { resolveSessionCampaign } from '@/lib/campaign/session-campaign.ts'

export const Route = createFileRoute('/gm')({
  component: GMLayout,
})

function GMLayout() {
  const isActive = useSessionStore(s => s.isActive)
  const campaignId = useSessionStore(s => s.session?.meta.campaignId)
  const [showAIPanel, setShowAIPanel] = useState(false)

  // Register the working campaign's content (monsters/items/spells) as an ephemeral
  // session pack so campaign ("story") monsters spawned via the adventure filter
  // resolve everywhere a definition is looked up by id — initiative, combat
  // statblocks, stores. Without this getMonster() returns undefined for them, which
  // silently drops them from the encounter (breaking "Roll Initiative") and shows no
  // stats in battle. Mounted on the GM shell so it applies across every tab.
  useEffect(() => {
    const camp = isActive ? resolveSessionCampaign(campaignId) : null
    dataRegistry.setSessionPacks(camp ? [{
      id: `campaign:${camp.id}`,
      name: camp.name,
      author: camp.author || 'Campaign',
      version: '1',
      description: `Session content for ${camp.name}`,
      enabled: true,
      data: camp.content,
    }] : [])
    return () => dataRegistry.setSessionPacks([])
  }, [isActive, campaignId])

  return (
    <div className="min-h-screen">
      <GMHeader />
      <Outlet />

      {/* AI — available on all GM pages when session is active */}
      {isActive && (
        <>
          <button
            onClick={() => setShowAIPanel(true)}
            className="fixed right-6 bottom-6 z-30 flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition hover:opacity-90 hover:scale-105"
            title="Open AI Assistant"
          >
            <span>✨</span> AI
          </button>
          <AIPanel isOpen={showAIPanel} onClose={() => setShowAIPanel(false)} />
        </>
      )}
    </div>
  )
}
