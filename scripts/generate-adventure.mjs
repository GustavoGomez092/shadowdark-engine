#!/usr/bin/env node
/**
 * generate-adventure.mjs
 * Generates the "El Hueco de Aldric" sample adventure JSON
 * for the ShadowDark Engine.
 *
 * Usage:
 *   node scripts/generate-adventure.mjs > public/samples/sample-adventure.json
 */

// ─────────────────────────────────────────────────────
// Helper: create a dungeon room for the snapshot format
// ─────────────────────────────────────────────────────

function makeRoom(index, x, y, w, h, noteSymb, noteText) {
  return {
    x, y, w, h,
    originX: x + w / 2, originY: y + h / 2,
    axisX: 0, axisY: 1,
    width: w, depth: h, mirror: false,
    seed: index, round: false, columns: false, hidden: false,
    symm: 0, desc: null,
    enemy: null, loot: null, key: null, gate: null, event: null, enviro: null,
    props: [],
    note: { px: x + w / 2, py: y + h / 2, symb: noteSymb, text: noteText },
  };
}

// Helper: create a corridor room (no note, no features)
function makeCorridor(index, x, y, w, h) {
  return {
    x, y, w, h,
    originX: x + w / 2, originY: y + h / 2,
    axisX: 0, axisY: 1,
    width: w, depth: h, mirror: false,
    seed: index, round: false, columns: false, hidden: false,
    symm: 0, desc: null,
    enemy: null, loot: null, key: null, gate: null, event: null, enviro: null,
    props: [],
    note: null,
  };
}

// Helper: create a door between two rooms at a shared edge.
// Rooms MUST share exactly one wall (edge-to-edge) and overlap >= 3
// on the perpendicular axis.
function makeDoor(fromRoom, toRoom, fromIdx, toIdx, type = 0) {
  const fRight  = fromRoom.x + fromRoom.w;
  const fBottom = fromRoom.y + fromRoom.h;
  const tRight  = toRoom.x + toRoom.w;
  const tBottom = toRoom.y + toRoom.h;

  let doorX, doorY, dirX, dirY;

  if (fRight === toRoom.x) {
    // fromRoom is left of toRoom  (vertical shared wall at x = fRight)
    const overlapY1 = Math.max(fromRoom.y, toRoom.y);
    const overlapY2 = Math.min(fBottom, tBottom);
    doorX = fRight - 1;
    doorY = Math.floor((overlapY1 + overlapY2) / 2);
    dirX = 1; dirY = 0;
  } else if (tRight === fromRoom.x) {
    // toRoom is left of fromRoom  (vertical shared wall at x = tRight)
    const overlapY1 = Math.max(fromRoom.y, toRoom.y);
    const overlapY2 = Math.min(fBottom, tBottom);
    doorX = tRight - 1;
    doorY = Math.floor((overlapY1 + overlapY2) / 2);
    dirX = -1; dirY = 0;
  } else if (fBottom === toRoom.y) {
    // fromRoom is above toRoom  (horizontal shared wall at y = fBottom)
    const overlapX1 = Math.max(fromRoom.x, toRoom.x);
    const overlapX2 = Math.min(fRight, tRight);
    doorX = Math.floor((overlapX1 + overlapX2) / 2);
    doorY = fBottom - 1;
    dirX = 0; dirY = 1;
  } else if (tBottom === fromRoom.y) {
    // toRoom is above fromRoom  (horizontal shared wall at y = tBottom)
    const overlapX1 = Math.max(fromRoom.x, toRoom.x);
    const overlapX2 = Math.min(fRight, tRight);
    doorX = Math.floor((overlapX1 + overlapX2) / 2);
    doorY = tBottom - 1;
    dirX = 0; dirY = -1;
  } else {
    throw new Error(
      `Rooms ${fromIdx} and ${toIdx} do not share a wall edge. ` +
      `from=(${fromRoom.x},${fromRoom.y},${fromRoom.w},${fromRoom.h}) ` +
      `to=(${toRoom.x},${toRoom.y},${toRoom.w},${toRoom.h})`
    );
  }

  return { x: doorX, y: doorY, type, dirX, dirY, fromIdx, toIdx };
}

// Helper: wrap rooms/doors/story into a full dungeonData object
function makeDungeonData(seed, rooms, doors, storyName, storyHook) {
  return {
    seed,
    _snapshot: {
      rooms,
      doors,
      story: { name: storyName, hook: storyHook },
    },
    editorState: {
      noteOverrides: {},
      rotation: 0,
      palette: 'default',
      showGrid: true,
      showWater: true,
      showProps: true,
      showNotes: true,
      showSecrets: false,
      showTitle: true,
      bw: false,
    },
  };
}

// ─────────────────────────────────────────────────────
// MAP 1: El Hueco de la Campana (Ruinas Superiores)
// ─────────────────────────────────────────────────────

function generateMap1() {
  // Layout with corridor rooms bridging gaps between main rooms.
  // All connected pairs share a wall edge and overlap >= 3 on the perp axis.
  //
  //   [0] Room 1 "Vestíbulo"          x:8  y:0  w:5  h:4
  //        |
  //   [1] Corridor C1                 x:9  y:4  w:3  h:3
  //        |
  //   [2] Room 2 "Nave Llorosa"       x:4  y:7  w:13 h:8
  //    |              |              |
  //   [3] Room 3     [5] C3        [4] Room 4
  //   "Nichos"       south          "Sacristía"
  //    x:0 y:7       x:9 y:15      x:17 y:7
  //    w:4 h:8       w:3 h:3       w:6  h:6
  //                   |
  //   [6] Room 5 "Pozo Voces"        x:4  y:18 w:13 h:8
  //    |                          |
  //   [7] Corridor C4 (east)     [9] Corridor C5 (south)
  //    x:17 y:21 w:3 h:3         x:9  y:26 w:3  h:3
  //    |                          |
  //   [8] Room 6 "Pozo Sangre"   [10] Room 7 "Descenso"
  //    x:20 y:20 w:5 h:5          x:9  y:29 w:3  h:4

  const rooms = [
    /* 0  */ makeRoom(0,   8,  0,  5,  4, '1', 'Vestíbulo de la Puerta'),
    /* 1  */ makeCorridor(1, 9,  4,  3,  3),
    /* 2  */ makeRoom(2,   4,  7, 13,  8, '2', 'La Nave Llorosa'),
    /* 3  */ makeRoom(3,   0,  7,  4,  8, '3', 'Los Nichos de Huesos'),
    /* 4  */ makeRoom(4,  17,  7,  6,  6, '4', 'La Sacristía Derrumbada'),
    /* 5  */ makeCorridor(5, 9, 15,  3,  3),
    /* 6  */ makeRoom(6,   4, 18, 13,  8, '5', 'El Pozo de las Voces'),
    /* 7  */ makeCorridor(7, 17, 21, 3,  3),
    /* 8  */ makeRoom(8,  20, 20,  5,  5, '6', 'El Pozo Sanguíneo'),
    /* 9  */ makeCorridor(9, 9, 26,  3,  3),
    /* 10 */ makeRoom(10,  9, 29,  3,  4, '7', 'El Pozo de Descenso'),
  ];

  const doors = [
    makeDoor(rooms[0],  rooms[1],   0,  1, 0),  // Room 1 → C1
    makeDoor(rooms[1],  rooms[2],   1,  2, 0),  // C1 → Room 2
    makeDoor(rooms[2],  rooms[3],   2,  3, 0),  // Room 2 → Room 3 (west)
    makeDoor(rooms[2],  rooms[4],   2,  4, 0),  // Room 2 → Room 4 (east)
    makeDoor(rooms[2],  rooms[5],   2,  5, 0),  // Room 2 → C3 (south)
    makeDoor(rooms[5],  rooms[6],   5,  6, 0),  // C3 → Room 5
    makeDoor(rooms[6],  rooms[7],   6,  7, 0),  // Room 5 → C4 (east)
    makeDoor(rooms[7],  rooms[8],   7,  8, 0),  // C4 → Room 6
    makeDoor(rooms[6],  rooms[9],   6,  9, 0),  // Room 5 → C5 (south)
    makeDoor(rooms[9],  rooms[10],  9, 10, 0),  // C5 → Room 7
  ];

  const dungeonData = makeDungeonData(
    42001,
    rooms,
    doors,
    'El Hueco de la Campana — Ruinas Superiores',
    'El nivel superior de las ruinas bajo Ashenveil. Un antiguo monasterio convertido en guarida de aberraciones no-muertas.',
  );

  return {
    id: 'map-1',
    name: 'El Hueco de la Campana — Ruinas Superiores',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    width: 30,
    height: 35,
    cellSize: 32,
    layers: [],
    labels: [],
    markers: [],
    dungeonData,
  };
}

