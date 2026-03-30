import type { DangerLevel, RangeCategory, TreasureQuality } from './reference.ts';
import type { MonsterInstance } from './monsters.ts';
import type { CoinPouch } from './inventory.ts';

export interface EncounterCheckResult {
  id: string;
  dangerLevel: DangerLevel;
  roll: number; // d6
  isEncounter: boolean; // true if roll === 1
  timestamp: number;
  crawlingRound: number;
}

export interface RandomEncounter {
  id: string;
  startingDistance: RangeCategory;
  startingDistanceRoll: number;
  activityRoll: number;
  activity: string;
  reactionRoll: number;
  chaModifier: number;
  reactionTotal: number;
  reaction: 'hostile' | 'suspicious' | 'neutral' | 'curious' | 'friendly';
  hasTreasure: boolean;
  treasure?: TreasureResult;
  monsters: MonsterInstance[];
  isResolved: boolean;
  resolution?: 'combat' | 'negotiation' | 'fled' | 'avoided';
}

export interface TreasureResult {
  xpClass: TreasureQuality;
  xpValue: number;
  items: TreasureItem[];
  coins: CoinPouch;
  description?: string;
}

export interface TreasureItem {
  id: string;
  name: string;
  gpValue: number;
  description: string;
  isMagic: boolean;
  magicItemId?: string;
  itemDefinitionId?: string;
}
