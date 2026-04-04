import type { AIPurpose, AIGameContext, AIMonsterContext, AIPartyMemberContext } from '@/schemas/ai.ts'
import type { SessionState } from '@/schemas/session.ts'
import { getMonster } from '@/data/index.ts'
import { getLocale, LOCALE_LABELS } from '@/i18n/index.ts'

// ========== Purpose Labels & Icons ==========

// Translation keys for purpose labels — render with t() at call site
export const PURPOSE_LABEL_KEYS: Record<AIPurpose, string> = {
  encounter_description: 'ai.purpose.encounter',
  npc_dialogue: 'ai.purpose.npc',
  adventure_hook: 'ai.purpose.adventureHook',
  ruling_help: 'ai.purpose.rulingHelp',
  treasure_description: 'ai.purpose.treasure',
  store_generation: 'ai.purpose.store',
  room_description: 'ai.purpose.room',
  trap_description: 'ai.purpose.trap',
  general: 'ai.purpose.general',
}

// English fallback labels (used in non-UI contexts like conversation titles)
export const PURPOSE_LABELS: Record<AIPurpose, string> = {
  encounter_description: 'Describe Encounter',
  npc_dialogue: 'NPC Dialogue',
  adventure_hook: 'Adventure Hook',
  ruling_help: 'Ruling Help',
  treasure_description: 'Describe Treasure',
  store_generation: 'Generate Store',
  room_description: 'Describe Room',
  trap_description: 'Design Trap',
  general: 'General Assistant',
}

export const PURPOSE_ICONS: Record<AIPurpose, string> = {
  encounter_description: '⚔️',
  npc_dialogue: '💬',
  adventure_hook: '🗺️',
  ruling_help: '📖',
  treasure_description: '💎',
  store_generation: '🏪',
  room_description: '🚪',
  trap_description: '⚠️',
  general: '✨',
}

// ========== Base Prompts Per Purpose ==========

