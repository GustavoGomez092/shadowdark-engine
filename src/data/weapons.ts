import type { WeaponDefinition } from '@/schemas/inventory.ts';

export const WEAPONS: WeaponDefinition[] = [
  { id: 'bastard-sword', name: 'Bastard sword', type: 'melee', damage: 'd8', range: 'close', properties: ['versatile'], versatileDamage: 'd10', cost: 10, slots: 2 },
  { id: 'club', name: 'Club', type: 'melee', damage: 'd4', range: 'close', properties: [], cost: 0.05, slots: 1 },
  { id: 'crossbow', name: 'Crossbow', type: 'ranged', damage: 'd6', range: 'far', properties: ['two_handed', 'loading'], cost: 8, slots: 1 },
  { id: 'dagger', name: 'Dagger', type: 'melee', damage: 'd4', range: 'close', properties: ['finesse', 'thrown'], cost: 1, slots: 1, description: 'Can be thrown at near range' },
  { id: 'greataxe', name: 'Greataxe', type: 'melee', damage: 'd8', range: 'close', properties: ['versatile'], versatileDamage: 'd10', cost: 10, slots: 2 },
  { id: 'greatsword', name: 'Greatsword', type: 'melee', damage: 'd12', range: 'close', properties: ['two_handed'], cost: 12, slots: 2 },
  { id: 'javelin', name: 'Javelin', type: 'melee', damage: 'd4', range: 'close', properties: ['thrown'], cost: 0.5, slots: 1, description: 'Can be thrown at far range' },
  { id: 'longbow', name: 'Longbow', type: 'ranged', damage: 'd8', range: 'far', properties: ['two_handed'], cost: 8, slots: 1 },
  { id: 'longsword', name: 'Longsword', type: 'melee', damage: 'd8', range: 'close', properties: [], cost: 9, slots: 1 },
  { id: 'mace', name: 'Mace', type: 'melee', damage: 'd6', range: 'close', properties: [], cost: 5, slots: 1 },
  { id: 'shortbow', name: 'Shortbow', type: 'ranged', damage: 'd4', range: 'far', properties: ['two_handed'], cost: 6, slots: 1 },
  { id: 'shortsword', name: 'Shortsword', type: 'melee', damage: 'd6', range: 'close', properties: [], cost: 7, slots: 1 },
  { id: 'spear', name: 'Spear', type: 'melee', damage: 'd6', range: 'close', properties: ['thrown'], cost: 0.5, slots: 1, description: 'Can be thrown at near range' },
  { id: 'staff', name: 'Staff', type: 'melee', damage: 'd4', range: 'close', properties: ['two_handed'], cost: 0.5, slots: 1 },
  { id: 'warhammer', name: 'Warhammer', type: 'melee', damage: 'd10', range: 'close', properties: ['two_handed'], cost: 10, slots: 1 },

  // ==================== EXPANSION WEAPONS ====================
  { id: 'handaxe', name: 'Handaxe', type: 'melee', damage: 'd6', range: 'close', properties: ['thrown'], cost: 2, slots: 1, description: 'Can be thrown at near range' },
  { id: 'scimitar', name: 'Scimitar', type: 'melee', damage: 'd6', range: 'close', properties: ['finesse'], cost: 8, slots: 1 },
  { id: 'pike', name: 'Pike', type: 'melee', damage: 'd10', range: 'close', properties: ['two_handed'], cost: 5, slots: 2, description: 'Long reach weapon' },
  { id: 'whip', name: 'Whip', type: 'melee', damage: 'd4', range: 'close', properties: ['finesse'], cost: 2, slots: 1, description: 'Can reach near targets' },
  { id: 'blowgun', name: 'Blowgun', type: 'ranged', damage: 'd4', range: 'near', properties: [], cost: 1, slots: 1, description: 'Silent ranged weapon' },
  { id: 'bolas', name: 'Bolas', type: 'ranged', damage: 'd4', range: 'near', properties: ['thrown'], cost: 1, slots: 1, description: 'Can entangle targets' },
  { id: 'boomerang', name: 'Boomerang', type: 'ranged', damage: 'd4', range: 'near', properties: ['thrown'], cost: 1, slots: 1, description: 'Returns on a miss' },
  { id: 'razor-chain', name: 'Razor Chain', type: 'melee', damage: 'd6', range: 'close', properties: ['finesse'], cost: 5, slots: 1, description: 'Can reach near targets' },
  { id: 'shuriken', name: 'Shuriken', type: 'ranged', damage: 'd4', range: 'near', properties: ['thrown'], cost: 0.5, slots: 1, description: 'Throwing star' },
  { id: 'spear-thrower', name: 'Spear-thrower', type: 'ranged', damage: 'd6', range: 'far', properties: [], cost: 2, slots: 1, description: 'Hurls javelins at far range' },
  { id: 'stave', name: 'Stave', type: 'melee', damage: 'd6', range: 'close', properties: ['two_handed'], cost: 1, slots: 1, description: 'Rune-carved staff used by seers' },
  { id: 'morningstar', name: 'Morningstar', type: 'melee', damage: 'd8', range: 'close', properties: [], cost: 8, slots: 1 },
  { id: 'sling', name: 'Sling', type: 'ranged', damage: 'd4', range: 'near', properties: [], cost: 0.5, slots: 1 },
];

export function getWeapon(id: string): WeaponDefinition | undefined {
  return WEAPONS.find(w => w.id === id);
}
