export const ADVENTURE_NAME_COL1 = [
  'Mines of the', 'Abbey of the', 'Tower of the', 'Caves of the', 'Barrow of the',
  'Warrens of the', 'Crypt of the', 'Monastery of the', 'Ruin of the', 'Tunnels of the',
  'Citadel of the', 'Tomb of the', 'Castle of the', 'Temple of the', 'Fortress of the',
  'Isle of the', 'Keep of the', 'Dungeon of the', 'Necropolis of the', 'Shrine of the',
];

export const ADVENTURE_NAME_COL2 = [
  'Cursed', 'Whispering', 'Bleeding', 'Shrouded', 'Lost',
  'Dead', 'Deepwood', 'Fallen', 'Revenant', 'Frozen',
  'Shimmering', 'Chaos', 'Abandoned', 'Blighted', 'Forgotten',
  'Slumbering', 'Savage', 'Unholy', 'Enchanted', 'Immortal',
];

export const ADVENTURE_NAME_COL3 = [
  'Flame', 'Ghost', 'Darkness', 'Peak', 'Borderlands',
  'King', 'Twilight', 'Depths', 'Jewel', 'God',
  'Lands', 'Storm', 'Swamp', 'Ravine', 'Valley',
  'Horde', 'Skull', 'Queen', 'Wastes', 'Hero',
];

export function generateAdventureName(): string {
  const col1 = ADVENTURE_NAME_COL1[Math.floor(Math.random() * 20)];
  const col2 = ADVENTURE_NAME_COL2[Math.floor(Math.random() * 20)];
  const col3 = ADVENTURE_NAME_COL3[Math.floor(Math.random() * 20)];
  return `${col1} ${col2} ${col3}`;
}
