import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { useCampaignStore } from '@/stores/campaign-store.ts'
import { useLocale } from '@/hooks/use-locale.ts'
import { parseCampaignFile } from '@/lib/campaign/import.ts'

export const Route = createFileRoute('/campaign/')({
  component: CampaignListPage,
})

function CampaignListPage() {
  const { t, ti } = useLocale()
  const navigate = useNavigate()
  const getSavedCampaigns = useCampaignStore(s => s.getSavedCampaigns)
  const createCampaign = useCampaignStore(s => s.createCampaign)
  const deleteCampaign = useCampaignStore(s => s.deleteCampaign)
  const importCampaign = useCampaignStore(s => s.importCampaign)

  const [name, setName] = useState('')
  const [author, setAuthor] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const savedCampaigns = getSavedCampaigns().sort((a, b) => b.updatedAt - a.updatedAt)

  function handleDelete(id: string) {
    deleteCampaign(id)
    setRefreshKey(k => k + 1)
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const campaign = createCampaign(name.trim(), author.trim())
    navigate({ to: '/campaign/$campaignId', params: { campaignId: campaign.id } })
  }

  function handleImport(file: File) {
    setImportError(null)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string)
        const result = parseCampaignFile(json)
        if (result.success) {
          const id = importCampaign(result.campaign)
          navigate({ to: '/campaign/$campaignId', params: { campaignId: id } })
        } else {
          setImportError(result.errors.join(', '))
        }
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Failed to parse JSON file')
      }
    }
    reader.readAsText(file)
  }

  return (
    <main className="mx-auto max-w-lg px-3 py-8 sm:px-4 sm:py-12">
      <h1 className="mb-8 text-2xl font-bold sm:text-3xl">{t('campaign.createNew')}</h1>

      {/* Create Form */}
      <form onSubmit={handleCreate} className="rounded-xl border border-border bg-card p-4 space-y-4 sm:p-6">
        <div>
          <label className="mb-1 block text-sm font-medium">{t('campaign.campaignName')}</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('campaign.campaignNamePlaceholder')}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('campaign.authorName')}</label>
          <input
            type="text"
            value={author}
            onChange={e => setAuthor(e.target.value)}
            placeholder={t('campaign.authorNamePlaceholder')}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          disabled={!name.trim()}
          className="w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-40"
        >
          {t('campaign.create')}
        </button>
      </form>

      {/* Saved Campaigns */}
      {savedCampaigns.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-xl font-bold">{t('campaign.savedCampaigns')}</h2>
          <div className="space-y-2">
            {savedCampaigns.map(c => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.author && <span>{c.author} · </span>}
                    {t('campaign.lastEdited')}: {new Date(c.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 ml-3">
                  <button
                    onClick={() => navigate({ to: '/campaign/$campaignId', params: { campaignId: c.id } })}
                    className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition"
                  >
                    {t('campaign.open')}
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition"
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import */}
      <div className="mt-8">
        <h2 className="mb-4 text-xl font-bold">{t('campaign.importCampaign')}</h2>
        {importError && (
          <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{importError}</div>
        )}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-primary/60', 'text-foreground') }}
          onDragLeave={e => { e.preventDefault(); e.currentTarget.classList.remove('border-primary/60', 'text-foreground') }}
          onDrop={e => {
            e.preventDefault()
            e.currentTarget.classList.remove('border-primary/60', 'text-foreground')
            const file = e.dataTransfer.files?.[0]
            if (file) handleImport(file)
          }}
          className="w-full cursor-pointer rounded-xl border-2 border-dashed border-border py-8 text-center text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition"
        >
          {t('campaign.importDescription')}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handleImport(file)
            e.target.value = ''
          }}
        />
      </div>
    </main>
  )
}
