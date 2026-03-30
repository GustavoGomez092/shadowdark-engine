export interface TrapEntry {
  roll: number;
  trap: string;
  trigger: string;
  effect: string;
}

export const TRAPS: TrapEntry[] = [
  { roll: 1, trap: 'Crossbow', trigger: 'Tripwire', effect: '1d6 damage' },
  { roll: 2, trap: 'Hail of needles', trigger: 'Pressure plate', effect: '1d6 damage / sleep' },
  { roll: 3, trap: 'Toxic gas', trigger: 'Opening a door', effect: '1d6 damage / paralyze' },
  { roll: 4, trap: 'Barbed net', trigger: 'Switch or button', effect: '1d6 damage / blind' },
  { roll: 5, trap: 'Rolling boulder', trigger: 'False step on stairs', effect: '2d8 damage' },
  { roll: 6, trap: 'Slicing blade', trigger: 'Closing a door', effect: '2d8 damage / sleep' },
  { roll: 7, trap: 'Spiked pit', trigger: 'Breaking a light beam', effect: '2d8 damage / paralyze' },
  { roll: 8, trap: 'Javelin', trigger: 'Pulling a lever', effect: '2d8 damage / confuse' },
  { roll: 9, trap: 'Magical glyph', trigger: 'A word is spoken', effect: '3d10 damage' },
  { roll: 10, trap: 'Blast of fire', trigger: 'Hook on a thread', effect: '3d10 damage / paralyze' },
  { roll: 11, trap: 'Falling block', trigger: 'Removing an object', effect: '3d10 damage / unconscious' },
  { roll: 12, trap: 'Cursed statue', trigger: 'Casting a spell', effect: '3d10 damage / petrify' },
];

export function getRandomTrap(): TrapEntry {
  const roll = Math.floor(Math.random() * 12) + 1;
  return TRAPS[roll - 1];
}
