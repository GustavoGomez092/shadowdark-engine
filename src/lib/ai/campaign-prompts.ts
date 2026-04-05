import type { Campaign } from '@/schemas/campaign.ts'

export type CampaignAIPurpose =
  | 'lore_generation'
  | 'room_description'
  | 'npc_backstory'
  | 'monster_stats'
  | 'encounter_composition'
  | 'treasure_table'
  | 'general_campaign'

export const CAMPAIGN_PURPOSE_LABELS: Record<CampaignAIPurpose, string> = {
  lore_generation: 'Generate Lore',
  room_description: 'Room Description',
  npc_backstory: 'NPC Backstory',
  monster_stats: 'Monster Stats',
  encounter_composition: 'Encounter Design',
  treasure_table: 'Treasure Table',
  general_campaign: 'General',
}

export const CAMPAIGN_PURPOSE_ICONS: Record<CampaignAIPurpose, string> = {
  lore_generation: '📜',
  room_description: '🏰',
  npc_backstory: '🧙',
  monster_stats: '🐉',
  encounter_composition: '⚔️',
  treasure_table: '💰',
  general_campaign: '✨',
}

export function buildCampaignSystemPrompt(purpose: CampaignAIPurpose, campaign: Campaign): string {
  const base = `You are a creative assistant helping design a ShadowDark RPG adventure module.

CAMPAIGN: "${campaign.name}"
${campaign.description ? `DESCRIPTION: ${campaign.description}` : ''}
AUTHOR: ${campaign.author || 'Unknown'}
TARGET LEVEL: ${campaign.adventure.targetLevel[0]}-${campaign.adventure.targetLevel[1]}

${campaign.adventure.hook ? `ADVENTURE HOOK: ${campaign.adventure.hook}` : ''}
${campaign.adventure.overview ? `GM OVERVIEW: ${campaign.adventure.overview.slice(0, 500)}` : ''}

EXISTING CONTENT:
- ${campaign.content.monsters?.length ?? 0} custom monsters
- ${campaign.content.spells?.length ?? 0} custom spells
- ${campaign.adventure.rooms.length} rooms defined
- ${campaign.adventure.npcs.length} NPCs defined
- ${campaign.lore.chapters.length} lore chapters

${campaign.adventure.rooms.length > 0 ? `ROOMS: ${campaign.adventure.rooms.map(r => `#${r.number} ${r.name}`).join(', ')}` : ''}
${campaign.adventure.npcs.length > 0 ? `NPCs: ${campaign.adventure.npcs.map(n => `${n.name} (${n.role})`).join(', ')}` : ''}
${campaign.content.monsters && campaign.content.monsters.length > 0 ? `MONSTERS: ${campaign.content.monsters.map(m => `${m.name} LV${m.level}`).join(', ')}` : ''}

ShadowDark RPG uses these range categories: Close (5ft), Near (30ft), Far (60ft+).
ShadowDark RPG stats range from 3-18 typically. Ability modifiers: 1-3=-4, 4-5=-3, 6-7=-2, 8-9=-1, 10-11=0, 12-13=+1, 14-15=+2, 16-17=+3, 18-19=+4.
`

  const purposeInstructions: Record<CampaignAIPurpose, string> = {
    lore_generation: `Generate rich, evocative world-building lore for this campaign. Include history, factions, locations, and mysteries. Write in a narrative style suitable for a GM reference document. Keep it practical and gameable — every piece of lore should suggest adventure hooks or player interactions.`,

    room_description: `Create a detailed dungeon room description. Include:
- Read-aloud text (what players see/hear/smell when entering)
- GM notes (hidden info, DCs for checks, trap triggers)
- Creatures present and their behavior
- Treasure and interactive objects
- Connections to other rooms
Write in the style of published ShadowDark adventures.`,

    npc_backstory: `Create a detailed NPC for this adventure. Include:
- Name, ancestry, role
- Physical description and mannerisms
- Personality traits and motivations
- Secret or hidden agenda
- How they relate to the adventure's plot
- Key dialogue lines or phrases they'd use
Make them memorable and useful to the GM.`,

    monster_stats: `Design a ShadowDark-compatible monster. Provide complete stats:
- Name, level, AC, HP (with dice expression)
- Movement speed (close/near/far)
- Ability scores (STR, DEX, CON, INT, WIS, CHA)
- Attacks with name, bonus, damage, and range
- Special abilities with descriptions
- Alignment, morale behavior, and tags
Ensure the monster is balanced for the campaign's target level range. Format the stats clearly.`,

    encounter_composition: `Design a balanced encounter for a party at the campaign's target level. Include:
- Which monsters to use and how many
- Monster tactics and behavior
- Environmental hazards or terrain effects
- Treasure/rewards appropriate for the challenge
- Alternative resolutions (negotiation, stealth, etc.)
Consider the ShadowDark RPG encounter guidelines.`,

    treasure_table: `Create a treasure table for this adventure. Include:
- A random table (d6 or d12) with varied results
- A mix of coins, gear, consumables, and unique items
- At least one interesting non-monetary reward
- Level-appropriate values (ShadowDark treasure is rare and valuable)
Format as a rollable table.`,

    general_campaign: `Help with this campaign design. Answer questions, brainstorm ideas, suggest improvements, or flesh out details. Stay consistent with the established campaign lore and ShadowDark RPG rules. Be creative but practical.`,
  }

  return base + '\n\n' + purposeInstructions[purpose]
}
