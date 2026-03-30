import type { DiceExpression, DieType } from '@/schemas/dice.ts';

const VALID_DICE: DieType[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];

const DICE_REGEX = /^(\d+)?d(\d+)([+-]\d+)?$/i;

export function parseDiceNotation(notation: string): DiceExpression {
  const cleaned = notation.replace(/\s/g, '');
  const match = cleaned.match(DICE_REGEX);

  if (!match) {
    throw new Error(`Invalid dice notation: "${notation}"`);
  }

  const count = match[1] ? parseInt(match[1], 10) : 1;
  const dieSides = parseInt(match[2], 10);
  const modifier = match[3] ? parseInt(match[3], 10) : 0;

  const dieStr = `d${dieSides}` as DieType;
  if (!VALID_DICE.includes(dieStr)) {
    throw new Error(`Invalid die type: d${dieSides}`);
  }

  return { count, die: dieStr, modifier };
}

export function getDieSides(die: DieType): number {
  return parseInt(die.substring(1), 10);
}

export function formatDiceExpression(expr: DiceExpression): string {
  let result = `${expr.count}${expr.die}`;
  if (expr.modifier > 0) result += `+${expr.modifier}`;
  else if (expr.modifier < 0) result += `${expr.modifier}`;
  return result;
}
