import type { InventoryItem, InventoryState, CoinPouch, ItemCategory } from '@/schemas/inventory.ts';
import { calculateCoinSlots } from '@/schemas/inventory.ts';
import { generateId } from '@/lib/utils/id.ts';

// ========== Slot Calculations ==========

export function calculateUsedSlots(inventory: InventoryState): number {
  // Each item takes its slot count regardless of quantity
  // (20 arrows = 1 slot, 3 rations = 1 slot)
  const itemSlots = inventory.items.reduce((total, item) => {
    return total + item.slots;
  }, 0);
  const coinSlots = calculateCoinSlots(inventory.coins);
  return itemSlots + coinSlots;
}

export function canCarryItem(inventory: InventoryState, maxSlots: number, itemSlots: number, _quantity: number = 1): boolean {
  const currentSlots = calculateUsedSlots(inventory);
  return currentSlots + itemSlots <= maxSlots;
}

// ========== Add / Remove Items ==========

export function addItem(inventory: InventoryState, item: Omit<InventoryItem, 'id'>): InventoryState {
  const newItem: InventoryItem = {
    ...item,
    id: generateId(),
  };
  return {
    ...inventory,
    items: [...inventory.items, newItem],
  };
}

export function removeItem(inventory: InventoryState, itemId: string): InventoryState {
  return {
    ...inventory,
    items: inventory.items.filter(i => i.id !== itemId),
  };
}

export function updateItem(inventory: InventoryState, itemId: string, updates: Partial<InventoryItem>): InventoryState {
  return {
    ...inventory,
    items: inventory.items.map(i => i.id === itemId ? { ...i, ...updates } : i),
  };
}

export function adjustItemQuantity(inventory: InventoryState, itemId: string, delta: number): InventoryState {
  const item = inventory.items.find(i => i.id === itemId);
  if (!item) return inventory;

  const newQuantity = item.quantity + delta;
  if (newQuantity <= 0) {
    return removeItem(inventory, itemId);
  }

  return updateItem(inventory, itemId, { quantity: newQuantity });
}

// ========== Equip / Unequip ==========

export function equipItem(inventory: InventoryState, itemId: string): InventoryState {
  const item = inventory.items.find(i => i.id === itemId);
  if (!item) return inventory;

  // If equipping armor, unequip other armor of same category
  if (item.category === 'armor' || item.category === 'shield') {
    const updated = inventory.items.map(i => {
      if (i.id === itemId) return { ...i, equipped: true };
      if (i.category === item.category && i.equipped) return { ...i, equipped: false };
      return i;
    });
    return { ...inventory, items: updated };
  }

  return updateItem(inventory, itemId, { equipped: true });
}

export function unequipItem(inventory: InventoryState, itemId: string): InventoryState {
  return updateItem(inventory, itemId, { equipped: false });
}

// ========== Coins ==========

export function addCoins(inventory: InventoryState, coins: Partial<CoinPouch>): InventoryState {
  return {
    ...inventory,
    coins: {
      gp: inventory.coins.gp + (coins.gp ?? 0),
      sp: inventory.coins.sp + (coins.sp ?? 0),
      cp: inventory.coins.cp + (coins.cp ?? 0),
    },
  };
}

export function removeCoins(inventory: InventoryState, coins: Partial<CoinPouch>): InventoryState | null {
  const newGp = inventory.coins.gp - (coins.gp ?? 0);
  const newSp = inventory.coins.sp - (coins.sp ?? 0);
  const newCp = inventory.coins.cp - (coins.cp ?? 0);

  if (newGp < 0 || newSp < 0 || newCp < 0) return null; // insufficient funds

  return {
    ...inventory,
    coins: { gp: newGp, sp: newSp, cp: newCp },
  };
}

export function getTotalGoldValue(coins: CoinPouch): number {
  return coins.gp + coins.sp / 10 + coins.cp / 100;
}

export function canAfford(coins: CoinPouch, costInGp: number): boolean {
  return getTotalGoldValue(coins) >= costInGp;
}