const BASE_PROMPTS: Record<AIPurpose, string> = {
  encounter_description:
    `You are a dark fantasy narrator for ShadowDark RPG. Your ONLY job is to describe what the enemies look like and how they are positioned when the encounter begins.

STRICT RULES — FOLLOW EXACTLY:
- Describe ONLY the enemies listed below. Do NOT invent, add, or remove any creatures.
- For EACH enemy: describe their physical appearance, posture, weapon, and position relative to the party.
- LIGHTING IS CRITICAL: Check the light state below. If it says "TOTAL DARKNESS", the party CANNOT SEE — describe sounds, smells, and the feeling of nearby threats instead. Do NOT describe visual details in darkness. Do NOT invent light sources (no torches, glowing objects, moonlight, etc. unless the game state says they exist).
- If there ARE active light sources, describe the scene lit by those specific sources only.
- DANGER LEVEL sets the tone: unsafe = uneasy, risky = threatening, deadly = overwhelming dread.
- Do NOT give tactical suggestions, strategy options, or ask what the party does next.
- Do NOT invent lore, locations, quest hooks, or objects not in the game state.
- Keep it to 2-3 short paragraphs. Start immediately with the scene — no preamble.
- You ARE the Game Master narrating to the players. Write in third person, referring to player characters by their character names (e.g. "Kingler sees...", "the party hears..."). Do NOT use "you" — the GM describes what happens, not what "you" experience.`,
  npc_dialogue:
    'You are an NPC in a dark fantasy RPG world. Stay in character. Speak naturally for the setting. Be brief — tavern talk, not monologues. Include mannerisms and speech patterns.',
  adventure_hook:
    'You are a creative adventure designer for ShadowDark RPG. Generate compelling adventure hooks that create urgency and mystery. Include a clear goal, a complication, and a reward hint.',
  ruling_help:
    `You are a knowledgeable ShadowDark RPG rules advisor helping the Game Master with rulings.

STRICT RULES:
- Do NOT narrate scenes, describe encounters, or write story content. You are a rules consultant, not a narrator.
- The game state and scene context below are BACKGROUND INFORMATION about where the game currently is. Do NOT rule on them — they are just context so you understand the situation.
- Do NOT invent lore, storylines, factions, events, or details that are not explicitly stated in the game state or scene context below. Only reference what is actually provided.
- Your first response must follow this EXACT format — summarize the current situation in one sentence using ONLY these facts from the game state below, then ask what ruling is needed:
  * Character name(s) and location (from scene context, if provided)
  * Whether combat is active or not (from "Combat" line — if no combat line, say "no active combat")
  * Light status (from "Light" line — darkness, or which light sources)
  * Danger level (from "Danger level" line)
  Then ask: "What ruling do you need help with?"
  Example: "Kingler is at the volcano complex, no active combat, total darkness, danger level risky. What ruling do you need help with?"
- When the GM describes the situation, reference ShadowDark mechanics: DC checks, advantage/disadvantage, ability scores, saving throws, spell checks, morale, etc.
- Suggest specific DCs, dice rolls, and outcomes based on ShadowDark rules.
- Be concise and decisive. Give a clear ruling recommendation, then briefly explain why.
- Do NOT ask more than 1-2 clarifying questions at a time. Do NOT number a long list of questions.`,
  treasure_description:
    'You are a dark fantasy storyteller. Describe treasure and loot with evocative detail. Include visual descriptions, history hints, and possible magical properties.',
  store_generation:
    `You are helping a Game Master create a shop for ShadowDark RPG.

Generate EXACTLY three things:
1. **Shop Name** — a fitting name for the establishment.
2. **Shopkeeper** — name, ancestry, and 2-3 bullet points the GM can use to perform this character at the table. Focus on: voice/accent, one personality trait, one quirk or mannerism, and a sample greeting line. No backstory, no lore — just actionable roleplay notes.
3. **Store Atmosphere** — 2-3 sentences: what it looks and smells like when you walk in.

STRICT RULES:
- Do NOT list inventory, items, prices, or merchandise. The game system handles inventory separately.
- Do NOT invent game items, weapons, potions, or gear.
- Keep the shopkeeper section SHORT — this is a minor NPC, not a main character. The GM needs quick performance cues, not a biography.
- Use the scene context to make the shop fit the current location.`,
  room_description:
    `You are a dungeon narrator for ShadowDark RPG. Describe the room's ambiance and atmosphere ONLY.

STRICT RULES:
- Describe what the room looks, sounds, smells, and feels like. Focus on mood and sensory details.
- Do NOT invent exits, doors, gates, passages, staircases, or ways out. The GM decides those.
- Do NOT invent traps, treasure, enemies, NPCs, or interactive objects unless explicitly mentioned in the scene context.
- Do NOT suggest what the characters should do or investigate.
- Keep it to 2-3 short paragraphs. Ambiance only — leave gameplay decisions to the GM.
- Factor in the lighting and danger level from the game state.`,
  trap_description:
    'You are designing traps for a dark fantasy dungeon. Describe the trap\'s trigger, effect, and visible clues. Include DC for detection and damage.',
  general:
    'You are a helpful assistant for a ShadowDark RPG Game Master. Help with worldbuilding, rules questions, encounter design, and creative ideas.',
}

// ========== Build Game Context ==========

export function buildGameContext(session: SessionState): AIGameContext {
  const characters = Object.values(session.characters)

  const partySize = characters.length
  const partyLevel =
    partySize > 0
      ? Math.round((characters.reduce((sum, c) => sum + c.level, 0) / partySize) * 10) / 10
      : 0

  const partyMembers: AIPartyMemberContext[] = characters.map((c) => ({
    name: c.name,
    ancestry: c.ancestry,
    class: c.class,
    level: c.level,
  }))
  const partyAncestries = [...new Set(characters.map((c) => c.ancestry))]
  const partyClasses = [...new Set(characters.map((c) => c.class))]

  const combatPhase = session.combat?.phase
  const inCombat = combatPhase === 'active' || combatPhase === 'initiative'

  // Build rich monster context with stats from definitions
  const activeMonsterInstances = Object.values(session.activeMonsters).filter((m) => !m.isDefeated)
  const activeMonsters: AIMonsterContext[] = activeMonsterInstances.map((inst) => {
    const def = getMonster(inst.definitionId)
    return {
      name: inst.name,
      description: def?.description,
      level: def?.level ?? 0,
      ac: def?.ac ?? 0,
      currentHp: inst.currentHp,
      maxHp: inst.maxHp,
      attacks: def?.attacks.map((a) => `${a.name} +${a.bonus} (${a.damage})${a.specialEffect ? ` — ${a.specialEffect}` : ''}`) ?? [],
      abilities: def?.abilities.map((a) => `${a.name}: ${a.description}`) ?? [],
      tags: def?.tags ?? [],
    }
  })

  // Build light source info
  const activeLightSources: string[] = []
  const now = Date.now()
  for (const timer of session.light.timers) {
    if (timer.isActive && !timer.isExpired) {
      const elapsed = now - timer.startedAt - timer.accumulatedPauseMs
      const remaining = Math.max(0, timer.durationMs - elapsed)
      const mins = Math.ceil(remaining / 60000)
      activeLightSources.push(`${timer.type} (${mins} min remaining)`)
    }
  }

  const recentEvents = session.chatLog
    .filter((msg) => msg.type === 'action' || msg.type === 'system')
    .slice(-5)
    .map((msg) => msg.content)

  return {
    partyLevel,
    partySize,
    partyMembers,
    partyAncestries,
    partyClasses,
    inCombat,
    activeMonsters: activeMonsters.length > 0 ? activeMonsters : undefined,
    currentDangerLevel: session.dangerLevel,
    isInDarkness: session.light.isInDarkness,
    activeLightSources: activeLightSources.length > 0 ? activeLightSources : undefined,
    recentEvents: recentEvents.length > 0 ? recentEvents : undefined,
  }
}

