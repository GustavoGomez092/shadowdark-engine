import { useSessionStore } from '@/stores/session-store.ts'
import { resolveSessionCampaign } from '@/lib/campaign/session-campaign.ts'
import { listSavedCampaigns } from '@/stores/campaign-store.ts'
import type { Campaign } from '@/schemas/campaign.ts'

/** Resolve the session's working campaign + the saved-campaign list for linking. */
export function useWorkingCampaign(): { campaign: Campaign | null; saved: { id: string; name: string }[]; link: (c: { id: string; name: string }) => void } {
  const campaignId = useSessionStore(s => s.session?.meta.campaignId)
  const link = useSessionStore(s => s.linkCampaign)
  const saved = listSavedCampaigns().map(c => ({ id: c.id, name: c.name }))
  const campaign = resolveSessionCampaign(campaignId)
  return { campaign, saved, link }
}

/**
 * Small control to pick which saved campaign is the session's "working adventure".
 * Drives the store import + monster filter. Hidden when no campaigns are saved.
 */
export function WorkingCampaignBar() {
  const { campaign, saved, link } = useWorkingCampaign()
  if (saved.length === 0) return null

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
      <span className="text-muted-foreground">Working adventure:</span>
      <select
        value={campaign?.id ?? ''}
        onChange={e => {
          const c = saved.find(s => s.id === e.target.value)
          if (c) link(c)
        }}
        className="rounded-lg border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="" disabled>Select a campaign…</option>
        {saved.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      {!campaign && saved.length > 1 && (
        <span className="text-xs text-amber-400">Pick the campaign this session runs.</span>
      )}
    </div>
  )
}
