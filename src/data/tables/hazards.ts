export const HAZARD_MOVEMENT = [
  'Quicksand', 'Caltrops', 'Loose debris', 'Tar field', 'Grasping vines',
  'Steep incline', 'Slippery ice', 'Rushing water', 'Sticky webs', 'Gale force wind',
  'Greased floor', 'Illusory terrain',
];

export const HAZARD_DAMAGE = [
  'Acid pools', 'Exploding rocks', 'Icy water', 'Lava', 'Pummeling hail',
  'Steam vents', 'Toxic mold', 'Falling debris', 'Acid rain', 'Curtain of fire',
  'Electrified field', 'Gravity flux',
];

export const HAZARD_WEAKEN = [
  'Blinding smoke', 'Magnetic field', 'Exhausting runes', 'Antimagic zone', 'Snuffs light sources',
  'Disorienting sound', 'Magical silence', 'Numbing cold', 'Sickening smell', 'Sleep-inducing spores',
  'Confusing reflections', 'Memory-stealing',
];

export function getRandomHazard(): { movement: string; damage: string; weaken: string } {
  return {
    movement: HAZARD_MOVEMENT[Math.floor(Math.random() * 12)],
    damage: HAZARD_DAMAGE[Math.floor(Math.random() * 12)],
    weaken: HAZARD_WEAKEN[Math.floor(Math.random() * 12)],
  };
}
