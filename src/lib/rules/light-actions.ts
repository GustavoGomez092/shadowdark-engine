import type { Character } from '@/schemas/character.ts'
import type { LightState } from '@/schemas/light.ts'
import { applyLightForCarrier, createLightTimer } from './light.ts'

/**
 * Pure light-from-item actions: consume the relevant inventory item(s) and update
 * the per-bearer light timers. Shared by the player message handlers and the GM's
 * direct item panel so lighting behaves identically everywhere.
 */

type Result = { character: Character; light: LightState }

function withItems(c: Character, items: Character['inventory']['items']): Character {
  return { ...c, inventory: { ...c.inventory, items } }
}

/** Light a torch: consume the torch item, set/refresh this bearer's light. */
export function lightTorch(character: Character, light: LightState, torchItemId: string, durationMs: number, now: number = Date.now()): Result {
  const items = character.inventory.items.filter(i => i.id !== torchItemId)
  const timers = applyLightForCarrier(light.timers, character.id, 'torch', durationMs, now)
  return { character: withItems(character, items), light: { ...light, timers, isInDarkness: false } }
}

/** Light a lantern: consume one oil flask (the lantern stays), set/refresh this bearer's light. */
export function lightLantern(character: Character, light: LightState, oilItemId: string, durationMs: number, now: number = Date.now()): Result {
  const items = character.inventory.items.filter(i => i.id !== oilItemId)
  const timers = applyLightForCarrier(light.timers, character.id, 'lantern', durationMs, now)
  return { character: withItems(character, items), light: { ...light, timers, isInDarkness: false } }
}

/** Make a campfire: consume the given torches, append a separate campfire timer (not a per-bearer reset). */
export function lightCampfire(character: Character, light: LightState, torchIds: string[], durationMs: number, now: number = Date.now()): Result {
  const items = character.inventory.items.filter(i => !torchIds.includes(i.id))
  const timer = { ...createLightTimer('campfire', character.id, durationMs), startedAt: now }
  return { character: withItems(character, items), light: { ...light, timers: [...light.timers, timer], isInDarkness: false } }
}
