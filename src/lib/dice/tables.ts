import type { RandomTable } from '@/schemas/reference.ts';
import { rollDice } from './roller.ts';

export function rollOnTable(table: RandomTable): string {
  const result = rollDice(table.diceExpression);
  const total = result.total;

  for (const entry of table.entries) {
    if (typeof entry.roll === 'number') {
      if (total === entry.roll) return entry.result;
    } else {
      const [min, max] = entry.roll;
      if (total >= min && total <= max) return entry.result;
    }
  }

  // Fallback: return last entry
  return table.entries[table.entries.length - 1]?.result ?? 'No result';
}