// ─────────────────────────────────────────────────────
// MAP 2: Las Criptas Hundidas (Nivel Inferior)
// ─────────────────────────────────────────────────────

function generateMap2() {
  // Layout with corridor rooms. Room 10 is taller (h:9) so it
  // shares a wall with Room 12 at y=17.
  //
  //   [0] Room 8 "Galería Ahogada"   x:6  y:0  w:9  h:5
  //        |
  //   [1] Corridor C6                x:9  y:5  w:3  h:3
  //        |
  //   [2] Room 9 "Bóvedas"           x:4  y:8  w:11 h:6
  //    |              |
  //   [4] C7 south   [3] Room 10 "Cirujano"  x:15 y:8 w:7 h:9
  //    x:9 y:14       |
  //    w:3 h:3        | (secret door south at y=17)
  //    |              |
  //   [5] Room 11    [6] Room 12 "Antecámara" x:15 y:17 w:5 h:5
  //   "Puente"            |
  //    x:5 y:17      (secret door between 11↔12 at x=15)
  //    w:10 h:5
  //        |
  //   [7] Corridor C8                x:9  y:22 w:3  h:3
  //        |
  //   [8] Room 13 "Trono"            x:3  y:25 w:15 h:8

  const rooms = [
    /* 0 */ makeRoom(0,   6,  0,  9,  5, '8', 'La Galería Ahogada'),
    /* 1 */ makeCorridor(1, 9,  5,  3,  3),
    /* 2 */ makeRoom(2,   4,  8, 11,  6, '9', 'Las Bóvedas de Médula'),
    /* 3 */ makeRoom(3,  15,  8,  7,  9, '10', 'El Hueco del Cirujano'),
    /* 4 */ makeCorridor(4, 9, 14,  3,  3),
    /* 5 */ makeRoom(5,   5, 17, 10,  5, '11', 'El Puente del Osario'),
    /* 6 */ makeRoom(6,  15, 17,  5,  5, '12', 'La Antecámara Sellada'),
    /* 7 */ makeCorridor(7, 9, 22,  3,  3),
    /* 8 */ makeRoom(8,   3, 25, 15,  8, '13', 'El Trono de los Ecos'),
  ];

  const doors = [
    makeDoor(rooms[0], rooms[1], 0, 1, 0),  // Room 8 → C6
    makeDoor(rooms[1], rooms[2], 1, 2, 0),  // C6 → Room 9
    makeDoor(rooms[2], rooms[3], 2, 3, 0),  // Room 9 → Room 10 (east, normal)
    makeDoor(rooms[2], rooms[4], 2, 4, 0),  // Room 9 → C7 (south)
    makeDoor(rooms[4], rooms[5], 4, 5, 0),  // C7 → Room 11
    makeDoor(rooms[3], rooms[6], 3, 6, 2),  // Room 10 → Room 12 (secret, south)
    makeDoor(rooms[5], rooms[6], 5, 6, 2),  // Room 11 → Room 12 (secret, east)
    makeDoor(rooms[5], rooms[7], 5, 7, 0),  // Room 11 → C8 (south)
    makeDoor(rooms[7], rooms[8], 7, 8, 0),  // C8 → Room 13
  ];

  const dungeonData = makeDungeonData(
    42002,
    rooms,
    doors,
    'Las Criptas Hundidas — Nivel Inferior',
    'El nivel profundo de las criptas. Aquí Aldric Voss realiza sus rituales de Vaciado en busca de devolver la vida a su hija Sera.',
  );

  return {
    id: 'map-2',
    name: 'Las Criptas Hundidas — Nivel Inferior',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    width: 30,
    height: 35,
    cellSize: 32,
    layers: [],
    labels: [],
    markers: [],
    dungeonData,
  };
}

// ─────────────────────────────────────────────────────
// MAP 3: Ashenveil — Ciudad
// ─────────────────────────────────────────────────────

function generateMap3() {
  // City map — buildings connected by road (corridor) rooms.
  //
  //   [0] Room B "Sala Prefecto"      x:5  y:0  w:5  h:4
  //        |
  //   [1] Road R1                     x:6  y:4  w:3  h:3
  //        |
  //   [2] Room D "Posada"             x:3  y:7  w:7  h:5
  //    |                       |
  //   [3] Road R2 (east)      [5] Road R3 (south)
  //    x:10 y:9 w:3 h:3       x:6  y:12 w:3  h:3
  //    |                       |
  //   [4] Room C "Mercado"    [6] Room F "Torre"
  //    x:13 y:7 w:6 h:5       x:5  y:15 w:5  h:5
  //    |                       |
  //   [7] Road R4 (south)     [9] Road R5 (south)
  //    x:14 y:12 w:3 h:3      x:6  y:20 w:3  h:3
  //    |                       |
  //   [8] Room E "Guardia"    [10] Room I "Puerta"
  //    x:13 y:15 w:6 h:4      x:5  y:23 w:6  h:4

  const rooms = [
    /* 0  */ makeRoom(0,   5,  0,  5,  4, 'B', 'Sala del Prefecto'),
    /* 1  */ makeCorridor(1, 6,  4,  3,  3),
    /* 2  */ makeRoom(2,   3,  7,  7,  5, 'D', 'Posada del Canal Negro'),
    /* 3  */ makeCorridor(3, 10, 9,  3,  3),
    /* 4  */ makeRoom(4,  13,  7,  6,  5, 'C', 'Mercado Hueco de Quen'),
    /* 5  */ makeCorridor(5, 6, 12,  3,  3),
    /* 6  */ makeRoom(6,   5, 15,  5,  5, 'F', 'Torre de la Campana'),
    /* 7  */ makeCorridor(7, 14, 12, 3,  3),
    /* 8  */ makeRoom(8,  13, 15,  6,  4, 'E', 'Puesto de Guardia'),
    /* 9  */ makeCorridor(9, 6, 20,  3,  3),
    /* 10 */ makeRoom(10,  5, 23,  6,  4, 'I', 'Puerta del Belltallow'),
  ];

  const doors = [
    makeDoor(rooms[0],  rooms[1],   0,  1, 0),  // Prefecto → R1
    makeDoor(rooms[1],  rooms[2],   1,  2, 0),  // R1 → Posada
    makeDoor(rooms[2],  rooms[3],   2,  3, 0),  // Posada → R2 (east)
    makeDoor(rooms[3],  rooms[4],   3,  4, 0),  // R2 → Mercado
    makeDoor(rooms[2],  rooms[5],   2,  5, 0),  // Posada → R3 (south)
    makeDoor(rooms[5],  rooms[6],   5,  6, 0),  // R3 → Torre
    makeDoor(rooms[4],  rooms[7],   4,  7, 0),  // Mercado → R4 (south)
    makeDoor(rooms[7],  rooms[8],   7,  8, 0),  // R4 → Guardia
    makeDoor(rooms[6],  rooms[9],   6,  9, 0),  // Torre → R5 (south)
    makeDoor(rooms[9],  rooms[10],  9, 10, 0),  // R5 → Puerta
  ];

  const dungeonData = makeDungeonData(
    42003,
    rooms,
    doors,
    'Ashenveil — Ciudad',
    'La pequeña ciudad amurallada de Ashenveil, construida sobre las ruinas del monasterio de Belltallow. Un canal de aguas oscuras la atraviesa.',
  );

  return {
    id: 'map-3',
    name: 'Ashenveil — Ciudad',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    width: 25,
    height: 30,
    cellSize: 32,
    layers: [],
    labels: [],
    markers: [],
    dungeonData,
  };
}

// ─────────────────────────────────────────────────────
// MONSTERS
// ─────────────────────────────────────────────────────

