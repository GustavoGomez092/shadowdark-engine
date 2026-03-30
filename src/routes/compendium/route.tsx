import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/compendium')({
  component: CompendiumLayout,
})

function CompendiumLayout() {
  return (
    <div className="min-h-screen">
      <Outlet />
    </div>
  )
}
