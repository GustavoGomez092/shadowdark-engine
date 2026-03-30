import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useSessionStore } from '@/stores/session-store.ts'
import { GMHeader } from '@/components/gm/gm-header.tsx'

export const Route = createFileRoute('/gm')({
  component: GMLayout,
})

function GMLayout() {
  const isActive = useSessionStore(s => s.isActive)

  return (
    <div className="min-h-screen">
      {isActive && <GMHeader />}
      <Outlet />
    </div>
  )
}