const monsters = [
  {
    id: 'monster-masa-balbuciente',
    name: 'Masa Balbuciente',
    description: 'Un amasijo húmedo de carne y musgo que balbuce sin cesar. Sus extremidades blandas terminan en garras de hueso expuesto.',
    level: 1,
    ac: 11,
    hp: 8,
    attacks: [
      { name: 'Garra', bonus: 2, damage: '1d6', range: 'close' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 12, DEX: 8, CON: 14, INT: 2, WIS: 6, CHA: 3 },
    alignment: 'chaotic',
    abilities: [
      {
        name: 'Estallido Resonante',
        description: 'Cuando la Masa muere, emite un grito que obliga a todas las criaturas en rango cercano a tirar SAB CD 11 o quedar aturdidas 1 ronda.',
      },
      {
        name: 'Relleno de Musgo',
        description: 'La Masa es parcialmente inmune al daño contundente: recibe la mitad de daño de ataques contundentes.',
      },
    ],
    checksMorale: false,
    tags: ['aberración', 'no-muerto'],
  },
  {
    id: 'monster-arana-huesos',
    name: 'Araña de Huesos',
    description: 'Un ensamblaje arácnido de fémures, costillas y cráneos, que trepa por los techos con un repiqueteo seco.',
    level: 2,
    ac: 13,
    hp: 12,
    attacks: [
      { name: 'Mordisco', bonus: 3, damage: '1d4', range: 'close', multiattack: 2 },
    ],
    movement: { normal: 'near', climb: 'near' },
    stats: { STR: 10, DEX: 14, CON: 10, INT: 3, WIS: 10, CHA: 2 },
    alignment: 'chaotic',
    abilities: [
      {
        name: 'Ataque desde Arriba',
        description: 'Si la Araña de Huesos ataca desde el techo, el objetivo debe tirar DES CD 12 o queda derribado.',
      },
      {
        name: 'Muchas Articulaciones',
        description: 'La Araña de Huesos puede comprimir su cuerpo para pasar por espacios de medio metro. No puede ser agarrada.',
      },
    ],
    checksMorale: false,
    tags: ['constructo', 'no-muerto'],
  },
  {
    id: 'monster-guardian-hueco',
    name: 'Guardián Hueco',
    description: 'Una figura humanoide de piel curtida y ojos vacíos, que avanza con movimientos lentos pero implacables. Lleva frascos de vidrio atados al cuerpo.',
    level: 3,
    ac: 14,
    hp: 22,
    attacks: [
      { name: 'Abrazo', bonus: 4, damage: '1d8', range: 'close', specialEffect: 'En impacto: el objetivo queda agarrado (FUE CD 14 para liberarse).' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 16, DEX: 8, CON: 14, INT: 4, WIS: 8, CHA: 3 },
    alignment: 'chaotic',
    abilities: [
      {
        name: 'Frascos de Vidrio',
        description: 'Cuando el Guardián recibe daño cortante o perforante, un frasco se rompe y libera gas tóxico en rango cercano. Todos en el área tiran CON CD 12 o sufren 1d4 de daño de veneno.',
      },
      {
        name: 'Agarrado',
        description: 'Un objetivo agarrado por el Guardián sufre 1d4 de daño necrótico automático al inicio de cada turno del Guardián.',
      },
    ],
    checksMorale: false,
    tags: ['no-muerto', 'constructo'],
  },
  {
    id: 'monster-eco-aldric',
    name: 'El Eco de Aldric',
    description: 'Una sombra translúcida que imita la silueta de Aldric Voss en vida: un hombre delgado con una flauta de hueso en la mano. Susurra fragmentos de canciones de cuna.',
    level: 4,
    ac: 13,
    hp: 30,
    attacks: [
      { name: 'Garra Espectral', bonus: 4, damage: '1d8', range: 'close' },
      { name: 'Elegía', bonus: 4, damage: '1d6', range: 'near', specialEffect: 'Daño psíquico. SAB CD 13 o el objetivo queda paralizado hasta el final de su siguiente turno.' },
    ],
    movement: { normal: 'near', fly: 'near' },
    stats: { STR: 6, DEX: 14, CON: 12, INT: 12, WIS: 14, CHA: 16 },
    alignment: 'chaotic',
    abilities: [
      {
        name: 'Elegía',
        description: 'El Eco toca una melodía fantasmal. Todos los enemigos en rango cercano deben tirar SAB CD 13 o quedan paralizados hasta el final de su siguiente turno. Usa esta habilidad en lugar de atacar.',
      },
      {
        name: 'No Es Él',
        description: 'El Eco no es Aldric. Es un residuo psíquico. Si es destruido, susurra "no soy yo… sigue bajando" antes de desvanecerse.',
      },
    ],
    checksMorale: false,
    tags: ['no-muerto', 'incorpóreo'],
  },
  {
    id: 'monster-aldric-voss',
    name: 'Aldric Voss',
    description: 'Un hombre demacrado y cadavérico sentado en un trono de huesos. Su piel es gris ceniza, y sus ojos brillan con una luz verde enfermiza. Sostiene una flauta hecha de la tibia de su hija Sera.',
    level: 6,
    ac: 12,
    hp: 45,
    attacks: [
      { name: 'Toque Necrótico', bonus: 5, damage: '1d10', range: 'close', specialEffect: 'Daño necrótico. El objetivo pierde 1 PG máximo hasta un descanso largo.' },
      { name: 'Acorde Ritual', bonus: 5, damage: '2d6', range: 'far', specialEffect: 'Daño psíquico en área. Todos los enemigos en rango lejano tiran SAB CD 14 o sufren el daño.' },
    ],
    movement: { normal: 'near' },
    stats: { STR: 8, DEX: 10, CON: 14, INT: 16, WIS: 14, CHA: 18 },
    alignment: 'chaotic',
    abilities: [
      {
        name: 'Acorde Ritual',
        description: 'Aldric toca su flauta de hueso. Todos los enemigos en la sala deben tirar SAB CD 14 o sufren 2d6 de daño psíquico. Usa esta habilidad cada 2 rondas.',
      },
      {
        name: 'Voz Cristalina',
        description: 'Aldric puede lanzar un grito supersónico como acción. Todas las fuentes de luz no mágicas en la sala se apagan.',
      },
      {
        name: 'Padre Afligido',
        description: 'Si alguien menciona a Sera o muestra el Colgante de Piedra Sangre, Aldric pierde su siguiente turno llorando. Solo funciona una vez.',
      },
      {
        name: 'Vasallo No-muerto',
        description: 'Al inicio del combate, Aldric invoca 1d4 Masas Balbucientes de los sarcófagos de la sala. Estas actúan en su turno.',
      },
    ],
    checksMorale: false,
    tags: ['no-muerto', 'jefe', 'humanoide'],
  },
];

// ─────────────────────────────────────────────────────
// GEAR (custom items)
// ─────────────────────────────────────────────────────

const gear = [
  {
    id: 'gear-testigo-duelo',
    name: 'Testigo de Duelo',
    category: 'gear',
    cost: 0,
    slots: 0,
    description: 'Un pequeño trozo de tela negra anudado. Los portadores del Testigo pueden sentir la presencia de no-muertos en rango cercano como un escalofrío en la nuca.',
  },
  {
    id: 'gear-colgante-piedra-sangre',
    name: 'Colgante de Piedra Sangre',
    category: 'gear',
    cost: 0,
    slots: 0,
    description: 'Un collar con una piedra roja oscura tallada en forma de campana. Perteneció a Sera, la hija de Aldric. Si se muestra ante Aldric, este pierde su siguiente turno.',
  },
  {
    id: 'gear-vela-hueca',
    name: 'Vela Hueca',
    category: 'light_source',
    cost: 0.8,
    slots: 1,
    description: 'Una vela de sebo mezclado con médula ósea. Arde con llama azulada durante 2 horas. Los no-muertos en rango cercano son visibles incluso si son invisibles o etéreos.',
    mechanics: [
      { type: 'light_source', value: 120, description: 'Llama azul, 2 horas. Revela no-muertos invisibles en rango cercano.' },
    ],
  },
  {
    id: 'gear-anillo-mortifero',
    name: 'Anillo del Mortífero',
    category: 'gear',
    cost: 20,
    slots: 0,
    description: 'Un anillo de hierro frío con un cráneo grabado. El portador tiene ventaja en tiradas de salvación contra efectos de miedo causados por no-muertos.',
    mechanics: [
      { type: 'advantage', description: 'Ventaja en salvaciones contra miedo de no-muertos.' },
    ],
  },
  {
    id: 'gear-aceite-medula',
    name: 'Aceite de Médula Ósea',
    category: 'consumable',
    cost: 0,
    slots: 1,
    description: 'Un frasco de aceite denso y amarillento. Al aplicar sobre un arma (acción), el siguiente golpe contra un no-muerto inflige +1d6 de daño radiante.',
    mechanics: [
      { type: 'damage', dieValue: '1d6', description: '+1d6 daño radiante contra no-muertos en el siguiente golpe.' },
    ],
  },
  {
    id: 'gear-tomo-vaciado',
    name: 'Tomo del Vaciado',
    category: 'gear',
    cost: 80,
    slots: 1,
    description: 'Un libro encuadernado en piel gris con páginas escritas en tinta de sangre. Contiene los rituales de Aldric Voss. Un lanzador de conjuros puede estudiarlo durante un descanso largo para aprender el conjuro "Hablar con los Muertos" como un conjuro de nivel 2. Si el lector falla una tirada de INT CD 14 al estudiar, sufre 1d6 de daño psíquico.',
  },
];

// ─────────────────────────────────────────────────────
// ADVENTURE ROOMS (13)
// ─────────────────────────────────────────────────────

const rooms = [
  {
    id: 'room-1',
    number: 1,
    name: 'Vestíbulo de la Puerta',
    description: 'Una sala rectangular con un techo abovedado de piedra ennegrecida. La puerta norte está cubierta de raíces secas. El aire huele a tierra mojada y algo más dulce: carne podrida. Dos antorchas apagadas flanquean una puerta doble al sur que conduce a un corredor oscuro.',
    gmNotes: 'Esta sala es la entrada principal a las ruinas. La puerta norte está trabada (FUE CD 10 para abrir). En las raíces secas hay un nido de 2 Masas Balbucientes que atacan si se molestan las raíces. Un registro cuidadoso (INT CD 12) revela un grabado en la pared: "Aquí yace el campanario de los que lloran".',
    monsterIds: ['monster-masa-balbuciente'],
    treasure: 'Entre las raíces: 12 mo, un cuchillo oxidado (daga, -1 al daño).',
    traps: [],
    connections: ['room-2'],
    mapId: 'map-1',
  },
  {
    id: 'room-2',
    number: 2,
    name: 'La Nave Llorosa',
    description: 'Una nave amplia de techo alto, con bancos de piedra a ambos lados. El suelo está cubierto de polvo y fragmentos de vitrales rotos. Al fondo, un altar vacío preside la sala. De las paredes cuelgan estandartes podridos con el símbolo de una campana. Se escucha un goteo constante y, de vez en cuando, lo que parece un sollozo lejano.',
    gmNotes: 'La nave era la capilla principal del antiguo campanario. Los sollozos provienen del Pozo de las Voces (Sala 5). El altar tiene una cavidad oculta (INT CD 13) que contiene el Colgante de Piedra Sangre. Hay puertas al oeste (Sala 3), al este (Sala 4) y un corredor al sur (Sala 5). 1d4 Arañas de Huesos acechan en el techo y atacan al grupo que pase por debajo.',
    monsterIds: ['monster-arana-huesos'],
    treasure: 'Cavidad del altar: Colgante de Piedra Sangre.',
    traps: [],
    connections: ['room-1', 'room-3', 'room-4', 'room-5'],
    mapId: 'map-1',
  },
  {
    id: 'room-3',
    number: 3,
    name: 'Los Nichos de Huesos',
    description: 'Las paredes están cubiertas de nichos funerarios abiertos, cada uno con un esqueleto envuelto en tela amarillenta. Algunos nichos están vacíos, con marcas de garras en la piedra. El suelo tiene una baldosa central ligeramente hundida.',
    gmNotes: 'Hay 24 nichos, de los cuales 6 están vacíos (sus ocupantes se convirtieron en Masas Balbucientes). La baldosa hundida en x:3,y:9 es una trampa de foso: el suelo se abre a un pozo de 3 metros con estacas. Uno de los nichos (INT CD 14) contiene un compartimento secreto con el Anillo del Mortífero y 30 mo.',
    monsterIds: [],
    treasure: 'Nicho secreto: Anillo del Mortífero, 30 mo.',
    traps: [
      {
        id: 'trap-3-foso',
        name: 'Trampa de Foso con Estacas',
        description: 'Una baldosa falsa cubre un pozo de 3 metros de profundidad con estacas de hueso en el fondo.',
        trigger: 'Pisar la baldosa central (x:3, y:9).',
        effect: 'El personaje cae 3 metros al pozo y es empalado por las estacas.',
        detectionDC: 13,
        disarmDC: 11,
        damage: '1d6 por caída + 1d4 por estacas',
      },
    ],
    connections: ['room-2'],
    mapId: 'map-1',
  },
  {
    id: 'room-4',
    number: 4,
    name: 'La Sacristía Derrumbada',
    description: 'La mitad oriental de esta sala se ha derrumbado, dejando expuesta una pared de roca natural cubierta de un musgo fosforescente verde. Armarios rotos y telas desgarradas cubren el suelo. Un olor agrio a productos químicos antiguos impregna el aire.',
    gmNotes: 'La sacristía era donde el clérigo guardaba sus implementos rituales. La mayoría está destruida, pero un registro (INT CD 12) revela 2 Velas Huecas intactas y un frasco de Aceite de Médula Ósea. El musgo fosforescente proporciona luz tenue. Un pasaje parcialmente bloqueado (FUE CD 13) lleva a un pequeño espacio donde hay un cofre con 45 mo y un pergamino ilegible.',
    monsterIds: [],
    treasure: '2 Velas Huecas, Aceite de Médula Ósea, cofre con 45 mo.',
    traps: [],
    connections: ['room-2'],
    mapId: 'map-1',
  },
  {
    id: 'room-5',
    number: 5,
    name: 'El Pozo de las Voces',
    description: 'Una cámara vasta con un pozo circular de agua negra en el centro. El agua burbujea suavemente y de ella surgen susurros incoherentes — fragmentos de oraciones, nombres, llantos de niños. La oscuridad del pozo parece infinita. Escaleras de piedra húmeda descienden junto al borde del pozo hacia las profundidades.',
    gmNotes: 'El pozo conecta con el nivel inferior (Sala 8, La Galería Ahogada). Las voces son residuos psíquicos de los rituales de Aldric. Cualquiera que escuche las voces durante más de 1 minuto debe tirar SAB CD 12 o sufrir 1d4 de daño psíquico. Las escaleras están resbaladizas (DES CD 10 o caer al agua). El agua tiene 5 metros de profundidad y está helada. Un Guardián Hueco patrulla el borde del pozo.',
    monsterIds: ['monster-guardian-hueco'],
    treasure: '',
    traps: [],
    connections: ['room-2', 'room-6', 'room-7', 'room-8'],
    mapId: 'map-1',
  },
  {
    id: 'room-6',
    number: 6,
    name: 'El Pozo Sanguíneo',
    description: 'Una sala lateral con un pozo más pequeño en el centro. El agua de este pozo es de un rojo oscuro y viscoso. Marcas de dedos ensangrentados cubren el borde de piedra. El aire es cálido y húmedo, con un olor metálico intenso.',
    gmNotes: 'El agua del pozo es una mezcla de sangre antigua y agua subterránea. No es venenosa, pero beber de ella causa náuseas (CON CD 11 o desventaja en tiradas durante 10 minutos). En el fondo del pozo (sumergirse, CON CD 13 para aguantar la respiración) hay un cofre de hierro sellado con 80 mo, 3 gemas de rubí (20 mo cada una) y un Testigo de Duelo.',
    monsterIds: [],
    treasure: 'Fondo del pozo: 80 mo, 3 rubíes (20 mo c/u), Testigo de Duelo.',
    traps: [],
    connections: ['room-5'],
    mapId: 'map-1',
  },
  {
    id: 'room-7',
    number: 7,
    name: 'El Pozo de Descenso',
    description: 'Una sala pequeña dominada por un agujero cuadrado en el centro. Escaleras de caracol talladas en la roca descienden en espiral hacia la oscuridad. Un viento frío y húmedo asciende desde abajo, trayendo consigo el sonido distante de agua corriente.',
    gmNotes: 'Las escaleras descienden 15 metros hasta el nivel inferior. La bajada toma 2 turnos de exploración. A mitad de camino hay un rellano donde 2 Arañas de Huesos han tendido una emboscada (las telarañas son de hilo óseo, DES CD 12 para no quedar atrapado). Este es un camino alternativo al nivel inferior que evita la galería inundada.',
    monsterIds: ['monster-arana-huesos'],
    treasure: '',
    traps: [],
    connections: ['room-5', 'room-9'],
    mapId: 'map-1',
  },
  {
    id: 'room-8',
    number: 8,
    name: 'La Galería Ahogada',
    description: 'Agua negra y helada cubre el suelo hasta la cintura. Columnas de piedra verdosa sobresalen del agua a intervalos regulares, cubiertas de algas y musgo. La luz de las antorchas se refleja en la superficie del agua creando sombras ondulantes en el techo bajo. Algo se mueve bajo la superficie.',
    gmNotes: 'Toda la galería está inundada (agua hasta la cintura, terreno difícil). Las columnas pueden usarse como apoyo. Hay 3 Masas Balbucientes sumergidas que atacan cuando el grupo llega al centro de la sala. El agua dificulta el combate: las armas de fuego y las tiradas de ataque cuerpo a cuerpo tienen desventaja mientras se esté en el agua. Las escaleras al norte suben al Pozo de las Voces (Sala 5).',
    monsterIds: ['monster-masa-balbuciente'],
    treasure: 'Bajo el agua, contra la pared este: bolsa impermeable con 25 mo y un mapa parcial del nivel inferior.',
    traps: [],
    connections: ['room-5', 'room-9'],
    mapId: 'map-2',
  },
  {
    id: 'room-9',
    number: 9,
    name: 'Las Bóvedas de Médula',
    description: 'Una cripta amplia con seis sarcófagos de piedra dispuestos en dos filas. Las tapas están parcialmente abiertas, revelando huesos amarillentos cubiertos de una sustancia aceitosa y brillante. El aire apesta a grasa rancia. Glifos luminosos parpadean en el umbral de la puerta sur.',
    gmNotes: 'Los sarcófagos contienen los restos de los primeros sujetos del Vaciado de Aldric. La sustancia aceitosa es Médula procesada — se puede recolectar 2 dosis de Aceite de Médula Ósea (INT CD 12 para extraer sin contaminar). La puerta sur tiene un glifo trampa que se activa al cruzar el umbral. Puerta al este hacia Sala 10.',
    monsterIds: [],
    treasure: '2 dosis de Aceite de Médula Ósea (si se extraen). Sarcófago 3: collar de plata (15 mo). Sarcófago 5: daga ceremonial (1d4, +1 contra no-muertos).',
    traps: [
      {
        id: 'trap-9-glifo',
        name: 'Glifo de Alarma Necrótica',
        description: 'Un glifo tallado en el suelo del umbral sur emite una onda de energía necrótica al ser pisado.',
        trigger: 'Cruzar el umbral de la puerta sur (y:14).',
        effect: 'Todos en rango cercano del glifo sufren daño necrótico y alertan a los Guardianes Huecos de la Sala 10.',
        detectionDC: 14,
        disarmDC: 15,
        damage: '2d6 necrótico',
      },
    ],
    connections: ['room-8', 'room-7', 'room-10'],
    mapId: 'map-2',
  },
  {
    id: 'room-10',
    number: 10,
    name: 'El Hueco del Cirujano',
    description: 'Una sala que hiede a formaldehído y carne podrida. Una mesa de operaciones de piedra ocupa el centro, cubierta de instrumentos quirúrgicos oxidados. Estanterías repletas de frascos con órganos conservados en líquido turbio cubren las paredes. En una jaula de hierro al fondo, una mujer herida suplica en voz baja. Cerca de ella, una figura pálida de ojos hundidos permanece inmóvil.',
    gmNotes: 'Esta era la sala de trabajo de Aldric. La mujer en la jaula es Mira Soln, una curandera capturada. La figura inmóvil es Kaelith, un no-muerto "voluntario" que sirve a Aldric pero mantiene parte de su consciencia. Kaelith no atacará a menos que el grupo amenace el trabajo de Aldric. Si se le convence (CAR CD 13), revelará la ubicación de la puerta secreta al sur (x:24, y:14) que lleva a la Sala 11. 2 Guardianes Huecos protegen la sala.',
    monsterIds: ['monster-guardian-hueco'],
    treasure: 'Mesa: instrumental quirúrgico (15 mo como lote). Estantería: 3 pociones de curación (1d6 PG). Frasco especial: Tomo del Vaciado (dentro de un compartimento oculto en la estantería, INT CD 14).',
    traps: [],
    connections: ['room-9', 'room-11'],
    mapId: 'map-2',
  },
  {
    id: 'room-11',
    number: 11,
    name: 'El Puente del Osario',
    description: 'Un puente de piedra estrecho cruza un abismo sin fondo. A ambos lados, la oscuridad se extiende hacia abajo hasta donde alcanza la vista. Los huesos de cientos de cuerpos han sido incrustados en las paredes del abismo, formando un mosaico macabro de calaveras que parecen observar a los que cruzan. El viento asciende desde las profundidades con un gemido constante.',
    gmNotes: 'El puente tiene 2 metros de ancho (1 casilla) y 5 metros de largo. Pasar sin problemas requiere DES CD 10. Si hay combate en el puente, los ataques fallidos por 5 o más hacen que el atacante deba tirar DES CD 12 o caer. Caer al abismo es muerte instantánea. Un Eco de Aldric aparece a mitad del puente y bloquea el paso. Hay una puerta secreta (INT CD 15) en la pared este a mitad del puente que lleva a la Antecámara Sellada (Sala 12).',
    monsterIds: ['monster-eco-aldric'],
    treasure: '',
    traps: [],
    connections: ['room-10', 'room-12', 'room-13'],
    mapId: 'map-2',
  },
  {
    id: 'room-12',
    number: 12,
    name: 'La Antecámara Sellada',
    description: 'Una sala pequeña y herméticamente sellada. El aire está viciado pero seco. En el centro hay un altar bajo con un cojín de terciopelo deteriorado sobre el cual descansa una flauta de hueso agrietada. Las paredes están cubiertas de escritura apretada en tinta roja — las confesiones de Aldric Voss.',
    gmNotes: 'Esta sala era el santuario privado de Aldric antes de su transformación final. La flauta es una réplica — la verdadera la tiene Aldric en la Sala 13. Sin embargo, esta flauta emite un tono que aturde a los no-muertos menores (las Masas Balbucientes huyen durante 1d4 rondas). Las confesiones en las paredes revelan la historia completa de Aldric y Sera: Sera murió de una enfermedad, Aldric enloqueció de dolor e intentó traerla de vuelta con nigromancia, el "Vaciado" fue su intento de transferir vida de los vivos a los muertos. Leer las confesiones toma 1 turno de exploración y otorga ventaja en la interacción social con Aldric.',
    monsterIds: [],
    treasure: 'Flauta de hueso réplica (funcional contra no-muertos menores, valor 30 mo). Detrás del altar: cofre con 60 mo y un anillo de sello con el emblema de la familia Voss (25 mo).',
    traps: [],
    connections: ['room-11'],
    mapId: 'map-2',
  },
  {
    id: 'room-13',
    number: 13,
    name: 'El Trono de los Ecos',
    description: 'Una cámara inmensa con un techo de catedral perdido en la penumbra. En el centro, un trono de huesos fusionados se alza sobre un estrado de tres escalones. Sentado en él, un hombre cadavérico de ojos verdes sostiene una flauta de hueso humano contra sus labios agrietados. A sus flancos, dos sarcófagos abiertos emanan un resplandor enfermizo. El aire vibra con una melodía baja y discordante que parece provenir de las paredes mismas.',
    gmNotes: 'Esta es la sala del jefe final. Aldric Voss está sentado en su trono. Los dos sarcófagos contienen: el izquierdo, el cuerpo preservado de Sera (su hija); el derecho, un sarcófago vacío preparado para un nuevo ritual. Al inicio del combate, Aldric invoca 1d4 Masas Balbucientes de grietas en las paredes. Aldric no ataca de inmediato — primero habla, explicando que "ya casi termina" y que Sera "volverá pronto". Si el grupo muestra el Colgante de Piedra Sangre, Aldric pierde su primer turno llorando. Si destruyen el sarcófago de Sera (CA 10, 15 PG), Aldric entra en furia (+2 a ataques, -2 a CA). Hay tres posibles finales: 1) Matar a Aldric, 2) Convencerle de parar (CAR CD 16, con ventaja si leyeron las confesiones), 3) Completar el ritual (consecuencias terribles). Victoria: el temblor cesa, los no-muertos caen.',
    monsterIds: ['monster-aldric-voss', 'monster-masa-balbuciente'],
    treasure: 'Trono: la Flauta de Hueso de Aldric (objeto mágico menor, permite lanzar "Hablar con los Muertos" 1/día). Sarcófago derecho: 120 mo, gema de ópalo negro (50 mo). Cuerpo de Aldric: Tomo del Vaciado (si no se encontró antes). Estrado: Testigo de Duelo.',
    traps: [],
    connections: ['room-11'],
    mapId: 'map-2',
  },
];

// ─────────────────────────────────────────────────────
// NPCs
// ─────────────────────────────────────────────────────

const npcs = [
  {
    id: 'npc-orvana',
    name: 'Orvana Drast',
    ancestry: 'human',
    role: 'Prefecta de Ashenveil',
    description: 'Una mujer de unos cincuenta años con cabello canoso recogido en un moño severo. Viste una capa de lana gruesa sobre una armadura de cuero desgastada. Sus ojos grises son penetrantes y cansados. Es la autoridad máxima de Ashenveil y quien contrata a los aventureros.',
    personality: 'Directa y pragmática. No tiene paciencia para tonterías ni heroísmos gratuitos. Habla poco pero con precisión. Oculta su miedo detrás de la autoridad. Lleva semanas sin dormir bien por los temblores y las desapariciones.',
    portraitPrompt: 'Human woman, 50s, gray hair in severe bun, gray eyes, weathered leather armor, wool cloak, stern expression, fantasy RPG portrait',
  },
  {
    id: 'npc-quen',
    name: 'Quen Halvash',
    ancestry: 'halfling',
    role: 'Mercader del Mercado Hueco',
    description: 'Un halfling regordete con una sonrisa permanente que no llega a sus ojos. Lleva un delantal lleno de bolsillos y un sombrero de ala ancha. Su tienda improvisada está repleta de objetos dispares: desde velas hasta dagas, pasando por frascos de dudosa procedencia.',
    personality: 'Jovial y charlatán, pero astuto como un zorro. Cobra precios justos a los locales pero intenta sacar más a los forasteros. Tiene información sobre las ruinas que compartirá si se le compra suficiente mercancía o se le convence (CAR CD 11). Conoce el rumor de que Aldric era un músico antes de volverse loco.',
    portraitPrompt: 'Halfling male, plump, wide-brimmed hat, apron with pockets, shrewd smile, market stall background, fantasy RPG portrait',
  },
  {
    id: 'npc-mira',
    name: 'Mira Soln',
    ancestry: 'human',
    role: 'Curandera capturada',
    description: 'Una mujer joven con el cabello oscuro enmarañado y la piel pálida por semanas de cautiverio. Viste una túnica de curandera hecha jirones. Tiene marcas de agujas en los brazos — Aldric ha estado experimentando con ella. Sus ojos castaños están llenos de terror pero también de una determinación feroz.',
    personality: 'Asustada pero valiente. Si es liberada, insiste en ayudar al grupo con sus conocimientos de herbolaria (puede curar 1d6+2 PG a cada miembro del grupo una vez). Sabe que Aldric habla con alguien llamada "Sera" y que el ritual requiere "más médula". Suplicará al grupo que detenga a Aldric antes de que sea demasiado tarde.',
    portraitPrompt: 'Human woman, young, tangled dark hair, pale skin, torn healer robes, needle marks on arms, brown eyes, captive, fantasy RPG portrait',
  },
  {
    id: 'npc-kaelith',
    name: 'Kaelith',
    ancestry: 'human',
    role: 'No-muerto voluntario',
    description: 'Un hombre alto y delgado con la piel grisácea y los ojos hundidos pero sorprendentemente lucidos. Viste ropas de sacerdote remendadas. Se mueve con una rigidez antinatural pero habla con coherencia. Es uno de los primeros sujetos del Vaciado que conservó parte de su consciencia.',
    personality: 'Melancólico y resignado. Sirve a Aldric no por lealtad sino porque no tiene adónde ir — el mundo exterior lo trataría como un monstruo. Si el grupo le ofrece una alternativa (santuario, curación, propósito), puede aliarse con ellos. Conoce el diseño de las criptas y puede revelar la puerta secreta a la Sala 11.',
    portraitPrompt: 'Human male, tall, thin, grayish skin, sunken but lucid eyes, patched priest robes, undead but sentient, melancholic expression, fantasy RPG portrait',
  },
  {
    id: 'npc-aldric',
    name: 'Aldric Voss',
    ancestry: 'human',
    role: 'Nigromante, villano principal',
    description: 'Un hombre que fue apuesto en vida, ahora consumido por la no-muerte y la obsesión. Piel gris ceniza, ojos que brillan con fuego verde, ropas de noble raídas sobre un cuerpo esquelético. Sostiene una flauta tallada de un hueso humano — la tibia de su hija Sera.',
    personality: 'Trágico y aterrador a partes iguales. No se ve a sí mismo como un villano: cree que está a punto de devolver la vida a Sera y que todos los sacrificios han valido la pena. Habla con una calma inquietante, como un profesor explicando un experimento. Si se le confronta con la realidad de sus actos, oscila entre la furia y el llanto. En el fondo, una parte de él sabe que Sera no volverá.',
    stats: {
      id: 'monster-aldric-voss',
      name: 'Aldric Voss',
      level: 6,
      ac: 12,
      hp: 45,
      attacks: [
        { name: 'Toque Necrótico', bonus: 5, damage: '1d10', range: 'close' },
        { name: 'Acorde Ritual', bonus: 5, damage: '2d6', range: 'far' },
      ],
      movement: { normal: 'near' },
      stats: { STR: 8, DEX: 10, CON: 14, INT: 16, WIS: 14, CHA: 18 },
      alignment: 'chaotic',
      abilities: [
        { name: 'Acorde Ritual', description: 'Toca su flauta. Todos en la sala: SAB CD 14 o 2d6 psíquico.' },
        { name: 'Voz Cristalina', description: 'Grito supersónico. Apaga luces no mágicas.' },
        { name: 'Padre Afligido', description: 'Mostrar a Sera o el colgante: pierde 1 turno. Solo 1 vez.' },
        { name: 'Vasallo No-muerto', description: 'Invoca 1d4 Masas Balbucientes al inicio del combate.' },
      ],
      checksMorale: false,
      tags: ['no-muerto', 'jefe', 'humanoide'],
    },
    portraitPrompt: 'Human male necromancer, gaunt, ash-gray skin, glowing green eyes, tattered noble clothes, bone flute, skeletal, tragic villain, fantasy RPG portrait',
  },
];

// ─────────────────────────────────────────────────────
// RANDOM ENCOUNTERS
// ─────────────────────────────────────────────────────

const randomEncounters = [
  {
    id: 'ret-hueco',
    name: 'Encuentros en El Hueco de Aldric',
    diceExpression: '2d6',
    entries: [
      {
        roll: 2,
        description: 'Un temblor sacude la sala. Todos tiran DES CD 12 o caen al suelo. Los objetos sueltos se caen de los estantes.',
      },
      {
        roll: 3,
        description: '1d4 Masas Balbucientes emergen de una grieta en la pared, balbuceando fragmentos de canciones.',
        monsterIds: ['monster-masa-balbuciente'],
        quantity: '1d4',
      },
      {
        roll: 4,
        description: 'Una Araña de Huesos desciende del techo en silencio. Tiro de percepción (SAB CD 13) o sorprende al grupo.',
        monsterIds: ['monster-arana-huesos'],
        quantity: '1',
      },
      {
        roll: [5, 6],
        description: 'Se escucha una melodía de flauta lejana y melancólica. Todos deben tirar SAB CD 11 o sentirse compelidos a avanzar hacia el sonido durante 1 ronda.',
      },
      {
        roll: [7, 8],
        description: 'Nada. Solo silencio opresivo y el goteo constante del agua.',
      },
      {
        roll: 9,
        description: 'Un Guardián Hueco pasa patrullando. Si el grupo se esconde (DES CD 12), no los detecta. Si los detecta, ataca.',
        monsterIds: ['monster-guardian-hueco'],
        quantity: '1',
      },
      {
        roll: 10,
        description: 'El grupo encuentra un cadáver reciente de un explorador. Lleva 2d6 mo, una antorcha y una nota que dice: "No escuchéis la flauta".',
      },
      {
        roll: 11,
        description: 'Las velas y antorchas parpadean y casi se apagan. SAB CD 12 o cada personaje experimenta una alucinación de su peor miedo durante 1 ronda (desventaja en todo).',
      },
      {
        roll: 12,
        description: 'El eco de una voz infantil dice "papá, tengo frío". Es el residuo psíquico de Sera. No es peligroso pero es inquietante. Si alguien responde en voz alta, 2 Masas Balbucientes se acercan a investigar.',
        monsterIds: ['monster-masa-balbuciente'],
        quantity: '2',
      },
    ],
  },
];

// ─────────────────────────────────────────────────────
// STORE: Quen's Hollow Market
// ─────────────────────────────────────────────────────

const stores = [
  {
    id: 'store-quen',
    name: 'El Mercado Hueco de Quen',
    description: 'Un puesto de mercado improvisado bajo un toldo remendado en la plaza central de Ashenveil. Quen Halvash, un halfling con más bolsillos que escrúpulos, vende de todo un poco — desde equipo básico de exploración hasta objetos peculiares recuperados de las ruinas.',
    keeperName: 'Quen Halvash',
    keeperAncestry: 'halfling',
    storeType: 'general',
    items: [
      { id: 'si-soga', name: 'Soga (18 m)', description: 'Cuerda de cáñamo resistente, 18 metros.', price: 1, quantity: 5, category: 'gear', slots: 1, isCustom: false },
      { id: 'si-antorcha', name: 'Antorcha', description: 'Antorcha estándar, 1 hora de luz.', price: 0.05, quantity: 20, category: 'light_source', slots: 1, isCustom: false },
      { id: 'si-aceite', name: 'Frasco de aceite', description: 'Aceite de lámpara. 1 hora de luz en linterna, o se puede arrojar como arma improvisada (1d4 fuego).', price: 0.1, quantity: 10, category: 'gear', slots: 1, isCustom: false },
      { id: 'si-raciones', name: 'Raciones (3)', description: 'Tres raciones de viaje: cecina, queso curado y galletas.', price: 0.5, quantity: 15, category: 'ration', slots: 1, isCustom: false },
      { id: 'si-odre', name: 'Odre de agua', description: 'Odre de cuero para agua. Capacidad para 1 día.', price: 0.05, quantity: 8, category: 'gear', slots: 1, isCustom: false },
      { id: 'si-curandera', name: 'Kit de curandera', description: 'Vendas, ungüentos y hierbas básicas. 10 usos. Permite estabilizar a un aliado a 0 PG.', price: 5, quantity: 2, category: 'gear', slots: 1, isCustom: false },
      { id: 'si-herramientas', name: 'Herramientas de ladrón', description: 'Ganzúas, limas y alambres. Necesarias para forzar cerraduras y desactivar trampas.', price: 10, quantity: 1, category: 'gear', slots: 1, isCustom: false },
      { id: 'si-estacas', name: 'Estacas y martillo', description: '3 estacas de madera y un martillo. Útil contra vampiros y para fijar cuerdas.', price: 0.5, quantity: 4, category: 'gear', slots: 1, isCustom: false },
      { id: 'si-pala', name: 'Pala', description: 'Pala de hierro con mango de madera. Útil para cavar.', price: 2, quantity: 2, category: 'gear', slots: 1, isCustom: false },
      { id: 'si-vela-hueca', itemDefinitionId: 'gear-vela-hueca', name: 'Vela Hueca', description: 'Vela de sebo y médula ósea. Llama azul, 2 horas. Revela no-muertos invisibles.', price: 0.8, quantity: 4, category: 'light_source', slots: 1, isCustom: true },
      { id: 'si-aceite-medula', itemDefinitionId: 'gear-aceite-medula', name: 'Aceite de Médula Ósea', description: 'Aceite denso. Aplicar a un arma: +1d6 radiante contra no-muertos (1 golpe).', price: 3, quantity: 2, category: 'consumable', slots: 1, isCustom: true },
      { id: 'si-agua-bendita', name: 'Agua bendita', description: 'Frasco de agua bendita. Arrojar contra no-muerto: 1d6 de daño radiante. Rango cercano.', price: 5, quantity: 3, category: 'consumable', slots: 1, isCustom: false },
      { id: 'si-espejo', name: 'Espejo de mano', description: 'Espejo de acero pulido. Útil para mirar esquinas o enfrentar a criaturas con mirada petrificante.', price: 5, quantity: 1, category: 'gear', slots: 1, isCustom: false },
      { id: 'si-cadena', name: 'Cadena (3 m)', description: '3 metros de cadena de hierro con candado.', price: 2, quantity: 2, category: 'gear', slots: 1, isCustom: false },
      { id: 'si-pocion-curacion', name: 'Poción de curación', description: 'Líquido rojo brillante. Beber: recupera 1d6 PG.', price: 10, quantity: 3, category: 'consumable', slots: 1, isCustom: false },
      { id: 'si-daga', name: 'Daga', description: 'Daga de hierro. Cuerpo a cuerpo o arrojadiza.', price: 1, quantity: 5, category: 'weapon', slots: 1, isCustom: false },
    ],
    npcId: 'npc-quen',
  },
];

// ─────────────────────────────────────────────────────
// LORE (3 chapters)
// ─────────────────────────────────────────────────────

const lore = {
  chapters: [
    {
      id: 'lore-ashenveil',
      title: 'La Ciudad de Ashenveil',
      sortOrder: 1,
      sections: [
        {
          id: 'lore-ashenveil-desc',
          title: 'Descripción General',
          content: 'Ashenveil es una pequeña ciudad amurallada construida sobre las ruinas de un antiguo campanario dedicado a una deidad olvidada. La ciudad se asienta en un valle brumoso atravesado por un canal de aguas oscuras. Sus edificios son de piedra gris y madera ennegrecida, y una niebla perpetua cuelga sobre sus tejados como un sudario.\n\nLa población de Ashenveil ronda las 800 almas — en su mayoría humanos, con una comunidad de halflings comerciantes y algunos enanos mineros que trabajan las canteras cercanas. La ciudad vive del comercio fluvial, la agricultura de subsistencia y, cada vez más, del saqueo discreto de las ruinas bajo la ciudad.',
          sortOrder: 1,
        },
        {
          id: 'lore-ashenveil-belltallow',
          title: 'La Historia de Belltallow',
          content: 'Hace más de dos siglos, el lugar que hoy ocupa Ashenveil era conocido como Belltallow — el Campanario del Sebo. Era un monasterio dedicado al culto de una deidad menor de la muerte y el tránsito, cuyos sacerdotes fabricaban velas especiales con sebo mezclado con médula ósea de los fieles difuntos. Estas "Velas Huecas" supuestamente permitían comunicarse con los muertos.\n\nBelltallow fue abandonado tras una plaga que diezmó a sus sacerdotes. La ciudad de Ashenveil creció sobre sus ruinas, y los niveles inferiores del monasterio fueron sellados y olvidados — hasta que los temblores recientes abrieron grietas en los cimientos, revelando las criptas de abajo.',
          sortOrder: 2,
        },
        {
          id: 'lore-ashenveil-situacion',
          title: 'La Situación Actual',
          content: 'Desde hace tres semanas, temblores inexplicables sacuden Ashenveil cada noche. Han desaparecido cinco personas: tres mineros, una curandera (Mira Soln) y un sacerdote itinerante. Los guardias enviados a investigar las ruinas no han regresado. La prefecta Orvana Drast ha ofrecido una recompensa de 200 mo a cualquier grupo de aventureros que investigue las ruinas, encuentre a los desaparecidos y detenga los temblores.\n\nLos ciudadanos están aterrados. Algunos hablan de mudarse. Otros susurran que los muertos de Belltallow han despertado. Quen Halvash, el mercader halfling, ha empezado a vender "equipo anti-fantasmas" a precios inflados.',
          sortOrder: 3,
        },
      ],
    },
    {
      id: 'lore-aldric',
      title: 'Aldric Voss y el Vaciado',
      sortOrder: 2,
      sections: [
        {
          id: 'lore-aldric-historia',
          title: 'La Historia de Aldric',
          content: 'Aldric Voss fue un músico y erudito que vivió en Ashenveil hace treinta años. Era conocido por su talento con la flauta y su devoción por su hija única, Sera. Cuando Sera enfermó de la Fiebre Ceniza a los siete años, Aldric buscó desesperadamente una cura. Recurrió a curanderos, sacerdotes y, finalmente, a textos prohibidos.\n\nSera murió una noche de invierno. Aldric no pudo aceptarlo. Descubrió los textos de los antiguos sacerdotes de Belltallow y se obsesionó con sus rituales de comunicación con los muertos. Descendió a las ruinas selladas bajo la ciudad y nunca regresó.',
          sortOrder: 1,
        },
        {
          id: 'lore-aldric-vaciado',
          title: 'El Vaciado',
          content: 'El "Vaciado" es el nombre que Aldric dio a su proceso nigromántice. Inspirado en las Velas Huecas de Belltallow, Aldric desarrolló un ritual que extrae la "médula vital" de los vivos — su esencia vital, almacenada en los huesos — y la transfiere a un recipiente muerto. Su objetivo final es reunir suficiente médula vital para devolver a Sera a la vida.\n\nEl proceso tiene efectos secundarios terribles: los sujetos vaciados se convierten en las Masas Balbucientes — amasijos de carne drenada que balbucean los últimos pensamientos de sus víctimas. Algunos sujetos más resistentes se convierten en Guardianes Huecos, sirvientes no-muertos con una obediencia ciega. Solo uno, Kaelith, conservó parte de su consciencia.\n\nLos temblores son causados por los rituales de Aldric, que requieren cada vez más energía a medida que se acercan a su culminación.',
          sortOrder: 2,
        },
        {
          id: 'lore-aldric-sera',
          title: 'Sera',
          content: 'Sera Voss era una niña de siete años, alegre y curiosa, que murió de la Fiebre Ceniza. Su cuerpo fue enterrado en el cementerio de Ashenveil, pero Aldric lo desenterró y lo llevó a las criptas. El cuerpo de Sera yace preservado en un sarcófago en la Sala 13, intacto gracias a la nigromancia de Aldric. Parece dormida.\n\nEl Colgante de Piedra Sangre que Sera siempre llevaba fue dejado en el altar de la Nave Llorosa como ofrenda. Es la única cosa que puede hacer dudar a Aldric. El sarcófago de Sera es el núcleo del ritual: si se destruye, el ritual falla y Aldric enloquece de furia; si se completa, algo terrible despierta en el cuerpo de Sera — pero no será Sera.',
          sortOrder: 3,
        },
      ],
    },
    {
      id: 'lore-epilogo',
      title: 'Epílogo: Los Tres Finales',
      sortOrder: 3,
      sections: [
        {
          id: 'lore-final-1',
          title: 'Final 1: La Paz del Acero',
          content: 'Si los aventureros derrotan a Aldric Voss en combate, su cuerpo se desmorona en cenizas y la flauta de hueso se quiebra con un último lamento. Los temblores cesan inmediatamente. Las Masas Balbucientes y los Guardianes Huecos caen inertes en todo el complejo. El cuerpo de Sera en el sarcófago finalmente comienza a descomponerse, liberado de la nigromancia.\n\nAshenveil celebra a los héroes. La prefecta Orvana paga la recompensa completa de 200 mo. Si Mira Soln fue rescatada, se convierte en la nueva curandera de la ciudad. Si Kaelith sobrevive, abandona la ciudad en silencio, buscando un lugar donde su condición no sea un problema.\n\nPero por las noches, los ciudadanos juran que aún escuchan, muy lejos y muy débil, el sonido de una flauta.',
          sortOrder: 1,
        },
        {
          id: 'lore-final-2',
          title: 'Final 2: La Palabra que Sana',
          content: 'Si los aventureros convencen a Aldric de detenerse (CAR CD 16, con ventaja si leyeron las confesiones en la Antecámara), Aldric deja de tocar y llora abrazando el sarcófago de Sera. Tras un largo silencio, acepta que Sera no volverá. El ritual se deshace lentamente: los temblores cesan, los no-muertos caen, pero el proceso toma días en lugar de ser instantáneo.\n\nAldric se entrega voluntariamente. Su destino queda en manos de la prefecta: puede ser ejecutado, encarcelado, o exiliado. Si los aventureros abogan por clemencia, Orvana puede aceptar el exilio (CAR CD 13 adicional). Aldric se marcha al amanecer, solo, sin la flauta, que deja sobre la tumba de Sera.\n\nLa recompensa se paga. Ashenveil tarda en sanar, pero sana. Y la flauta, dejada sobre la tumba, nunca vuelve a sonar.',
          sortOrder: 2,
        },
        {
          id: 'lore-final-3',
          title: 'Final 3: El Despertar',
          content: 'Si los aventureros permiten que el ritual se complete — ya sea por decisión propia, por llegar demasiado tarde, o por fallar en detener a Aldric — el cuerpo de Sera abre los ojos. Pero lo que mira desde esos ojos no es Sera.\n\nUna entidad antigua y hambrienta, la misma deidad olvidada de Belltallow, usa el cuerpo de Sera como ancla para manifestarse parcialmente en el mundo material. Aldric, horrorizado, intenta detener lo que ha invocado, pero es destruido por la entidad. Los aventureros deben huir de las ruinas que se derrumban mientras la entidad despierta.\n\nAshenveil es evacuada. Las ruinas se hunden en la tierra. Pero la entidad no ha sido destruida — solo contenida temporalmente. Una nueva amenaza acecha bajo la superficie, y tarde o temprano, alguien tendrá que enfrentarla.\n\nEste final abre la puerta a una campaña completa.',
          sortOrder: 3,
        },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────
// ASSEMBLE THE FULL DOCUMENT
// ─────────────────────────────────────────────────────

const now = Date.now();

const adventure = {
  format: 'shadowdark-adventure-v1',
  exportedAt: now,
  id: 'adventure-el-hueco-de-aldric',
  name: 'El Hueco de Aldric',
  author: 'ShadowDark Engine — Aventura de Ejemplo',
  version: '1.0',
  description: 'Una aventura one-shot de exploración de mazmorras para niveles 1-3. Los aventureros investigan unas ruinas bajo la ciudad de Ashenveil, donde un nigromante enloquecido por el dolor intenta devolver la vida a su hija muerta mediante un ritual terrible conocido como el Vaciado.',
  createdAt: now,
  updatedAt: now,

  content: {
    monsters,
    gear,
  },

  adventure: {
    hook: 'Temblores nocturnos sacuden la pequeña ciudad de Ashenveil. Cinco personas han desaparecido en tres semanas. Los guardias enviados a las ruinas bajo la ciudad no han regresado. La prefecta Orvana Drast ofrece 200 monedas de oro a cualquier grupo de valientes dispuestos a descender al Hueco — las antiguas catacumbas del monasterio de Belltallow — y poner fin a lo que sea que acecha en las profundidades.',
    overview: 'El Hueco de Aldric es una aventura de exploración de mazmorras en dos niveles bajo la ciudad de Ashenveil. El nivel superior (El Hueco de la Campana) contiene las ruinas de un antiguo monasterio con 7 salas. El nivel inferior (Las Criptas Hundidas) contiene 6 salas más profundas y peligrosas. La aventura culmina en un enfrentamiento con Aldric Voss, un nigromante trágico que intenta resucitar a su hija mediante un ritual de extracción de médula vital. Hay tres posibles resoluciones: combate, diplomacia, o permitir que el ritual se complete con consecuencias catastróficas.',
    targetLevel: [1, 3],
    rooms,
    randomEncounters,
    npcs,
    stores,
  },

  lore,

  maps: [
    generateMap1(),
    generateMap2(),
    generateMap3(),
  ],
};

// Output
console.log(JSON.stringify(adventure, null, 2));
