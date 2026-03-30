import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/player')({
  component: PlayerLayout,
})

function PlayerLayout() {
  return (
    <div className="min-h-screen">
      <Outlet />
    </div>
  )
}
