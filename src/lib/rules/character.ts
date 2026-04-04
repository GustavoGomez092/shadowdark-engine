import type {
  Character, AbilityScores, AbilityModifiers, AbilityScore,
  Ancestry, CharacterClass, ComputedCharacterValues, AppliedTalent
} from '@/schemas/character.ts';
import type { Alignment } from '@/schemas/reference.ts';
import type { InventoryState } from '@/schemas/inventory.ts';
import type { CharacterSpellState } from '@/schemas/spells.ts';
import { getAbilityModifier, XP_THRESHOLDS, TALENT_LEVELS } from '@/schemas/reference.ts';
import { getAncestry, getClass, getTitle, getArmor } from '@/data/index.ts';
import { calculateCoinSlots } from '@/schemas/inventory.ts';
import { generateId } from '@/lib/utils/id.ts';
import { rollDice } from '@/lib/dice/roller.ts';

const ABILITY_KEYS: AbilityScore[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

// ========== Stat Computation ==========

export function computeModifiers(stats: AbilityScores): AbilityModifiers {
  const mods = {} as AbilityModifiers;
  for (const key of ABILITY_KEYS) {
    mods[key] = getAbilityModifier(stats[key]);
  }
  return mods;
}

export function computeEffectiveStats(character: Character): AbilityScores {
  const effective = { ...character.baseStats };
  for (const mod of character.statModifications) {
    effective[mod.stat] += mod.amount;
  }
  return effective;
}

// ========== AC Calculation ==========

export function computeAC(character: Character): number {
  const effective = computeEffectiveStats(character);
  const dexMod = getAbilityModifier(effective.DEX);

  // Find equipped armor — check by category, not by .armor property
  const equippedArmor = character.inventory.items.find(
    item => item.equipped && item.category === 'armor'
  );
  // Find equipped shield
  const equippedShield = character.inventory.items.find(
    item => item.equipped && item.category === 'shield'
  );

  let ac: number;
  if (!equippedArmor) {
    // Unarmored: 10 + DEX mod
    ac = 10 + dexMod;
  } else {
    // Look up armor definition from data for accurate AC
    const armorDef = getArmor(equippedArmor.definitionId);
    if (armorDef) {
      ac = armorDef.addDex ? armorDef.acBase + dexMod : armorDef.acBase;
    } else {
      // Fallback: use name heuristic
      const name = equippedArmor.name.toLowerCase();
      if (name.includes('plate')) {
        ac = 15;
      } else if (name.includes('chain')) {
        ac = 13 + dexMod;
      } else if (name.includes('leather')) {
        ac = 11 + dexMod;
      } else {
        ac = 10 + dexMod;
      }
    }
  }

  // Shield: +2
  if (equippedShield) {
    ac += 2;
  }

  // Magic armor bonus
  const magicArmorBonus = equippedArmor?.magicBonus ?? 0;
  ac += magicArmorBonus;

  return ac;
}

// ========== Gear Slots ==========

export function computeGearSlots(character: Character): number {
  const effective = computeEffectiveStats(character);
  const strScore = effective.STR;
  const base = Math.max(strScore, 10);

  // Fighter hauler: add CON mod if positive
  const classDef = getClass(character.class);
  const isHauler = classDef?.features.some(f => f.mechanic.type === 'hauler') ?? false;
  const conMod = getAbilityModifier(effective.CON);
  const haulerBonus = isHauler && conMod > 0 ? conMod : 0;

  return base + haulerBonus;
}

export function computeUsedGearSlots(character: Character): number {
  // Each item takes its slot count regardless of quantity
  // (20 arrows = 1 slot, 3 rations = 1 slot)
  const itemSlots = character.inventory.items.reduce((total, item) => {
    return total + item.slots;
  }, 0);
  const coinSlots = calculateCoinSlots(character.inventory.coins);
  return itemSlots + coinSlots;
}

// ========== Attack Bonuses ==========

export function computeMeleeAttackBonus(character: Character): number {
  const effective = computeEffectiveStats(character);
  let bonus = getAbilityModifier(effective.STR);

  // Half-orc: +1 melee attack
  const ancestry = getAncestry(character.ancestry);
  if (ancestry?.mechanics.some(m => m.type === 'bonus_melee_attack')) {
    bonus += 1;
  }

  // Talent attack bonuses
  for (const talent of character.talents) {
    if (talent.mechanic.type === 'attack_bonus') {
      bonus += talent.mechanic.melee;
    }
  }

  return bonus;
}

export function computeRangedAttackBonus(character: Character): number {
  const effective = computeEffectiveStats(character);
  let bonus = getAbilityModifier(effective.DEX);

  // Elf farsight: +1 ranged (if chosen)
  if (character.ancestry === 'elf' && character.elfChoice === 'ranged') {
    bonus += 1;
  }

  // Talent attack bonuses
  for (const talent of character.talents) {
    if (talent.mechanic.type === 'attack_bonus') {
      bonus += talent.mechanic.ranged;
    }
  }

  return bonus;
}

export function computeSpellCheckBonus(character: Character): number | undefined {
  const classDef = getClass(character.class);
  if (!classDef?.spellcasting) return undefined;

  const effective = computeEffectiveStats(character);
  const stat = classDef.spellcasting.stat;
  let bonus = getAbilityModifier(effective[stat]);

  // Elf farsight: +1 spellcasting (if chosen)
  if (character.ancestry === 'elf' && character.elfChoice === 'spellcasting') {
    bonus += 1;
  }

  // Talent spellcasting bonuses
  for (const talent of character.talents) {
    if (talent.mechanic.type === 'spellcasting_bonus') {
      bonus += talent.mechanic.amount;
    }
  }

  return bonus;
}

// ========== Compute All ==========

export function computeCharacterValues(character: Character): ComputedCharacterValues {
  const effectiveStats = computeEffectiveStats(character);
  const modifiers = computeModifiers(effectiveStats);

  return {
    effectiveStats,
    modifiers,
    ac: computeAC(character),
    gearSlots: computeGearSlots(character),
    usedGearSlots: computeUsedGearSlots(character),
    meleeAttackBonus: computeMeleeAttackBonus(character),
    rangedAttackBonus: computeRangedAttackBonus(character),
    spellCheckBonus: computeSpellCheckBonus(character),
  };
}

// ========== Character Creation ==========

export function rollStartingGold(): number {
  const result = rollDice('2d6');
  return result.total * 5;
}

export function rollStartingHP(characterClass: CharacterClass, conMod: number, isDwarf: boolean): number {
  const classDef = getClass(characterClass);
  if (!classDef) return 1;

  if (isDwarf) {
    // Dwarves roll HP with advantage
    const roll1 = rollDice(`1${classDef.hitDie}`);
    const roll2 = rollDice(`1${classDef.hitDie}`);
    const hpRoll = Math.max(roll1.total, roll2.total);
    const baseHp = Math.max(1, hpRoll + conMod);
    return baseHp + 2; // Dwarf +2 HP
  }

  const hpRoll = rollDice(`1${classDef.hitDie}`);
  return Math.max(1, hpRoll.total + conMod);
}

export function getStartingLanguages(ancestry: Ancestry): string[] {
  const ancestryDef = getAncestry(ancestry);
  return [...(ancestryDef?.languages ?? ['Common'])];
}

export interface CreateCharacterParams {
  name: string;
  playerId: string;
  ancestry: Ancestry;
  characterClass: CharacterClass;
  alignment: Alignment;
  background: string;
  deity?: string;
  baseStats: AbilityScores;
  elfChoice?: 'ranged' | 'spellcasting';
  languages: string[];
  talents: AppliedTalent[];
  startingHp: number;
}

export function createCharacter(params: CreateCharacterParams): Character {
  const title = getTitle(params.characterClass, params.alignment, 1);

  const emptySpellState: CharacterSpellState = {
    knownSpells: [],
    penances: [],
  };

  const emptyInventory: InventoryState = {
    items: [],
    coins: { gp: 0, sp: 0, cp: 0 },
  };

  const character: Character = {
    id: generateId(),
    playerId: params.playerId,
    name: params.name,
    ancestry: params.ancestry,
    class: params.characterClass,
    level: 1,
    xp: 0,
    alignment: params.alignment,
    background: params.background,
    deity: params.deity,
    title,
    languages: params.languages,
    baseStats: params.baseStats,
    statModifications: [],
    maxHp: params.startingHp,
    currentHp: params.startingHp,
    isDying: false,
    inventory: emptyInventory,
    spells: emptySpellState,
    conditions: [],
    talents: params.talents,
    ancestryTraitUsed: false,
    elfChoice: params.elfChoice,
    hasLuckToken: false,
    weaponMasteries: [],
    notes: '',
    computed: {
      effectiveStats: params.baseStats,
      modifiers: computeModifiers(params.baseStats),
      ac: 10 + getAbilityModifier(params.baseStats.DEX),
      gearSlots: Math.max(params.baseStats.STR, 10),
      usedGearSlots: 0,
      meleeAttackBonus: getAbilityModifier(params.baseStats.STR),
      rangedAttackBonus: getAbilityModifier(params.baseStats.DEX),
    },
  };

  // Recompute all derived values
  character.computed = computeCharacterValues(character);
  return character;
}

// ========== Level Up ==========

export function canLevelUp(character: Character): boolean {
  if (character.level >= 10) return false;
  const threshold = XP_THRESHOLDS[character.level];
  return threshold !== undefined && character.xp >= threshold;
}

export function getXpToNextLevel(character: Character): number {
  if (character.level >= 10) return 0;
  const threshold = XP_THRESHOLDS[character.level] ?? 0;
  return Math.max(0, threshold - character.xp);
}

export function levelUpCharacter(character: Character, hpRoll: number, newTalent?: AppliedTalent): Character {
  const newLevel = character.level + 1;
  const conMod = getAbilityModifier(computeEffectiveStats(character).CON);
  const hpGain = Math.max(1, hpRoll + conMod);

  const updated: Character = {
    ...character,
    level: newLevel,
    xp: 0, // reset on level up
    title: getTitle(character.class, character.alignment, newLevel),
    maxHp: character.maxHp + hpGain,
    currentHp: character.currentHp + hpGain, // heal the gained amount
    talents: newTalent ? [...character.talents, newTalent] : character.talents,
  };

  updated.computed = computeCharacterValues(updated);
  return updated;
}

export function gainsTalentAtLevel(level: number): boolean {
  return (TALENT_LEVELS as readonly number[]).includes(level);
}

// ========== Rest ==========

export function restCharacter(character: Character): Character {
  const updated: Character = {
    ...character,
    currentHp: character.maxHp,
    isDying: false,
    deathTimer: undefined,
    ancestryTraitUsed: false,
    // Restore all lost spells
    spells: {
      ...character.spells,
      knownSpells: character.spells.knownSpells.map(s => ({
        ...s,
        isAvailable: true,
      })),
      activeFocusSpell: undefined,
    },
    // Remove non-permanent stat modifications
    statModifications: character.statModifications.filter(m => m.permanent),
    // Remove all conditions (rest clears temporary conditions)
    conditions: [],
  };
  updated.computed = computeCharacterValues(updated);
  return updated;
}
