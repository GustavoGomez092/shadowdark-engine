import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useCampaignStore } from '@/stores/campaign-store.ts'
import { useLocale } from '@/hooks/use-locale.ts'
import { exportAsDataPack, exportAdventureDocument, downloadJson } from '@/lib/campaign/export.ts'
import { generateAdventurePDF } from '@/lib/campaign/pdf/generate-pdf.ts'

export const Route = createFileRoute('/campaign/$campaignId/')({
  component: CampaignOverviewPage,
})

function CampaignOverviewPage() {
  const { t } = useLocale()
  const campaign = useCampaignStore(s => s.campaign)
  const updateMeta = useCampaignStore(s => s.updateMeta)
  const [pdfExporting, setPdfExporting] = useState(false)
  const [pdfStatus, setPdfStatus] = useState('')

  if (!campaign) return null

  const monsterCount = campaign.content.monsters?.length ?? 0
  const spellCount = campaign.content.spells?.length ?? 0
  const weaponCount = campaign.content.weapons?.length ?? 0
  const armorCount = campaign.content.armor?.length ?? 0
  const gearCount = campaign.content.gear?.length ?? 0
  const totalContent = monsterCount + spellCount + weaponCount + armorCount + gearCount
  const roomCount = campaign.adventure.rooms.length
  const npcCount = campaign.adventure.npcs.length
  const chapterCount = campaign.lore.chapters.length
  const mapCount = campaign.maps.length

  return (
    <main className="mx-auto max-w-5xl px-3 py-4 sm:px-4 sm:py-8">
      {/* Campaign Info */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6 mb-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">{t('campaign.campaignName')}</label>
            <input
              type="text"
              value={campaign.name}
              onChange={e => updateMeta({ name: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">{t('campaign.authorName')}</label>
            <input
              type="text"
              value={campaign.author}
              onChange={e => updateMeta({ author: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">{t('campaign.version')}</label>
            <input
              type="text"
              value={campaign.version}
              onChange={e => updateMeta({ version: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">{t('campaign.description')}</label>
          <textarea
            value={campaign.description}
            onChange={e => updateMeta({ description: e.target.value })}
            placeholder={t('campaign.descriptionPlaceholder')}
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-y"
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-4">
        <StatCard label={t('campaign.stats.content')} value={totalContent} />
        <StatCard label={t('campaign.stats.rooms')} value={roomCount} />
        <StatCard label={t('campaign.stats.npcs')} value={npcCount} />
        <StatCard label={t('campaign.stats.maps')} value={mapCount} />
      </div>

      {/* Content Breakdown */}
      {totalContent > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 mb-6">
          <h3 className="mb-3 font-semibold">{t('campaign.contentBreakdown')}</h3>
          <div className="flex flex-wrap gap-2 text-xs">
            {monsterCount > 0 && <span className="rounded-full bg-red-500/20 px-3 py-1 text-red-400">{monsterCount} {t('campaign.contentType.monsters')}</span>}
            {spellCount > 0 && <span className="rounded-full bg-purple-500/20 px-3 py-1 text-purple-400">{spellCount} {t('campaign.contentType.spells')}</span>}
            {weaponCount > 0 && <span className="rounded-full bg-amber-500/20 px-3 py-1 text-amber-400">{weaponCount} {t('campaign.contentType.weapons')}</span>}
            {armorCount > 0 && <span className="rounded-full bg-blue-500/20 px-3 py-1 text-blue-400">{armorCount} {t('campaign.contentType.armor')}</span>}
            {gearCount > 0 && <span className="rounded-full bg-green-500/20 px-3 py-1 text-green-400">{gearCount} {t('campaign.contentType.gear')}</span>}
          </div>
        </div>
      )}

      {/* Lore Summary */}
      {chapterCount > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 mb-6">
          <h3 className="mb-2 font-semibold">{t('campaign.loreSummary')}</h3>
          <p className="text-sm text-muted-foreground">{chapterCount} {t('campaign.chapters')}, {campaign.lore.chapters.reduce((sum, ch) => sum + ch.sections.length, 0)} {t('campaign.sections')}</p>
        </div>
      )}

      {/* Export */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h3 className="mb-4 font-semibold">{t('campaign.export')}</h3>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <button
            onClick={() => downloadJson(exportAsDataPack(campaign), `${campaign.id}-datapack.json`)}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
          >
            {t('campaign.exportDataPack')}
          </button>
          <button
            onClick={() => downloadJson(exportAdventureDocument(campaign), `${campaign.id}-adventure.json`)}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent transition"
          >
            {t('campaign.exportAdventure')}
          </button>
          <button
            disabled={pdfExporting}
            onClick={async () => {
              setPdfExporting(true)
              setPdfStatus('')
              try {
                await generateAdventurePDF(campaign, (step) => setPdfStatus(step))
              } catch {
                setPdfStatus(t('campaign.exportPDFError'))
              } finally {
                setPdfExporting(false)
              }
            }}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-accent transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pdfExporting ? pdfStatus || t('campaign.exportPDFGenerating') : t('campaign.exportPDF')}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{t('campaign.exportHint')}</p>
      </div>
    </main>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
