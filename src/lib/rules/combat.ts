import type { CombatState, Combatant, AttackResult, MoraleCheck, CombatLogEntry } from '@/schemas/combat.ts'
import type { Character } from '@/schemas/character.ts'
import type { MonsterInstance, MonsterDefinition } from '@/schemas/monsters.ts'
import type { DiceRollResult } from '@/schemas/dice.ts'
import { rollDice } from '@/lib/dice/roller.ts'
import { generateId } from '@/lib/utils/id.ts'
import { getAbilityModifier, DC } from '@/schemas/reference.ts'
import { computeEffectiveStats } from './character.ts'

// ========== Initiative ==========

export function rollInitiative(characters: Character[], monsters: { instance: MonsterInstance; definition: MonsterDefinition }[]): CombatState {
  const combatants: Combatant[] = []

  // Roll for each PC
  for (const char of characters) {
    const stats = computeEffectiveStats(char)
    const dexMod = getAbilityModifier(stats.DEX)
    const roll = rollDice('1d20', { rolledBy: char.id, purpose: 'initiative' })
    combatants.push({
      id: generateId(),
      type: 'pc',
      referenceId: char.id,
      name: char.name,
      initiativeRoll: roll.total + dexMod,
      initiativeBonus: dexMod,
      hasActed: false,
      isDefeated: false,
      hasUsedAction: false,
      hasUsedMove: false,
      isDoubleMoveActive: false,
    })
  }

  // Roll once for all monsters using highest DEX mod
  for (const { instance, definition } of monsters) {
    const dexMod = getAbilityModifier(definition.stats.DEX)
    const roll = rollDice('1d20', { rolledBy: instance.id, purpose: 'initiative' })
    combatants.push({
      id: generateId(),
      type: 'monster',
      referenceId: instance.id,
      name: instance.name,
      initiativeRoll: roll.total + dexMod,
      initiativeBonus: dexMod,
      hasActed: false,
      isDefeated: false,
      hasUsedAction: false,
      hasUsedMove: false,
      isDoubleMoveActive: false,
    })
  }

  // Sort by initiative (highest first)
  const sorted = [...combatants].sort((a, b) => (b.initiativeRoll ?? 0) - (a.initiativeRoll ?? 0))
  const initiativeOrder = sorted.map(c => c.id)

  return {
    id: generateId(),
    phase: 'active',
    combatants,
    initiativeOrder,
    currentTurnIndex: 0,
    roundNumber: 1,
    log: [{
      id: generateId(),
      timestamp: Date.now(),
      round: 1,
      actorId: 'system',
      type: 'round_start',
      message: 'Combat begins! Round 1.',
    }],
  }
}

// ========== Attack Resolution ==========

export interface AttackParams {
  attackerId: string
  targetId: string
  attackBonus: number
  targetAC: number
  damageDice: string
  damageBonus: number
  isCriticalBonusDice?: number // extra dice on crit (e.g., backstab)
  advantage?: boolean
  disadvantage?: boolean
}

export function resolveAttack(params: AttackParams): AttackResult {
  const attackRoll = rollDice('1d20', {
    rolledBy: params.attackerId,
    purpose: 'attack',
    advantage: params.advantage,
    disadvantage: params.disadvantage,
  })

  const isNat20 = attackRoll.dice[0].isNat20
  const isNat1 = attackRoll.dice[0].isNat1
  const attackTotal = attackRoll.total + params.attackBonus
  const isHit = isNat20 || (!isNat1 && attackTotal >= params.targetAC)

  let damageRoll: DiceRollResult | undefined
  let totalDamage = 0
  let criticalBonusDamage = 0

  if (isHit) {
    damageRoll = rollDice(params.damageDice, { rolledBy: params.attackerId, purpose: 'damage' })
    totalDamage = damageRoll.total + params.damageBonus

    if (isNat20) {
      // Critical: roll damage dice again (double dice, not modifier)
      const critRoll = rollDice(params.damageDice, { rolledBy: params.attackerId, purpose: 'critical_damage' })
      criticalBonusDamage = critRoll.total
      totalDamage += criticalBonusDamage

      // Extra crit dice (e.g., backstab)
      if (params.isCriticalBonusDice) {
        for (let i = 0; i < params.isCriticalBonusDice; i++) {
          const extraRoll = rollDice(params.damageDice, { rolledBy: params.attackerId, purpose: 'critical_extra' })
          criticalBonusDamage += extraRoll.total
          totalDamage += extraRoll.total
        }
      }
    }

    totalDamage = Math.max(0, totalDamage)
  }

  return {
    id: generateId(),
    attackerId: params.attackerId,
    targetId: params.targetId,
    attackRoll,
    targetAC: params.targetAC,
    isHit,
    isCritical: isNat20,
    isFumble: isNat1,
    damageRoll,
    totalDamage: isHit ? totalDamage : undefined,
    criticalBonusDamage: isNat20 ? criticalBonusDamage : undefined,
  }
}

