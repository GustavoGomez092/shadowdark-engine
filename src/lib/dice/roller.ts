import type { DieType, DieResult, DiceRollResult } from '@/schemas/dice.ts';
import { parseDiceNotation, getDieSides } from './parser.ts';
import { generateId } from '@/lib/utils/id.ts';

function rollSingleDie(die: DieType): DieResult {
  const sides = getDieSides(die);
  const value = Math.floor(Math.random() * sides) + 1;
  return {
    die,
    value,
    isNat1: value === 1,
    isNat20: die === 'd20' && value === 20,
  };
}

export interface RollOptions {
  advantage?: boolean;
  disadvantage?: boolean;
  rolledBy?: string;
  purpose?: string;
}

export function rollDice(notation: string, options: RollOptions = {}): DiceRollResult {
  const expr = parseDiceNotation(notation);

  // For advantage/disadvantage, only applies to single d20 rolls
  if ((options.advantage || options.disadvantage) && expr.count === 1 && expr.die === 'd20') {
    const roll1 = rollSingleDie(expr.die);
    const roll2 = rollSingleDie(expr.die);

    const useFirst = options.advantage
      ? roll1.value >= roll2.value
      : roll1.value <= roll2.value;

    const chosen = useFirst ? roll1 : roll2;
    const alternate = useFirst ? roll2 : roll1;

    return {
      id: generateId(),
      expression: notation,
      dice: [chosen],
      modifier: expr.modifier,
      total: chosen.value + expr.modifier,
      timestamp: Date.now(),
      rolledBy: options.rolledBy ?? 'unknown',
      purpose: options.purpose,
      advantage: options.advantage,
      disadvantage: options.disadvantage,
      alternateTotal: alternate.value + expr.modifier,
    };
  }

  // Standard roll
  const dice: DieResult[] = [];
  for (let i = 0; i < expr.count; i++) {
    dice.push(rollSingleDie(expr.die));
  }

  const diceTotal = dice.reduce((sum, d) => sum + d.value, 0);

  return {
    id: generateId(),
    expression: notation,
    dice,
    modifier: expr.modifier,
    total: diceTotal + expr.modifier,
    timestamp: Date.now(),
    rolledBy: options.rolledBy ?? 'unknown',
    purpose: options.purpose,
  };
}

// Roll on a d6 for the "D6 Decider" (1-3 bad, 4-6 good)
export function rollD6Decider(): { roll: number; favorable: boolean } {
  const result = rollDice('1d6');
  return {
    roll: result.total,
    favorable: result.total >= 4,
  };
}

// Roll 3d6 for ability score generation
export function rollAbilityScore(): { dice: number[]; total: number } {
  const result = rollDice('3d6');
  return {
    dice: result.dice.map(d => d.value),
    total: result.total,
  };
}

// Roll all 6 ability scores in order
export function rollAllAbilityScores(): { STR: number; DEX: number; CON: number; INT: number; WIS: number; CHA: number } {
  return {
    STR: rollAbilityScore().total,
    DEX: rollAbilityScore().total,
    CON: rollAbilityScore().total,
    INT: rollAbilityScore().total,
    WIS: rollAbilityScore().total,
    CHA: rollAbilityScore().total,
  };
}
