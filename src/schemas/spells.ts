import type { AbilityScore, ConditionType } from './character.ts';
import type { RangeCategory } from './reference.ts';

export type SpellTier = 1 | 2 | 3 | 4 | 5;
export type SpellClass = 'wizard' | 'priest';
export type SpellDuration = 'instant' | 'rounds' | 'focus' | 'hours' | 'days' | 'permanent' | 'special';

export type SpellEffect =
  | { type: 'damage'; dice: string; damageType?: string }
  | { type: 'healing'; dice: string }
  | { type: 'buff'; stat?: AbilityScore; bonus: number; duration?: number }
  | { type: 'condition'; condition: ConditionType; duration?: number; saveDC?: number }
  | { type: 'ac_bonus'; amount: number }
  | { type: 'light'; range: RangeCategory; durationRealMinutes: number }
  | { type: 'utility'; description: string }
  | { type: 'custom'; key: string; value: unknown };

export interface SpellDefinition {
  id: string;
  name: string;
  tier: SpellTier;
  class: SpellClass;
  range: RangeCategory | 'self' | 'touch';
  duration: SpellDuration;
  durationValue?: number; // e.g., 5 for "5 rounds", 10 for "10 rounds"
  isFocus: boolean;
  description: string;
  effects: SpellEffect[];
  hasAdvantage?: boolean; // Magic Missile has advantage on cast check
}

// ========== LIVE SPELL STATE ==========

export interface KnownSpell {
  spellId: string;
  isAvailable: boolean; // false = lost until rest
  source: 'class' | 'scroll' | 'talent';
  hasAdvantage: boolean; // from talent: advantage on casting this spell
}

export interface ActiveFocusSpell {
  spellId: string;
  castAt: number; // timestamp
  roundsCast: number;
}

export interface Penance {
  id: string;
  spellId: string;
  tier: SpellTier;
  type: 'quest' | 'sacrifice';
  sacrificeRequired: number; // gp value: 5/20/40/90/150 by tier
  sacrificePaid: number;
  isComplete: boolean;
  description?: string;
}

export interface CharacterSpellState {
  knownSpells: KnownSpell[];
  activeFocusSpell?: ActiveFocusSpell;
  penances: Penance[];
}

// Wizard mishap effects (d12 table)
export type MishapEffect =
  | { type: 'double_roll' } // Roll twice, combine (reroll further 1s)
  | { type: 'damage'; dice: string; target: 'self' }
  | { type: 'redirect'; target: 'self' | 'random_ally' }
  | { type: 'lose_spell_week' } // Can't cast this spell for a week
  | { type: 'gear_disappears' } // One random piece of gear vanishes
  | { type: 'lose_random_spell_until_rest' }
  | { type: 'lose_random_spell_until_con_check' } // DC 12 CON each turn
  | { type: 'suppress_light'; rounds: number }
  | { type: 'scream'; rounds: number }
  | { type: 'glow'; rounds: number } // Enemies have advantage
  | { type: 'disadvantage_tier'; rounds: number }; // Disadvantage on same tier

export interface WizardMishap {
  roll: number; // 1-12
  name: string;
  description: string;
  effect: MishapEffect;
}

// Spell cast result
export interface SpellCastResult {
  id: string;
  characterId: string;
  spellId: string;
  rollTotal: number;
  dc: number;
  success: boolean;
  isNat20: boolean;
  isNat1: boolean;
  mishap?: WizardMishap;
  penanceRequired?: boolean;
  spellLost: boolean;
  scrollConsumed?: boolean;
  wandEffect?: 'stops_working' | 'breaks';
}
