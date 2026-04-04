import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useState } from 'react'
import { useSessionStore } from '@/stores/session-store.ts'
import { GMHeader } from '@/components/gm/gm-header.tsx'
import { AIPanel } from '@/components/ai/ai-panel.tsx'

export const Route = createFileRoute('/gm')({
  component: GMLayout,
})

function GMLayout() {
  const isActive = useSessionStore(s => s.isActive)
  const [showAIPanel, setShowAIPanel] = useState(false)

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
