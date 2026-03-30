import type { ItemCategory } from './inventory.ts';
import type { Ancestry } from './character.ts';

export type StoreType =
  | 'general' | 'weapons' | 'armor' | 'magic'
  | 'potions' | 'tavern' | 'temple' | 'custom';

export interface GameStore {
  id: string;
  name: string;
  description: string;
  keeperName?: string;
  keeperAncestry?: Ancestry;
  storeType: StoreType;
  items: StoreItem[];
  isActive: boolean; // visible to players when true
}

export interface StoreItem {
  id: string;
  itemDefinitionId?: string; // reference to standard item
  name: string;
  description: string;
  price: number; // in gp
  quantity: number; // -1 = unlimited
  category: ItemCategory;
  slots: number;
  isCustom: boolean;
}
