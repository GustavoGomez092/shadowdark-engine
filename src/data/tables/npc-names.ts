export const NPC_NAMES: Record<string, string[]> = {
  dwarf: [
    'Hild', 'Torbin', 'Marga', 'Bruno', 'Karin', 'Nol', 'Brenna', 'Wulfgar',
    'Isolde', 'Thedric', 'Gudrun', 'Balor', 'Agna', 'Odar', 'Breglor', 'Ulfnora',
    'Gunnloda', 'Dain', 'Brunhild', 'Thuradin',
  ],
  elf: [
    'Lenuil', 'Fael', 'Daenala', 'Miriel', 'Aelrin', 'Galathil', 'Elora', 'Fyndril',
    'Naivara', 'Thamior', 'Quilinn', 'Ialantha', 'Hadarai', 'Sariel', 'Adran', 'Siannodel',
    'Caelynn', 'Riardon', 'Meriele', 'Varis',
  ],
  goblin: [
    'Iggs', 'Gnat', 'Tark', 'Blirg', 'Fried', 'Snokri', 'Drig', 'Hup',
    'Fibble', 'Lunk', 'Rug', 'Zook', 'Krak', 'Nix', 'Brix', 'Fizzle',
    'Grot', 'Pip', 'Wort', 'Snig',
  ],
  halfling: [
    'Willow', 'Brim', 'Nedda', 'Merric', 'Lidda', 'Osborn', 'Cora', 'Eldon',
    'Portia', 'Garret', 'Verna', 'Roscoe', 'Miri', 'Corrin', 'Paela', 'Wellby',
    'Lavinia', 'Seraph', 'Callie', 'Finnan',
  ],
  'half-orc': [
    'Dench', 'Feng', 'Henk', 'Holg', 'Imsh', 'Keth', 'Krusk', 'Mhurren',
    'Ront', 'Shump', 'Thokk', 'Baggi', 'Emen', 'Engong', 'Myev', 'Neega',
    'Ovak', 'Ownka', 'Sutha', 'Vola',
  ],
  human: [
    'Bram', 'Elena', 'Heron', 'Freya', 'Osric', 'Mara', 'Aldric', 'Selene',
    'Gareth', 'Rowena', 'Theron', 'Brenna', 'Dorian', 'Lyra', 'Cedric', 'Isolde',
    'Marcus', 'Astrid', 'Rowan', 'Elara',
  ],
};

export function getRandomName(ancestry: string): string {
  const names = NPC_NAMES[ancestry] ?? NPC_NAMES['human'];
  return names[Math.floor(Math.random() * names.length)];
}
