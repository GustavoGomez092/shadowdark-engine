export type DieType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';

export interface DiceExpression {
  count: number;
  die: DieType;
  modifier: number;
}

export interface DieResult {
  die: DieType;
  value: number;
  isNat1: boolean;
  isNat20: boolean;
}

export interface DiceRollResult {
  id: string;
  expression: string;
  dice: DieResult[];
  modifier: number;
  total: number;
  timestamp: number;
  rolledBy: string;
  purpose?: string;
  advantage?: boolean;
  disadvantage?: boolean;
  alternateTotal?: number;
}
