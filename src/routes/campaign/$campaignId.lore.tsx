import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useCampaignStore } from '@/stores/campaign-store.ts'
import { useLocale } from '@/hooks/use-locale.ts'
import { createEmptyChapter, createEmptySection } from '@/lib/campaign/defaults.ts'
import type { LoreChapter, LoreSection } from '@/schemas/campaign.ts'

export const Route = createFileRoute('/campaign/$campaignId/lore')({
  component: LoreWriterPage,
})

function LoreWriterPage() {
  const { t } = useLocale()
  const campaign = useCampaignStore(s => s.campaign)
  const addChapter = useCampaignStore(s => s.addChapter)
  const updateChapter = useCampaignStore(s => s.updateChapter)
  const removeChapter = useCampaignStore(s => s.removeChapter)
  const addSection = useCampaignStore(s => s.addSection)
  const updateSection = useCampaignStore(s => s.updateSection)
  const removeSection = useCampaignStore(s => s.removeSection)

  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  if (!campaign) return null

  const chapters = [...campaign.lore.chapters].sort((a, b) => a.sortOrder - b.sortOrder)
  const selectedChapter = chapters.find(ch => ch.id === selectedChapterId) ?? null
  const selectedSection = selectedChapter?.sections.find(s => s.id === selectedSectionId) ?? null

  function handleAddChapter() {
    const ch = createEmptyChapter()
    ch.sortOrder = chapters.length
    addChapter(ch)
    setSelectedChapterId(ch.id)
    setSelectedSectionId(null)
  }

  function handleAddSection(chapterId: string) {
    const chapter = chapters.find(ch => ch.id === chapterId)
    if (!chapter) return
    const sec = createEmptySection()
    sec.sortOrder = chapter.sections.length
    addSection(chapterId, sec)
    setSelectedSectionId(sec.id)
  }

  function handleDeleteChapter(id: string) {
    removeChapter(id)
    if (selectedChapterId === id) {
      setSelectedChapterId(null)
      setSelectedSectionId(null)
    }
  }

  function handleDeleteSection(chapterId: string, sectionId: string) {
    removeSection(chapterId, sectionId)
    if (selectedSectionId === sectionId) setSelectedSectionId(null)
  }

  const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"

  return (
    <main className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('campaign.nav.lore')}</h1>
        <button onClick={handleAddChapter} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition">
          + New Chapter
        </button>
      </div>

      {chapters.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-lg text-muted-foreground">No lore written yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create chapters to organize your world-building</p>
          <button onClick={handleAddChapter} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition">
            Create First Chapter
          </button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          {/* Left: Chapter/Section Tree */}
          <div className="rounded-xl border border-border bg-card p-3 space-y-2 lg:max-h-[calc(100vh-200px)] lg:overflow-y-auto">
            {chapters.map(ch => (
              <div key={ch.id}>
                <div
                  onClick={() => { setSelectedChapterId(ch.id); setSelectedSectionId(null) }}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition ${
                    selectedChapterId === ch.id && !selectedSectionId ? 'bg-primary/15 text-primary' : 'hover:bg-accent'
                  }`}
                >
                  <span className="font-medium text-sm truncate">{ch.title || 'Untitled Chapter'}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={e => { e.stopPropagation(); handleAddSection(ch.id) }} className="text-[10px] text-primary hover:underline" title="Add section">+</button>
                    <button onClick={e => { e.stopPropagation(); handleDeleteChapter(ch.id) }} className="text-[10px] text-red-400 hover:text-red-300" title="Delete chapter">X</button>
                  </div>
                </div>
                {/* Sections */}
                {[...ch.sections].sort((a, b) => a.sortOrder - b.sortOrder).map(sec => (
                  <div
                    key={sec.id}
                    onClick={() => { setSelectedChapterId(ch.id); setSelectedSectionId(sec.id) }}
                    className={`ml-4 flex items-center justify-between rounded-lg px-3 py-1.5 cursor-pointer transition text-xs ${
                      selectedSectionId === sec.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                  >
                    <span className="truncate">{sec.title || 'Untitled Section'}</span>
                    <button onClick={e => { e.stopPropagation(); handleDeleteSection(ch.id, sec.id) }} className="shrink-0 text-[10px] text-red-400 hover:text-red-300">X</button>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Right: Editor */}
          <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
            {selectedSection && selectedChapterId ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Section Title</label>
                  <input
                    type="text"
                    value={selectedSection.title}
                    onChange={e => updateSection(selectedChapterId, selectedSection.id, s => { s.title = e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground">Content</label>
                  <button onClick={() => setShowPreview(!showPreview)} className="text-xs text-primary hover:underline">
                    {showPreview ? 'Edit' : 'Preview'}
                  </button>
                </div>
                {showPreview ? (
                  <div className="prose prose-invert prose-sm max-w-none rounded-lg border border-border p-4 min-h-[300px]">
                    {selectedSection.content.split('\n').map((line, i) => {
                      if (line.startsWith('# ')) return <h1 key={i}>{line.slice(2)}</h1>
                      if (line.startsWith('## ')) return <h2 key={i}>{line.slice(3)}</h2>
                      if (line.startsWith('### ')) return <h3 key={i}>{line.slice(4)}</h3>
                      if (line.startsWith('- ')) return <li key={i}>{line.slice(2)}</li>
                      if (line.startsWith('> ')) return <blockquote key={i}><p>{line.slice(2)}</p></blockquote>
                      if (line.trim() === '') return <br key={i} />
                      return <p key={i}>{line}</p>
                    })}
                  </div>
                ) : (
                  <textarea
                    value={selectedSection.content}
                    onChange={e => updateSection(selectedChapterId, selectedSection.id, s => { s.content = e.target.value })}
                    rows={16}
                    placeholder="Write your lore here... Supports basic markdown (# headings, - lists, > quotes)"
                    className={inputCls + " resize-y font-mono text-xs min-h-[300px]"}
                  />
                )}
              </div>
            ) : selectedChapter ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">Chapter Title</label>
                  <input
                    type="text"
                    value={selectedChapter.title}
                    onChange={e => updateChapter(selectedChapter.id, ch => { ch.title = e.target.value })}
                    className={inputCls}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedChapter.sections.length} section{selectedChapter.sections.length !== 1 ? 's' : ''} in this chapter.
                </p>
                <button onClick={() => handleAddSection(selectedChapter.id)} className="rounded-lg bg-primary/10 border border-primary/30 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition">
                  + Add Section
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
                Select a chapter or section to edit
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
