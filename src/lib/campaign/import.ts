import type { Campaign } from '@/schemas/campaign.ts'
import { validateCampaign, validateAdventureDocument } from './schema.ts'

export type ParseResult =
  | { success: true; campaign: Campaign }
  | { success: false; errors: string[] }

/**
 * Parse and validate a campaign JSON file.
 * Detects whether the input is an adventure document (shadowdark-adventure-v1)
 * or a raw Campaign, validates accordingly, and returns a clean Campaign object.
 */
export function parseCampaignFile(json: unknown): ParseResult {
  if (json === null || json === undefined || typeof json !== 'object' || Array.isArray(json)) {
    return { success: false, errors: ['Input must be a JSON object'] }
  }

  const obj = json as Record<string, unknown>

  // Detect adventure document format
  if (obj.format === 'shadowdark-adventure-v1') {
    const advResult = validateAdventureDocument(json)
    if (!advResult.success) {
      return { success: false, errors: advResult.errors }
    }
    // Strip adventure document metadata, return clean Campaign
    const { format: _format, exportedAt: _exportedAt, ...campaignFields } = advResult.data!
    return { success: true, campaign: campaignFields as Campaign }
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
  return { success: true, campaign: campaignResult.data as Campaign }
}
