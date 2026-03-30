import type { DieType } from './dice.ts';
import type { Alignment } from './reference.ts';
import type { InventoryState } from './inventory.ts';
import type { CharacterSpellState } from './spells.ts';

export type AbilityScore = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';
export type AbilityScores = Record<AbilityScore, number>;
export type AbilityModifiers = Record<AbilityScore, number>;

export type Ancestry = 'dwarf' | 'elf' | 'goblin' | 'halfling' | 'half-orc' | 'human' | 'kobold';
export type CharacterClass =
  | 'fighter' | 'priest' | 'thief' | 'wizard'
  | 'bard' | 'ranger' | 'warlock' | 'witch'
  | 'knight-of-st-ydris' | 'seer' | 'basilisk-warrior'
  | 'desert-rider' | 'pit-fighter' | 'sea-wolf' | 'ras-godai';

export type ConditionType =
  | 'blinded' | 'charmed' | 'deafened' | 'paralyzed' | 'poisoned'
  | 'sleeping' | 'dazed' | 'grabbed' | 'frightened' | 'invisible'
  | 'prone' | 'restrained' | 'stunned' | 'unconscious'
  | 'afraid' | 'banished' | 'beguiled' | 'compelled' | 'cursed'
  | 'diseased' | 'drained' | 'enfeebled' | 'fragile' | 'gibbering'
  | 'laughing' | 'life-drained' | 'mesmerized' | 'petrified'
  | 'polymorphed' | 'possessed' | 'stuck' | 'stupified';

export interface ActiveCondition {
  id: string;
  condition: ConditionType;
  source: string;
  duration?: number; // rounds remaining, undefined = until removed
  appliedAt: number;
}

export interface StatModification {
  id: string;
  stat: AbilityScore;
  amount: number; // positive = bonus, negative = penalty
  source: string;
  permanent: boolean; // removed on rest if false
  expiresAt?: number;
}

export interface DeathTimer {
  totalRounds: number; // 1d4 + CON mod (min 1)
  roundsRemaining: number;
  startedAt: number;
}

// Ancestry mechanic types
export type AncestryMechanicType =
  | 'bonus_hp'
  | 'advantage_hp_roll'
  | 'bonus_ranged_attack'
  | 'bonus_spellcasting'
  | 'cannot_be_surprised'
  | 'invisibility_1day'
  | 'bonus_melee_attack'
  | 'bonus_melee_damage'
  | 'extra_talent_level1'
  | 'luck_token_session_start';

export interface AncestryMechanic {
  type: AncestryMechanicType;
  value?: number;
  duration?: number; // rounds
  usesPerDay?: number;
  isChoice?: boolean;
  choiceGroup?: string;
}

export interface AncestryDefinition {
  id: Ancestry;
  name: string;
  traitName: string;
  traitDescription: string;
  mechanics: AncestryMechanic[];
  languages: string[];
}

// Class features
export type ClassFeatureMechanic =
  | { type: 'weapon_mastery'; bonus: number }
  | { type: 'grit'; stat: 'STR' | 'DEX' }
  | { type: 'hauler' }
  | { type: 'backstab'; extraDice: number }
  | { type: 'thievery'; skills: string[] }
  | { type: 'turn_undead' }
  | { type: 'spellcasting'; stat: AbilityScore }
  | { type: 'scroll_learning' }
  | { type: 'bardic_arts'; skills: string[] }
  | { type: 'presence'; description: string }
  | { type: 'magical_dabbler'; stat: AbilityScore }
  | { type: 'prolific' }
  | { type: 'wayfinder'; skills: string[] }
  | { type: 'herbalism'; stat: AbilityScore }
  | { type: 'demonic_possession'; usesPerDay: number; damageBonus: number; rounds: number }
  | { type: 'patron'; description: string }
  | { type: 'patron_boon' }
  | { type: 'familiar' }
  | { type: 'omen'; usesPerDay: number; dc: number }
  | { type: 'destined' }
  | { type: 'stone_skin'; acBonus: number }
  | { type: 'basilisk_blood' }
  | { type: 'petrifying_gaze'; dc: number }
  | { type: 'charge'; usesPerDay: number }
  | { type: 'mount' }
  | { type: 'flourish'; usesPerDay: number }
  | { type: 'relentless'; usesPerDay: number; dc: number }
  | { type: 'implacable' }
  | { type: 'last_stand'; threshold: number }
  | { type: 'seafarer' }
  | { type: 'old_gods' }
  | { type: 'shield_wall'; ac: number }
  | { type: 'smoke_step'; usesPerDay: number }
  | { type: 'black_lotus' }
  | { type: 'trained_assassin' };

