import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useCampaignStore } from '@/stores/campaign-store.ts'
import { useLocale } from '@/hooks/use-locale.ts'
import { createEmptyNPC, createEmptyEncounterTable, createEmptyStore } from '@/lib/campaign/defaults.ts'
import { NPCEditor } from '@/components/campaign/adventure/npc-editor.tsx'
import { EncounterTableEditor } from '@/components/campaign/adventure/encounter-table-editor.tsx'
import { StoreEditor } from '@/components/campaign/adventure/store-editor.tsx'
import type { AdventureNPC, RandomEncounterTable, AdventureStore } from '@/schemas/campaign.ts'

export const Route = createFileRoute('/campaign/$campaignId/adventure')({
  component: AdventureStructurePage,
})

type AdventureTab = 'overview' | 'npcs' | 'encounters' | 'shops'

function AdventureStructurePage() {
  const { t } = useLocale()
  const campaign = useCampaignStore(s => s.campaign)
  const updateAdventure = useCampaignStore(s => s.updateAdventure)
  const addNPC = useCampaignStore(s => s.addNPC)
  const updateNPCStore = useCampaignStore(s => s.updateNPC)
  const removeNPC = useCampaignStore(s => s.removeNPC)
  const addEncounterTable = useCampaignStore(s => s.addEncounterTable)
  const updateEncounterTable = useCampaignStore(s => s.updateEncounterTable)
  const removeEncounterTable = useCampaignStore(s => s.removeEncounterTable)
  const addStore = useCampaignStore(s => s.addStore)
  const updateStoreStore = useCampaignStore(s => s.updateStore)
  const removeStore = useCampaignStore(s => s.removeStore)

  const [tab, setTab] = useState<AdventureTab>('overview')
  const [editingNPC, setEditingNPC] = useState<AdventureNPC | null>(null)
  const [editingTable, setEditingTable] = useState<RandomEncounterTable | null>(null)
  const [editingStore, setEditingStore] = useState<AdventureStore | null>(null)

  if (!campaign) return null

  const adv = campaign.adventure
  // Guard for campaigns saved before stores were added
  if (!adv.stores) adv.stores = []
  const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"

  function saveNPC(npc: AdventureNPC) {
    const exists = adv.npcs.find(n => n.id === npc.id)
    if (exists) updateNPCStore(npc.id, n => Object.assign(n, npc))
    else addNPC(npc)
    setEditingNPC(null)
  }

  function saveEncounterTable(table: RandomEncounterTable) {
    const exists = adv.randomEncounters.find(t => t.id === table.id)
    if (exists) updateEncounterTable(table.id, t => Object.assign(t, table))
    else addEncounterTable(table)
    setEditingTable(null)
  }

  function saveStore(store: AdventureStore) {
    const exists = adv.stores.find(s => s.id === store.id)
    if (exists) updateStoreStore(store.id, s => Object.assign(s, store))
    else addStore(store)
    setEditingStore(null)
  }

  const tabs: { key: AdventureTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'npcs', label: `NPCs (${adv.npcs.length})` },
    { key: 'encounters', label: `Encounters (${adv.randomEncounters.length})` },
    { key: 'shops', label: `Shops (${adv.stores.length})` },
  ]

  return (
    <main className="mx-auto max-w-5xl px-3 py-4 sm:px-4 sm:py-8">
      <h1 className="mb-4 text-2xl font-bold">{t('campaign.nav.adventure')}</h1>

      {/* Tab Bar */}
      <div className="-mx-3 mb-6 flex gap-1 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0 scrollbar-hide">
        {tabs.map(tb => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
              tab === tb.key ? 'bg-primary/15 text-primary border border-primary/30' : 'border border-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Adventure Hook</label>
              <textarea value={adv.hook} onChange={e => updateAdventure(a => { a.hook = e.target.value })} rows={3} placeholder="The premise that draws the party into this adventure..." className={inputCls + " resize-y"} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">GM Overview</label>
              <textarea value={adv.overview} onChange={e => updateAdventure(a => { a.overview = e.target.value })} rows={5} placeholder="Background, key factions, secrets..." className={inputCls + " resize-y"} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Min Target Level</label>
                <input type="number" value={adv.targetLevel[0]} min={0} max={10} onChange={e => updateAdventure(a => { a.targetLevel = [parseInt(e.target.value) || 1, a.targetLevel[1]] })} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">Max Target Level</label>
                <input type="number" value={adv.targetLevel[1]} min={adv.targetLevel[0]} max={10} onChange={e => updateAdventure(a => { a.targetLevel = [a.targetLevel[0], parseInt(e.target.value) || 3] })} className={inputCls} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NPCs */}
      {tab === 'npcs' && (
        <div>
          <div className="mb-4 flex justify-end">
            <button onClick={() => setEditingNPC(createEmptyNPC())} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition">+ New NPC</button>
          </div>
          {adv.npcs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-12 text-center">
              <p className="text-muted-foreground">No NPCs yet</p>
              <button onClick={() => setEditingNPC(createEmptyNPC())} className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition">Create First NPC</button>
            </div>
          ) : (
            <div className="space-y-2">
              {adv.npcs.map(npc => (
                <div key={npc.id} onClick={() => setEditingNPC(npc)} className="flex items-center justify-between rounded-xl border border-border bg-card p-3 cursor-pointer hover:border-border/80 transition">
                  <div className="min-w-0 flex-1">
                    <span className="font-medium">{npc.name || 'Unnamed NPC'}</span>
                    <p className="text-xs text-muted-foreground">{[npc.ancestry, npc.role].filter(Boolean).join(' · ')}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); removeNPC(npc.id) }} className="shrink-0 text-xs text-red-400 hover:text-red-300 ml-3">Delete</button>
                </div>
              ))}
            </div>
          )}
          {editingNPC && <NPCEditor npc={editingNPC} onSave={saveNPC} onCancel={() => setEditingNPC(null)} />}
        </div>
      )}

      {/* Encounter Tables */}
      {tab === 'encounters' && (
        <div>
          <div className="mb-4 flex justify-end">
            <button onClick={() => setEditingTable(createEmptyEncounterTable())} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition">+ New Table</button>
          </div>
          {adv.randomEncounters.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-12 text-center">
              <p className="text-muted-foreground">No encounter tables yet</p>
              <button onClick={() => setEditingTable(createEmptyEncounterTable())} className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition">Create First Table</button>
            </div>
          ) : (
            <div className="space-y-2">
              {adv.randomEncounters.map(table => (
                <div key={table.id} onClick={() => setEditingTable(table)} className="flex items-center justify-between rounded-xl border border-border bg-card p-3 cursor-pointer hover:border-border/80 transition">
                  <div>
                    <span className="font-medium">{table.name}</span>
                    <p className="text-xs text-muted-foreground">{table.diceExpression} · {table.entries.length} entries</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); removeEncounterTable(table.id) }} className="shrink-0 text-xs text-red-400 hover:text-red-300 ml-3">Delete</button>
                </div>
              ))}
            </div>
          )}
          {editingTable && <EncounterTableEditor table={editingTable} onSave={saveEncounterTable} onCancel={() => setEditingTable(null)} />}
        </div>
      )}

      {/* Shops */}
      {tab === 'shops' && (
        <div>
          <div className="mb-4 flex justify-end">
            <button onClick={() => setEditingStore(createEmptyStore())} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition">+ New Shop</button>
          </div>
          {adv.stores.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-12 text-center">
              <p className="text-muted-foreground">No shops yet</p>
              <button onClick={() => setEditingStore(createEmptyStore())} className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition">Create First Shop</button>
            </div>
          ) : (
            <div className="space-y-2">
              {adv.stores.map(store => (
                <div key={store.id} onClick={() => setEditingStore(store)} className="flex items-center justify-between rounded-xl border border-border bg-card p-3 cursor-pointer hover:border-border/80 transition">
                  <div className="min-w-0 flex-1">
                    <span className="font-medium">{store.name || 'Unnamed Shop'}</span>
                    <p className="text-xs text-muted-foreground">
                      {[
                        store.storeType.charAt(0).toUpperCase() + store.storeType.slice(1),
                        `${store.items.length} items`,
                        store.keeperName ? `Keeper: ${store.keeperName}` : null,
                        store.roomId ? `Room: ${adv.rooms.find(r => r.id === store.roomId)?.name ?? 'Unknown'}` : null,
                      ].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); removeStore(store.id) }} className="shrink-0 text-xs text-red-400 hover:text-red-300 ml-3">Delete</button>
                </div>
              ))}
            </div>
          )}
          {editingStore && <StoreEditor store={editingStore} rooms={adv.rooms} npcs={adv.npcs} onSave={saveStore} onCancel={() => setEditingStore(null)} />}
        </div>
      )}
    </main>
  )
}
