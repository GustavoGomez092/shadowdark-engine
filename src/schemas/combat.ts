import type { DiceRollResult } from './dice.ts';
export type CombatPhase = 'inactive' | 'surprise' | 'initiative' | 'active' | 'ended';

export interface CombatState {
  id: string;
  phase: CombatPhase;
  combatants: Combatant[];
  initiativeOrder: string[]; // combatant IDs in turn order
  currentTurnIndex: number;
  roundNumber: number;
  surpriseActors?: string[]; // combatant IDs that can act in surprise round
  log: CombatLogEntry[];
}

export interface Combatant {
  id: string;
  type: 'pc' | 'monster' | 'npc';
  referenceId: string; // Character.id or MonsterInstance.id
  name: string;
  initiativeRoll?: number;
  initiativeBonus: number; // DEX modifier
  hasActed: boolean; // this round
  isDefeated: boolean;
  hasUsedAction: boolean;
  hasUsedMove: boolean;
  isDoubleMoveActive: boolean;
}

export type CombatLogType =
  | 'initiative' | 'attack' | 'damage' | 'spell' | 'condition'
  | 'death' | 'stabilize' | 'morale' | 'movement' | 'round_start' | 'other';

export interface CombatLogEntry {
  id: string;
  timestamp: number;
  round: number;
  actorId: string;
  type: CombatLogType;
  message: string;
  rolls?: DiceRollResult[];
  details?: Record<string, unknown>;
}

export interface AttackResult {
  id: string;
  attackerId: string;
  targetId: string;
  attackRoll: DiceRollResult;
  targetAC: number;
  isHit: boolean;
  isCritical: boolean; // nat 20
  isFumble: boolean; // nat 1
  damageRoll?: DiceRollResult;
  totalDamage?: number;
  criticalBonusDamage?: number; // critical: double dice, not modifier
}

export interface MoraleCheck {
  combatantId: string;
  trigger: 'half_numbers' | 'half_hp' | 'leader_killed';
  roll: DiceRollResult; // DC 15 WIS check
  passed: boolean;
  fled: boolean;
}
