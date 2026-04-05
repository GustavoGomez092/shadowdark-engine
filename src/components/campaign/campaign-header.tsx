import { Link, useMatches } from '@tanstack/react-router'
import { useCampaignStore } from '@/stores/campaign-store.ts'
import { useLocale } from '@/hooks/use-locale.ts'
import { LOCALE_LABELS } from '@/i18n/index.ts'

const NAV_ITEMS = [
  { key: 'campaign.nav.overview', href: '/campaign/$campaignId', matchEnd: true },
  { key: 'campaign.nav.content', href: '/campaign/$campaignId/content', matchEnd: false },
  { key: 'campaign.nav.adventure', href: '/campaign/$campaignId/adventure', matchEnd: false },
  { key: 'campaign.nav.lore', href: '/campaign/$campaignId/lore', matchEnd: false },
  { key: 'campaign.nav.map', href: '/campaign/$campaignId/map', matchEnd: false },
  { key: 'campaign.nav.ai', href: '/campaign/$campaignId/ai', matchEnd: false },
  { key: 'campaign.nav.mapgen2', href: '/campaign/$campaignId/mapgen2', matchEnd: false },
]

export function CampaignHeader() {
  const { t, locale, setLocale, availableLocales } = useLocale()
  const campaign = useCampaignStore(s => s.campaign)

  const matches = useMatches()
  const currentPath = matches[matches.length - 1]?.fullPath ?? ''

  if (!campaign) {
    return (
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30 overflow-x-hidden">
        <div className="mx-auto max-w-7xl px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold sm:text-xl">{t('campaign.title')}</h1>
              <p className="text-xs text-muted-foreground">{t('campaign.subtitle')}</p>
            </div>
            <Link to="/campaign" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
              {t('campaign.backToList')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const campaignId = campaign.id

  function isActive(href: string) {
    const resolved = href.replace('$campaignId', campaignId)
    if (href.endsWith('$campaignId')) return currentPath === resolved
    return currentPath.startsWith(resolved)
  }

  return (
    <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30 overflow-x-hidden">
      <div className="mx-auto max-w-7xl px-3 py-2 sm:px-4 sm:py-3">
        {/* Top row */}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 sm:mb-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold sm:text-xl">{campaign.name}</h1>
            <p className="text-xs text-muted-foreground">{t('campaign.subtitle')}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/campaign"
              className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent transition"
            >
              {t('campaign.backToList')}
            </Link>
            <select
              value={locale}
              onChange={e => setLocale(e.target.value as typeof locale)}
              className="rounded-lg border border-border bg-card px-2 py-1 text-xs outline-none"
            >
              {availableLocales.map(l => (
                <option key={l} value={l}>{LOCALE_LABELS[l]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Nav row */}
        <div className="-mx-3 flex gap-1 overflow-x-auto px-3 pb-0.5 sm:mx-0 sm:gap-1.5 sm:px-0 scrollbar-hide">
          {NAV_ITEMS.map(item => {
            const href = item.href.replace('$campaignId', campaignId)
            const active = isActive(item.href)

            return (
              <Link
                key={item.key}
                to={href}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition sm:px-3 sm:py-2 sm:text-sm ${
                  active
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'border border-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {t(item.key)}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
