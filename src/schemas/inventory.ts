import type { DieType } from './dice.ts';
import type { Alignment, RangeCategory } from './reference.ts';

export type ItemCategory =
  | 'weapon' | 'armor' | 'shield' | 'gear' | 'consumable'
  | 'treasure' | 'magic_item' | 'ammo' | 'ration' | 'light_source' | 'coins';

export type WeaponProperty = 'finesse' | 'loading' | 'thrown' | 'two_handed' | 'versatile';

export interface WeaponDefinition {
  id: string;
  name: string;
  type: 'melee' | 'ranged';
  damage: DieType;
  range: RangeCategory;
  properties: WeaponProperty[];
  versatileDamage?: DieType;
  cost: number; // in gp
  slots: number;
  description?: string;
}

export interface ArmorDefinition {
  id: string;
  name: string;
  type: 'leather' | 'chainmail' | 'plate' | 'shield';
  acBase: number; // 11, 13, 15, or +2 for shield
  addDex: boolean;
  stealthPenalty: boolean;
  swimPenalty: 'none' | 'disadvantage' | 'cannot';
  cost: number;
  slots: number;
  isMithral: boolean;
}

export interface GearDefinition {
  id: string;
  name: string;
  category: ItemCategory;
  cost: number; // in gp (use decimals for sp/cp: 0.5 = 5sp, 0.05 = 5cp)
  slots: number;
  description: string;
  quantityPerSlot?: number; // e.g., 20 arrows per slot, 3 rations per slot
  mechanics?: GearMechanic[];
}

export interface GearMechanic {
  type: 'light_source' | 'healing' | 'advantage' | 'damage' | 'utility';
  value?: number;
  dieValue?: string;
  range?: RangeCategory;
  description?: string;
}

export interface MagicItemDefinition {
  id: string;
  name: string;
  baseItemId?: string; // reference to base weapon/armor
  bonus: number; // +1 to +3
  benefit?: string;
  curse?: string;
  personality?: MagicItemPersonality;
  slots: number;
  value?: number; // gp value
  description: string;
}

export interface MagicItemPersonality {
  name: string;
  alignment: Alignment;
  virtue: string;
  flaw: string;
  desire?: string;
}

// ========== LIVE INVENTORY STATE ==========

export interface CoinPouch {
  gp: number;
  sp: number;
  cp: number;
}

export interface InventoryItem {
  id: string;
  definitionId: string;
  name: string;
  category: ItemCategory;
  slots: number;
  quantity: number;
  equipped: boolean;
  isIdentified: boolean;
  magicBonus?: number;
  notes?: string;

  weapon?: {
    definitionId: string;
    masteryApplied: boolean;
  };

  armor?: {
    definitionId: string;
    isMithral: boolean;
  };

  magic?: {
    definitionId: string;
    isAttuned: boolean;
    curseRevealed: boolean;
    personalityRevealed: boolean;
  };

  consumable?: {
    uses: number;
    maxUses?: number;
    isExpended: boolean;
  };

  lightSource?: {
    isLit: boolean;
    timerId?: string;
  };
}

export interface InventoryState {
  items: InventoryItem[];
  coins: CoinPouch;
}

// Coin encumbrance rules:
// - First 100 coins (total gp + sp + cp) are free (no slots)
// - Every 100 coins after that = 1 gear slot
export function calculateCoinSlots(coins: CoinPouch): number {
  const totalCoins = coins.gp + coins.sp + coins.cp;
  const excess = Math.max(0, totalCoins - 100);
  return Math.ceil(excess / 100);
}