// ========== Build System Prompt ==========

export function buildSystemPrompt(
  purpose: AIPurpose,
  context: AIGameContext,
  customPrompt?: string,
): string {
  const parts: string[] = [BASE_PROMPTS[purpose]]

  // Build game state section
  const stateLines: string[] = []

  if (context.partyMembers && context.partyMembers.length > 0) {
    const memberList = context.partyMembers.map((m) => `${m.name} (Level ${m.level} ${m.ancestry} ${m.class})`).join(', ')
    if (context.partyMembers.length === 1) {
      const solo = context.partyMembers[0]
      stateLines.push(`- Solo adventurer: ${solo.name} (Level ${solo.level} ${solo.ancestry} ${solo.class}). There is NO party — refer to this character by name, not as "the party".`)
    } else {
      stateLines.push(`- Party (${context.partySize} adventurers, avg level ${context.partyLevel}): ${memberList}`)
    }
  } else if (context.partySize > 0) {
    stateLines.push(`- Party: ${context.partySize} adventurers, average level ${context.partyLevel}`)
    if (context.partyClasses.length > 0) stateLines.push(`- Classes: ${context.partyClasses.join(', ')}`)
    if (context.partyAncestries.length > 0) stateLines.push(`- Ancestries: ${context.partyAncestries.join(', ')}`)
  }

  if (context.inCombat) {
    const threats = context.activeMonsters?.length ?? 0
    stateLines.push(`- Combat: Active (EXACTLY ${threats} enem${threats !== 1 ? 'ies' : 'y'})`)
  }

  if (context.activeMonsters && context.activeMonsters.length > 0) {
    const monsterDetails = context.activeMonsters.map((m) => {
      const lines = [`  - ${m.name} (Level ${m.level}, AC ${m.ac}, HP ${m.currentHp}/${m.maxHp})`]
      if (m.description) lines.push(`    Description: ${m.description}`)
      if (m.tags.length > 0) lines.push(`    Type: ${m.tags.join(', ')}`)
      if (m.attacks.length > 0) lines.push(`    Attacks: ${m.attacks.join('; ')}`)
      if (m.abilities.length > 0) lines.push(`    Abilities: ${m.abilities.join('; ')}`)
      return lines.join('\n')
    })
    stateLines.push(`- Enemies (${context.activeMonsters.length} total):\n${monsterDetails.join('\n')}`)
  }

  if (context.isInDarkness) {
    stateLines.push('- Light: TOTAL DARKNESS — no active light sources. The party cannot see without darkvision.')
  } else if (context.activeLightSources && context.activeLightSources.length > 0) {
    stateLines.push(`- Light: ${context.activeLightSources.join(', ')}`)
  } else {
    stateLines.push('- Light: Lit')
  }

  if (context.currentDangerLevel) {
    stateLines.push(`- Danger level: ${context.currentDangerLevel}`)
  }

  if (context.recentEvents && context.recentEvents.length > 0) {
    const eventList = context.recentEvents.map((e) => `  - ${e}`).join('\n')
    stateLines.push(`- Recent events:\n${eventList}`)
  }

  if (stateLines.length > 0) {
    parts.push(`\nCURRENT GAME STATE:\n${stateLines.join('\n')}`)
  }

  if (customPrompt) {
    parts.push(`\nADDITIONAL INSTRUCTIONS:\n${customPrompt}`)
  }

  // Language instruction — respond in the user's locale
  const locale = getLocale()
  if (locale !== 'en') {
    const langName = LOCALE_LABELS[locale] ?? locale
    parts.push(`\nIMPORTANT: You MUST respond entirely in ${langName}. All output text must be in ${langName}. Do not respond in English.`)
  }

  return parts.join('\n')
}
