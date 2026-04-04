import type { RandomEncounter, TreasureResult } from '@/schemas/encounters.ts'
import type { MonsterInstance } from '@/schemas/monsters.ts'
import type { DangerLevel } from '@/schemas/reference.ts'
import { getStartingDistance, getEncounterActivity, getEncounterReaction, ENCOUNTER_CHECK_INTERVALS, TREASURE_XP } from '@/schemas/reference.ts'
import { rollDice } from '@/lib/dice/roller.ts'
import { generateId } from '@/lib/utils/id.ts'
import { MONSTERS } from '@/data/index.ts'

export function checkForEncounter(): { roll: number; isEncounter: boolean } {
  const result = rollDice('1d6')
  return { roll: result.total, isEncounter: result.total === 1 }
}

export function shouldCheckEncounter(roundsSinceCheck: number, dangerLevel: DangerLevel): boolean {
  const interval = ENCOUNTER_CHECK_INTERVALS[dangerLevel]
  if (interval === 0) return false // Safe — no encounter checks
  return roundsSinceCheck >= interval
}

export function generateEncounter(chaModifier: number = 0, partyLevel: number = 1): RandomEncounter {
  // Starting distance
  const distRoll = rollDice('1d6')
  const startingDistance = getStartingDistance(distRoll.total)

  // Activity
  const actRoll = rollDice('2d6')
  const activity = getEncounterActivity(actRoll.total)

  // Reaction
  const reactRoll = rollDice('2d6')
  const reactionTotal = reactRoll.total + chaModifier
  const reaction = getEncounterReaction(reactionTotal)

  // Treasure (50% chance none)
  const treasureRoll = rollDice('1d6')
  const hasTreasure = treasureRoll.total >= 4

  // Pick random monster(s) appropriate for party level
  const eligibleMonsters = MONSTERS.filter(m => m.level <= partyLevel + 2 && m.level >= Math.max(0, partyLevel - 2))
  const monsterDef = eligibleMonsters[Math.floor(Math.random() * eligibleMonsters.length)] ?? MONSTERS[0]

  // Generate 1-4 monster instances
  const monsterCount = Math.max(1, rollDice('1d4').total)
  const monsters: MonsterInstance[] = Array.from({ length: monsterCount }, (_, i) => ({
    id: generateId(),
    definitionId: monsterDef.id,
    name: monsterCount > 1 ? `${monsterDef.name} ${i + 1}` : monsterDef.name,
    currentHp: monsterDef.hp,
    maxHp: monsterDef.hp,
    conditions: [],
    rangeBand: startingDistance,
    isDefeated: false,
  }))

  let treasure: TreasureResult | undefined
  if (hasTreasure) {
    const goldAmount = Math.floor(Math.random() * 10 * partyLevel) + 5
    treasure = {
      xpClass: 'normal',
      xpValue: TREASURE_XP.normal,
      items: [],
      coins: { gp: goldAmount, sp: 0, cp: 0 },
    }
  }

  return {
    id: generateId(),
    startingDistance,
    startingDistanceRoll: distRoll.total,
    activityRoll: actRoll.total,
    activity,
    reactionRoll: reactRoll.total,
    chaModifier,
    reactionTotal,
    reaction,
    hasTreasure,
    treasure,
    monsters,
    isResolved: false,
  }
}
