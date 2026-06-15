import type { Campaign, AdventureStore } from '@/schemas/campaign.ts'
import type { GameStore } from '@/schemas/stores.ts'
import type { Ancestry } from '@/schemas/character.ts'
import type { MonsterDefinition } from '@/schemas/monsters.ts'
import { readCampaign, listSavedCampaigns } from '@/stores/campaign-store.ts'

/**
 * Bridges the working CAMPAIGN into the live SESSION. Sessions aren't hard-linked
 * to a campaign, so we resolve one (explicit id, else the only saved campaign) and
 * pull its adventure stores + content monsters on demand.
 */

/** Convert an editor AdventureStore into a session GameStore (inactive until the GM reveals it). */
export function adventureStoreToGameStore(s: AdventureStore): GameStore {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    keeperName: s.keeperName,
    keeperAncestry: s.keeperAncestry as Ancestry | undefined,
    storeType: s.storeType,
    items: s.items,
    isActive: false,
  }
}

/** Append incoming stores not already present (by id); existing stores win, so GM edits are preserved. */
export function mergeStores(existing: GameStore[], incoming: GameStore[]): GameStore[] {
  const have = new Set(existing.map(s => s.id))
  return [...existing, ...incoming.filter(s => !have.has(s.id))]
}

/**
 * The monsters belonging to the working adventure: global monsters whose id the
 * campaign references, plus campaign-only definitions not in the global list.
 */
export function filterCampaignMonsters(global: MonsterDefinition[], campaign: MonsterDefinition[]): MonsterDefinition[] {
  const campaignIds = new Set(campaign.map(m => m.id))
  if (campaignIds.size === 0) return []
  const fromGlobal = global.filter(m => campaignIds.has(m.id))
  const haveGlobal = new Set(fromGlobal.map(m => m.id))
  const campaignOnly = campaign.filter(m => !haveGlobal.has(m.id))
  return [...fromGlobal, ...campaignOnly]
}

/**
 * Resolve the session's working campaign: the explicitly-linked one if set, else
 * the sole saved campaign (so existing sessions Just Work when only one exists).
 * Returns null when ambiguous (multiple campaigns, none linked) or none saved.
 */
export function resolveSessionCampaign(campaignId: string | undefined): Campaign | null {
  if (campaignId) return readCampaign(campaignId)
  const saved = listSavedCampaigns()
  if (saved.length === 1) return readCampaign(saved[0].id)
  return null
}
