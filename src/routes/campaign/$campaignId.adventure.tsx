import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useCampaignStore } from '@/stores/campaign-store.ts'
import { useLocale } from '@/hooks/use-locale.ts'
import { createEmptyRoom, createEmptyNPC, createEmptyEncounterTable } from '@/lib/campaign/defaults.ts'
import { RoomEditor } from '@/components/campaign/adventure/room-editor.tsx'
import { NPCEditor } from '@/components/campaign/adventure/npc-editor.tsx'
import { EncounterTableEditor } from '@/components/campaign/adventure/encounter-table-editor.tsx'
import type { AdventureRoom, AdventureNPC, RandomEncounterTable } from '@/schemas/campaign.ts'

export const Route = createFileRoute('/campaign/$campaignId/adventure')({
  component: AdventureStructurePage,
})

type AdventureTab = 'overview' | 'rooms' | 'npcs' | 'encounters'

function AdventureStructurePage() {
  const { t } = useLocale()
  const campaign = useCampaignStore(s => s.campaign)
  const updateAdventure = useCampaignStore(s => s.updateAdventure)
  const addRoom = useCampaignStore(s => s.addRoom)
  const updateRoom = useCampaignStore(s => s.updateRoom)
  const removeRoom = useCampaignStore(s => s.removeRoom)
  const addNPC = useCampaignStore(s => s.addNPC)
  const updateNPCStore = useCampaignStore(s => s.updateNPC)
  const removeNPC = useCampaignStore(s => s.removeNPC)
  const addEncounterTable = useCampaignStore(s => s.addEncounterTable)
  const updateEncounterTable = useCampaignStore(s => s.updateEncounterTable)
  const removeEncounterTable = useCampaignStore(s => s.removeEncounterTable)

  const [tab, setTab] = useState<AdventureTab>('overview')
  const [editingRoom, setEditingRoom] = useState<AdventureRoom | null>(null)
  const [editingNPC, setEditingNPC] = useState<AdventureNPC | null>(null)
  const [editingTable, setEditingTable] = useState<RandomEncounterTable | null>(null)

  if (!campaign) return null

  const adv = campaign.adventure
  const monsterNames = (campaign.content.monsters ?? []).map(m => ({ id: m.id, name: m.name }))
  const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"

  function saveRoom(room: AdventureRoom) {
    const exists = adv.rooms.find(r => r.id === room.id)
    if (exists) updateRoom(room.id, () => Object.assign(exists, room))
    else addRoom(room)
    setEditingRoom(null)
  }

  function saveNPC(npc: AdventureNPC) {
    const exists = adv.npcs.find(n => n.id === npc.id)
    if (exists) updateNPCStore(npc.id, () => Object.assign(exists, npc))
    else addNPC(npc)
    setEditingNPC(null)
  }

  function saveEncounterTable(table: RandomEncounterTable) {
    const exists = adv.randomEncounters.find(t => t.id === table.id)
    if (exists) updateEncounterTable(table.id, () => Object.assign(exists, table))
    else addEncounterTable(table)
    setEditingTable(null)
  }

  const tabs: { key: AdventureTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'rooms', label: `Rooms (${adv.rooms.length})` },
    { key: 'npcs', label: `NPCs (${adv.npcs.length})` },
    { key: 'encounters', label: `Encounters (${adv.randomEncounters.length})` },
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

      {/* Rooms */}
      {tab === 'rooms' && (
        <div>
          <div className="mb-4 flex justify-end">
            <button onClick={() => setEditingRoom(createEmptyRoom(adv.rooms.length + 1))} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition">
              + New Room
            </button>
          </div>
          {adv.rooms.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-12 text-center">
              <p className="text-muted-foreground">No rooms yet</p>
              <button onClick={() => setEditingRoom(createEmptyRoom(1))} className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition">Create First Room</button>
            </div>
          ) : (
            <div className="space-y-2">
              {adv.rooms.sort((a, b) => a.number - b.number).map(room => (
                <div key={room.id} onClick={() => setEditingRoom(room)} className="flex items-center justify-between rounded-xl border border-border bg-card p-3 cursor-pointer hover:border-border/80 transition">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-bold text-primary">#{room.number}</span>
                      <span className="font-medium truncate">{room.name}</span>
                    </div>
                    {room.description && <p className="mt-0.5 text-xs text-muted-foreground truncate">{room.description.slice(0, 80)}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2 ml-3">
                    {room.monsterIds.length > 0 && <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] text-red-400">{room.monsterIds.length} foes</span>}
                    {room.traps.length > 0 && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-400">{room.traps.length} traps</span>}
                    <button onClick={e => { e.stopPropagation(); removeRoom(room.id) }} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {editingRoom && <RoomEditor room={editingRoom} monsterNames={monsterNames} onSave={saveRoom} onCancel={() => setEditingRoom(null)} />}
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
    </main>
  )
}
