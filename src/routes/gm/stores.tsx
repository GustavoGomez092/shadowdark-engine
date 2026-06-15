import { createFileRoute } from '@tanstack/react-router'
import { useSessionStore } from '@/stores/session-store.ts'
import { StoreEditor } from '@/components/gm/store-editor.tsx'
import { WorkingCampaignBar, useWorkingCampaign } from '@/components/gm/working-campaign-bar.tsx'
import { adventureStoreToGameStore, mergeStores } from '@/lib/campaign/session-campaign.ts'
import { gmPeer } from '@/lib/peer/gm-peer-singleton.ts'
import { createActionLog } from '@/lib/utils/action-log.ts'

export const Route = createFileRoute('/gm/stores')({
  component: GMStoresPage,
})

function GMStoresPage() {
  const session = useSessionStore(s => s.session)
  const addStore = useSessionStore(s => s.addStore)
  const updateStore = useSessionStore(s => s.updateStore)
  const removeStore = useSessionStore(s => s.removeStore)
  const addChatMessage = useSessionStore(s => s.addChatMessage)
  const { campaign } = useWorkingCampaign()

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">No active session</p>
      </main>
    )
  }

  // Campaign stores not yet pulled into this session (matched by id).
  const haveIds = new Set(session.stores.map(s => s.id))
  const importable = (campaign?.adventure.stores ?? []).filter(s => !haveIds.has(s.id))

  function importCampaignStores() {
    if (!campaign) return
    const incoming = campaign.adventure.stores.map(adventureStoreToGameStore)
    const existing = useSessionStore.getState().session?.stores ?? []
    const fresh = mergeStores(existing, incoming).slice(existing.length)
    for (const store of fresh) addStore(store)
    addChatMessage(createActionLog(`GM imported ${fresh.length} shop${fresh.length === 1 ? '' : 's'} from ${campaign.name}`))
    setTimeout(() => gmPeer.broadcastStateSync(), 50)
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <WorkingCampaignBar />
      {campaign && importable.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <span className="text-sm">
            <span className="font-semibold">{campaign.name}</span> has {importable.length} shop{importable.length === 1 ? '' : 's'} not in this session.
          </span>
          <button
            onClick={importCampaignStores}
            className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
          >
            Import {importable.length} shop{importable.length === 1 ? '' : 's'}
          </button>
        </div>
      )}
      <StoreEditor
        stores={session.stores}
        onAddStore={(store) => {
          addStore(store)
          setTimeout(() => gmPeer.broadcastStateSync(), 50)
        }}
        onUpdateStore={(id, updater) => {
          // Check if this is an activation toggle
          const storeBefore = session.stores.find(s => s.id === id)
          updateStore(id, updater)
          const storeAfter = useSessionStore.getState().session?.stores.find(s => s.id === id)

          if (storeBefore && storeAfter && storeBefore.isActive !== storeAfter.isActive) {
            if (storeAfter.isActive) {
              addChatMessage(createActionLog(`GM opened ${storeAfter.name} for shopping 🏪`))
            } else {
              addChatMessage(createActionLog(`GM closed ${storeAfter.name}`))
            }
          }

          setTimeout(() => gmPeer.broadcastStateSync(), 50)
        }}
        onRemoveStore={(id) => {
          removeStore(id)
          setTimeout(() => gmPeer.broadcastStateSync(), 50)
        }}
      />
    </main>
  )
}