/** Deduct cost from coins, spending cp first, then sp, then gp. Returns new CoinPouch or null if can't afford. */
export function deductCost(coins: CoinPouch, costInGp: number): CoinPouch | null {
  let remainingCp = Math.round(costInGp * 100); // convert to cp for precision
  let { gp, sp, cp } = coins;

  // Spend cp first
  const cpSpent = Math.min(cp, remainingCp);
  cp -= cpSpent;
  remainingCp -= cpSpent;

  // Then sp (1 sp = 10 cp)
  const spNeeded = Math.ceil(remainingCp / 10);
  const spSpent = Math.min(sp, spNeeded);
  sp -= spSpent;
  remainingCp -= spSpent * 10;

  // Then gp (1 gp = 100 cp)
  if (remainingCp > 0) {
    const gpNeeded = Math.ceil(remainingCp / 100);
    if (gpNeeded > gp) return null; // can't afford
    gp -= gpNeeded;
    const change = gpNeeded * 100 - remainingCp;
    // Give change back in sp and cp
    sp += Math.floor(change / 10);
    cp += change % 10;
  }

  return { gp, sp, cp };
}

// ========== Store Transactions ==========

export interface BuyResult {
  inventory: InventoryState;
  success: boolean;
  reason?: string;
}

export function buyFromStore(
  inventory: InventoryState,
  maxSlots: number,
  item: {
    name: string;
    category: ItemCategory;
    slots: number;
    price: number;
    definitionId?: string;
  }
): BuyResult {
  // Check affordability
  const newCoins = deductCost(inventory.coins, item.price);
  if (!newCoins) {
    return { inventory, success: false, reason: 'Insufficient funds' };
  }

  // Check encumbrance
  const tempInventory = { ...inventory, coins: newCoins };
  if (!canCarryItem(tempInventory, maxSlots, item.slots)) {
    return { inventory, success: false, reason: 'Not enough gear slots' };
  }

  // Add item
  const newItem: Omit<InventoryItem, 'id'> = {
    definitionId: item.definitionId ?? item.name.toLowerCase().replace(/\s/g, '-'),
    name: item.name,
    category: item.category,
    slots: item.slots,
    quantity: 1,
    equipped: false,
    isIdentified: true,
  };

  const updatedInventory = addItem({ ...inventory, coins: newCoins }, newItem);
  return { inventory: updatedInventory, success: true };
}

export function sellItem(
  inventory: InventoryState,
  itemId: string,
  sellPrice: number
): InventoryState {
  const updatedInventory = removeItem(inventory, itemId);
  return addCoins(updatedInventory, { gp: Math.floor(sellPrice) });
}

// ========== Utility ==========

export function getEquippedWeapons(inventory: InventoryState): InventoryItem[] {
  return inventory.items.filter(i => i.equipped && i.weapon);
}

export function getEquippedArmor(inventory: InventoryState): InventoryItem | undefined {
  return inventory.items.find(i => i.equipped && i.category === 'armor');
}

export function getEquippedShield(inventory: InventoryState): InventoryItem | undefined {
  return inventory.items.find(i => i.equipped && i.category === 'shield');
}

export function createInventoryItem(
  definitionId: string,
  name: string,
  category: ItemCategory,
  slots: number,
  overrides?: Partial<InventoryItem>
): InventoryItem {
  // Auto-detect quantity for stackable items (ammo, rations)
  // by checking the name for common patterns like "(20)", "(5)", "(3)"
  let defaultQuantity = 1
  const qtyMatch = name.match(/\((\d+)\)/)
  if (qtyMatch && (category === 'ammo' || category === 'ration')) {
    defaultQuantity = parseInt(qtyMatch[1], 10)
  }

  return {
    id: generateId(),
    definitionId,
    name,
    category,
    slots,
    quantity: defaultQuantity,
    equipped: false,
    isIdentified: true,
    ...overrides,
  };
}
