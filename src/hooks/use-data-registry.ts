import { useSyncExternalStore } from 'react'
import { dataRegistry } from '@/lib/data/registry.ts'

let version = 0
dataRegistry.subscribe(() => { version++ })

function subscribe(callback: () => void) {
  return dataRegistry.subscribe(callback)
}

function getSnapshot() {
  return version
}

function getServerSnapshot() {
  return 0
}

/**
 * Forces re-render when data packs change (added/removed/toggled).
 * Call at top of any component that reads from data/index.ts arrays.
 */
export function useDataRegistry() {
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
