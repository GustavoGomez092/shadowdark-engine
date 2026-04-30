import type { CombatState, Combatant, AttackResult, MoraleCheck, CombatLogEntry } from '@/schemas/combat.ts'
import type { Character } from '@/schemas/character.ts'
import type { MonsterInstance, MonsterDefinition } from '@/schemas/monsters.ts'
import type { DiceRollResult } from '@/schemas/dice.ts'
import { rollDice } from '@/lib/dice/roller.ts'
import { generateId } from '@/lib/utils/id.ts'
import { getAbilityModifier, DC } from '@/schemas/reference.ts'
import { computeEffectiveStats } from './character.ts'
import { getAncestry } from '@/data/index.ts'

// ========== Initiative ==========

const INITIATIVE_DEADLINE_MS = 30_000

export interface RollInitiativeOptions {
  surprisedCharacterIds?: string[]
  surprisedMonsterInstanceIds?: string[]
}

export function rollInitiative(
  characters: Character[],
  monsters: { instance: MonsterInstance; definition: MonsterDefinition }[],
  options?: RollInitiativeOptions
): CombatState {
  if (characters.length === 0) throw new Error('Cannot roll initiative: no characters')
  if (monsters.length === 0) throw new Error('Cannot roll initiative: no monsters')

  // Determine immunity to filter out any user-supplied surprise that would violate game rules.
  const immunity = getCombatantsImmuneToSurprise(characters, monsters)
  const surprisedCharIds = new Set(
    (options?.surprisedCharacterIds ?? []).filter(id => !immunity.characterIds.includes(id))
  )
  const surprisedMonsterIds = new Set(
    (options?.surprisedMonsterInstanceIds ?? []).filter(id => !immunity.monsterInstanceIds.includes(id))
  )

  const combatants: Combatant[] = []
  const surpriseActorIds: string[] = []

  for (const char of characters) {
    const stats = computeEffectiveStats(char)
    const dexMod = getAbilityModifier(stats.DEX)
    const id = generateId()
    combatants.push({
      id,
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
    if (surprisedCharIds.has(char.id)) surpriseActorIds.push(id)
  }

  // ONE shared monster row using the highest DEX mod across the group.
  const groupDexMod = Math.max(
    ...monsters.map(m => getAbilityModifier(m.definition.stats.DEX))
  )
  const groupRoll = rollDice('1d20', { purpose: 'initiative' })
  const groupId = generateId()
  combatants.push({
    id: groupId,
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
  // Group row counts as surprised if any of its instances are in the surprised set.
  if (monsters.some(m => surprisedMonsterIds.has(m.instance.id))) {
    surpriseActorIds.push(groupId)
  }

  return {
    id: generateId(),
    phase: 'initiative',
    combatants,
    initiativeOrder: [],
    currentTurnIndex: 0,
    roundNumber: 1,
    initiativeDeadline: Date.now() + INITIATIVE_DEADLINE_MS,
    surpriseActors: surpriseActorIds.length > 0 ? surpriseActorIds : undefined,
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

// Canonical sort comparator. Imported by the store so both paths agree.
// Rule: highest roll first; PC beats non-PC on ties; same-type ties broken by array order.
export function initiativeComparator(
  a: { roll: number; type: string; idx: number },
  b: { roll: number; type: string; idx: number }
): number {
  if (a.roll !== b.roll) return b.roll - a.roll
  if (a.type === 'pc' && b.type !== 'pc') return -1
  if (b.type === 'pc' && a.type !== 'pc') return 1
  return a.idx - b.idx
}

export function lockInitiativeOrder(state: CombatState): CombatState {
  const indexed = state.combatants.map((c, idx) => ({
    id: c.id,
    type: c.type,
    roll: c.initiativeRoll ?? -Infinity,
    idx,
  }))
  indexed.sort(initiativeComparator)
  const initiativeOrder = indexed.map(x => x.id)

  // Round 1 already has the "Roll for initiative!" entry from rollInitiative — don't duplicate it.
  const log = state.roundNumber === 1
    ? state.log
    : [...state.log, {
        id: generateId(),
        timestamp: Date.now(),
        round: state.roundNumber,
        actorId: 'system',
        type: 'round_start' as const,
        message: `Round ${state.roundNumber} begins.`,
      }]

  // Pick the first non-defeated, non-surprised combatant as the active turn.
  // Most often index 0, but skip surprised rows on round 1 so the active turn
  // doesn't land on a frozen combatant.
  let startIdx = 0
  for (let i = 0; i < initiativeOrder.length; i++) {
    const candidate = state.combatants.find(c => c.id === initiativeOrder[i])
    const isSurprisedRound1 =
      state.roundNumber === 1 &&
      !!candidate &&
      (state.surpriseActors?.includes(candidate.id) ?? false)
    if (candidate && !candidate.isDefeated && !isSurprisedRound1) {
      startIdx = i
      break
    }
  }

  return {
    ...state,
    phase: 'active',
    initiativeOrder,
    currentTurnIndex: startIdx,
    initiativeDeadline: undefined,
    log,
  }
}

// ========== Surprise Immunity ==========

export interface ImmunityResult {
  characterIds: string[]
  monsterInstanceIds: string[]
}

export function getCombatantsImmuneToSurprise(
  characters: Character[],
  monsters: { instance: MonsterInstance; definition: MonsterDefinition }[]
): ImmunityResult {
  const characterIds: string[] = []
  for (const c of characters) {
    const ancestry = getAncestry(c.ancestry)
    const immune = ancestry?.mechanics.some(m => m.type === 'cannot_be_surprised') ?? false
    if (immune) characterIds.push(c.id)
  }
  const monsterInstanceIds: string[] = []
  for (const m of monsters) {
    if (m.definition.cannotBeSurprised) monsterInstanceIds.push(m.instance.id)
  }
  return { characterIds, monsterInstanceIds }
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

  // Find next non-defeated, non-surprised combatant
  let nextIndex = updated.currentTurnIndex
  do {
    nextIndex = (nextIndex + 1) % updated.initiativeOrder.length

    // If we've wrapped around, start new round
    if (nextIndex === 0) {
      updated.roundNumber += 1
      updated.combatants = updated.combatants.map(c => ({ ...c, hasActed: false }))
      // Surprise expires after round 1.
      if (updated.roundNumber > 1) {
        updated.surpriseActors = undefined
      }
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
    const isSurprisedRound1 =
      updated.roundNumber === 1 &&
      !!nextCombatant &&
      (updated.surpriseActors?.includes(nextCombatant.id) ?? false)
    if (nextCombatant && !nextCombatant.isDefeated && !isSurprisedRound1) break
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
