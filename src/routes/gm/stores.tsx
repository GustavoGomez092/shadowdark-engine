import { createFileRoute } from '@tanstack/react-router'
import { useSessionStore } from '@/stores/session-store.ts'
import { StoreEditor } from '@/components/gm/store-editor.tsx'
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

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">No active session</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
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
