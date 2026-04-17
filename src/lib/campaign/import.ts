import type { Campaign } from '@/schemas/campaign.ts'
import { validateCampaign, validateAdventureDocument, migrateRandomEncounters } from './schema.ts'

export type ParseResult =
  | { success: true; campaign: Campaign }
  | { success: false; errors: string[] }

/**
 * Strip table attachments that reference rooms or maps no longer present
 * in the campaign. This keeps data clean after partial deletions or
 * when importing from external sources with stale references.
 */
function cleanOrphanedAttachments(campaign: Campaign): Campaign {
  const roomIds = new Set(campaign.adventure.rooms.map(r => r.id))
  const mapIds = new Set((campaign.maps ?? []).map(m => m.id))

  campaign.tables = (campaign.tables ?? []).map(table => ({
    ...table,
    attachments: table.attachments.filter(a => {
      if (a.type === 'room') return roomIds.has(a.id)
      if (a.type === 'map') return mapIds.has(a.id)
      return false
    }),
  }))

  return campaign
}

/**
 * Parse and validate a campaign JSON file.
 * Detects whether the input is an adventure document (shadowdark-adventure-v1)
 * or a raw Campaign, validates accordingly, and returns a clean Campaign object.
 *
 * Runs backward-compatible migration (adventure.randomEncounters → tables)
 * and strips orphaned table attachments before returning.
 */
export function parseCampaignFile(json: unknown): ParseResult {
  if (json === null || json === undefined || typeof json !== 'object' || Array.isArray(json)) {
    return { success: false, errors: ['Input must be a JSON object'] }
  }

  const obj = json as Record<string, unknown>

  // Run migration before validation
  migrateRandomEncounters(obj)

  // Detect adventure document format
  if (obj.format === 'shadowdark-adventure-v1') {
    const advResult = validateAdventureDocument(json)
    if (!advResult.success) {
      return { success: false, errors: advResult.errors }
    }
    // Strip adventure document metadata, return clean Campaign
    const { format: _format, exportedAt: _exportedAt, ...campaignFields } = advResult.data!
    return { success: true, campaign: cleanOrphanedAttachments(campaignFields as Campaign) }
  }

  // If it has a format field but it's not the one we recognize, reject
  if ('format' in obj && typeof obj.format === 'string') {
    return {
      success: false,
      errors: [`Unrecognized format: "${obj.format}". Expected "shadowdark-adventure-v1" or no format field.`],
    }
  }

  // Raw campaign format
  const campaignResult = validateCampaign(json)
  if (!campaignResult.success) {
    return { success: false, errors: campaignResult.errors }
  }
  return { success: true, campaign: cleanOrphanedAttachments(campaignResult.data as Campaign) }
}
