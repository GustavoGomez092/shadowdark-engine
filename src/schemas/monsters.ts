import type { AbilityScores, ActiveCondition } from './character.ts';
import type { Alignment, RangeCategory } from './reference.ts';

export interface MonsterAttack {
  name: string;
  bonus: number;
  damage: string; // dice expression "1d6+2"
  damageType?: string;
  range: RangeCategory;
  multiattack?: number; // number of attacks per turn
  specialEffect?: string; // "poison: DC 12 CON or 1d4 extra damage"
}

export interface MonsterMovement {
  normal: RangeCategory; // typically 'near'
  double?: boolean; // double near
  fly?: RangeCategory;
  swim?: RangeCategory;
  climb?: RangeCategory;
  burrow?: RangeCategory;
}

export interface MonsterAbility {
  name: string;
  description: string;
  mechanic?: MonsterAbilityMechanic;
}

export type MonsterAbilityMechanic =
  | { type: 'damage_resistance'; source: string } // only damaged by X
  | { type: 'damage_immunity'; damageType: string }
  | { type: 'condition_immunity'; condition: string }
  | { type: 'morale_immunity' }
  | { type: 'regeneration'; amount: string; prevention?: string }
  | { type: 'spellcasting'; spells: string[]; stat: string; dc: number }
  | { type: 'custom'; key: string; value: unknown };

export interface MonsterDefinition {
  id: string;
  name: string;
  description?: string;
  level: number;
  ac: number;
  acSource?: string; // e.g., "chainmail", "natural"
  hp: number; // average HP
  hpDice?: string; // e.g., "2d8+2" for manual rolling
  attacks: MonsterAttack[];
  movement: MonsterMovement;
  stats: AbilityScores;
  alignment: Alignment;
  abilities: MonsterAbility[];
  checksMorale: boolean;
  tags: string[]; // 'undead', 'beast', 'humanoid', etc.
  cannotBeSurprised?: boolean;
}

// Live instance of a monster in play
export interface MonsterInstance {
  id: string;
  definitionId: string;
  name: string; // can be customized
  currentHp: number;
  maxHp: number;
  conditions: ActiveCondition[];
  rangeBand?: RangeCategory;
  isDefeated: boolean;
  notes?: string;
}
