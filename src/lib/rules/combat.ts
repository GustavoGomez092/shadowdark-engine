import type { CombatState, Combatant, AttackResult, MoraleCheck, CombatLogEntry } from '@/schemas/combat.ts'
import type { Character } from '@/schemas/character.ts'
import type { MonsterInstance, MonsterDefinition } from '@/schemas/monsters.ts'
import type { DiceRollResult } from '@/schemas/dice.ts'
import { rollDice } from '@/lib/dice/roller.ts'
import { generateId } from '@/lib/utils/id.ts'
import { getAbilityModifier, DC } from '@/schemas/reference.ts'
import { computeEffectiveStats } from './character.ts'

// ========== Initiative ==========

const INITIATIVE_DEADLINE_MS = 30_000

export function rollInitiative(
  characters: Character[],
  monsters: { instance: MonsterInstance; definition: MonsterDefinition }[]
): CombatState {
  if (characters.length === 0) throw new Error('Cannot roll initiative: no characters')
  if (monsters.length === 0) throw new Error('Cannot roll initiative: no monsters')

  const combatants: Combatant[] = []

  for (const char of characters) {
    const stats = computeEffectiveStats(char)
    const dexMod = getAbilityModifier(stats.DEX)
    combatants.push({
      id: generateId(),
      type: 'pc',
      referenceId: char.id,
      name: char.name,
      initiativeRoll: undefined,
      initiativeBonus: dexMod,
      hasActed: false,
      isDefeated: false,
      hasUsedAction: false,
      hasUsedMove: false,
      isDoubleMoveActive: false,
    })
  }

  // ONE shared monster row using the highest DEX mod across the group.
  const groupDexMod = Math.max(
    ...monsters.map(m => getAbilityModifier(m.definition.stats.DEX))
  )
  const groupRoll = rollDice('1d20', { purpose: 'initiative' })
  combatants.push({
    id: generateId(),
    type: 'monster',
    // Group row: referenceId is one of the monster instances, but the row
    // represents the whole group — do not look up monsters by this id.
    referenceId: monsters[0].instance.id,
    name: 'Monsters',
    initiativeRoll: groupRoll.total + groupDexMod,
    initiativeBonus: groupDexMod,
    hasActed: false,
    isDefeated: false,
    hasUsedAction: false,
    hasUsedMove: false,
    isDoubleMoveActive: false,
  })

  return {
    id: generateId(),
    phase: 'initiative',
    combatants,
    initiativeOrder: [],
    currentTurnIndex: 0,
    roundNumber: 1,
    initiativeDeadline: Date.now() + INITIATIVE_DEADLINE_MS,
    log: [{
      id: generateId(),
      timestamp: Date.now(),
      round: 1,
      actorId: 'system',
      type: 'round_start',
      message: 'Roll for initiative!',
    }],
  }
}

export function applyInitiativeRoll(
  state: CombatState,
  combatantId: string,
  total: number,
  byAuto: boolean
): CombatState {
  return {
    ...state,
    combatants: state.combatants.map(c =>
      c.id === combatantId
        ? { ...c, initiativeRoll: total, initiativeRolledByAuto: byAuto }
        : c
    ),
  }
}

export function hasInitiativeAdvantage(character: Character): boolean {
  return character.talents.some(t => t.mechanic.type === 'initiative_advantage')
}

export function autoRollMissing(state: CombatState, characters: Character[]): CombatState {
  let working = state
  for (const c of state.combatants) {
    if (c.type !== 'pc') continue
    if (c.initiativeRoll !== undefined) continue
    const character = characters.find(ch => ch.id === c.referenceId)
    if (!character) continue
    const advantage = hasInitiativeAdvantage(character)
    const roll = rollDice('1d20', {
      purpose: 'initiative',
      rolledBy: character.id,
      advantage,
    })
    const total = roll.total + c.initiativeBonus
    working = applyInitiativeRoll(working, c.id, total, true)
  }
  return working
}

export function lockInitiativeOrder(state: CombatState): CombatState {
  // Pair each combatant with its index for stable tie-breaking among PCs.
  const indexed = state.combatants.map((c, idx) => ({ c, idx }))
  indexed.sort((a, b) => {
    const rollA = a.c.initiativeRoll ?? -Infinity
    const rollB = b.c.initiativeRoll ?? -Infinity
    if (rollA !== rollB) return rollB - rollA
    // PC beats monster on ties
    if (a.c.type === 'pc' && b.c.type !== 'pc') return -1
    if (b.c.type === 'pc' && a.c.type !== 'pc') return 1
    // Same-type tie: array order
    return a.idx - b.idx
  })
  const initiativeOrder = indexed.map(x => x.c.id)

  return {
    ...state,
    phase: 'active',
    initiativeOrder,
    currentTurnIndex: 0,
    initiativeDeadline: undefined,
    log: [...state.log, {
      id: generateId(),
      timestamp: Date.now(),
      round: state.roundNumber,
      actorId: 'system',
      type: 'round_start',
      message: `Round ${state.roundNumber} begins.`,
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

export interface StabilizeResult {
  success: boolean
  roll: number
  intMod: number
  total: number
}

export function attemptStabilize(intScore: number): StabilizeResult {
  const intMod = getAbilityModifier(intScore)
  const roll = rollDice('1d20', { purpose: 'stabilize' })
  const total = roll.total + intMod
  return { success: total >= DC.HARD, roll: roll.total, intMod, total } // DC 15
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
