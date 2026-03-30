import type { ArmorDefinition } from '@/schemas/inventory.ts';

export const ARMOR: ArmorDefinition[] = [
  {
    id: 'leather',
    name: 'Leather armor',
    type: 'leather',
    acBase: 11,
    addDex: true,
    stealthPenalty: false,
    swimPenalty: 'none',
    cost: 10,
    slots: 1,
    isMithral: false,
  },
  {
    id: 'chainmail',
    name: 'Chainmail',
    type: 'chainmail',
    acBase: 13,
    addDex: true,
    stealthPenalty: true,
    swimPenalty: 'disadvantage',
    cost: 60,
    slots: 2,
    isMithral: false,
  },
  {
    id: 'plate-mail',
    name: 'Plate mail',
    type: 'plate',
    acBase: 15,
    addDex: false,
    stealthPenalty: true,
    swimPenalty: 'cannot',
    cost: 130,
    slots: 3,
    isMithral: false,
  },
  {
    id: 'shield',
    name: 'Shield',
    type: 'shield',
    acBase: 2, // +2 bonus
    addDex: false,
    stealthPenalty: false,
    swimPenalty: 'none',
    cost: 10,
    slots: 1,
    isMithral: false,
  },
  {
    id: 'mithral-chainmail',
    name: 'Mithral chainmail',
    type: 'chainmail',
    acBase: 13,
    addDex: true,
    stealthPenalty: false,
    swimPenalty: 'none',
    cost: 240, // 4x chainmail cost
    slots: 1, // -1 slot from mithral
    isMithral: true,
  },
  {
    id: 'mithral-plate',
    name: 'Mithral plate mail',
    type: 'plate',
    acBase: 15,
    addDex: false,
    stealthPenalty: false,
    swimPenalty: 'none',
    cost: 520, // 4x plate cost
    slots: 2, // -1 slot from mithral
    isMithral: true,
  },
];

export function getArmor(id: string): ArmorDefinition | undefined {
  return ARMOR.find(a => a.id === id);
}
