import type { MonsterDefinition } from '@/schemas/monsters.ts';

export const MONSTERS: MonsterDefinition[] = [
  // ---------- 1. Aboleth (p.194) ----------
  {
    id: 'aboleth',
    name: 'Aboleth',
    description: 'An ancient aquatic horror with psychic dominion over lesser minds.',
    level: 8,
    ac: 16,
    acSource: 'natural',
    hp: 39,
    hpDice: '6d10+6',
    attacks: [
      { name: 'Tentacle', bonus: 5, damage: '1d8', range: 'near', multiattack: 2, specialEffect: 'curse' },
      { name: 'Tail', bonus: 5, damage: '3d6', range: 'close' },
    ],
    movement: { normal: 'near', swim: 'near' },
    stats: { STR: 18, DEX: 8, CON: 16, INT: 18, WIS: 14, CHA: 14 },
    alignment: 'chaotic',
    abilities: [
      { name: 'Curse', description: 'A creature hit by a tentacle must pass DC 15 CON or contract a mucous disease. Within 1d4 hours it can only breathe underwater.' },
      { name: 'Enslave', description: 'The aboleth targets one creature within near. DC 15 WIS or charmed for 1 day. It can repeat the save when it takes damage.' },
      { name: 'Telepathic', description: 'The aboleth communicates telepathically with any creature within far range.' },
    ],
    checksMorale: true,
    tags: ['aberration', 'aquatic'],
  },

  // ---------- 2. Acolyte (p.194) ----------
  {
    id: 'acolyte',
    name: 'Acolyte',
    description: 'A low-ranking priest devoted to a deity.',
    level: 1,
    ac: 12,
    acSource: 'leather',
    hp: 4,
    hpDice: '1d8',
    attacks: [
      { name: 'Mace', bonus: 1, damage: '1d6', range: 'close' },
      { name: 'Spell +2', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 12, DEX: 8, CON: 10, INT: 8, WIS: 14, CHA: 10 },
    alignment: 'lawful',
    abilities: [
      { name: 'Healing Touch', description: 'Once per day, the acolyte can heal a creature within close range for 1d4 HP.' },
    ],
    checksMorale: true,
    tags: ['humanoid', 'spellcaster'],
  },

  // ---------- 3. Angel, Domini (p.195) ----------
  {
    id: 'angel-domini',
    name: 'Angel, Domini',
    description: 'A radiant celestial warrior whose burning gaze judges the wicked and whose blade cleaves the unholy.',
    level: 9,
    ac: 17,
    acSource: 'plate mail + shield',
    hp: 42,
    attacks: [
      { name: 'Bastard Sword', bonus: 7, damage: '1d8', range: 'close', multiattack: 3 },
      { name: 'Horn', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near', fly: 'near' },
    stats: { STR: 18, DEX: 12, CON: 14, INT: 16, WIS: 18, CHA: 18 },
    alignment: 'lawful',
    abilities: [],
    checksMorale: true,
    tags: ['celestial', 'angel'],
  },

  // ---------- 4. Angel, Principi (p.195) ----------
  {
    id: 'angel-principi',
    name: 'Angel, Principi',
    description: 'A celestial commander clad in blinding radiance, leading the heavenly host against the forces of darkness.',
    level: 11,
    ac: 16,
    acSource: '+1 plate mail',
    hp: 53,
    attacks: [
      { name: 'Silvered Bastard Sword', bonus: 9, damage: '1d10', range: 'close', multiattack: 3 },
    ],
    movement: { normal: 'near', double: true, fly: 'near' },
    stats: { STR: 18, DEX: 14, CON: 18, INT: 18, WIS: 18, CHA: 18 },
    alignment: 'lawful',
    abilities: [],
    checksMorale: true,
    tags: ['celestial', 'angel'],
  },

  // ---------- 5. Angel, Seraph (p.195) ----------
  {
    id: 'angel-seraph',
    name: 'Angel, Seraph',
    description: 'A radiant celestial warrior wreathed in holy fire, sent to enact divine judgment.',
    level: 3,
    ac: 14,
    acSource: 'chainmail',
    hp: 14,
    attacks: [
      { name: 'Longsword', bonus: 3, damage: '1d8', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near', fly: 'near' },
    stats: { STR: 16, DEX: 12, CON: 12, INT: 14, WIS: 16, CHA: 16 },
    alignment: 'lawful',
    abilities: [],
    checksMorale: true,
    tags: ['celestial', 'angel'],
  },

  // ---------- 6. Animated Armor (p.196) ----------
  {
    id: 'animated-armor',
    name: 'Animated Armor',
    description: 'A suit of armor animated by arcane magic to guard a location.',
    level: 2,
    ac: 15,
    acSource: 'plate',
    hp: 11,
    hpDice: '2d8+2',
    attacks: [
      { name: 'Longsword', bonus: 3, damage: '1d8', range: 'close' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 16, DEX: 8, CON: 14, INT: 8, WIS: 12, CHA: 10 },
    alignment: 'chaotic',
    abilities: [
      { name: 'Statue', description: 'The animated armor appears to be a normal suit of armor when motionless. It is indistinguishable until it moves.' },
    ],
    checksMorale: true,
    tags: ['construct'],
  },

  // ---------- 7. Ankheg (p.196) ----------
  {
    id: 'ankheg',
    name: 'Ankheg',
    description: 'A burrowing insectoid with mandibles like shears and a corrosive acid spray.',
    level: 3,
    ac: 14,
    hp: 14,
    attacks: [
      { name: 'Bite', bonus: 4, damage: '1d6', range: 'close' },
      { name: 'Acid Spray', bonus: 4, damage: '2d6', range: 'near' },
    ],
    movement: { normal: 'near', burrow: 'near' },
    stats: { STR: 14, DEX: 14, CON: 12, INT: 6, WIS: 12, CHA: 6 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 8. Ape (p.196) ----------
  {
    id: 'ape',
    name: 'Ape',
    description: 'A powerful primate with long arms and a fierce territorial temper.',
    level: 2,
    ac: 12,
    hp: 10,
    attacks: [
      { name: 'Fist', bonus: 2, damage: '1d6', range: 'close' },
      { name: 'Rock', bonus: 2, damage: '1d4', range: 'far' },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 14, DEX: 14, CON: 12, INT: 6, WIS: 12, CHA: 10 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal'],
  },

  // ---------- 9. Ape, Snow (p.196) ----------
  {
    id: 'ape-snow',
    name: 'Ape, Snow',
    description: 'A white-furred mountain ape that hurls rocks and crushes intruders in its frozen domain.',
    level: 4,
    ac: 13,
    hp: 19,
    attacks: [
      { name: 'Fist', bonus: 4, damage: '1d6', range: 'close', multiattack: 2 },
      { name: 'Rock', bonus: 4, damage: '2d6', range: 'far' },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 16, DEX: 12, CON: 12, INT: 6, WIS: 12, CHA: 10 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal'],
  },

  // ---------- 10. Apprentice (p.196) ----------
  {
    id: 'apprentice',
    name: 'Apprentice',
    description: 'A young student of the arcane arts, barely trained and eager to prove themselves.',
    level: 1,
    ac: 11,
    hp: 3,
    attacks: [
      { name: 'Dagger', bonus: 1, damage: '1d4', range: 'near' },
      { name: 'Spell +2', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 8, DEX: 12, CON: 8, INT: 14, WIS: 10, CHA: 10 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 11. Archangel (p.195) ----------
  {
    id: 'archangel',
    name: 'Archangel',
    description: 'A supreme celestial being of blinding glory whose mere presence sears the wicked and inspires the righteous.',
    level: 16,
    ac: 18,
    acSource: '+3 plate mail',
    hp: 76,
    attacks: [
      { name: 'Flaming Greatsword', bonus: 10, damage: '2d12', range: 'close', multiattack: 3 },
    ],
    movement: { normal: 'near', double: true, fly: 'near' },
    stats: { STR: 20, DEX: 14, CON: 18, INT: 18, WIS: 20, CHA: 20 },
    alignment: 'lawful',
    abilities: [],
    checksMorale: true,
    tags: ['celestial', 'angel'],
  },

  // ---------- 12. Archdevil (p.206) ----------
  {
    id: 'archdevil',
    name: 'Archdevil',
    description: 'A sovereign of the Nine Hells whose honeyed words have toppled empires and damned countless souls.',
    level: 16,
    ac: 19,
    hp: 76,
    attacks: [
      { name: 'Iron Scepter', bonus: 10, damage: '3d10', range: 'close', multiattack: 4 },
      { name: 'Soulbind', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 20, DEX: 18, CON: 18, INT: 20, WIS: 18, CHA: 24 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['fiend', 'devil'],
  },

  // ---------- 13. Archmage (p.197) ----------
  {
    id: 'archmage',
    name: 'Archmage',
    description: 'A master of the arcane whose vast knowledge bends the very laws of reality to their will.',
    level: 10,
    ac: 12,
    hp: 44,
    attacks: [
      { name: 'Spell +7', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 8, DEX: 14, CON: 8, INT: 18, WIS: 14, CHA: 12 },
    alignment: 'lawful',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 14. Assassin (p.197) ----------
  {
    id: 'assassin',
    name: 'Assassin',
    description: 'A cold-eyed killer trained in poison and shadow, striking once from the dark and vanishing.',
    level: 8,
    ac: 15,
    acSource: 'leather',
    hp: 38,
    attacks: [
      { name: 'Poisoned Dagger', bonus: 6, damage: '2d4', range: 'near', multiattack: 2 },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 14, DEX: 18, CON: 14, INT: 14, WIS: 16, CHA: 16 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 15. Azer (p.197) ----------
  {
    id: 'azer',
    name: 'Azer',
    description: 'A stout, bronze-skinned elemental smith whose hair and beard burn with living flame.',
    level: 3,
    ac: 15,
    hp: 15,
    attacks: [
      { name: 'Flaming Warhammer', bonus: 3, damage: '1d10', range: 'close', multiattack: 2, specialEffect: 'ignites flammables' },
      { name: 'Crossbow', bonus: 0, damage: '1d6', range: 'far' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 16, DEX: 10, CON: 14, INT: 10, WIS: 10, CHA: 10 },
    alignment: 'lawful',
    abilities: [],
    checksMorale: true,
    tags: ['elemental'],
  },

  // ---------- 16. Badger (p.197) ----------
  {
    id: 'badger',
    name: 'Badger',
    description: 'A stocky, burrowing mammal with powerful claws and a vicious temperament when cornered.',
    level: 1,
    ac: 11,
    hp: 5,
    attacks: [
      { name: 'Claw', bonus: 2, damage: '1d4', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near', burrow: 'near' },
    stats: { STR: 14, DEX: 10, CON: 12, INT: 4, WIS: 12, CHA: 6 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal'],
  },

  // ---------- 17. Bandit (p.197) ----------
  {
    id: 'bandit',
    name: 'Bandit',
    description: 'A common brigand who preys on travelers.',
    level: 1,
    ac: 13,
    acSource: 'leather + shield',
    hp: 4,
    hpDice: '1d8',
    attacks: [
      { name: 'Club', bonus: 1, damage: '1d4', range: 'close' },
      { name: 'Shortbow', bonus: 0, damage: '1d4', range: 'far' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 12, DEX: 10, CON: 10, INT: 8, WIS: 10, CHA: 8 },
    alignment: 'chaotic',
    abilities: [
      { name: 'Ambush', description: 'If the bandit surprises a target, it deals an extra 1d6 damage on its first attack.' },
    ],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 18. Basilisk (p.198) ----------
  {
    id: 'basilisk',
    name: 'Basilisk',
    description: 'An eight-legged reptile whose deadly gaze turns living creatures to stone.',
    level: 5,
    ac: 14,
    hp: 25,
    attacks: [
      { name: 'Bite', bonus: 4, damage: '2d6', range: 'close', multiattack: 2, specialEffect: 'petrify' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 16, DEX: 12, CON: 16, INT: 4, WIS: 12, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 19. Bat, Giant (p.198) ----------
  {
    id: 'bat-giant',
    name: 'Bat, Giant',
    description: 'A dog-sized bat with a vicious bite.',
    level: 2,
    ac: 12,
    hp: 9,
    hpDice: '2d8',
    attacks: [
      { name: 'Bite', bonus: 2, damage: '1d6', range: 'close' },
    ],
    movement: { normal: 'near', fly: 'near' },
    stats: { STR: 8, DEX: 14, CON: 10, INT: 4, WIS: 12, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['beast', 'animal', 'giant'],
  },

  // ---------- 20. Bat, Swarm (p.198) ----------
  {
    id: 'bat-swarm',
    name: 'Bat, Swarm',
    description: 'A shrieking cloud of hundreds of bats that engulfs victims in biting, scratching chaos.',
    level: 4,
    ac: 12,
    hp: 18,
    attacks: [
      { name: 'Bite', bonus: 2, damage: '1d6', range: 'close', multiattack: 3 },
    ],
    movement: { normal: 'near', fly: 'near' },
    stats: { STR: 4, DEX: 14, CON: 10, INT: 4, WIS: 12, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal', 'swarm'],
  },

  // ---------- 21. Bear, Brown (p.198) ----------
  {
    id: 'bear-brown',
    name: 'Bear, Brown',
    description: 'A massive, powerful bear that defends its territory fiercely.',
    level: 5,
    ac: 13,
    acSource: 'natural',
    hp: 25,
    hpDice: '4d10+4',
    attacks: [
      { name: 'Claw', bonus: 4, damage: '1d8', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near' },
    stats: { STR: 18, DEX: 12, CON: 16, INT: 6, WIS: 12, CHA: 6 },
    alignment: 'neutral',
    abilities: [
      { name: 'Crush', description: 'If both claw attacks hit the same target, the bear crushes it for an additional 1d8 damage.' },
    ],
    checksMorale: true,
    tags: ['beast', 'animal'],
  },

  // ---------- 22. Bear, Polar (p.198) ----------
  {
    id: 'bear-polar',
    name: 'Bear, Polar',
    description: 'A towering white hunter of the frozen wastes, powerful enough to shatter ice with a single swipe.',
    level: 7,
    ac: 13,
    hp: 34,
    attacks: [
      { name: 'Claw', bonus: 6, damage: '2d6', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 18, DEX: 12, CON: 16, INT: 6, WIS: 12, CHA: 6 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal'],
  },

  // ---------- 23. Beastman (p.198) ----------
  {
    id: 'beastman',
    name: 'Beastman',
    description: 'A savage, goat-headed humanoid that raids and pillages.',
    level: 1,
    ac: 12,
    acSource: 'natural',
    hp: 5,
    hpDice: '1d8+1',
    attacks: [
      { name: 'Spear', bonus: 2, damage: '1d6', range: 'near', specialEffect: '1' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 14, DEX: 12, CON: 12, INT: 6, WIS: 12, CHA: 8 },
    alignment: 'chaotic',
    abilities: [
      { name: 'Brutal', description: '+1 damage on melee attacks (already included in damage).' },
    ],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 24. Berserker (p.199) ----------
  {
    id: 'berserker',
    name: 'Berserker',
    description: 'A wild-eyed warrior consumed by battle-rage, heedless of pain or self-preservation.',
    level: 2,
    ac: 12,
    acSource: 'leather',
    hp: 10,
    attacks: [
      { name: 'Greataxe', bonus: 2, damage: '1d10', range: 'close' },
      { name: 'Spear', bonus: 2, damage: '1d6', range: 'near' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 14, DEX: 12, CON: 12, INT: 10, WIS: 12, CHA: 10 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 25. Black Pudding (p.199) ----------
  {
    id: 'black-pudding',
    name: 'Black Pudding',
    description: 'A massive, corrosive ooze that dissolves flesh and metal alike as it flows through lightless tunnels.',
    level: 6,
    ac: 9,
    hp: 30,
    attacks: [
      { name: 'Tentacle', bonus: 4, damage: '2d6', range: 'close', multiattack: 3 },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 14, DEX: 8, CON: 16, INT: 3, WIS: 4, CHA: 3 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['ooze'],
  },

  // ---------- 26. Boar (p.199) ----------
  {
    id: 'boar',
    name: 'Boar',
    description: 'A wild pig with sharp tusks and a mean temper.',
    level: 3,
    ac: 12,
    acSource: 'natural',
    hp: 14,
    hpDice: '3d8',
    attacks: [
      { name: 'Tusk', bonus: 3, damage: '1d6', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near' },
    stats: { STR: 16, DEX: 10, CON: 12, INT: 6, WIS: 12, CHA: 6 },
    alignment: 'neutral',
    abilities: [
      { name: 'Gore', description: 'If the boar moves its full movement in a straight line and hits with a tusk attack, the target takes an extra 1d6 damage.' },
    ],
    checksMorale: true,
    tags: ['beast', 'animal'],
  },

  // ---------- 27. Brachiosaurus (p.208) ----------
  {
    id: 'brachiosaurus',
    name: 'Brachiosaurus',
    description: 'A towering, long-necked herbivore that shakes the ground with every step.',
    level: 12,
    ac: 13,
    hp: 57,
    attacks: [
      { name: 'Stomp', bonus: 7, damage: '2d10', range: 'close', multiattack: 3 },
    ],
    movement: { normal: 'near', double: true },
    stats: { STR: 22, DEX: 8, CON: 16, INT: 4, WIS: 12, CHA: 4 },
    alignment: 'neutral',
    abilities: [
      { name: 'Trample', description: 'Brachiosaurus deals double damage with its stomp to creatures of small size or smaller.' },
    ],
    checksMorale: true,
    tags: ['dinosaur'],
  },

  // ---------- 28. Brain Eater (p.199) ----------
  {
    id: 'brain-eater',
    name: 'Brain Eater',
    description: 'A tentacle-faced aberration that feeds on sentient minds, savoring intelligence as a delicacy.',
    level: 8,
    ac: 14,
    acSource: 'leather',
    hp: 36,
    attacks: [
      { name: 'Tentacle', bonus: 5, damage: '1d8', range: 'close', multiattack: 4, specialEffect: 'latch' },
      { name: 'Mind Blast', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
      { name: 'Mind Control', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 14, DEX: 16, CON: 10, INT: 18, WIS: 14, CHA: 18 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['aberration'],
  },

  // ---------- 29. Bugbear (p.200) ----------
  {
    id: 'bugbear',
    name: 'Bugbear',
    description: 'A hulking, fur-covered goblinoid that excels at ambush, striking from the shadows with brutal force.',
    level: 3,
    ac: 13,
    acSource: 'leather + shield',
    hp: 14,
    attacks: [
      { name: 'Spiked Mace', bonus: 3, damage: '1d6', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near' },
    stats: { STR: 16, DEX: 10, CON: 12, INT: 8, WIS: 10, CHA: 6 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 30. Bulette (p.200) ----------
  {
    id: 'bulette',
    name: 'Bulette',
    description: 'A massive, armored predator that burrows through earth and erupts beneath its prey with devastating force.',
    level: 8,
    ac: 17,
    hp: 40,
    attacks: [
      { name: 'Bite', bonus: 5, damage: '2d6', range: 'close', multiattack: 3 },
      { name: 'Leap', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near', burrow: 'near' },
    stats: { STR: 20, DEX: 12, CON: 18, INT: 4, WIS: 12, CHA: 6 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 31. Camel (p.200) ----------
  {
    id: 'camel',
    name: 'Camel',
    description: 'A hardy desert beast of burden with a foul temper and a punishing kick.',
    level: 2,
    ac: 10,
    hp: 12,
    attacks: [
      { name: 'Hoof', bonus: 3, damage: '1d6', range: 'close' },
      { name: 'Spit', bonus: 0, damage: '1d4', range: 'near' },
    ],
    movement: { normal: 'near', double: true },
    stats: { STR: 16, DEX: 10, CON: 16, INT: 6, WIS: 12, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal'],
  },

  // ---------- 32. Cave Brute (p.200) ----------
  {
    id: 'cave-brute',
    name: 'Cave Brute',
    description: 'A hulking subterranean predator with powerful claws and crushing mandibles.',
    level: 6,
    ac: 14,
    acSource: 'natural',
    hp: 28,
    hpDice: '4d10+8',
    attacks: [
      { name: 'Claw', bonus: 5, damage: '1d8', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near', burrow: 'near' },
    stats: { STR: 18, DEX: 12, CON: 12, INT: 4, WIS: 12, CHA: 4 },
    alignment: 'neutral',
    abilities: [
      { name: 'Bewilder', description: 'Once per round, a creature hit by a claw must pass DC 12 WIS or be dazed for 1 round (disadvantage on attacks).' },
    ],
    checksMorale: true,
    tags: ['monstrosity', 'underground', 'insect'],
  },

  // ---------- 33. Cave Creeper (p.200) ----------
  {
    id: 'cave-creeper',
    name: 'Cave Creeper',
    description: 'A many-legged arthropod that lurks on cavern ceilings.',
    level: 4,
    ac: 12,
    acSource: 'natural',
    hp: 18,
    hpDice: '3d10+3',
    attacks: [
      { name: 'Bite', bonus: 3, damage: '1d6', range: 'close' },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 14, DEX: 14, CON: 10, INT: 4, WIS: 12, CHA: 4 },
    alignment: 'neutral',
    abilities: [
      { name: 'Toxin', description: 'A creature hit by the tentacles must pass DC 12 CON or be paralyzed for 1d4 rounds.' },
    ],
    checksMorale: true,
    tags: ['monstrosity', 'underground', 'insect'],
  },

  // ---------- 34. Centaur (p.201) ----------
  {
    id: 'centaur',
    name: 'Centaur',
    description: 'A noble creature with the torso of a human and the body of a horse, proud and swift.',
    level: 3,
    ac: 12,
    acSource: 'leather',
    hp: 14,
    attacks: [
      { name: 'Spear', bonus: 2, damage: '1d6', range: 'near', multiattack: 2 },
      { name: 'Longbow', bonus: 1, damage: '1d8', range: 'far' },
    ],
    movement: { normal: 'near', double: true },
    stats: { STR: 14, DEX: 12, CON: 12, INT: 10, WIS: 14, CHA: 12 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 35. Centipede, Giant (p.201) ----------
  {
    id: 'centipede-giant',
    name: 'Centipede, Giant',
    description: 'A man-length segmented horror that skitters along walls and ceilings on dozens of legs.',
    level: 1,
    ac: 11,
    hp: 4,
    attacks: [
      { name: 'Bite', bonus: 1, damage: '1d4', range: 'close', specialEffect: 'poison' },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 4, DEX: 12, CON: 10, INT: 3, WIS: 4, CHA: 3 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['insect', 'giant'],
  },

  // ---------- 36. Centipede, Swarm (p.201) ----------
  {
    id: 'centipede-swarm',
    name: 'Centipede, Swarm',
    description: 'A writhing mass of venomous centipedes that pours from cracks in the stone like a living carpet.',
    level: 4,
    ac: 11,
    hp: 18,
    attacks: [
      { name: 'Bite', bonus: 1, damage: '1d4', range: 'close', multiattack: 3, specialEffect: 'poison' },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 4, DEX: 12, CON: 10, INT: 3, WIS: 4, CHA: 3 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['insect', 'swarm'],
  },

  // ---------- 37. Chimera (p.201) ----------
  {
    id: 'chimera',
    name: 'Chimera',
    description: 'A three-headed abomination of lion, goat, and dragon, belching fire and sowing chaos wherever it roams.',
    level: 10,
    ac: 16,
    hp: 49,
    attacks: [
      { name: 'Rend', bonus: 7, damage: '2d8', range: 'close', multiattack: 4 },
    ],
    movement: { normal: 'near', double: true, fly: 'near' },
    stats: { STR: 20, DEX: 18, CON: 18, INT: 4, WIS: 14, CHA: 8 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 38. Chuul (p.201) ----------
  {
    id: 'chuul',
    name: 'Chuul',
    description: 'A lobster-like aberration with massive pincers and paralytic tentacles, lurking in underground pools.',
    level: 5,
    ac: 15,
    hp: 25,
    attacks: [
      { name: 'Pincer', bonus: 4, damage: '1d8', range: 'close', multiattack: 2, specialEffect: 'grab' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 16, DEX: 8, CON: 16, INT: 8, WIS: 12, CHA: 6 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['insect'],
  },

  // ---------- 39. Cloaker (p.202) ----------
  {
    id: 'cloaker',
    name: 'Cloaker',
    description: 'A living shadow shaped like a great cloak, it wraps around victims and drains their will to live.',
    level: 6,
    ac: 13,
    hp: 28,
    attacks: [
      { name: 'Lash', bonus: 4, damage: '1d8', range: 'close', multiattack: 3 },
      { name: 'Screech', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near', fly: 'near' },
    stats: { STR: 14, DEX: 16, CON: 12, INT: 12, WIS: 12, CHA: 10 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['aberration'],
  },

  // ---------- 40. Cockatrice (p.202) ----------
  {
    id: 'cockatrice',
    name: 'Cockatrice',
    description: 'A rooster-bodied reptile with bat wings whose bite turns living flesh to stone.',
    level: 3,
    ac: 11,
    hp: 14,
    attacks: [
      { name: 'Bite', bonus: 1, damage: '1d4', range: 'close', specialEffect: 'petrify' },
    ],
    movement: { normal: 'near', fly: 'near' },
    stats: { STR: 6, DEX: 12, CON: 12, INT: 4, WIS: 12, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 41. Couatl (p.202) ----------
  {
    id: 'couatl',
    name: 'Couatl',
    description: 'A feathered serpent of divine origin, shimmering with prismatic light and ancient benevolence.',
    level: 9,
    ac: 16,
    hp: 42,
    attacks: [
      { name: 'Bite', bonus: 6, damage: '2d6', range: 'close', multiattack: 3, specialEffect: 'poison' },
    ],
    movement: { normal: 'near', fly: 'near' },
    stats: { STR: 14, DEX: 16, CON: 14, INT: 18, WIS: 18, CHA: 20 },
    alignment: 'lawful',
    abilities: [],
    checksMorale: true,
    tags: ['celestial'],
  },

  // ---------- 42. Crab, Giant (p.202) ----------
  {
    id: 'crab-giant',
    name: 'Crab, Giant',
    description: 'A barnacle-encrusted crustacean the size of a wagon, snapping its claws with bone-crushing force.',
    level: 5,
    ac: 15,
    hp: 24,
    attacks: [
      { name: 'Pincer', bonus: 4, damage: '1d8', range: 'close', multiattack: 2, specialEffect: 'crush' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 16, DEX: 10, CON: 14, INT: 4, WIS: 10, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal', 'giant'],
  },

  // ---------- 43. Crocodile (p.203) ----------
  {
    id: 'crocodile',
    name: 'Crocodile',
    description: 'A large, armored reptile that ambushes prey near water.',
    level: 4,
    ac: 14,
    acSource: 'natural',
    hp: 20,
    hpDice: '3d10+3',
    attacks: [
      { name: 'Bite', bonus: 3, damage: '1d8', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near', swim: 'near' },
    stats: { STR: 16, DEX: 12, CON: 14, INT: 6, WIS: 12, CHA: 6 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['beast', 'aquatic', 'animal'],
  },

  // ---------- 44. Cultist (p.203) ----------
  {
    id: 'cultist',
    name: 'Cultist',
    description: 'A fanatical follower of a dark power.',
    level: 2,
    ac: 14,
    acSource: 'chainmail',
    hp: 9,
    hpDice: '2d8',
    attacks: [
      { name: 'Longsword', bonus: 1, damage: '1d8', range: 'close' },
      { name: 'Spell +2', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 12, DEX: 8, CON: 10, INT: 8, WIS: 14, CHA: 10 },
    alignment: 'chaotic',
    abilities: [
      { name: 'Fearless', description: 'The cultist never checks morale.\', mechanic: { type: \'morale_immunity' },
      { name: 'Deathtouch', description: 'Once per day, the cultist can make a melee spell attack (+2). On a hit, the target takes 2d6 necrotic damage.' },
    ],
    checksMorale: true,
    tags: ['humanoid', 'spellcaster'],
  },

  // ---------- 45. Cyclops (p.203) ----------
  {
    id: 'cyclops',
    name: 'Cyclops',
    description: 'A one-eyed giant of terrible strength and foul temper, hurling boulders with uncanny aim.',
    level: 8,
    ac: 11,
    acSource: 'leather',
    hp: 38,
    attacks: [
      { name: 'Greatclub', bonus: 7, damage: '2d8', range: 'close', multiattack: 2 },
      { name: 'Rock', bonus: 5, damage: '1d12', range: 'far' },
    ],
    movement: { normal: 'near', double: true },
    stats: { STR: 20, DEX: 10, CON: 14, INT: 8, WIS: 6, CHA: 10 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid', 'giant'],
  },

  // ---------- 46. Darkmantle (p.203) ----------
  {
    id: 'darkmantle',
    name: 'Darkmantle',
    description: 'A bat-like creature that envelops prey in magical darkness.',
    level: 1,
    ac: 13,
    acSource: 'natural',
    hp: 4,
    hpDice: '1d8',
    attacks: [
      { name: 'Bite', bonus: 3, damage: '1d4', range: 'close' },
      { name: 'Darkness', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near', fly: 'near' },
    stats: { STR: 6, DEX: 16, CON: 10, INT: 4, WIS: 10, CHA: 4 },
    alignment: 'neutral',
    abilities: [
      { name: 'Darkness', description: 'The darkmantle can cast magical darkness in a near radius around itself once per day. The darkness lasts 10 rounds.' },
    ],
    checksMorale: true,
    tags: ['monstrosity', 'underground', 'aberration'],
  },

  // ---------- 47. Deep One (p.203) ----------
  {
    id: 'deep-one',
    name: 'Deep One',
    description: 'A fish-faced humanoid that dwells in sunken cities and worships alien gods of the abyss.',
    level: 2,
    ac: 13,
    hp: 10,
    attacks: [
      { name: 'Spear', bonus: 2, damage: '1d6', range: 'near', multiattack: 2 },
    ],
    movement: { normal: 'near' },
    stats: { STR: 14, DEX: 12, CON: 12, INT: 6, WIS: 10, CHA: 6 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['aberration'],
  },

  // ---------- 48. Demon, Balor (p.204) ----------
  {
    id: 'demon-balor',
    name: 'Demon, Balor',
    description: 'A colossal fiend of fire and shadow, wielding a whip of flame and a sword that drinks souls.',
    level: 16,
    ac: 19,
    hp: 77,
    attacks: [
      { name: 'Greatsword', bonus: 10, damage: '2d12', range: 'close', multiattack: 3, specialEffect: 'hellfire' },
    ],
    movement: { normal: 'near', double: true, fly: 'near' },
    stats: { STR: 22, DEX: 14, CON: 20, INT: 18, WIS: 16, CHA: 18 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['fiend', 'demon'],
  },

  // ---------- 49. Demon, Dretch (p.204) ----------
  {
    id: 'demon-dretch',
    name: 'Demon, Dretch',
    description: 'The lowest of demonkind -- a bloated, stinking fiend with rubbery pale flesh.',
    level: 2,
    ac: 12,
    hp: 11,
    attacks: [
      { name: 'Claw', bonus: 2, damage: '1d6', range: 'close' },
      { name: 'Gas', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 14, DEX: 10, CON: 14, INT: 6, WIS: 8, CHA: 4 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['fiend', 'demon'],
  },

  // ---------- 50. Demon, Glabrezu (p.204) ----------
  {
    id: 'demon-glabrezu',
    name: 'Demon, Glabrezu',
    description: 'A towering fiend with massive pincers and a gift for corrupting mortals through dark bargains.',
    level: 8,
    ac: 15,
    hp: 40,
    attacks: [
      { name: 'Pincer', bonus: 7, damage: '2d8', range: 'close', multiattack: 2, specialEffect: 'crush' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 18, DEX: 12, CON: 18, INT: 16, WIS: 14, CHA: 14 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['fiend', 'demon'],
  },

  // ---------- 51. Demon, Marilith (p.205) ----------
  {
    id: 'demon-marilith',
    name: 'Demon, Marilith',
    description: 'A six-armed serpent demon, each hand wielding a different blade in a whirlwind of carnage.',
    level: 9,
    ac: 17,
    acSource: 'plate mail',
    hp: 43,
    attacks: [
      { name: 'Longsword', bonus: 7, damage: '1d8', range: 'close', multiattack: 6 },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 20, DEX: 18, CON: 16, INT: 16, WIS: 16, CHA: 18 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['fiend', 'demon'],
  },

  // ---------- 52. Demon, Vrock (p.205) ----------
  {
    id: 'demon-vrock',
    name: 'Demon, Vrock',
    description: 'A vulture-headed demon with enormous wings that shrieks with enough force to stun its foes.',
    level: 5,
    ac: 14,
    hp: 24,
    attacks: [
      { name: 'Talons', bonus: 4, damage: '1d8', range: 'close', multiattack: 2 },
      { name: 'Screech', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 14, DEX: 14, CON: 14, INT: 8, WIS: 12, CHA: 10 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['fiend', 'demon'],
  },

  // ---------- 53. Devil, Barbed (p.206) ----------
  {
    id: 'devil-barbed',
    name: 'Devil, Barbed',
    description: 'A tall fiend covered in sharp, hooked barbs that shred anything that grapples it.',
    level: 3,
    ac: 13,
    hp: 14,
    attacks: [
      { name: 'Spine', bonus: 3, damage: '1d6', range: 'near', multiattack: 2, specialEffect: 'barb' },
      { name: 'Fire Blast', bonus: 3, damage: '1d8', range: 'far' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 14, DEX: 16, CON: 12, INT: 12, WIS: 12, CHA: 12 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['fiend', 'devil'],
  },

  // ---------- 54. Devil, Cubi (p.207) ----------
  {
    id: 'devil-cubi',
    name: 'Devil, Cubi',
    description: 'A fiend of seduction and whispered bargains, wearing beauty like a mask over its true cruelty.',
    level: 6,
    ac: 14,
    hp: 29,
    attacks: [
      { name: 'Kiss', bonus: 4, damage: '1d6', range: 'close', specialEffect: 'drain' },
      { name: 'Charm', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near', fly: 'near' },
    stats: { STR: 14, DEX: 18, CON: 14, INT: 16, WIS: 14, CHA: 20 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['fiend', 'devil'],
  },

  // ---------- 55. Devil, Erinyes (p.207) ----------
  {
    id: 'devil-erinyes',
    name: 'Devil, Erinyes',
    description: 'A fallen angel in infernal service, beautiful and merciless, hunting oathbreakers across the planes.',
    level: 9,
    ac: 17,
    acSource: '+1 plate mail',
    hp: 43,
    attacks: [
      { name: 'Greatsword', bonus: 8, damage: '1d12', range: 'close', multiattack: 3 },
      { name: 'Longbow', bonus: 8, damage: '1d8', range: 'far', multiattack: 2, specialEffect: 'poison' },
    ],
    movement: { normal: 'near', double: true, fly: 'near' },
    stats: { STR: 18, DEX: 18, CON: 16, INT: 18, WIS: 18, CHA: 20 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['fiend', 'devil'],
  },

  // ---------- 56. Devil, Horned (p.207) ----------
  {
    id: 'devil-horned',
    name: 'Devil, Horned',
    description: 'A towering fiend armored in iron-hard scales, its great horns wreathed in infernal flame.',
    level: 7,
    ac: 16,
    hp: 35,
    attacks: [
      { name: 'Burning Trident', bonus: 7, damage: '2d6', range: 'near', multiattack: 2 },
      { name: 'Fire Blast', bonus: 4, damage: '2d8', range: 'far' },
    ],
    movement: { normal: 'near', double: true, fly: 'near' },
    stats: { STR: 20, DEX: 14, CON: 18, INT: 14, WIS: 12, CHA: 14 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['fiend', 'devil'],
  },

  // ---------- 57. Devil, Imp (p.207) ----------
  {
    id: 'devil-imp',
    name: 'Devil, Imp',
    description: 'A tiny, winged fiend with a barbed tail, sent to tempt mortals and spy for its infernal masters.',
    level: 2,
    ac: 13,
    hp: 9,
    attacks: [
      { name: 'Stinger', bonus: 3, damage: '1d4', range: 'close', specialEffect: 'poison' },
    ],
    movement: { normal: 'near', fly: 'near' },
    stats: { STR: 6, DEX: 16, CON: 10, INT: 12, WIS: 10, CHA: 14 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['fiend', 'devil'],
  },

  // ---------- 58. Djinni (p.209) ----------
  {
    id: 'djinni',
    name: 'Djinni',
    description: 'A noble spirit of wind and wish, ancient and capricious, bound by laws older than mortal reckoning.',
    level: 10,
    ac: 14,
    hp: 48,
    attacks: [
      { name: 'Scimitar', bonus: 7, damage: '1d12', range: 'close', multiattack: 3 },
      { name: 'Whirlwind', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near', double: true, fly: 'near' },
    stats: { STR: 18, DEX: 18, CON: 16, INT: 18, WIS: 16, CHA: 16 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['elemental'],
  },

  // ---------- 59. Doppelganger (p.209) ----------
  {
    id: 'doppelganger',
    name: 'Doppelganger',
    description: 'A faceless shapeshifter that assumes the identity of its victims to infiltrate and betray.',
    level: 4,
    ac: 12,
    hp: 20,
    attacks: [
      { name: 'Dagger', bonus: 2, damage: '1d4', range: 'near' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 12, DEX: 14, CON: 14, INT: 12, WIS: 10, CHA: 18 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 60. Dragon, Desert (p.210) ----------
  {
    id: 'dragon-desert',
    name: 'Dragon, Desert',
    description: 'A sand-colored wyrm of terrible wisdom that rules the wastelands from a throne of bleached bone.',
    level: 13,
    ac: 17,
    hp: 61,
    attacks: [
      { name: 'Rend', bonus: 9, damage: '2d10', range: 'close', multiattack: 3 },
      { name: 'Lightning Breath', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near', double: true, fly: 'near' },
    stats: { STR: 20, DEX: 16, CON: 16, INT: 18, WIS: 20, CHA: 20 },
    alignment: 'lawful',
    abilities: [],
    checksMorale: true,
    tags: ['dragon'],
  },

  // ---------- 61. Dragon, Fire (p.210) ----------
  {
    id: 'dragon-fire',
    name: 'Dragon, Fire',
    description: 'The mightiest of wyrms, a living cataclysm of flame whose wrath reduces kingdoms to cinder and memory.',
    level: 17,
    ac: 18,
    hp: 80,
    attacks: [
      { name: 'Rend', bonus: 11, damage: '2d12', range: 'close', multiattack: 4 },
      { name: 'Fire Breath', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near', double: true, fly: 'near' },
    stats: { STR: 22, DEX: 20, CON: 18, INT: 18, WIS: 18, CHA: 20 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['dragon'],
  },

  // ---------- 62. Dragon, Forest (p.211) ----------
  {
    id: 'dragon-forest',
    name: 'Dragon, Forest',
    description: 'A moss-scaled wyrm that slumbers beneath ancient canopies, exhaling clouds of choking spores.',
    level: 12,
    ac: 16,
    hp: 58,
    attacks: [
      { name: 'Rend', bonus: 8, damage: '2d8', range: 'close', multiattack: 3 },
      { name: 'Poison Breath', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near', double: true, fly: 'near' },
    stats: { STR: 18, DEX: 16, CON: 18, INT: 16, WIS: 16, CHA: 18 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['dragon'],
  },

  // ---------- 63. Dragon, Frost (p.211) ----------
  {
    id: 'dragon-frost',
    name: 'Dragon, Frost',
    description: 'A pale-scaled wyrm of the frozen north whose breath entombs entire armies in killing ice.',
    level: 14,
    ac: 17,
    hp: 68,
    attacks: [
      { name: 'Rend', bonus: 9, damage: '2d10', range: 'close', multiattack: 4 },
      { name: 'Ice Breath', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near', double: true, fly: 'near' },
    stats: { STR: 18, DEX: 16, CON: 20, INT: 16, WIS: 18, CHA: 16 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['dragon'],
  },

  // ---------- 64. Dragon, Sea (p.211) ----------
  {
    id: 'dragon-sea',
    name: 'Dragon, Sea',
    description: 'A sapphire-scaled leviathan that commands the tides and drags entire fleets beneath the waves.',
    level: 16,
    ac: 17,
    hp: 76,
    attacks: [
      { name: 'Rend', bonus: 10, damage: '2d10', range: 'close', multiattack: 4 },
      { name: 'Steam Breath', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
      { name: 'Water Spout', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near', double: true, fly: 'near', swim: 'near' },
    stats: { STR: 20, DEX: 22, CON: 18, INT: 18, WIS: 20, CHA: 20 },
    alignment: 'lawful',
    abilities: [],
    checksMorale: true,
    tags: ['dragon'],
  },

  // ---------- 65. Dragon, Swamp (p.211) ----------
  {
    id: 'dragon-swamp',
    name: 'Dragon, Swamp',
    description: 'A cunning dragon that lairs in fetid marshlands, belching clouds of choking smog.',
    level: 12,
    ac: 16,
    acSource: 'natural',
    hp: 58,
    hpDice: '7d12+14',
    attacks: [
      { name: 'Rend', bonus: 8, damage: '2d10', range: 'close', multiattack: 3 },
      { name: 'Smog Breath', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near', double: true, swim: 'near', burrow: 'near' },
    stats: { STR: 20, DEX: 16, CON: 18, INT: 18, WIS: 16, CHA: 16 },
    alignment: 'chaotic',
    abilities: [
      { name: 'Smog Breath', description: 'The dragon exhales a cloud of poisonous smog in a near-sized cone. All creatures in the area must pass DC 15 CON or take 4d8 poison damage and be blinded for 1d4 rounds. On success, half damage and not blinded. Recharges on 5-6 on 1d6 each round.' },
    ],
    checksMorale: true,
    tags: ['dragon'],
  },

  // ---------- 66. Drow (p.212) ----------
  {
    id: 'drow',
    name: 'Drow',
    description: 'A pale-skinned elf of the underworld, raised in cruelty and skilled with blade and poison.',
    level: 2,
    ac: 16,
    acSource: 'mithral chainmail',
    hp: 9,
    attacks: [
      { name: 'Poison Dart', bonus: 3, damage: '1d4', range: 'near', specialEffect: 'poison' },
      { name: 'Longsword', bonus: 1, damage: '1d8', range: 'close' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 10, DEX: 16, CON: 10, INT: 12, WIS: 12, CHA: 12 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 67. Drow, Drider (p.212) ----------
  {
    id: 'drow-drider',
    name: 'Drow, Drider',
    description: 'A cursed drow fused with a monstrous spider body, driven mad by its goddess\\\'s punishment.',
    level: 6,
    ac: 16,
    acSource: 'mithral chainmail',
    hp: 29,
    attacks: [
      { name: 'Longsword', bonus: 3, damage: '1d8', range: 'close', multiattack: 3 },
      { name: 'Longbow', bonus: 3, damage: '1d8', range: 'far', multiattack: 2, specialEffect: 'poison' },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 16, DEX: 16, CON: 14, INT: 14, WIS: 14, CHA: 10 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 68. Drow, Priestess (p.212) ----------
  {
    id: 'drow-priestess',
    name: 'Drow, Priestess',
    description: 'A fanatical servant of the spider queen, wielding dark prayers and venomous authority.',
    level: 6,
    ac: 16,
    acSource: 'mithral chainmail',
    hp: 28,
    attacks: [
      { name: 'Snake Whip', bonus: 4, damage: '1d8', range: 'near', multiattack: 3, specialEffect: 'poison' },
      { name: 'Spell +4', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 14, DEX: 16, CON: 12, INT: 16, WIS: 18, CHA: 16 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 69. Druid (p.213) ----------
  {
    id: 'druid',
    name: 'Druid',
    description: 'A keeper of the old ways who commands the wrath of nature itself against those who defile the wild.',
    level: 7,
    ac: 11,
    hp: 31,
    attacks: [
      { name: 'Staff', bonus: 0, damage: '1d4', range: 'close' },
      { name: 'Spell +5', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 10, DEX: 12, CON: 10, INT: 18, WIS: 16, CHA: 10 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 70. Dryad (p.213) ----------
  {
    id: 'dryad',
    name: 'Dryad',
    description: 'A shy forest spirit bound to a great tree.',
    level: 4,
    ac: 13,
    acSource: 'natural',
    hp: 19,
    hpDice: '3d10+3',
    attacks: [
      { name: 'Staff', bonus: -1, damage: '1d4', range: 'close' },
      { name: 'Charm', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 8, DEX: 14, CON: 12, INT: 12, WIS: 16, CHA: 18 },
    alignment: 'neutral',
    abilities: [
      { name: 'Charm', description: 'The dryad targets one creature within near range. DC 15 WIS or the creature is charmed for 1 day and regards the dryad as a trusted ally.' },
      { name: 'Meld', description: 'The dryad can meld into any tree, becoming invisible and untargetable. It can emerge from the same or any connected tree within far range.' },
    ],
    checksMorale: true,
    tags: ['fey'],
  },

  // ---------- 71. Duergar (p.213) ----------
  {
    id: 'duergar',
    name: 'Duergar',
    description: 'A gray-skinned dwarf of the deep, embittered by centuries of darkness and toil.',
    level: 2,
    ac: 15,
    acSource: 'chainmail + shield',
    hp: 12,
    attacks: [
      { name: 'War Pick', bonus: 2, damage: '1d6', range: 'close' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 14, DEX: 10, CON: 16, INT: 10, WIS: 8, CHA: 8 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 72. Dung Beetle, Giant (p.214) ----------
  {
    id: 'dung-beetle-giant',
    name: 'Dung Beetle, Giant',
    description: 'An oversized beetle that rolls balls of filth through underground tunnels.',
    level: 2,
    ac: 13,
    acSource: 'natural',
    hp: 10,
    hpDice: '2d8+2',
    attacks: [
      { name: 'Horn', bonus: 1, damage: '1d4', range: 'close', specialEffect: 'knock' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 12, DEX: 8, CON: 12, INT: 4, WIS: 8, CHA: 4 },
    alignment: 'neutral',
    abilities: [
      { name: 'Knock', description: 'On a hit, the target must pass DC 12 STR or be knocked prone.' },
    ],
    checksMorale: true,
    tags: ['beast', 'underground', 'insect', 'giant'],
  },

  // ---------- 73. Efreeti (p.214) ----------
  {
    id: 'efreeti',
    name: 'Efreeti',
    description: 'A lord of elemental fire, wreathed in smoke and flame, granting wishes that always burn the wisher.',
    level: 9,
    ac: 15,
    hp: 43,
    attacks: [
      { name: 'Scimitar', bonus: 8, damage: '2d10', range: 'close', multiattack: 3 },
      { name: 'Fire Bolt', bonus: 5, damage: '2d6', range: 'far', multiattack: 2 },
    ],
    movement: { normal: 'near', fly: 'near' },
    stats: { STR: 20, DEX: 14, CON: 16, INT: 16, WIS: 14, CHA: 16 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['elemental'],
  },

  // ---------- 78. Elephant (p.216) ----------
  {
    id: 'elephant',
    name: 'Elephant',
    description: 'A colossal grey beast whose thundering charge can flatten palisades and scatter armies.',
    level: 7,
    ac: 14,
    hp: 34,
    attacks: [
      { name: 'Tusks', bonus: 6, damage: '1d8', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near' },
    stats: { STR: 20, DEX: 10, CON: 16, INT: 6, WIS: 12, CHA: 10 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal'],
  },

  // ---------- 79. Elf (p.216) ----------
  {
    id: 'elf',
    name: 'Elf',
    description: 'A graceful, long-lived forest dweller with keen senses and natural affinity for magic.',
    level: 2,
    ac: 13,
    hp: 9,
    attacks: [
      { name: 'Longbow', bonus: 3, damage: '1d8', range: 'far' },
      { name: 'Longsword', bonus: 1, damage: '1d8', range: 'close' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 10, DEX: 16, CON: 10, INT: 12, WIS: 12, CHA: 12 },
    alignment: 'lawful',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 80. Ettercap (p.216) ----------
  {
    id: 'ettercap',
    name: 'Ettercap',
    description: 'A spider-like humanoid that weaves sticky, venomous webs.',
    level: 3,
    ac: 12,
    acSource: 'natural',
    hp: 14,
    hpDice: '3d8',
    attacks: [
      { name: 'Bite', bonus: 2, damage: '1d6', range: 'close', multiattack: 2 },
      { name: 'Poison Web (near) +2', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 10, DEX: 14, CON: 12, INT: 10, WIS: 10, CHA: 8 },
    alignment: 'chaotic',
    abilities: [
      { name: 'Poison Web', description: 'Instead of biting, the ettercap can fling a web at a target within near range. DC 12 DEX or the target is restrained. A restrained target must also pass DC 12 CON or be poisoned for 1d4 rounds.' },
    ],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 81. Fairy (p.216) ----------
  {
    id: 'fairy',
    name: 'Fairy',
    description: 'A tiny winged trickster armed with a sleep-inducing needle.',
    level: 1,
    ac: 13,
    hp: 4,
    hpDice: '1d8',
    attacks: [
      { name: 'Needle', bonus: 3, damage: '1', range: 'close', specialEffect: 'poison' },
    ],
    movement: { normal: 'near', fly: 'near' },
    stats: { STR: 6, DEX: 16, CON: 10, INT: 12, WIS: 10, CHA: 12 },
    alignment: 'neutral',
    abilities: [
      { name: 'Poison', description: 'A creature hit by the fairy needle must pass DC 12 CON or fall into a deep, magical sleep for 1d4 hours.' },
    ],
    checksMorale: true,
    tags: ['fey'],
  },

  // ---------- 82. Frog, Giant (p.216) ----------
  {
    id: 'frog-giant',
    name: 'Frog, Giant',
    description: 'A bloated amphibian the size of a pony, capable of swallowing halflings whole.',
    level: 2,
    ac: 12,
    hp: 10,
    attacks: [
      { name: 'Tongue And 1 Bite', bonus: 2, damage: '1d6', range: 'close' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 14, DEX: 14, CON: 12, INT: 4, WIS: 10, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal', 'giant'],
  },

  // ---------- 83. Gargoyle (p.216) ----------
  {
    id: 'gargoyle',
    name: 'Gargoyle',
    description: 'A stone-skinned, winged predator that perches motionless on ledges until prey wanders near.',
    level: 4,
    ac: 16,
    hp: 20,
    attacks: [
      { name: 'Claw', bonus: 3, damage: '1d6', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near', fly: 'near' },
    stats: { STR: 16, DEX: 12, CON: 14, INT: 10, WIS: 12, CHA: 8 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['elemental'],
  },

  // ---------- 84. Gelatinous Cube (p.217) ----------
  {
    id: 'gelatinous-cube',
    name: 'Gelatinous Cube',
    description: 'A nearly transparent ooze that fills entire corridors, dissolving all it engulfs.',
    level: 5,
    ac: 11,
    hp: 24,
    hpDice: '4d10+4',
    attacks: [
      { name: 'Touch', bonus: 4, damage: '1d8', range: 'close', specialEffect: 'toxin, engulf' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 16, DEX: 12, CON: 14, INT: 3, WIS: 12, CHA: 3 },
    alignment: 'neutral',
    abilities: [
      { name: 'Engulf', description: 'The cube moves into a creature\\\'s space. The creature must pass DC 12 DEX or be engulfed. Engulfed creatures are blinded, restrained, and take 2d6 acid damage at the start of each of their turns.' },
      { name: 'Rubbery', description: 'The cube takes half damage from bludgeoning attacks.\', mechanic: { type: \'damage_resistance\', source: \'bludgeoning' },
      { name: 'Toxin', description: 'A creature hit by the cube must pass DC 12 CON or be paralyzed for 1d4 rounds.' },
    ],
    checksMorale: true,
    tags: ['ooze', 'underground'],
  },

  // ---------- 85. Ghast (p.217) ----------
  {
    id: 'ghast',
    name: 'Ghast',
    description: 'A more powerful ghoul that exudes a nauseating stench, paralyzing even elves with its claws.',
    level: 4,
    ac: 11,
    hp: 20,
    attacks: [
      { name: 'Claw', bonus: 4, damage: '1d8', range: 'close', multiattack: 2, specialEffect: 'paralyze' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 16, DEX: 12, CON: 14, INT: 10, WIS: 10, CHA: 14 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['undead'],
  },

  // ---------- 86. Ghost (p.217) ----------
  {
    id: 'ghost',
    name: 'Ghost',
    description: 'A tormented spirit bound to the mortal world by unfinished business.',
    level: 6,
    ac: 13,
    hp: 27,
    hpDice: '4d10+4',
    attacks: [
      { name: 'Death Touch', bonus: 5, damage: '1d8', range: 'close', multiattack: 2, specialEffect: 'life drain' },
      { name: 'Possess', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near', fly: 'near' },
    stats: { STR: 6, DEX: 16, CON: 10, INT: 10, WIS: 10, CHA: 18 },
    alignment: 'chaotic',
    abilities: [
      { name: 'Greater Undead', description: 'The ghost is immune to morale checks, sleep, charm, and fear effects.\', mechanic: { type: \'morale_immunity' },
      { name: 'Incorporeal', description: 'The ghost can move through solid objects and creatures. Non-magical weapons pass through it harmlessly.\', mechanic: { type: \'damage_resistance\', source: \'non-magical weapons' },
      { name: 'Life Drain', description: 'A creature reduced to 0 HP by the ghost\\\'s death touch cannot be healed until a priest casts a tier 2+ spell on it.' },
      { name: 'Possess', description: 'The ghost targets one creature within near range. DC 15 CHA or the ghost takes control of the target\\\'s body for up to 1 hour. The ghost\\\'s body vanishes. The host can repeat the save each round when it takes damage.' },
    ],
    checksMorale: true,
    tags: ['undead', 'incorporeal'],
  },

  // ---------- 87. Ghoul (p.217) ----------
  {
    id: 'ghoul',
    name: 'Ghoul',
    description: 'A hunched, clawed undead that haunts graveyards and tunnels, paralyzing prey with its touch.',
    level: 2,
    ac: 11,
    hp: 11,
    attacks: [
      { name: 'Claw', bonus: 2, damage: '1d6', range: 'close', specialEffect: 'paralyze' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 14, DEX: 12, CON: 14, INT: 4, WIS: 8, CHA: 10 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['undead'],
  },

  // ---------- 88. Giant, Cloud (p.218) ----------
  {
    id: 'giant-cloud',
    name: 'Giant, Cloud',
    description: 'A regal giant dwelling among the highest peaks, hurling thunderbolts and passing judgment from above.',
    level: 10,
    ac: 15,
    acSource: 'leather',
    hp: 48,
    attacks: [
      { name: 'Morningstar', bonus: 9, damage: '2d10', range: 'close', multiattack: 3 },
    ],
    movement: { normal: 'near', double: true },
    stats: { STR: 20, DEX: 18, CON: 16, INT: 16, WIS: 16, CHA: 16 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['giant'],
  },

  // ---------- 89. Giant, Fire (p.218) ----------
  {
    id: 'giant-fire',
    name: 'Giant, Fire',
    description: 'A flame-bearded colossus that forges weapons in volcanic heat and hurls molten boulders at its foes.',
    level: 9,
    ac: 15,
    acSource: 'plate mail',
    hp: 44,
    attacks: [
      { name: 'Greatsword', bonus: 9, damage: '2d12', range: 'close', multiattack: 3 },
    ],
    movement: { normal: 'near', double: true },
    stats: { STR: 22, DEX: 10, CON: 18, INT: 12, WIS: 14, CHA: 12 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['giant'],
  },

  // ---------- 90. Giant, Frost (p.219) ----------
  {
    id: 'giant-frost',
    name: 'Giant, Frost',
    description: 'A towering blue-skinned giant clad in glacial armor, breathing killing cold across the tundra.',
    level: 9,
    ac: 14,
    acSource: 'chainmail',
    hp: 44,
    attacks: [
      { name: 'Greataxe', bonus: 8, damage: '2d10', range: 'close', multiattack: 3 },
    ],
    movement: { normal: 'near', double: true },
    stats: { STR: 20, DEX: 12, CON: 18, INT: 14, WIS: 16, CHA: 14 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['giant'],
  },

  // ---------- 91. Giant, Goat (p.219) ----------
  {
    id: 'giant-goat',
    name: 'Giant, Goat',
    description: 'A mountainous beast with spiraling horns that can shatter stone walls on impact.',
    level: 8,
    ac: 12,
    acSource: 'leather',
    hp: 39,
    attacks: [
      { name: 'Greatclub', bonus: 7, damage: '2d8', range: 'close', multiattack: 2 },
      { name: 'Boulder', bonus: 7, damage: '2d10', range: 'far' },
    ],
    movement: { normal: 'near', double: true, climb: 'near' },
    stats: { STR: 18, DEX: 12, CON: 16, INT: 6, WIS: 10, CHA: 6 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['giant'],
  },

  // ---------- 92. Giant, Hill (p.219) ----------
  {
    id: 'giant-hill',
    name: 'Giant, Hill',
    description: 'A dim, brutish giant that hurls boulders and devours livestock whole.',
    level: 7,
    ac: 11,
    acSource: 'leather',
    hp: 34,
    attacks: [
      { name: 'Greatclub', bonus: 6, damage: '2d8', range: 'close', multiattack: 2 },
      { name: 'Boulder', bonus: 6, damage: '2d10', range: 'far' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 18, DEX: 10, CON: 16, INT: 6, WIS: 6, CHA: 6 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['giant'],
  },

  // ---------- 93. Giant, Stone (p.219) ----------
  {
    id: 'giant-stone',
    name: 'Giant, Stone',
    description: 'A brooding, reclusive giant who hurls carved boulders with deadly precision from high crags.',
    level: 8,
    ac: 17,
    hp: 40,
    attacks: [
      { name: 'Greatclub', bonus: 7, damage: '2d8', range: 'close', multiattack: 2 },
      { name: 'Boulder', bonus: 7, damage: '2d10', range: 'far' },
    ],
    movement: { normal: 'near', double: true },
    stats: { STR: 18, DEX: 14, CON: 18, INT: 12, WIS: 12, CHA: 8 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['giant'],
  },

  // ---------- 94. Giant, Storm (p.219) ----------
  {
    id: 'giant-storm',
    name: 'Giant, Storm',
    description: 'A titan wreathed in lightning, striding through thunderheads and hurling bolts that split the earth.',
    level: 12,
    ac: 15,
    acSource: 'mithral chainmail',
    hp: 58,
    attacks: [
      { name: 'Greatsword', bonus: 10, damage: '2d12', range: 'close', multiattack: 3 },
      { name: 'Lightning Bolt', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near', double: true, swim: 'near' },
    stats: { STR: 22, DEX: 14, CON: 18, INT: 16, WIS: 18, CHA: 18 },
    alignment: 'lawful',
    abilities: [],
    checksMorale: true,
    tags: ['giant'],
  },

  // ---------- 95. Gibbering Mouther (p.220) ----------
  {
    id: 'gibbering-mouther',
    name: 'Gibbering Mouther',
    description: 'A mound of melted flesh covered in countless mouths and eyes, babbling maddening nonsense.',
    level: 4,
    ac: 8,
    hp: 21,
    attacks: [
      { name: 'Bite', bonus: 3, damage: '1d8', range: 'close', multiattack: 2, specialEffect: 'latch' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 14, DEX: 6, CON: 16, INT: 4, WIS: 10, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['aberration'],
  },

  // ---------- 96. Gladiator (p.220) ----------
  {
    id: 'gladiator',
    name: 'Gladiator',
    description: 'A scarred arena fighter skilled in spectacle and slaughter, armored in piecemeal plate.',
    level: 3,
    ac: 16,
    acSource: 'chainmail + shield',
    hp: 15,
    attacks: [
      { name: 'Longsword', bonus: 3, damage: '1d8', range: 'close', multiattack: 2 },
      { name: 'Spear', bonus: 3, damage: '1d6', range: 'near' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 14, DEX: 12, CON: 14, INT: 10, WIS: 10, CHA: 12 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 97. Gnoll (p.220) ----------
  {
    id: 'gnoll',
    name: 'Gnoll',
    description: 'A cackling hyena-headed humanoid that roams in savage war bands, leaving ruin in its wake.',
    level: 2,
    ac: 12,
    acSource: 'leather',
    hp: 10,
    attacks: [
      { name: 'Spear', bonus: 1, damage: '1d6', range: 'near' },
      { name: 'Longbow', bonus: 1, damage: '1d8', range: 'far' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 12, DEX: 12, CON: 12, INT: 8, WIS: 10, CHA: 8 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 98. Gnome, Deep (p.220) ----------
  {
    id: 'gnome-deep',
    name: 'Gnome, Deep',
    description: 'A small, reclusive subterranean gnome with innate illusion magic and keen darkvision.',
    level: 3,
    ac: 14,
    acSource: 'leather + shield',
    hp: 14,
    attacks: [
      { name: 'Pick', bonus: 3, damage: '1d6', range: 'close' },
      { name: 'Dart', bonus: 2, damage: '1d4', range: 'near' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 14, DEX: 12, CON: 12, INT: 12, WIS: 12, CHA: 12 },
    alignment: 'lawful',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 99. Goblin (p.221) ----------
  {
    id: 'goblin',
    name: 'Goblin',
    description: 'A scrawny, green-skinned creature with sharp teeth and a cruel cunning.',
    level: 1,
    ac: 11,
    hp: 5,
    attacks: [
      { name: 'Club', bonus: 0, damage: '1d4', range: 'close' },
      { name: 'Shortbow', bonus: 1, damage: '1d4', range: 'far' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 10, DEX: 12, CON: 12, INT: 8, WIS: 8, CHA: 6 },
    alignment: 'chaotic',
    abilities: [
      { name: 'Keen Senses', description: 'Can\'t be surprised.' },
    ],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 100. Goblin, Boss (p.221) ----------
  {
    id: 'goblin-boss',
    name: 'Goblin, Boss',
    description: 'The biggest and meanest goblin in the tribe, ruling through violence and intimidation.',
    level: 4,
    ac: 14,
    acSource: 'chainmail',
    hp: 20,
    attacks: [
      { name: 'Spear', bonus: 3, damage: '1d6', range: 'near' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 14, DEX: 12, CON: 14, INT: 8, WIS: 10, CHA: 12 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 101. Goblin, Shaman (p.221) ----------
  {
    id: 'goblin-shaman',
    name: 'Goblin, Shaman',
    description: 'A hunched goblin draped in fetishes and bones, channeling crude but dangerous magic.',
    level: 4,
    ac: 12,
    acSource: 'leather',
    hp: 19,
    attacks: [
      { name: 'Staff', bonus: 0, damage: '1d4', range: 'close' },
      { name: 'Spell +3', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 10, DEX: 12, CON: 12, INT: 10, WIS: 14, CHA: 12 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 102. Golem, Clay (p.222) ----------
  {
    id: 'golem-clay',
    name: 'Golem, Clay',
    description: 'A hulking figure of enchanted clay, shaped by divine command and nearly impossible to destroy.',
    level: 8,
    ac: 14,
    hp: 40,
    attacks: [
      { name: 'Slam', bonus: 6, damage: '1d8', range: 'close', multiattack: 3 },
    ],
    movement: { normal: 'near' },
    stats: { STR: 18, DEX: 10, CON: 18, INT: 6, WIS: 10, CHA: 6 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['golem', 'construct'],
  },

  // ---------- 103. Golem, Flesh (p.222) ----------
  {
    id: 'golem-flesh',
    name: 'Golem, Flesh',
    description: 'A grotesque patchwork of stolen corpses, stitched together and jolted to terrible life.',
    level: 7,
    ac: 9,
    hp: 35,
    attacks: [
      { name: 'Slam', bonus: 6, damage: '1d8', range: 'close', multiattack: 3 },
    ],
    movement: { normal: 'near' },
    stats: { STR: 18, DEX: 8, CON: 18, INT: 8, WIS: 12, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['golem', 'construct'],
  },

  // ---------- 104. Golem, Iron (p.222) ----------
  {
    id: 'golem-iron',
    name: 'Golem, Iron',
    description: 'An indestructible juggernaut of forged metal, immune to nearly all magic and utterly relentless.',
    level: 10,
    ac: 19,
    hp: 49,
    attacks: [
      { name: 'Slam', bonus: 8, damage: '2d8', range: 'close', multiattack: 3 },
      { name: 'Poison Breath', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 20, DEX: 8, CON: 18, INT: 6, WIS: 10, CHA: 6 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['golem', 'construct'],
  },

  // ---------- 105. Golem, Stone (p.222) ----------
  {
    id: 'golem-stone',
    name: 'Golem, Stone',
    description: 'A ponderous guardian carved from solid rock, unyielding and utterly tireless in its appointed duty.',
    level: 8,
    ac: 18,
    hp: 40,
    attacks: [
      { name: 'Slam', bonus: 6, damage: '1d10', range: 'close', multiattack: 3 },
    ],
    movement: { normal: 'near' },
    stats: { STR: 18, DEX: 8, CON: 18, INT: 6, WIS: 10, CHA: 6 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['golem', 'construct'],
  },

  // ---------- 106. Gorgon (p.223) ----------
  {
    id: 'gorgon',
    name: 'Gorgon',
    description: 'An iron-scaled bull that breathes petrifying gas, leaving a trail of stone statues in its wake.',
    level: 7,
    ac: 18,
    hp: 33,
    attacks: [
      { name: 'Gore', bonus: 6, damage: '2d8', range: 'close', multiattack: 2 },
      { name: 'Charge', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
      { name: 'Petrifying Breath', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near', double: true },
    stats: { STR: 18, DEX: 10, CON: 14, INT: 4, WIS: 12, CHA: 4 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 107. Gorilla (p.223) ----------
  {
    id: 'gorilla',
    name: 'Gorilla',
    description: 'A massive, silver-backed primate of tremendous strength that charges when threatened.',
    level: 4,
    ac: 12,
    hp: 20,
    attacks: [
      { name: 'Rend', bonus: 5, damage: '2d6', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 18, DEX: 14, CON: 14, INT: 8, WIS: 12, CHA: 8 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal'],
  },

  // ---------- 108. Gray Ooze (p.223) ----------
  {
    id: 'gray-ooze',
    name: 'Gray Ooze',
    description: 'A stone-colored slime that clings to dungeon floors, dissolving metal and flesh alike.',
    level: 2,
    ac: 11,
    hp: 9,
    attacks: [
      { name: 'Tentacle', bonus: 2, damage: '1d6', range: 'close' },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 12, DEX: 12, CON: 10, INT: 3, WIS: 4, CHA: 3 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['ooze'],
  },

  // ---------- 109. Grick (p.223) ----------
  {
    id: 'grick',
    name: 'Grick',
    description: 'A worm-like predator with a hard beak and writhing tentacles, camouflaged against dungeon stone.',
    level: 4,
    ac: 14,
    hp: 19,
    attacks: [
      { name: 'Beak', bonus: 3, damage: '1d8', range: 'close' },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 16, DEX: 14, CON: 12, INT: 4, WIS: 12, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 110. Griffon (p.224) ----------
  {
    id: 'griffon',
    name: 'Griffon',
    description: 'A ferocious hybrid with an eagle\\\'s head and wings and a lion\\\'s powerful body.',
    level: 4,
    ac: 12,
    hp: 19,
    attacks: [
      { name: 'Rend', bonus: 4, damage: '1d10', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near', double: true, fly: 'near' },
    stats: { STR: 18, DEX: 14, CON: 12, INT: 4, WIS: 12, CHA: 8 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 111. Grimlow (p.224) ----------
  {
    id: 'grimlow',
    name: 'Grimlow',
    description: 'A bloated amphibious horror that lurks in swamp shallows, swallowing prey in one hideous gulp.',
    level: 9,
    ac: 12,
    hp: 43,
    attacks: [
      { name: 'Grab And 3 Bite', bonus: 6, damage: '2d8', range: 'close' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 18, DEX: 14, CON: 16, INT: 4, WIS: 12, CHA: 6 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 112. Guard (p.224) ----------
  {
    id: 'guard',
    name: 'Guard',
    description: 'An armored sentry posted to protect a gate, caravan, or noble household.',
    level: 1,
    ac: 15,
    acSource: 'chainmail + shield',
    hp: 4,
    attacks: [
      { name: 'Spear', bonus: 1, damage: '1d6', range: 'near' },
      { name: 'Longsword', bonus: 1, damage: '1d8', range: 'close' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 12, DEX: 10, CON: 10, INT: 10, WIS: 12, CHA: 10 },
    alignment: 'lawful',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 113. Hag, Night (p.225) ----------
  {
    id: 'hag-night',
    name: 'Hag, Night',
    description: 'A fiend-touched crone who haunts the dreams of mortals, feeding on terror until the soul withers.',
    level: 8,
    ac: 14,
    hp: 37,
    attacks: [
      { name: 'Bite', bonus: 6, damage: '1d10', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near' },
    stats: { STR: 18, DEX: 14, CON: 12, INT: 14, WIS: 16, CHA: 16 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['fey'],
  },

  // ---------- 114. Hag, Sea (p.225) ----------
  {
    id: 'hag-sea',
    name: 'Hag, Sea',
    description: 'A bloated, barnacle-crusted crone who lures sailors to drown with promises whispered through the fog.',
    level: 6,
    ac: 15,
    hp: 28,
    attacks: [
      { name: 'Claw', bonus: 4, damage: '1d8', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near', swim: 'near' },
    stats: { STR: 14, DEX: 16, CON: 12, INT: 12, WIS: 14, CHA: 14 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['fey'],
  },

  // ---------- 115. Hag, Weald (p.225) ----------
  {
    id: 'hag-weald',
    name: 'Hag, Weald',
    description: 'A hunched forest witch whose knowledge of dark herbs and curses makes the woodland itself hostile.',
    level: 6,
    ac: 14,
    hp: 28,
    attacks: [
      { name: 'Claw', bonus: 4, damage: '1d8', range: 'close', multiattack: 2 },
      { name: 'Drink Pain', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 16, DEX: 14, CON: 12, INT: 12, WIS: 14, CHA: 16 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['fey'],
  },

  // ---------- 116. Harpy (p.226) ----------
  {
    id: 'harpy',
    name: 'Harpy',
    description: 'A winged she-fiend with a woman\\\'s face and a vulture\\\'s body, whose song lures victims to their doom.',
    level: 3,
    ac: 13,
    hp: 14,
    attacks: [
      { name: 'Claw', bonus: 3, damage: '1d6', range: 'close', multiattack: 2 },
      { name: 'Song', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near', fly: 'near' },
    stats: { STR: 12, DEX: 16, CON: 12, INT: 10, WIS: 10, CHA: 12 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 117. Hell Hound (p.226) ----------
  {
    id: 'hell-hound',
    name: 'Hell Hound',
    description: 'A coal-black hound with smoldering eyes that breathes gouts of hellfire.',
    level: 4,
    ac: 13,
    hp: 19,
    attacks: [
      { name: 'Bite', bonus: 4, damage: '1d8', range: 'close', multiattack: 2 },
      { name: 'Fire Breath', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near', double: true },
    stats: { STR: 14, DEX: 12, CON: 12, INT: 6, WIS: 12, CHA: 4 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['fiend'],
  },

  // ---------- 118. Hippogriff (p.226) ----------
  {
    id: 'hippogriff',
    name: 'Hippogriff',
    description: 'A majestic hybrid of eagle and horse, fierce in the wild but tameable as a mount.',
    level: 3,
    ac: 13,
    hp: 14,
    attacks: [
      { name: 'Rend', bonus: 3, damage: '1d8', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near', double: true, fly: 'near' },
    stats: { STR: 16, DEX: 16, CON: 12, INT: 4, WIS: 12, CHA: 6 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 119. Hippopotamus (p.226) ----------
  {
    id: 'hippopotamus',
    name: 'Hippopotamus',
    description: 'A massively built river beast with a gaping maw that can crush a canoe in one bite.',
    level: 5,
    ac: 12,
    hp: 24,
    attacks: [
      { name: 'Bite', bonus: 4, damage: '1d10', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near', swim: 'near' },
    stats: { STR: 18, DEX: 10, CON: 14, INT: 4, WIS: 10, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal'],
  },

  // ---------- 120. Hobgoblin (p.227) ----------
  {
    id: 'hobgoblin',
    name: 'Hobgoblin',
    description: 'A disciplined, iron-clad goblinoid soldier that fights in organized formations.',
    level: 2,
    ac: 15,
    acSource: 'chainmail + shield',
    hp: 10,
    attacks: [
      { name: 'Longsword', bonus: 3, damage: '1d8', range: 'close' },
      { name: 'Longbow', bonus: 0, damage: '1d8', range: 'far' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 16, DEX: 10, CON: 12, INT: 14, WIS: 12, CHA: 12 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 121. Horse (p.227) ----------
  {
    id: 'horse',
    name: 'Horse',
    description: 'A domesticated riding animal, strong and swift but easily spooked by monsters.',
    level: 2,
    ac: 11,
    hp: 11,
    attacks: [
      { name: 'Hooves', bonus: 3, damage: '1d6', range: 'close' },
    ],
    movement: { normal: 'near', double: true },
    stats: { STR: 16, DEX: 12, CON: 14, INT: 4, WIS: 12, CHA: 6 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal'],
  },

  // ---------- 122. Hydra (p.227) ----------
  {
    id: 'hydra',
    name: 'Hydra',
    description: 'A massive, multi-headed reptilian beast; sever one head and two more grow in its place.',
    level: 1,
    ac: 15,
    hp: 1,
    attacks: [
      { name: 'Bite', bonus: 6, damage: '1d8', range: 'near' },
    ],
    movement: { normal: 'near', swim: 'near' },
    stats: { STR: 20, DEX: 12, CON: 14, INT: 6, WIS: 12, CHA: 6 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 123. Invisible Stalker (p.227) ----------
  {
    id: 'invisible-stalker',
    name: 'Invisible Stalker',
    description: 'An unseen hunter from the elemental planes, bound by magic to pursue its quarry without rest.',
    level: 6,
    ac: 13,
    hp: 29,
    attacks: [
      { name: 'Pummel', bonus: 4, damage: '1d6', range: 'close', multiattack: 3 },
    ],
    movement: { normal: 'near', fly: 'near' },
    stats: { STR: 14, DEX: 16, CON: 14, INT: 14, WIS: 12, CHA: 10 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['elemental'],
  },

  // ---------- 124. Jellyfish (p.228) ----------
  {
    id: 'jellyfish',
    name: 'Jellyfish',
    description: 'A translucent blob of trailing tentacles that drifts through dark waters, stinging whatever it touches.',
    level: 0,
    ac: 11,
    hp: 1,
    attacks: [
      { name: 'Sting', bonus: 1, damage: '1', range: 'close', specialEffect: 'toxin' },
    ],
    movement: { normal: 'near', swim: 'near' },
    stats: { STR: 3, DEX: 12, CON: 10, INT: 3, WIS: 12, CHA: 3 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal'],
  },

  // ---------- 125. Knight (p.228) ----------
  {
    id: 'knight',
    name: 'Knight',
    description: 'A heavily armored warrior of noble birth, sworn to a lord or holy order.',
    level: 3,
    ac: 17,
    acSource: 'plate mail + shield',
    hp: 14,
    attacks: [
      { name: 'Bastard Sword', bonus: 3, damage: '1d8', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near' },
    stats: { STR: 16, DEX: 10, CON: 12, INT: 10, WIS: 10, CHA: 12 },
    alignment: 'lawful',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 126. Kobold (p.228) ----------
  {
    id: 'kobold',
    name: 'Kobold',
    description: 'A small, craven reptilian humanoid that relies on traps and overwhelming numbers.',
    level: 0,
    ac: 13,
    acSource: 'leather',
    hp: 1,
    attacks: [
      { name: 'Spear', bonus: 0, damage: '1d6', range: 'near' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 6, DEX: 14, CON: 10, INT: 8, WIS: 10, CHA: 8 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 127. Kobold, Sorcerer (p.228) ----------
  {
    id: 'kobold-sorcerer',
    name: 'Kobold, Sorcerer',
    description: 'A rare kobold born with innate arcane power, feared and revered by its tribe.',
    level: 3,
    ac: 13,
    acSource: 'leather',
    hp: 13,
    attacks: [
      { name: 'Club', bonus: 1, damage: '1d4', range: 'close' },
      { name: 'Spell +2', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 6, DEX: 14, CON: 10, INT: 8, WIS: 12, CHA: 14 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 128. Kraken (p.229) ----------
  {
    id: 'kraken',
    name: 'Kraken',
    description: 'An abyssal titan of tentacle and beak that drags ships into the lightless deep and devours all aboard.',
    level: 17,
    ac: 18,
    hp: 80,
    attacks: [
      { name: 'Tentacle', bonus: 9, damage: '2d12', range: 'near', multiattack: 4 },
      { name: 'Storm', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near', double: true, swim: 'near' },
    stats: { STR: 22, DEX: 16, CON: 18, INT: 18, WIS: 16, CHA: 18 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity', 'giant'],
  },

  // ---------- 129. Leech, Giant (p.229) ----------
  {
    id: 'leech-giant',
    name: 'Leech, Giant',
    description: 'A slimy, arm-thick blood-drinker that lurks in stagnant water and latches onto the unwary.',
    level: 2,
    ac: 9,
    hp: 10,
    attacks: [
      { name: 'Bite', bonus: 1, damage: '1d4', range: 'close', specialEffect: 'attach' },
    ],
    movement: { normal: 'near', swim: 'near' },
    stats: { STR: 12, DEX: 8, CON: 12, INT: 4, WIS: 8, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal', 'giant'],
  },

  // ---------- 130. Leprechaun (p.230) ----------
  {
    id: 'leprechaun',
    name: 'Leprechaun',
    description: 'A tiny, mischievous fey trickster that hoards gold and bewilders mortals with illusions.',
    level: 4,
    ac: 13,
    hp: 19,
    attacks: [
      { name: 'Spell +4', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 12, DEX: 16, CON: 12, INT: 14, WIS: 12, CHA: 16 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['fey'],
  },

  // ---------- 131. Lich (p.230) ----------
  {
    id: 'lich',
    name: 'Lich',
    description: 'An undead sorcerer who sacrificed its mortality for eternal power, its phylactery hiding a soul consumed by ambition.',
    level: 13,
    ac: 16,
    hp: 62,
    attacks: [
      { name: 'Touch', bonus: 6, damage: '2d8', range: 'close', multiattack: 2, specialEffect: 'paralysis' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 16, DEX: 12, CON: 18, INT: 18, WIS: 16, CHA: 16 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['undead'],
  },

  // ---------- 132. Lion (p.231) ----------
  {
    id: 'lion',
    name: 'Lion',
    description: 'A powerful great cat with a tawny mane, apex predator of savanna and ruin alike.',
    level: 3,
    ac: 12,
    hp: 15,
    attacks: [
      { name: 'Rend', bonus: 4, damage: '1d8', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near' },
    stats: { STR: 18, DEX: 14, CON: 14, INT: 4, WIS: 12, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal'],
  },

  // ---------- 133. Lizardfolk (p.231) ----------
  {
    id: 'lizardfolk',
    name: 'Lizardfolk',
    description: 'A cold-blooded, scaled humanoid that dwells in swamps and guards its territory with primal ferocity.',
    level: 2,
    ac: 14,
    acSource: 'leather + shield',
    hp: 11,
    attacks: [
      { name: 'Spear', bonus: 2, damage: '1d6', range: 'near' },
    ],
    movement: { normal: 'near', swim: 'near' },
    stats: { STR: 12, DEX: 12, CON: 14, INT: 8, WIS: 12, CHA: 6 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 134. Mage (p.231) ----------
  {
    id: 'mage',
    name: 'Mage',
    description: 'A scholarly wielder of arcane power whose spells can reshape the battlefield in an instant.',
    level: 6,
    ac: 11,
    hp: 27,
    attacks: [
      { name: 'Spell +5', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 8, DEX: 12, CON: 10, INT: 16, WIS: 12, CHA: 10 },
    alignment: 'lawful',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 135. Mammoth (p.231) ----------
  {
    id: 'mammoth',
    name: 'Mammoth',
    description: 'A shaggy titan of the frozen steppe, wielding tusks like siege weapons against anything in its path.',
    level: 9,
    ac: 15,
    hp: 44,
    attacks: [
      { name: 'Tusks', bonus: 7, damage: '1d12', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near' },
    stats: { STR: 20, DEX: 10, CON: 18, INT: 6, WIS: 12, CHA: 10 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal'],
  },

  // ---------- 136. Manta Ray, Giant (p.232) ----------
  {
    id: 'manta-ray-giant',
    name: 'Manta Ray, Giant',
    description: 'A vast, silent glider of the deep ocean whose sweeping fins blot out the light above.',
    level: 8,
    ac: 13,
    hp: 37,
    attacks: [
      { name: 'Sting', bonus: 5, damage: '1d12', range: 'close', multiattack: 2, specialEffect: 'poison' },
    ],
    movement: { normal: 'near', double: true, swim: 'near' },
    stats: { STR: 16, DEX: 16, CON: 12, INT: 6, WIS: 12, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal', 'giant'],
  },

  // ---------- 137. Manticore (p.232) ----------
  {
    id: 'manticore',
    name: 'Manticore',
    description: 'A beast with a lion\\\'s body, a human face twisted in malice, and a tail bristling with deadly spikes.',
    level: 6,
    ac: 14,
    hp: 29,
    attacks: [
      { name: 'Rend', bonus: 6, damage: '2d6', range: 'close', multiattack: 2 },
      { name: 'Tail Spike', bonus: 4, damage: '1d8', range: 'far', multiattack: 2 },
    ],
    movement: { normal: 'near', double: true, fly: 'near' },
    stats: { STR: 18, DEX: 14, CON: 14, INT: 6, WIS: 12, CHA: 6 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 138. Mastiff (p.232) ----------
  {
    id: 'mastiff',
    name: 'Mastiff',
    description: 'A large, muscular guard dog bred for loyalty and aggression.',
    level: 1,
    ac: 11,
    hp: 4,
    attacks: [
      { name: 'Bite', bonus: 1, damage: '1d6', range: 'close' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 12, DEX: 12, CON: 10, INT: 6, WIS: 12, CHA: 6 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal'],
  },

  // ---------- 139. Medusa (p.232) ----------
  {
    id: 'medusa',
    name: 'Medusa',
    description: 'A cursed woman with living serpents for hair whose gaze turns the living to lifeless stone.',
    level: 8,
    ac: 14,
    hp: 38,
    attacks: [
      { name: 'Snake Bite', bonus: 6, damage: '1d6', range: 'close', specialEffect: 'poison' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 14, DEX: 12, CON: 14, INT: 14, WIS: 16, CHA: 18 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 140. Merfolk (p.232) ----------
  {
    id: 'merfolk',
    name: 'Merfolk',
    description: 'An aquatic humanoid with a fish-like lower body, wary of surface dwellers.',
    level: 2,
    ac: 11,
    hp: 9,
    attacks: [
      { name: 'Spear', bonus: 2, damage: '1d6', range: 'near' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 12, DEX: 12, CON: 10, INT: 10, WIS: 12, CHA: 12 },
    alignment: 'lawful',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 141. Mimic (p.232) ----------
  {
    id: 'mimic',
    name: 'Mimic',
    description: 'A cunning shapeshifter that disguises itself as treasure chests and furniture to lure the unwary.',
    level: 5,
    ac: 12,
    hp: 23,
    attacks: [
      { name: 'Bite', bonus: 5, damage: '1d8', range: 'close', multiattack: 2, specialEffect: 'stick' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 14, DEX: 10, CON: 12, INT: 6, WIS: 10, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 142. Minotaur (p.233) ----------
  {
    id: 'minotaur',
    name: 'Minotaur',
    description: 'A bull-headed horror that stalks labyrinthine corridors, relishing the terror of the lost.',
    level: 7,
    ac: 14,
    acSource: 'chainmail',
    hp: 34,
    attacks: [
      { name: 'Greataxe', bonus: 6, damage: '1d10', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near' },
    stats: { STR: 18, DEX: 12, CON: 16, INT: 12, WIS: 14, CHA: 12 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 143. Moose (p.233) ----------
  {
    id: 'moose',
    name: 'Moose',
    description: 'A towering, antlered beast of the northern wilds, deceptively aggressive when provoked.',
    level: 4,
    ac: 11,
    hp: 19,
    attacks: [
      { name: 'Antler', bonus: 3, damage: '1d6', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near', double: true },
    stats: { STR: 16, DEX: 10, CON: 12, INT: 6, WIS: 10, CHA: 6 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal'],
  },

  // ---------- 144. Mordanticus The Flayed (p.234) ----------
  {
    id: 'mordanticus-the-flayed',
    name: 'Mordanticus The Flayed',
    description: 'A skinless archfiend whose exposed sinews pulse with forbidden power, rewriting the laws of flesh with every gesture.',
    level: 19,
    ac: 17,
    hp: 89,
    attacks: [
      { name: 'Rot Touch', bonus: 8, damage: '1d10', range: 'close', specialEffect: 'necrosis' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 18, DEX: 18, CON: 18, INT: 20, WIS: 18, CHA: 20 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['legendary'],
  },

  // ---------- 145. Mummy (p.236) ----------
  {
    id: 'mummy',
    name: 'Mummy',
    description: 'An embalmed tyrant risen from a cursed tomb, trailing ancient wrappings and a rotting aura of dread.',
    level: 10,
    ac: 13,
    hp: 47,
    attacks: [
      { name: 'Rot Touch', bonus: 8, damage: '1d10', range: 'close', multiattack: 3, specialEffect: 'necrosis' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 16, DEX: 10, CON: 14, INT: 16, WIS: 14, CHA: 16 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['undead'],
  },

  // ---------- 146. Mushroomfolk (p.236) ----------
  {
    id: 'mushroomfolk',
    name: 'Mushroomfolk',
    description: 'A sentient fungal humanoid that communicates through spore clouds and tends subterranean gardens.',
    level: 3,
    ac: 13,
    hp: 15,
    attacks: [
      { name: 'Slam', bonus: 2, damage: '1d6', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near' },
    stats: { STR: 14, DEX: 8, CON: 14, INT: 10, WIS: 12, CHA: 10 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid', 'plant'],
  },

  // ---------- 147. Naga (p.237) ----------
  {
    id: 'naga',
    name: 'Naga',
    description: 'An immortal serpent of terrible intelligence, guarding forbidden secrets with spell and fang.',
    level: 9,
    ac: 16,
    hp: 43,
    attacks: [
      { name: 'Bite', bonus: 7, damage: '2d6', range: 'close', multiattack: 2, specialEffect: 'poison' },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 18, DEX: 12, CON: 16, INT: 14, WIS: 14, CHA: 18 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 148. Naga, Bone (p.237) ----------
  {
    id: 'naga-bone',
    name: 'Naga, Bone',
    description: 'A skeletal serpent animated by necromantic spite, its hollow eye sockets burning with pale fire.',
    level: 6,
    ac: 13,
    hp: 31,
    attacks: [
      { name: 'Bite', bonus: 5, damage: '2d6', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near', climb: 'near', burrow: 'near' },
    stats: { STR: 16, DEX: 14, CON: 18, INT: 4, WIS: 10, CHA: 18 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 149. Nightmare (p.237) ----------
  {
    id: 'nightmare',
    name: 'Nightmare',
    description: 'A coal-black steed wreathed in hellfire, galloping between worlds to carry the damned.',
    level: 6,
    ac: 13,
    hp: 29,
    attacks: [
      { name: 'Hooves', bonus: 5, damage: '1d8', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near', double: true, fly: 'near' },
    stats: { STR: 16, DEX: 16, CON: 14, INT: 8, WIS: 12, CHA: 6 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['fiend'],
  },

  // ---------- 150. Obe-ixx Of Azarumme (p.238) ----------
  {
    id: 'obe-ixx-of-azarumme',
    name: 'Obe-ixx Of Azarumme',
    description: 'A nameless dread given form in the abyss of Azarumme, its thousand whispers eroding sanity like waves upon stone.',
    level: 16,
    ac: 18,
    acSource: '+3 plate mail',
    hp: 76,
    attacks: [
      { name: 'Greatsword', bonus: 11, damage: '1d12', range: 'near', multiattack: 4, specialEffect: '2, Moonbite properties' },
    ],
    movement: { normal: 'near', fly: 'near', climb: 'near' },
    stats: { STR: 20, DEX: 16, CON: 18, INT: 16, WIS: 18, CHA: 20 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['legendary', 'undead'],
  },

  // ---------- 151. Ochre Jelly (p.239) ----------
  {
    id: 'ochre-jelly',
    name: 'Ochre Jelly',
    description: 'A thick, amber-colored ooze that dissolves flesh and splits in two when struck by blades.',
    level: 4,
    ac: 9,
    hp: 20,
    attacks: [
      { name: 'Tentacle', bonus: 3, damage: '1d6', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 14, DEX: 8, CON: 14, INT: 3, WIS: 4, CHA: 3 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['ooze'],
  },

  // ---------- 152. Octopus, Giant (p.239) ----------
  {
    id: 'octopus-giant',
    name: 'Octopus, Giant',
    description: 'A deep-dwelling terror with crushing tentacles and an alien intelligence behind its dark eyes.',
    level: 5,
    ac: 13,
    hp: 23,
    attacks: [
      { name: 'Tentacle', bonus: 4, damage: '1d8', range: 'near', multiattack: 2, specialEffect: 'grab' },
    ],
    movement: { normal: 'near', swim: 'near' },
    stats: { STR: 16, DEX: 16, CON: 12, INT: 6, WIS: 12, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal', 'giant'],
  },

  // ---------- 153. Ogre (p.239) ----------
  {
    id: 'ogre',
    name: 'Ogre',
    description: 'A dim-witted, lumbering brute that bludgeons first and never thinks to ask questions.',
    level: 6,
    ac: 9,
    hp: 30,
    attacks: [
      { name: 'Greatclub', bonus: 6, damage: '2d6', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near' },
    stats: { STR: 18, DEX: 8, CON: 16, INT: 6, WIS: 6, CHA: 6 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['giant'],
  },

  // ---------- 154. Oni (p.239) ----------
  {
    id: 'oni',
    name: 'Oni',
    description: 'A shape-shifting ogre demon cloaked in illusion, feeding on fear and human flesh.',
    level: 7,
    ac: 11,
    hp: 33,
    attacks: [
      { name: 'Glaive', bonus: 6, damage: '1d10', range: 'near' },
      { name: 'Spell +5', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 20, DEX: 12, CON: 14, INT: 14, WIS: 12, CHA: 16 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['giant'],
  },

  // ---------- 155. Orc (p.240) ----------
  {
    id: 'orc',
    name: 'Orc',
    description: 'A brutish, tusked warrior driven by rage and a hunger for conquest.',
    level: 1,
    ac: 15,
    acSource: 'chainmail + shield',
    hp: 4,
    attacks: [
      { name: 'Greataxe', bonus: 2, damage: '1d8', range: 'close' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 14, DEX: 10, CON: 10, INT: 8, WIS: 10, CHA: 8 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 156. Orc, Chieftain (p.240) ----------
  {
    id: 'orc-chieftain',
    name: 'Orc, Chieftain',
    description: 'A battle-scarred orc warlord who commands through fear and unmatched brutality.',
    level: 4,
    ac: 14,
    acSource: 'chainmail',
    hp: 19,
    attacks: [
      { name: 'Greataxe', bonus: 4, damage: '1d10', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near' },
    stats: { STR: 14, DEX: 12, CON: 12, INT: 8, WIS: 10, CHA: 8 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 157. Otyugh (p.240) ----------
  {
    id: 'otyugh',
    name: 'Otyugh',
    description: 'A foul, tentacled scavenger that wallows in refuse and spreads virulent disease with every lashing strike.',
    level: 7,
    ac: 13,
    hp: 35,
    attacks: [
      { name: 'Tentacle', bonus: 5, damage: '1d8', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near' },
    stats: { STR: 18, DEX: 8, CON: 18, INT: 6, WIS: 10, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['aberration'],
  },

  // ---------- 158. Owlbear (p.242) ----------
  {
    id: 'owlbear',
    name: 'Owlbear',
    description: 'A ferocious hybrid of owl and bear, all beak, claws, and unreasoning rage.',
    level: 6,
    ac: 13,
    hp: 30,
    attacks: [
      { name: 'Claw', bonus: 5, damage: '1d10', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 18, DEX: 12, CON: 16, INT: 6, WIS: 14, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 159. Panther (p.242) ----------
  {
    id: 'panther',
    name: 'Panther',
    description: 'A sleek, black-furred cat that stalks its prey in silence before pouncing from the dark.',
    level: 3,
    ac: 14,
    hp: 14,
    attacks: [
      { name: 'Rend', bonus: 3, damage: '1d6', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 16, DEX: 18, CON: 12, INT: 6, WIS: 12, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal'],
  },

  // ---------- 160. Peasant (p.242) ----------
  {
    id: 'peasant',
    name: 'Peasant',
    description: 'A common laborer with no combat training, armed with whatever is at hand.',
    level: 1,
    ac: 10,
    hp: 4,
    attacks: [
      { name: 'Club', bonus: 0, damage: '1d4', range: 'close' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
    alignment: 'lawful',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 161. Pegasus (p.242) ----------
  {
    id: 'pegasus',
    name: 'Pegasus',
    description: 'A winged horse of celestial origin, loyal only to the pure of heart.',
    level: 3,
    ac: 12,
    hp: 15,
    attacks: [
      { name: 'Hooves', bonus: 3, damage: '1d6', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near', double: true, fly: 'near' },
    stats: { STR: 16, DEX: 14, CON: 14, INT: 4, WIS: 12, CHA: 10 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['celestial'],
  },

  // ---------- 162. Phoenix (p.243) ----------
  {
    id: 'phoenix',
    name: 'Phoenix',
    description: 'An immortal bird of sacred flame that immolates itself in death and rises renewed from the ashes.',
    level: 13,
    ac: 16,
    hp: 60,
    attacks: [
      { name: 'Rend', bonus: 8, damage: '2d12', range: 'close', multiattack: 4 },
    ],
    movement: { normal: 'near', double: true, fly: 'near' },
    stats: { STR: 16, DEX: 18, CON: 14, INT: 16, WIS: 16, CHA: 16 },
    alignment: 'lawful',
    abilities: [],
    checksMorale: true,
    tags: ['elemental'],
  },

  // ---------- 163. Piranha, Swarm (p.243) ----------
  {
    id: 'piranha-swarm',
    name: 'Piranha, Swarm',
    description: 'A frenzied school of razor-toothed fish that strips flesh from bone in seconds.',
    level: 3,
    ac: 12,
    hp: 13,
    attacks: [
      { name: 'Bite', bonus: 2, damage: '1d6', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near', swim: 'near' },
    stats: { STR: 6, DEX: 14, CON: 10, INT: 4, WIS: 10, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['swarm'],
  },

  // ---------- 164. Pirate (p.243) ----------
  {
    id: 'pirate',
    name: 'Pirate',
    description: 'A sea-hardened cutthroat who lives by plunder and the blade.',
    level: 1,
    ac: 12,
    acSource: 'leather',
    hp: 4,
    attacks: [
      { name: 'Cutlass', bonus: 1, damage: '1d6', range: 'close' },
      { name: 'Dagger', bonus: 1, damage: '1d4', range: 'near' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 12, DEX: 12, CON: 10, INT: 10, WIS: 10, CHA: 10 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 165. Plesiosaurus (p.208) ----------
  {
    id: 'plesiosaurus',
    name: 'Plesiosaurus',
    description: 'A long-necked aquatic predator that glides through dark waters like a living siege engine.',
    level: 6,
    ac: 13,
    hp: 30,
    attacks: [
      { name: 'Bite', bonus: 5, damage: '2d8', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near', double: true, swim: 'near' },
    stats: { STR: 18, DEX: 16, CON: 16, INT: 4, WIS: 12, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['dinosaur'],
  },

  // ---------- 166. Priest (p.243) ----------
  {
    id: 'priest',
    name: 'Priest',
    description: 'A devout servant of the gods who channels divine wrath against the faithless.',
    level: 5,
    ac: 15,
    acSource: 'chainmail + shield',
    hp: 23,
    attacks: [
      { name: 'Mace', bonus: 3, damage: '1d6', range: 'close', multiattack: 2 },
      { name: 'Spell +3', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 12, DEX: 10, CON: 12, INT: 10, WIS: 14, CHA: 12 },
    alignment: 'lawful',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 167. Primordial Slime (p.241) ----------
  {
    id: 'primordial-slime',
    name: 'Primordial Slime',
    description: 'An ancient ooze seeping up from the world\\\'s foundations, older than memory and endlessly hungry.',
    level: 6,
    ac: 9,
    hp: 30,
    attacks: [
      { name: 'Tentacle', bonus: 4, damage: '1d10', range: 'close', multiattack: 2, specialEffect: 'dissolve' },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 16, DEX: 14, CON: 16, INT: 3, WIS: 4, CHA: 3 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['outsider', 'ooze'],
  },

  // ---------- 168. Pterodactyl (p.208) ----------
  {
    id: 'pterodactyl',
    name: 'Pterodactyl',
    description: 'A winged reptile from a primordial age, soaring on leathery wings and snatching prey from below.',
    level: 4,
    ac: 14,
    hp: 20,
    attacks: [
      { name: 'Beak', bonus: 4, damage: '1d8', range: 'close', multiattack: 2, specialEffect: 'grab' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 14, DEX: 18, CON: 14, INT: 6, WIS: 12, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['dinosaur'],
  },

  // ---------- 169. Purple Worm (p.244) ----------
  {
    id: 'purple-worm',
    name: 'Purple Worm',
    description: 'A gargantuan burrowing horror that erupts from the earth to swallow horses and riders whole.',
    level: 12,
    ac: 18,
    hp: 57,
    attacks: [
      { name: 'Bite', bonus: 9, damage: '2d12', range: 'close', multiattack: 2, specialEffect: 'swallow' },
    ],
    movement: { normal: 'near', double: true, burrow: 'near' },
    stats: { STR: 20, DEX: 12, CON: 16, INT: 4, WIS: 12, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 170. Rakshasa (p.244) ----------
  {
    id: 'rakshasa',
    name: 'Rakshasa',
    description: 'A fiendish trickster cloaked in mortal guise, its backwards hands the only tell of its true nature.',
    level: 8,
    ac: 16,
    hp: 39,
    attacks: [
      { name: 'Claw', bonus: 6, damage: '1d8', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near' },
    stats: { STR: 12, DEX: 16, CON: 16, INT: 16, WIS: 16, CHA: 18 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['fiend'],
  },

  // ---------- 171. Rat (p.245) ----------
  {
    id: 'rat',
    name: 'Rat',
    description: 'A common vermin found in sewers and dungeons, emboldened by darkness and filth.',
    level: 0,
    ac: 10,
    hp: 1,
    attacks: [
      { name: 'Bite', bonus: 0, damage: '1', range: 'close', specialEffect: 'disease' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 4, DEX: 10, CON: 12, INT: 4, WIS: 12, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal'],
  },

  // ---------- 172. Rat, Dire (p.245) ----------
  {
    id: 'rat-dire',
    name: 'Rat, Dire',
    description: 'A wolf-sized rodent with scarred hide and a ravenous appetite for warm flesh.',
    level: 2,
    ac: 12,
    hp: 10,
    attacks: [
      { name: 'Bite', bonus: 2, damage: '1d6', range: 'close', specialEffect: 'disease' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 12, DEX: 14, CON: 12, INT: 6, WIS: 12, CHA: 6 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal', 'dire'],
  },

  // ---------- 173. Rat, Giant (p.245) ----------
  {
    id: 'rat-giant',
    name: 'Rat, Giant',
    description: 'A dog-sized rat with matted fur and yellowed fangs, bold enough to attack the living.',
    level: 1,
    ac: 11,
    hp: 5,
    attacks: [
      { name: 'Bite', bonus: 1, damage: '1d4', range: 'close', specialEffect: 'disease' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 6, DEX: 12, CON: 12, INT: 6, WIS: 12, CHA: 6 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal', 'giant'],
  },

  // ---------- 174. Rat, Swarm (p.245) ----------
  {
    id: 'rat-swarm',
    name: 'Rat, Swarm',
    description: 'A tide of filthy, biting rodents that overwhelms prey through sheer frenzied numbers.',
    level: 6,
    ac: 10,
    hp: 28,
    attacks: [
      { name: 'Bite', bonus: 0, damage: '1', range: 'close', multiattack: 4, specialEffect: 'disease' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 4, DEX: 10, CON: 12, INT: 4, WIS: 12, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal', 'swarm'],
  },

  // ---------- 175. Rathgamnon (p.246) ----------
  {
    id: 'rathgamnon',
    name: 'Rathgamnon',
    description: 'An ancient celestial judge turned executioner, whose gleaming blade has ended civilizations found wanting.',
    level: 19,
    ac: 17,
    hp: 89,
    attacks: [
      { name: 'Rend', bonus: 9, damage: '2d10', range: 'near', multiattack: 2 },
    ],
    movement: { normal: 'near', double: true, fly: 'near' },
    stats: { STR: 20, DEX: 16, CON: 18, INT: 20, WIS: 22, CHA: 20 },
    alignment: 'lawful',
    abilities: [],
    checksMorale: true,
    tags: ['legendary'],
  },

  // ---------- 176. Reaver (p.247) ----------
  {
    id: 'reaver',
    name: 'Reaver',
    description: 'A battle-hardened warrior who lives for plunder and leaves only ashes in their wake.',
    level: 6,
    ac: 17,
    acSource: 'plate mail + shield',
    hp: 28,
    attacks: [
      { name: 'Bastard Sword', bonus: 4, damage: '1d8', range: 'close', multiattack: 3, specialEffect: '2' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 16, DEX: 10, CON: 12, INT: 10, WIS: 10, CHA: 14 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 177. Remorhaz (p.247) ----------
  {
    id: 'remorhaz',
    name: 'Remorhaz',
    description: 'A massive arctic centipede radiating searing heat, melting tunnels through glaciers as it hunts.',
    level: 10,
    ac: 16,
    hp: 47,
    attacks: [
      { name: 'Bite', bonus: 7, damage: '2d6', range: 'close', multiattack: 3, specialEffect: 'swallow' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 20, DEX: 12, CON: 14, INT: 4, WIS: 12, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['insect'],
  },

  // ---------- 178. Rhinoceros (p.248) ----------
  {
    id: 'rhinoceros',
    name: 'Rhinoceros',
    description: 'A thick-skinned brute that charges with unstoppable fury, its horn lowered like a lance.',
    level: 5,
    ac: 14,
    hp: 25,
    attacks: [
      { name: 'Horn', bonus: 4, damage: '1d8', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near' },
    stats: { STR: 18, DEX: 8, CON: 16, INT: 4, WIS: 10, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal'],
  },

  // ---------- 179. Rime Walker (p.241) ----------
  {
    id: 'rime-walker',
    name: 'Rime Walker',
    description: 'A gaunt, frost-wreathed entity that strides through blizzards, freezing the living where they stand.',
    level: 9,
    ac: 16,
    hp: 43,
    attacks: [
      { name: 'Claw', bonus: 8, damage: '1d12', range: 'close', multiattack: 4 },
    ],
    movement: { normal: 'near', fly: 'near' },
    stats: { STR: 18, DEX: 18, CON: 16, INT: 14, WIS: 14, CHA: 14 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['outsider'],
  },

  // ---------- 180. Roc (p.248) ----------
  {
    id: 'roc',
    name: 'Roc',
    description: 'A bird of impossible size that nests on mountaintops and carries elephants in its talons.',
    level: 15,
    ac: 15,
    hp: 69,
    attacks: [
      { name: 'Rend', bonus: 9, damage: '2d10', range: 'close', multiattack: 4, specialEffect: 'grab' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 20, DEX: 16, CON: 14, INT: 6, WIS: 14, CHA: 6 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity', 'giant'],
  },

  // ---------- 181. Roper (p.248) ----------
  {
    id: 'roper',
    name: 'Roper',
    description: 'A stalagmite-shaped ambush predator that snares victims with long, sticky tendrils before devouring them.',
    level: 6,
    ac: 14,
    hp: 31,
    attacks: [
      { name: 'Tendril', bonus: 4, damage: '1d6', range: 'near', multiattack: 4, specialEffect: 'grab' },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 16, DEX: 6, CON: 18, INT: 8, WIS: 14, CHA: 12 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 182. Rot Flower (p.249) ----------
  {
    id: 'rot-flower',
    name: 'Rot Flower',
    description: 'A foul-smelling plant with writhing tendrils that feeds on decomposing corpses.',
    level: 2,
    ac: 9,
    hp: 10,
    attacks: [
      { name: 'Bite', bonus: 1, damage: '1d4', range: 'close', specialEffect: 'toxin' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 12, DEX: 4, CON: 12, INT: 3, WIS: 4, CHA: 3 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['plant'],
  },

  // ---------- 183. Rust Monster (p.249) ----------
  {
    id: 'rust-monster',
    name: 'Rust Monster',
    description: 'An insectoid scavenger with feathery antennae that corrode metal on contact, the bane of armored adventurers.',
    level: 4,
    ac: 13,
    hp: 19,
    attacks: [
      { name: 'Claw', bonus: 3, damage: '1d6', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 14, DEX: 16, CON: 12, INT: 4, WIS: 12, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 184. Sahuagin (p.249) ----------
  {
    id: 'sahuagin',
    name: 'Sahuagin',
    description: 'A vicious sea-devil with webbed claws and razor teeth, raiding coastal settlements by night.',
    level: 2,
    ac: 14,
    acSource: 'leather + shield',
    hp: 9,
    attacks: [
      { name: 'Trident', bonus: 1, damage: '1d6', range: 'near', multiattack: 2 },
    ],
    movement: { normal: 'near', swim: 'near' },
    stats: { STR: 12, DEX: 12, CON: 10, INT: 8, WIS: 10, CHA: 8 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 185. Salamander (p.249) ----------
  {
    id: 'salamander',
    name: 'Salamander',
    description: 'A serpentine creature wreathed in elemental flame, forged in the fires beneath the world.',
    level: 5,
    ac: 13,
    hp: 24,
    attacks: [
      { name: 'Flaming Spear', bonus: 4, damage: '1d6', range: 'near', multiattack: 2, specialEffect: 'ignites flammables' },
      { name: 'Iron Longbow', bonus: 2, damage: '1d8', range: 'far' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 14, DEX: 10, CON: 14, INT: 8, WIS: 12, CHA: 8 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['elemental'],
  },

  // ---------- 186. Scarab, Swarm (p.249) ----------
  {
    id: 'scarab-swarm',
    name: 'Scarab, Swarm',
    description: 'A tide of chitinous beetles that boils out of tombs and devours anything organic.',
    level: 3,
    ac: 13,
    hp: 14,
    attacks: [
      { name: 'Bite', bonus: 3, damage: '1d6', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near', fly: 'near' },
    stats: { STR: 8, DEX: 16, CON: 12, INT: 4, WIS: 10, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['insect', 'swarm'],
  },

  // ---------- 187. Scarecrow (p.249) ----------
  {
    id: 'scarecrow',
    name: 'Scarecrow',
    description: 'A straw-stuffed effigy animated by dark sorcery, its burlap face stitched into a permanent grin.',
    level: 3,
    ac: 12,
    hp: 15,
    attacks: [
      { name: 'Claws', bonus: 2, damage: '1d6', range: 'close', multiattack: 2 },
      { name: 'Scream', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 14, DEX: 14, CON: 14, INT: 10, WIS: 10, CHA: 14 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['undead'],
  },

  // ---------- 188. Scorpion (p.250) ----------
  {
    id: 'scorpion',
    name: 'Scorpion',
    description: 'A palm-sized arachnid with pincers and a venomous tail barb.',
    level: 0,
    ac: 11,
    hp: 1,
    attacks: [
      { name: 'Sting', bonus: 1, damage: '1', range: 'close', specialEffect: 'poison' },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 3, DEX: 12, CON: 10, INT: 3, WIS: 10, CHA: 3 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['insect'],
  },

  // ---------- 189. Scorpion, Giant (p.250) ----------
  {
    id: 'scorpion-giant',
    name: 'Scorpion, Giant',
    description: 'A wagon-sized arachnid with crushing pincers and a tail barb dripping lethal venom.',
    level: 3,
    ac: 14,
    hp: 13,
    attacks: [
      { name: 'Claw', bonus: 2, damage: '1d6', range: 'close', specialEffect: 'grab' },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 14, DEX: 14, CON: 10, INT: 3, WIS: 10, CHA: 3 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['insect', 'giant'],
  },

  // ---------- 190. Shadow (p.250) ----------
  {
    id: 'shadow',
    name: 'Shadow',
    description: 'A bodiless undead formed of living darkness that drains the strength of the living with its touch.',
    level: 3,
    ac: 12,
    hp: 15,
    attacks: [
      { name: 'Touch', bonus: 2, damage: '1d4', range: 'close', multiattack: 2, specialEffect: 'drain' },
    ],
    movement: { normal: 'near', fly: 'near' },
    stats: { STR: 3, DEX: 14, CON: 14, INT: 6, WIS: 10, CHA: 8 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['undead'],
  },

  // ---------- 191. Shambling Mound (p.251) ----------
  {
    id: 'shambling-mound',
    name: 'Shambling Mound',
    description: 'A heap of rotting vegetation animated by foul magic, engulfing victims in its mossy bulk.',
    level: 4,
    ac: 14,
    hp: 20,
    attacks: [
      { name: 'Slam', bonus: 3, damage: '1d6', range: 'close', multiattack: 2, specialEffect: 'engulf' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 16, DEX: 6, CON: 14, INT: 4, WIS: 10, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['plant'],
  },

  // ---------- 192. Shark (p.251) ----------
  {
    id: 'shark',
    name: 'Shark',
    description: 'A sleek oceanic predator drawn to blood, all muscle and teeth and relentless hunger.',
    level: 3,
    ac: 11,
    hp: 15,
    attacks: [
      { name: 'Bite', bonus: 3, damage: '1d10', range: 'close' },
    ],
    movement: { normal: 'near', swim: 'near' },
    stats: { STR: 16, DEX: 12, CON: 14, INT: 4, WIS: 12, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal'],
  },

  // ---------- 193. Shark, Megalodon (p.251) ----------
  {
    id: 'shark-megalodon',
    name: 'Shark, Megalodon',
    description: 'A primeval leviathan of the deep, large enough to swallow longboats whole.',
    level: 8,
    ac: 13,
    hp: 38,
    attacks: [
      { name: 'Bite', bonus: 7, damage: '2d8', range: 'close', multiattack: 3 },
    ],
    movement: { normal: 'near', double: true, swim: 'near' },
    stats: { STR: 20, DEX: 12, CON: 14, INT: 4, WIS: 12, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['dinosaur'],
  },

  // ---------- 194. Siren (p.251) ----------
  {
    id: 'siren',
    name: 'Siren',
    description: 'A hauntingly beautiful creature whose enchanting song compels sailors to steer toward the rocks.',
    level: 4,
    ac: 12,
    hp: 18,
    attacks: [
      { name: 'Claw', bonus: 2, damage: '1d6', range: 'close', multiattack: 2 },
      { name: 'Song', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 10, DEX: 14, CON: 10, INT: 14, WIS: 14, CHA: 18 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['fey'],
  },

  // ---------- 195. Skeleton (p.251) ----------
  {
    id: 'skeleton',
    name: 'Skeleton',
    description: 'The reanimated bones of the dead, held together by dark magic and driven to obey.',
    level: 2,
    ac: 13,
    acSource: 'chainmail',
    hp: 11,
    attacks: [
      { name: 'Shortsword', bonus: 1, damage: '1d6', range: 'close' },
      { name: 'Shortbow', bonus: 0, damage: '1d4', range: 'far' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 12, DEX: 10, CON: 14, INT: 6, WIS: 10, CHA: 8 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['undead'],
  },

  // ---------- 196. Smilodon (p.251) ----------
  {
    id: 'smilodon',
    name: 'Smilodon',
    description: 'A prehistoric great cat with dagger-length fangs, built for bringing down massive prey.',
    level: 3,
    ac: 12,
    hp: 14,
    attacks: [
      { name: 'Bite', bonus: 3, damage: '1d6', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near' },
    stats: { STR: 16, DEX: 14, CON: 12, INT: 4, WIS: 12, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal'],
  },

  // ---------- 197. Snake, Cobra (p.252) ----------
  {
    id: 'snake-cobra',
    name: 'Snake, Cobra',
    description: 'A hooded serpent that rears up and strikes with lightning-fast, venomous fangs.',
    level: 1,
    ac: 12,
    hp: 4,
    attacks: [
      { name: 'Bite', bonus: 2, damage: '1', range: 'close', specialEffect: 'poison' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 4, DEX: 14, CON: 10, INT: 4, WIS: 10, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal'],
  },

  // ---------- 198. Snake, Giant (p.252) ----------
  {
    id: 'snake-giant',
    name: 'Snake, Giant',
    description: 'An enormous constrictor that drops silently from the canopy to coil around its prey.',
    level: 5,
    ac: 12,
    hp: 23,
    attacks: [
      { name: 'Bite', bonus: 4, damage: '1d6', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 16, DEX: 14, CON: 12, INT: 6, WIS: 10, CHA: 6 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal', 'giant'],
  },

  // ---------- 199. Snake, Swarm (p.252) ----------
  {
    id: 'snake-swarm',
    name: 'Snake, Swarm',
    description: 'A roiling knot of dozens of venomous serpents that strikes from every direction at once.',
    level: 4,
    ac: 12,
    hp: 19,
    attacks: [
      { name: 'Bite', bonus: 2, damage: '1d4', range: 'close', multiattack: 3, specialEffect: 'poison' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 4, DEX: 14, CON: 12, INT: 4, WIS: 10, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal', 'swarm'],
  },

  // ---------- 200. Soldier (p.252) ----------
  {
    id: 'soldier',
    name: 'Soldier',
    description: 'A trained fighting man equipped with mail and a sturdy weapon, loyal to crown or coin.',
    level: 2,
    ac: 15,
    acSource: 'chainmail + shield',
    hp: 10,
    attacks: [
      { name: 'Longsword', bonus: 2, damage: '1d8', range: 'close' },
      { name: 'Crossbow', bonus: 1, damage: '1d6', range: 'far' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 12, DEX: 10, CON: 12, INT: 10, WIS: 10, CHA: 10 },
    alignment: 'lawful',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 201. Sphinx (p.253) ----------
  {
    id: 'sphinx',
    name: 'Sphinx',
    description: 'An enigmatic guardian with the body of a lion and the mind of a sage, posing riddles that carry the weight of doom.',
    level: 9,
    ac: 16,
    hp: 42,
    attacks: [
      { name: 'Claw', bonus: 7, damage: '1d10', range: 'close', multiattack: 3 },
      { name: 'Spell +5', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near', double: true, fly: 'near' },
    stats: { STR: 18, DEX: 12, CON: 14, INT: 18, WIS: 18, CHA: 16 },
    alignment: 'lawful',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 202. Spider (p.254) ----------
  {
    id: 'spider',
    name: 'Spider',
    description: 'A small, venomous spider that lurks in crevices and webs strung across dungeon corridors.',
    level: 0,
    ac: 11,
    hp: 1,
    attacks: [
      { name: 'Bite', bonus: 1, damage: '1', range: 'close', multiattack: 2, specialEffect: 'poison' },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 3, DEX: 12, CON: 10, INT: 3, WIS: 10, CHA: 3 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['insect'],
  },

  // ---------- 203. Spider, Giant (p.254) ----------
  {
    id: 'spider-giant',
    name: 'Spider, Giant',
    description: 'A horse-sized arachnid that spins webs across cavern mouths and injects dissolving venom.',
    level: 3,
    ac: 13,
    hp: 13,
    attacks: [
      { name: 'Bite', bonus: 3, damage: '1d4', range: 'close', specialEffect: 'poison' },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 14, DEX: 16, CON: 10, INT: 6, WIS: 12, CHA: 6 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['insect', 'giant'],
  },

  // ---------- 204. Spider, Swarm (p.254) ----------
  {
    id: 'spider-swarm',
    name: 'Spider, Swarm',
    description: 'A seething carpet of thousands of tiny spiders that engulfs and bites everything in its path.',
    level: 2,
    ac: 13,
    hp: 9,
    attacks: [
      { name: 'Bite', bonus: 3, damage: '1d4', range: 'close', specialEffect: 'poison' },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 8, DEX: 16, CON: 10, INT: 4, WIS: 12, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['insect', 'swarm'],
  },

  // ---------- 205. Stingbat (p.254) ----------
  {
    id: 'stingbat',
    name: 'Stingbat',
    description: 'A leathery-winged cave dweller with a barbed tail that drips venom.',
    level: 1,
    ac: 12,
    hp: 4,
    attacks: [
      { name: 'Beak', bonus: 2, damage: '1d4', range: 'close', specialEffect: 'blood drain' },
    ],
    movement: { normal: 'near', fly: 'near' },
    stats: { STR: 6, DEX: 14, CON: 10, INT: 6, WIS: 10, CHA: 6 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal'],
  },

  // ---------- 206. Strangler (p.254) ----------
  {
    id: 'strangler',
    name: 'Strangler',
    description: 'A tentacled lurker that drops from ceilings to wrap around its victim\\\'s throat.',
    level: 3,
    ac: 12,
    hp: 14,
    attacks: [
      { name: 'Claws', bonus: 2, damage: '1d6', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 6, DEX: 14, CON: 12, INT: 6, WIS: 10, CHA: 6 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 207. The Tarrasque (p.256) ----------
  {
    id: 'the-tarrasque',
    name: 'The Tarrasque',
    description: 'An apocalyptic engine of destruction that devours all in its path, feared as the world-ender in every age.',
    level: 30,
    ac: 22,
    hp: 140,
    attacks: [
      { name: 'Thrash', bonus: 13, damage: '3d10', range: 'near', multiattack: 4, specialEffect: 'sever' },
    ],
    movement: { normal: 'near', swim: 'near', burrow: 'near' },
    stats: { STR: 24, DEX: 14, CON: 20, INT: 4, WIS: 12, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['legendary'],
  },

  // ---------- 208. The Ten-eyed Oracle (p.255) ----------
  {
    id: 'the-ten-eyed-oracle',
    name: 'The Ten-eyed Oracle',
    description: 'An eldritch seer with ten unblinking eyes that pierce all veils of time, fate, and deception.',
    level: 18,
    ac: 17,
    hp: 85,
    attacks: [],
    movement: { normal: 'near', fly: 'near' },
    stats: { STR: 18, DEX: 20, CON: 18, INT: 20, WIS: 18, CHA: 18 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['legendary'],
  },

  // ---------- 209. The Wandering Merchant (p.258) ----------
  {
    id: 'the-wandering-merchant',
    name: 'The Wandering Merchant',
    description: 'A mysterious figure who appears at crossroads and in dying torchlight, selling wonders no mortal should possess.',
    level: 15,
    ac: 16,
    acSource: 'mithral chainmail',
    hp: 71,
    attacks: [
      { name: '+3 Vorpal Bastard Sword', bonus: 9, damage: '1d10', range: 'close', multiattack: 4, specialEffect: 'lop' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 16, DEX: 16, CON: 18, INT: 16, WIS: 18, CHA: 20 },
    alignment: 'lawful',
    abilities: [],
    checksMorale: true,
    tags: ['legendary'],
  },

  // ---------- 210. Thief (p.259) ----------
  {
    id: 'thief',
    name: 'Thief',
    description: 'A quick-fingered rogue who lives by stealth, picking locks and pockets with equal ease.',
    level: 3,
    ac: 13,
    acSource: 'leather',
    hp: 13,
    attacks: [
      { name: 'Dagger', bonus: 2, damage: '1d4', range: 'near' },
      { name: 'Shortsword', bonus: 0, damage: '1d6', range: 'close' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 10, DEX: 14, CON: 10, INT: 10, WIS: 10, CHA: 12 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 211. Thug (p.259) ----------
  {
    id: 'thug',
    name: 'Thug',
    description: 'A streetwise brute who settles disputes with fists and clubs.',
    level: 1,
    ac: 13,
    acSource: 'leather + shield',
    hp: 4,
    attacks: [
      { name: 'Shortsword', bonus: 1, damage: '1d6', range: 'close' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 12, DEX: 10, CON: 10, INT: 8, WIS: 12, CHA: 8 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 212. Treant (p.259) ----------
  {
    id: 'treant',
    name: 'Treant',
    description: 'An ancient, awakened tree that defends the forest with slow wrath and limbs like battering rams.',
    level: 8,
    ac: 14,
    hp: 38,
    attacks: [
      { name: 'Slam', bonus: 8, damage: '1d10', range: 'close', multiattack: 3 },
      { name: 'Rock', bonus: 8, damage: '2d12', range: 'far' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 18, DEX: 8, CON: 14, INT: 14, WIS: 16, CHA: 12 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['plant'],
  },

  // ---------- 213. Triceratops (p.208) ----------
  {
    id: 'triceratops',
    name: 'Triceratops',
    description: 'A titanic, three-horned beast whose armored frill and charging fury make it nearly unstoppable.',
    level: 7,
    ac: 17,
    hp: 35,
    attacks: [
      { name: 'Horns', bonus: 6, damage: '1d10', range: 'close', multiattack: 2 },
      { name: 'Charge', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 18, DEX: 8, CON: 18, INT: 4, WIS: 12, CHA: 4 },
    alignment: 'neutral',
    abilities: [
      { name: 'Trample', description: 'On a successful gore against a creature smaller than triceratops, the target must make a DC 15 STR check or be knocked prone and take 1d8 damage from being trampled.' },
    ],
    checksMorale: true,
    tags: ['dinosaur'],
  },

  // ---------- 214. Troll (p.259) ----------
  {
    id: 'troll',
    name: 'Troll',
    description: 'A lanky, regenerating horror with rubbery green flesh that knits itself back together after every wound.',
    level: 5,
    ac: 12,
    hp: 24,
    attacks: [
      { name: 'Claw', bonus: 4, damage: '1d6', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near' },
    stats: { STR: 16, DEX: 14, CON: 14, INT: 8, WIS: 10, CHA: 8 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['giant'],
  },

  // ---------- 215. Troll, Frost (p.260) ----------
  {
    id: 'troll-frost',
    name: 'Troll, Frost',
    description: 'A pale-skinned troll adapted to glacial wastes, its regenerating flesh crackling with rime.',
    level: 7,
    ac: 13,
    hp: 34,
    attacks: [
      { name: 'Claw', bonus: 5, damage: '1d8', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near' },
    stats: { STR: 16, DEX: 14, CON: 16, INT: 8, WIS: 10, CHA: 8 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['giant'],
  },

  // ---------- 216. Tyrannosaurus (p.208) ----------
  {
    id: 'tyrannosaurus',
    name: 'Tyrannosaurus',
    description: 'The apex predator of a forgotten age, all crushing jaws and thunderous footsteps.',
    level: 9,
    ac: 13,
    hp: 44,
    attacks: [
      { name: 'Bite', bonus: 8, damage: '2d12', range: 'close', multiattack: 3 },
    ],
    movement: { normal: 'near', double: true },
    stats: { STR: 20, DEX: 12, CON: 18, INT: 4, WIS: 12, CHA: 4 },
    alignment: 'neutral',
    abilities: [
      { name: 'Thrash', description: 'Once per round when the tyrannosaurus bites a creature smaller than itself, the target must succeed on a DC 15 STR check or be flung up to a near distance and take an additional 2d6 damage.' },
    ],
    checksMorale: true,
    tags: ['dinosaur'],
  },

  // ---------- 217. Unicorn (p.260) ----------
  {
    id: 'unicorn',
    name: 'Unicorn',
    description: 'A radiant white horse bearing a spiraling horn, embodying purity and ancient woodland magic.',
    level: 4,
    ac: 12,
    hp: 20,
    attacks: [
      { name: 'Hooves', bonus: 3, damage: '1d6', range: 'close' },
    ],
    movement: { normal: 'near', double: true },
    stats: { STR: 16, DEX: 14, CON: 14, INT: 12, WIS: 14, CHA: 16 },
    alignment: 'lawful',
    abilities: [],
    checksMorale: true,
    tags: ['celestial'],
  },

  // ---------- 218. Vampire (p.260) ----------
  {
    id: 'vampire',
    name: 'Vampire',
    description: 'An ancient undead lord of the night, commanding shadows, beasts, and thralls with imperious cunning.',
    level: 11,
    ac: 15,
    hp: 52,
    attacks: [
      { name: 'Bite', bonus: 7, damage: '1d8', range: 'close', multiattack: 3, specialEffect: 'blood drain' },
      { name: 'Charm', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 18, DEX: 16, CON: 16, INT: 12, WIS: 16, CHA: 18 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['undead'],
  },

  // ---------- 219. Vampire Spawn (p.261) ----------
  {
    id: 'vampire-spawn',
    name: 'Vampire Spawn',
    description: 'A newly turned undead thrall, savage and hungry, bound to the will of its dark creator.',
    level: 5,
    ac: 13,
    acSource: 'leather',
    hp: 25,
    attacks: [
      { name: 'Bite', bonus: 4, damage: '1d8', range: 'close', multiattack: 2, specialEffect: 'blood drain' },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 16, DEX: 14, CON: 16, INT: 8, WIS: 12, CHA: 14 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['undead'],
  },

  // ---------- 220. Velociraptor (p.208) ----------
  {
    id: 'velociraptor',
    name: 'Velociraptor',
    description: 'A swift, feathered predator with sickle-shaped claws and pack-hunting instincts.',
    level: 2,
    ac: 13,
    hp: 10,
    attacks: [
      { name: 'Claw', bonus: 3, damage: '1d6', range: 'close' },
    ],
    movement: { normal: 'near', double: true },
    stats: { STR: 8, DEX: 16, CON: 12, INT: 6, WIS: 12, CHA: 4 },
    alignment: 'neutral',
    abilities: [
      { name: 'Pack Attack', description: 'Velociraptor has advantage on attacks against creatures that have at least one of its allies within close range.' },
    ],
    checksMorale: true,
    tags: ['dinosaur'],
  },

  // ---------- 221. Violet Fungus (p.261) ----------
  {
    id: 'violet-fungus',
    name: 'Violet Fungus',
    description: 'A purple-capped fungus with lashing tendrils that rots flesh on contact.',
    level: 2,
    ac: 7,
    hp: 9,
    attacks: [
      { name: 'Tendril', bonus: 0, damage: '1d4', range: 'near', multiattack: 2 },
    ],
    movement: { normal: 'near' },
    stats: { STR: 4, DEX: 6, CON: 10, INT: 3, WIS: 4, CHA: 3 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['plant'],
  },

  // ---------- 222. Viperian (p.262) ----------
  {
    id: 'viperian',
    name: 'Viperian',
    description: 'A serpent-bodied humanoid with fanged jaws, blending cunning intelligence with reptilian malice.',
    level: 3,
    ac: 13,
    hp: 13,
    attacks: [
      { name: 'Scimitar', bonus: 2, damage: '1d6', range: 'close', multiattack: 2 },
      { name: 'Javelin', bonus: 2, damage: '1d4', range: 'far' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 12, DEX: 12, CON: 10, INT: 10, WIS: 12, CHA: 10 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 223. Viperian Ophid (p.262) ----------
  {
    id: 'viperian-ophid',
    name: 'Viperian Ophid',
    description: 'A serpentfolk warrior with cold reptilian cunning and a venomous blade arm.',
    level: 6,
    ac: 14,
    hp: 28,
    attacks: [
      { name: 'Falchion', bonus: 5, damage: '1d10', range: 'close', multiattack: 3 },
      { name: 'Longbow', bonus: 3, damage: '1d8', range: 'far', multiattack: 2 },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 18, DEX: 14, CON: 12, INT: 12, WIS: 12, CHA: 12 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 224. Viperian Wizard (p.262) ----------
  {
    id: 'viperian-wizard',
    name: 'Viperian Wizard',
    description: 'A serpentfolk sorcerer who wields venomous magic and dark rituals passed down through cold-blooded generations.',
    level: 8,
    ac: 13,
    hp: 37,
    attacks: [
      { name: 'Dagger', bonus: 2, damage: '1d4', range: 'near' },
      { name: 'Spell +5', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 10, DEX: 12, CON: 10, INT: 16, WIS: 12, CHA: 12 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 225. Void Spawn (p.241) ----------
  {
    id: 'void-spawn',
    name: 'Void Spawn',
    description: 'A writhing aberration pulled from the spaces between stars, radiating wrongness that warps the mind.',
    level: 7,
    ac: 13,
    hp: 34,
    attacks: [
      { name: 'Scythe', bonus: 6, damage: '1d10', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near', fly: 'near' },
    stats: { STR: 18, DEX: 12, CON: 16, INT: 10, WIS: 12, CHA: 8 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['outsider'],
  },

  // ---------- 226. Void Spider (p.241) ----------
  {
    id: 'void-spider',
    name: 'Void Spider',
    description: 'An arachnid woven from the fabric of nothingness, its bite unravels the threads of reality.',
    level: 5,
    ac: 13,
    hp: 23,
    attacks: [
      { name: 'Bite', bonus: 4, damage: '1d8', range: 'close', multiattack: 2, specialEffect: 'poison' },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 16, DEX: 16, CON: 12, INT: 8, WIS: 12, CHA: 6 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['outsider'],
  },

  // ---------- 227. Vulture (p.263) ----------
  {
    id: 'vulture',
    name: 'Vulture',
    description: 'A bald-headed carrion bird that circles battlefields, waiting for the dying to stop moving.',
    level: 1,
    ac: 10,
    hp: 5,
    attacks: [
      { name: 'Tear', bonus: 1, damage: '1d4', range: 'close' },
    ],
    movement: { normal: 'near', fly: 'near' },
    stats: { STR: 12, DEX: 10, CON: 12, INT: 4, WIS: 12, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal'],
  },

  // ---------- 228. Wasp, Giant (p.263) ----------
  {
    id: 'wasp-giant',
    name: 'Wasp, Giant',
    description: 'A horse-sized insect with iridescent wings and a stinger that can pierce plate armor.',
    level: 2,
    ac: 13,
    hp: 9,
    attacks: [
      { name: 'Sting', bonus: 3, damage: '1d6', range: 'close', specialEffect: 'venom' },
    ],
    movement: { normal: 'near', fly: 'near' },
    stats: { STR: 12, DEX: 16, CON: 10, INT: 4, WIS: 10, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['insect', 'giant'],
  },

  // ---------- 229. Wererat (p.263) ----------
  {
    id: 'wererat',
    name: 'Wererat',
    description: 'A shifty lycanthrope that alternates between human and rat form, lurking in sewers and thieves\\\' guilds.',
    level: 3,
    ac: 13,
    acSource: 'leather',
    hp: 14,
    attacks: [
      { name: 'Bite', bonus: 2, damage: '1d6', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 12, DEX: 14, CON: 12, INT: 8, WIS: 12, CHA: 8 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 230. Werewolf (p.263) ----------
  {
    id: 'werewolf',
    name: 'Werewolf',
    description: 'A cursed lycanthrope that transforms into a savage wolf-human hybrid under the full moon.',
    level: 4,
    ac: 12,
    hp: 20,
    attacks: [
      { name: 'Rend', bonus: 3, damage: '1d6', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near', double: true },
    stats: { STR: 16, DEX: 14, CON: 14, INT: 10, WIS: 12, CHA: 10 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['humanoid'],
  },

  // ---------- 231. Wight (p.263) ----------
  {
    id: 'wight',
    name: 'Wight',
    description: 'An armored undead warrior sustained by hatred, whose touch drains the life from the living.',
    level: 3,
    ac: 14,
    acSource: 'chainmail',
    hp: 15,
    attacks: [
      { name: 'Bastard Sword', bonus: 3, damage: '1d10', range: 'close' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 16, DEX: 12, CON: 14, INT: 12, WIS: 10, CHA: 16 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['undead'],
  },

  // ---------- 232. Will-o'-wisp (p.264) ----------
  {
    id: 'will-o-wisp',
    name: 'Will-o\'-wisp',
    description: 'A flickering ball of pale light that lures travelers into bogs and feeds on their dying breaths.',
    level: 2,
    ac: 13,
    hp: 10,
    attacks: [
      { name: 'Life Drain +3', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near', fly: 'near' },
    stats: { STR: 4, DEX: 16, CON: 12, INT: 8, WIS: 8, CHA: 6 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['undead'],
  },

  // ---------- 233. Wolf (p.264) ----------
  {
    id: 'wolf',
    name: 'Wolf',
    description: 'A lean gray predator that hunts in packs, circling prey with eerie coordination.',
    level: 2,
    ac: 12,
    hp: 10,
    attacks: [
      { name: 'Bite', bonus: 2, damage: '1d6', range: 'close' },
    ],
    movement: { normal: 'near', double: true },
    stats: { STR: 14, DEX: 14, CON: 12, INT: 6, WIS: 12, CHA: 10 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal'],
  },

  // ---------- 234. Wolf, Dire (p.264) ----------
  {
    id: 'wolf-dire',
    name: 'Wolf, Dire',
    description: 'A prehistoric wolf of immense size, intelligent enough to coordinate pack ambushes.',
    level: 4,
    ac: 12,
    hp: 19,
    attacks: [
      { name: 'Bite', bonus: 4, damage: '1d8', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near', double: true },
    stats: { STR: 16, DEX: 14, CON: 12, INT: 8, WIS: 12, CHA: 10 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['animal', 'dire'],
  },

  // ---------- 235. Wolf, Winter (p.264) ----------
  {
    id: 'wolf-winter',
    name: 'Wolf, Winter',
    description: 'A pale predator born of frozen wastelands whose breath carries the killing cold of the deep north.',
    level: 5,
    ac: 12,
    hp: 23,
    attacks: [
      { name: 'Bite', bonus: 4, damage: '1d6', range: 'close', multiattack: 2 },
      { name: 'Frost Breath', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near', double: true },
    stats: { STR: 16, DEX: 14, CON: 12, INT: 10, WIS: 12, CHA: 10 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['animal'],
  },

  // ---------- 236. Worg (p.265) ----------
  {
    id: 'worg',
    name: 'Worg',
    description: 'A malevolent, oversized wolf with a cruel intelligence, often ridden by goblins.',
    level: 3,
    ac: 11,
    hp: 14,
    attacks: [
      { name: 'Bite', bonus: 3, damage: '1d6', range: 'close' },
    ],
    movement: { normal: 'near', double: true },
    stats: { STR: 14, DEX: 12, CON: 12, INT: 6, WIS: 12, CHA: 6 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['monstrosity'],
  },

  // ---------- 237. Wraith (p.265) ----------
  {
    id: 'wraith',
    name: 'Wraith',
    description: 'A hateful spirit of pure malice, draining the life force of the living with its freezing touch.',
    level: 8,
    ac: 14,
    hp: 36,
    attacks: [
      { name: 'Death Touch', bonus: 6, damage: '1d10', range: 'close', multiattack: 3, specialEffect: 'life drain' },
    ],
    movement: { normal: 'near', fly: 'near' },
    stats: { STR: 3, DEX: 18, CON: 10, INT: 10, WIS: 10, CHA: 16 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['undead'],
  },

  // ---------- 238. Wyvern (p.265) ----------
  {
    id: 'wyvern',
    name: 'Wyvern',
    description: 'A two-legged dragon cousin with a venomous barbed tail and a shriek that echoes across mountain valleys.',
    level: 8,
    ac: 15,
    hp: 37,
    attacks: [
      { name: 'Rend', bonus: 6, damage: '1d8', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near', double: true, fly: 'near' },
    stats: { STR: 18, DEX: 14, CON: 12, INT: 4, WIS: 12, CHA: 4 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: ['dragon'],
  },

  // ---------- 239. Zombie (p.265) ----------
  {
    id: 'zombie',
    name: 'Zombie',
    description: 'A shambling corpse driven by necromantic hunger, slow but relentless.',
    level: 2,
    ac: 8,
    hp: 11,
    attacks: [
      { name: 'Slam', bonus: 2, damage: '1d6', range: 'close' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 14, DEX: 6, CON: 14, INT: 6, WIS: 6, CHA: 4 },
    alignment: 'chaotic',
    abilities: [],
    checksMorale: true,
    tags: ['undead'],
  },

  // ---------- Variant entries not in the canonical bestiary (kept for backward compatibility) ----------
  {
    id: 'basilisk-hatchling',
    name: 'Basilisk Hatchling',
    description: 'A juvenile eight-legged reptile whose petrifying gaze has not yet fully developed.',
    level: 1,
    ac: 13,
    hp: 6,
    attacks: [{ name: 'Attack', bonus: 1, damage: '1d4', range: 'close' }],
    movement: { normal: 'near' },
    stats: { STR: 12, DEX: 10, CON: 14, INT: 4, WIS: 12, CHA: 6 },
    alignment: 'neutral',
    abilities: [],
    checksMorale: true,
    tags: [],
  },
  {
    id: 'elemental-air-lesser',
    name: 'Elemental, Air (Lesser)',
    description: 'A howling vortex of wind given malevolent purpose, tearing at all in its path.',
    level: 6,
    ac: 16,
    hp: 29,
    attacks: [
      { name: 'Slam', bonus: 7, damage: '2d6', range: 'close', multiattack: 3 },
      { name: 'Whirlwind', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near', double: true, fly: 'near' },
    stats: { STR: 16, DEX: 20, CON: 14, INT: 6, WIS: 12, CHA: 6 },
    alignment: 'neutral',
    abilities: [
      { name: 'Whirlwind', description: 'Alternative to its slam multiattack. The elemental sweeps creatures within close range up into a swirling vortex; each must pass DC 15 STR or be flung up to near distance and knocked prone.' },
    ],
    checksMorale: true,
    tags: ['elemental'],
  },
  {
    id: 'elemental-earth-lesser',
    name: 'Elemental, Earth (Lesser)',
    description: 'A grinding mass of stone and soil that shambles forward with the patience of bedrock.',
    level: 6,
    ac: 17,
    hp: 31,
    attacks: [
      { name: 'Slam', bonus: 7, damage: '2d8', range: 'close', multiattack: 3 },
      { name: 'Avalanche', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near', burrow: 'near' },
    stats: { STR: 20, DEX: 10, CON: 18, INT: 6, WIS: 12, CHA: 6 },
    alignment: 'neutral',
    abilities: [
      { name: 'Avalanche', description: 'Alternative to its slam multiattack. The elemental crashes a wave of stone outward; all creatures within near must pass DC 15 STR or be knocked prone and buried under rubble until they spend a turn digging out.' },
    ],
    checksMorale: true,
    tags: ['elemental'],
  },
  {
    id: 'elemental-fire-lesser',
    name: 'Elemental, Fire (Lesser)',
    description: 'A roiling column of living flame that hungers to consume everything it touches.',
    level: 6,
    ac: 15,
    hp: 30,
    attacks: [
      { name: 'Slam', bonus: 6, damage: '2d10', range: 'close', multiattack: 3 },
      { name: 'Inferno', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near', fly: 'near' },
    stats: { STR: 18, DEX: 16, CON: 16, INT: 6, WIS: 12, CHA: 6 },
    alignment: 'neutral',
    abilities: [
      { name: 'Inferno', description: 'Alternative to its slam multiattack. The elemental erupts in a near-radius burst of flame; all creatures in range take 4d10 fire damage, DC 15 DEX check for half.' },
    ],
    checksMorale: true,
    tags: ['elemental'],
  },
  {
    id: 'elemental-water-lesser',
    name: 'Elemental, Water (Lesser)',
    description: 'A churning pillar of dark water that batters foes with the relentless force of a flood.',
    level: 6,
    ac: 15,
    hp: 29,
    attacks: [
      { name: 'Slam', bonus: 6, damage: '2d6', range: 'close', multiattack: 3 },
      { name: 'Whirlpool', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near', double: true, swim: 'near' },
    stats: { STR: 18, DEX: 14, CON: 14, INT: 6, WIS: 12, CHA: 6 },
    alignment: 'neutral',
    abilities: [
      { name: 'Whirlpool', description: 'Alternative to its slam multiattack. The elemental engulfs one creature within close range; target must pass DC 15 STR or be trapped, taking 2d8 bludgeoning each round until it succeeds on a STR check on its turn.' },
    ],
    checksMorale: true,
    tags: ['elemental'],
  },
  {
    id: 'elemental-air-greater',
    name: 'Elemental, Air (Greater)',
    description: 'A screaming cyclone of elemental fury, powerful enough to rip towers from their foundations.',
    level: 9,
    ac: 16,
    hp: 42,
    attacks: [
      { name: 'Slam', bonus: 7, damage: '3d6', range: 'close', multiattack: 3 },
      { name: 'Whirlwind', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near', double: true, fly: 'near' },
    stats: { STR: 16, DEX: 20, CON: 14, INT: 6, WIS: 12, CHA: 6 },
    alignment: 'neutral',
    abilities: [
      { name: 'Whirlwind', description: 'Alternative to its slam multiattack. The elemental sweeps creatures within close range up into a swirling vortex; each must pass DC 15 STR or be flung up to near distance and knocked prone.' },
    ],
    checksMorale: true,
    tags: ['elemental'],
  },
  {
    id: 'elemental-earth-greater',
    name: 'Elemental, Earth (Greater)',
    description: 'A mountain given wrathful life, shaking the ground with every ponderous, crushing step.',
    level: 9,
    ac: 17,
    hp: 44,
    attacks: [
      { name: 'Slam', bonus: 7, damage: '3d8', range: 'close', multiattack: 3 },
      { name: 'Avalanche', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near', burrow: 'near' },
    stats: { STR: 20, DEX: 10, CON: 18, INT: 6, WIS: 12, CHA: 6 },
    alignment: 'neutral',
    abilities: [
      { name: 'Avalanche', description: 'Alternative to its slam multiattack. The elemental crashes a wave of stone outward; all creatures within near must pass DC 15 STR or be knocked prone and buried under rubble until they spend a turn digging out.' },
    ],
    checksMorale: true,
    tags: ['elemental'],
  },
  {
    id: 'elemental-fire-greater',
    name: 'Elemental, Fire (Greater)',
    description: 'An inferno incarnate that melts stone beneath its stride and turns the air to shimmering agony.',
    level: 9,
    ac: 15,
    hp: 43,
    attacks: [
      { name: 'Slam', bonus: 6, damage: '3d10', range: 'close', multiattack: 3 },
      { name: 'Inferno', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near', fly: 'near' },
    stats: { STR: 18, DEX: 16, CON: 16, INT: 6, WIS: 12, CHA: 6 },
    alignment: 'neutral',
    abilities: [
      { name: 'Inferno', description: 'Alternative to its slam multiattack. The elemental erupts in a near-radius burst of flame; all creatures in range take 6d10 fire damage, DC 15 DEX check for half.' },
    ],
    checksMorale: true,
    tags: ['elemental'],
  },
  {
    id: 'elemental-water-greater',
    name: 'Elemental, Water (Greater)',
    description: 'A towering tidal wave with a will of its own, dragging all before it into the crushing depths.',
    level: 9,
    ac: 15,
    hp: 42,
    attacks: [
      { name: 'Slam', bonus: 6, damage: '3d6', range: 'close', multiattack: 3 },
      { name: 'Whirlpool', bonus: 0, damage: 'special', range: 'close', specialEffect: 'See ability description' },
    ],
    movement: { normal: 'near', double: true, swim: 'near' },
    stats: { STR: 18, DEX: 14, CON: 14, INT: 6, WIS: 12, CHA: 6 },
    alignment: 'neutral',
    abilities: [
      { name: 'Whirlpool', description: 'Alternative to its slam multiattack. The elemental engulfs one creature within close range; target must pass DC 15 STR or be trapped, taking 3d8 bludgeoning each round until it succeeds on a STR check on its turn.' },
    ],
    checksMorale: true,
    tags: ['elemental'],
  },
];
