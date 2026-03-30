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
];

export function getWeapon(id: string): WeaponDefinition | undefined {
  return WEAPONS.find(w => w.id === id);
}