export interface ClassFeature {
  name: string;
  level: number;
  description: string;
  mechanic: ClassFeatureMechanic;
}

// Talent table
export type TalentMechanic =
  | { type: 'weapon_mastery_extra' }
  | { type: 'attack_bonus'; melee: number; ranged: number }
  | { type: 'stat_bonus'; stats: AbilityScore[]; amount: number }
  | { type: 'armor_mastery' }
  | { type: 'spell_advantage' }
  | { type: 'learn_spell' }
  | { type: 'spellcasting_bonus'; amount: number }
  | { type: 'make_magic_item' }
  | { type: 'backstab_extra_dice'; amount: number }
  | { type: 'initiative_advantage' }
  | { type: 'choose_talent_or_stats' }
  | { type: 'magical_dabbler_bonus'; amount: number }
  | { type: 'improved_presence' }
  | { type: 'find_random_wand' }
  | { type: 'herbalism_advantage' }
  | { type: 'increased_weapon_damage' }
  | { type: 'melee_attack_bonus'; amount: number }
  | { type: 'ranged_attack_damage_bonus'; amount: number }
  | { type: 'damage_bonus'; amount: number }
  | { type: 'ac_bonus'; amount: number }
  | { type: 'patron_boon_roll' }
  | { type: 'go_berserk' }
  | { type: 'duality' }
  | { type: 'additional_smoke_step' }
  | { type: 'poisons_training' }
  | { type: 'additional_black_lotus' };

export interface TalentTableEntry {
  roll: number | [number, number]; // value or range on 2d6
  description: string;
  mechanic: TalentMechanic;
}

export interface AppliedTalent {
  id: string;
  levelGained: number;
  rollResult: number;
  mechanic: TalentMechanic;
  description: string;
  choices?: Record<string, string>;
}

// Weapon/armor proficiency types
export type ArmorProficiency = 'none' | 'leather' | 'chainmail' | 'plate' | 'shield' | 'mithral_chainmail';

export interface SpellcastingConfig {
  stat: AbilityScore;
  spellList: 'wizard' | 'priest' | 'witch' | 'seer';
}

export interface ClassDefinition {
  id: CharacterClass;
  name: string;
  description: string;
  hitDie: DieType;
  weaponProficiencies: string[];
  armorProficiencies: ArmorProficiency[];
  features: ClassFeature[];
  talentTable: TalentTableEntry[];
  spellcasting?: SpellcastingConfig;
  spellsKnownByLevel?: number[][]; // [level-1] = [tier1, tier2, tier3, tier4, tier5]
}

// Computed character values
export interface ComputedCharacterValues {
  effectiveStats: AbilityScores;
  modifiers: AbilityModifiers;
  ac: number;
  gearSlots: number;
  usedGearSlots: number;
  meleeAttackBonus: number;
  rangedAttackBonus: number;
  spellCheckBonus?: number;
}

// THE MAIN CHARACTER TYPE
export interface Character {
  id: string;
  playerId: string;
  name: string;
  ancestry: Ancestry;
  class: CharacterClass;
  level: number; // 1-10
  xp: number;
  alignment: Alignment;
  background: string;
  deity?: string;
  title: string;
  languages: string[];

  baseStats: AbilityScores;
  statModifications: StatModification[];

  maxHp: number;
  currentHp: number;

  isDying: boolean;
  deathTimer?: DeathTimer;

  inventory: InventoryState;
  spells: CharacterSpellState;
  conditions: ActiveCondition[];
  talents: AppliedTalent[];

  ancestryTraitUsed: boolean;
  elfChoice?: 'ranged' | 'spellcasting';
  hasLuckToken: boolean;
  weaponMasteries: string[];
  notes: string;

  computed: ComputedCharacterValues;
}
