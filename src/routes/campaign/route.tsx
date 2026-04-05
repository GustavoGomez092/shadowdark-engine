import { createFileRoute, Outlet } from '@tanstack/react-router'
import { CampaignHeader } from '@/components/campaign/campaign-header.tsx'

export const Route = createFileRoute('/campaign')({
  component: CampaignLayout,
})

function CampaignLayout() {
  return (
    <div className="min-h-screen">
      <CampaignHeader />
      <Outlet />
    </div>
  )
}