// ========== Morale ==========

export function checkMorale(wisScore: number): MoraleCheck {
  const wisMod = getAbilityModifier(wisScore)
  const roll = rollDice('1d20', { purpose: 'morale' })
  const total = roll.total + wisMod
  const passed = total >= DC.HARD // DC 15

  return {
    combatantId: '',
    trigger: 'half_numbers',
    roll,
    passed,
    fled: !passed,
  }
}

// ========== Death & Dying ==========

export function rollDeathTimer(conScore: number): { totalRounds: number } {
  const conMod = getAbilityModifier(conScore)
  const roll = rollDice('1d4')
  const total = Math.max(1, roll.total + conMod)
  return { totalRounds: total }
}

export function rollDeathSave(): { isNat20: boolean; roll: number } {
  const roll = rollDice('1d20', { purpose: 'death_save' })
  return { isNat20: roll.dice[0].isNat20, roll: roll.total }
}

export function attemptStabilize(intScore: number): boolean {
  const intMod = getAbilityModifier(intScore)
  const roll = rollDice('1d20', { purpose: 'stabilize' })
  return roll.total + intMod >= DC.HARD // DC 15
}

// ========== Turn Management ==========

export function advanceTurn(combat: CombatState): CombatState {
  const updated = { ...combat }

  // Mark current combatant as having acted
  const currentId = updated.initiativeOrder[updated.currentTurnIndex]
  updated.combatants = updated.combatants.map(c =>
    c.id === currentId ? { ...c, hasActed: true, hasUsedAction: false, hasUsedMove: false, isDoubleMoveActive: false } : c
  )

  // Find next non-defeated combatant
  let nextIndex = updated.currentTurnIndex
  do {
    nextIndex = (nextIndex + 1) % updated.initiativeOrder.length

    // If we've wrapped around, start new round
    if (nextIndex === 0) {
      updated.roundNumber += 1
      updated.combatants = updated.combatants.map(c => ({ ...c, hasActed: false }))
      updated.log = [...updated.log, {
        id: generateId(),
        timestamp: Date.now(),
        round: updated.roundNumber,
        actorId: 'system',
        type: 'round_start' as const,
        message: `Round ${updated.roundNumber} begins.`,
      }]
    }

    const nextCombatant = updated.combatants.find(c => c.id === updated.initiativeOrder[nextIndex])
    if (nextCombatant && !nextCombatant.isDefeated) break
  } while (nextIndex !== updated.currentTurnIndex)

  updated.currentTurnIndex = nextIndex
  return updated
}

export function getCurrentCombatant(combat: CombatState): Combatant | undefined {
  const id = combat.initiativeOrder[combat.currentTurnIndex]
  return combat.combatants.find(c => c.id === id)
}

export function addCombatLogEntry(combat: CombatState, entry: Omit<CombatLogEntry, 'id' | 'timestamp' | 'round'>): CombatState {
  return {
    ...combat,
    log: [...combat.log, {
      ...entry,
      id: generateId(),
      timestamp: Date.now(),
      round: combat.roundNumber,
    }],
  }
}

export function defeatCombatant(combat: CombatState, combatantId: string): CombatState {
  return {
    ...combat,
    combatants: combat.combatants.map(c =>
      c.id === combatantId ? { ...c, isDefeated: true } : c
    ),
  }
}

export function endCombat(combat: CombatState): CombatState {
  return { ...combat, phase: 'ended' }
}
