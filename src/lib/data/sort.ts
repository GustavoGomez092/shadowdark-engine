import { dataRegistry } from '@/lib/data/registry.ts'

export function sortPackFirst<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aIsPack = !!dataRegistry.getItemPackId(a.id)
    const bIsPack = !!dataRegistry.getItemPackId(b.id)
    if (aIsPack && !bIsPack) return -1
    if (!aIsPack && bIsPack) return 1
    return 0
  })
}
