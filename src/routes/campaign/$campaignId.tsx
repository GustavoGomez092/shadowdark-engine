import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useCampaignStore } from '@/stores/campaign-store.ts'

export const Route = createFileRoute('/campaign/$campaignId')({
  component: CampaignLayout,
})

function CampaignLayout() {
  const navigate = useNavigate()
  const { campaignId } = Route.useParams()
  const campaign = useCampaignStore(s => s.campaign)
  const loadCampaign = useCampaignStore(s => s.loadCampaign)

  useEffect(() => {
    if (!campaign || campaign.id !== campaignId) {
      const loaded = loadCampaign(campaignId)
      if (!loaded) navigate({ to: '/campaign' })
    }
  }, [campaign, campaignId, loadCampaign, navigate])

  if (!campaign) return null

  return <Outlet />
}
