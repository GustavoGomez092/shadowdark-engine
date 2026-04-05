import type { Campaign } from '@/schemas/campaign.ts'
import type { DataPack } from '@/lib/data/types.ts'

/** Export campaign content as a DataPack JSON importable by the engine */
export function exportAsDataPack(campaign: Campaign): DataPack {
  return {
    id: campaign.id,
    name: campaign.name,
    author: campaign.author,
    version: campaign.version,
    description: campaign.description,
    data: campaign.content,
  }
}

/** Export the full campaign as a structured adventure document */
export function exportAdventureDocument(campaign: Campaign): object {
  return {
    format: 'shadowdark-adventure-v1',
    exportedAt: Date.now(),
    ...campaign,
  }
}

/** Trigger a JSON file download in the browser */
export function downloadJson(data: object, filename: string) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
