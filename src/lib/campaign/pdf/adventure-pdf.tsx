import { Document, Page, View, Text, Image, Font } from '@react-pdf/renderer'
import type { Campaign, AdventureRoom, AdventureNPC, AdventureStore, RandomEncounterTable, LoreChapter } from '@/schemas/campaign.ts'
import type { MonsterDefinition } from '@/schemas/monsters.ts'
import { styles, COLORS } from './pdf-styles.ts'

// Register UnifrakturCook (Old English / Blackletter) for title
Font.register({
  family: 'UnifrakturCook',
  src: 'https://fonts.gstatic.com/s/unifrakturcook/v23/IurA6Yli8YOdcoky-0PTTdOm_9IQ1CH4.ttf',
})

// Spanish section labels
const L = {
  contents: 'Contenido',
  overview: 'Resumen',
  adventureHook: 'Gancho de Aventura',
  gmOverview: 'Resumen del DJ',
  targetLevel: 'Nivel Sugerido',
  keyNPCs: 'PNJs Clave',
  randomEncounters: 'Encuentros Aleatorios',
  rooms: 'Habitaciones',
  npcs: 'Personajes No Jugadores',
  shops: 'Tiendas',
  creatureStats: 'Estadísticas de Criaturas',
  lore: 'Trasfondo',
  creatures: 'Criaturas',
  treasure: 'Tesoro',
  traps: 'Trampas',
  exits: 'Salidas',
  roll: 'Tirada',
  encounter: 'Encuentro',
  item: 'Objeto',
  price: 'Precio',
  qty: 'Cant.',
  keeper: 'Encargado',
  storeType: 'Tipo',
  designedFor: 'Diseñado para uso con Shadowdark RPG',
  levelAdventure: 'Una aventura de nivel',
  by: 'por',
  description: 'Descripción',
  personality: 'Personalidad',
  role: 'Rol',
  ancestry: 'Ascendencia',
  detection: 'Detección',
  disarm: 'Desarmar',
  trigger: 'Activador',
  effect: 'Efecto',
  damage: 'Daño',
}

// ── Props ──

export interface AdventurePDFProps {
  campaign: Campaign
  mapImages: { mapId: string; dataUrl: string }[]
}

// ── Helpers ──

function formatModifier(val: number): string {
  return val >= 0 ? `+${val}` : `${val}`
}

function formatAlignment(al: string): string {
  const map: Record<string, string> = { lawful: 'L', neutral: 'N', chaotic: 'C' }
  return map[al] ?? al.charAt(0).toUpperCase()
}

function formatMovement(movement: MonsterDefinition['movement']): string {
  const parts: string[] = []
  if (movement.normal) parts.push(movement.double ? `double ${movement.normal}` : movement.normal)
  if (movement.fly) parts.push(`fly ${movement.fly}`)
  if (movement.swim) parts.push(`swim ${movement.swim}`)
  if (movement.climb) parts.push(`climb ${movement.climb}`)
  if (movement.burrow) parts.push(`burrow ${movement.burrow}`)
  return parts.join(', ') || 'near'
}

function formatRollRange(roll: number | [number, number]): string {
  if (Array.isArray(roll)) return `${roll[0]}-${roll[1]}`
  return `${roll}`
}

/** Resolve a monster definition by id from campaign content */
function findMonster(campaign: Campaign, id: string): MonsterDefinition | undefined {
  return campaign.content.monsters?.find(m => m.id === id)
}

/** Collect all unique monster ids referenced across rooms */
function collectAllMonsterIds(campaign: Campaign): string[] {
  const ids = new Set<string>()
  for (const room of campaign.adventure.rooms) {
    for (const mid of room.monsterIds) ids.add(mid)
  }
  for (const enc of campaign.adventure.randomEncounters) {
    for (const entry of enc.entries) {
      if (entry.monsterIds) {
        for (const mid of entry.monsterIds) ids.add(mid)
      }
    }
  }
  return [...ids]
}

// ── Page Components ──

function PageNumber() {
  return (
    <Text
      style={styles.pageNumber}
      render={({ pageNumber }) => `${pageNumber}`}
      fixed
    />
  )
}

// ── Cover Page ──

function CoverPage({ campaign }: { campaign: Campaign }) {
  const [minLevel, maxLevel] = campaign.adventure.targetLevel
  const levelText = minLevel === maxLevel
    ? `${L.levelAdventure} ${minLevel}`
    : `${L.levelAdventure} ${minLevel}-${maxLevel}`

  return (
    <Page size="LETTER" style={styles.coverPage}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 72 }}>
        <View style={{ marginBottom: 40, alignItems: 'center' }}>
          <Text style={{ fontFamily: 'UnifrakturCook', fontSize: 42, textAlign: 'center', color: COLORS.black, marginBottom: 12 }}>
            {campaign.name}
          </Text>
          <View style={{ borderBottomWidth: 2, borderBottomColor: COLORS.black, marginBottom: 16, width: 200 }} />
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 14, textAlign: 'center', color: COLORS.darkGray, marginBottom: 8, width: 400 }}>
            {levelText}
          </Text>
          {campaign.author ? (
            <Text style={{ fontFamily: 'Helvetica-Oblique', fontSize: 11, textAlign: 'center', color: COLORS.mediumGray, marginBottom: 24, width: 400 }}>
              {L.by} {campaign.author}
            </Text>
          ) : null}
        </View>

        {campaign.description ? (
          <View style={{ maxWidth: 400, marginBottom: 40 }}>
            <Text style={{ fontFamily: 'Helvetica-Oblique', fontSize: 10, textAlign: 'center', color: COLORS.mediumGray, lineHeight: 1.6 }}>
              {campaign.description}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ position: 'absolute', bottom: 54, left: 0, right: 0, alignItems: 'center' }}>
        <Text style={{ fontFamily: 'Helvetica', fontSize: 9, color: COLORS.lightGray }}>
          {L.designedFor}
        </Text>
      </View>
    </Page>
  )
}

// ── Contents Page ──

interface TOCEntry {
  title: string
  pageHint: string
}

function ContentsPage({ campaign }: { campaign: Campaign }) {
  const entries: TOCEntry[] = []

  entries.push({ title: L.overview, pageHint: '' })

  if (campaign.maps.filter(m => m.dungeonData).length > 0) {
    entries.push({ title: 'Mapas', pageHint: '' })
  }

  if (campaign.adventure.rooms.length > 0) {
    entries.push({ title: L.rooms, pageHint: '' })
    for (const room of campaign.adventure.rooms) {
      entries.push({ title: `   ${room.number}. ${room.name}`, pageHint: '' })
    }
  }

  if (campaign.adventure.npcs.length > 0) {
    entries.push({ title: L.npcs, pageHint: '' })
  }

  if (campaign.adventure.stores.length > 0) {
    entries.push({ title: L.shops, pageHint: '' })
  }

  const monsterIds = collectAllMonsterIds(campaign)
  if (monsterIds.length > 0) {
    entries.push({ title: L.creatureStats, pageHint: '' })
  }

  if (campaign.lore.chapters.length > 0) {
    entries.push({ title: L.lore, pageHint: '' })
    for (const chapter of campaign.lore.chapters) {
      entries.push({ title: `   ${chapter.title}`, pageHint: '' })
    }
  }

  return (
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.sectionHeader}>{L.contents}</Text>
      <View style={styles.ruleThick} />
      {entries.map((entry, i) => (
        <View key={i} style={{ flexDirection: 'row', marginBottom: 3 }}>
          <Text style={{ ...styles.bodyText, flex: 1 }}>{entry.title}</Text>
        </View>
      ))}
      <PageNumber />
    </Page>
  )
}

// ── Overview Page ──

function OverviewPage({ campaign }: { campaign: Campaign }) {
  const [minLevel, maxLevel] = campaign.adventure.targetLevel
  const npcs = campaign.adventure.npcs

  return (
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.sectionHeader}>{L.overview}</Text>
      <View style={styles.ruleThick} />

      <View style={styles.twoColumn}>
        {/* Left column: Hook + Overview */}
        <View style={styles.column}>
          {campaign.adventure.hook ? (
            <View>
              <Text style={styles.subsectionHeader}>{L.adventureHook}</Text>
              <View style={styles.calloutBox}>
                <Text style={styles.calloutText}>{campaign.adventure.hook}</Text>
              </View>
            </View>
          ) : null}

          {campaign.adventure.overview ? (
            <View>
              <Text style={styles.subsectionHeader}>{L.gmOverview}</Text>
              <Text style={styles.bodyText}>{campaign.adventure.overview}</Text>
            </View>
          ) : null}
        </View>

        {/* Right column: Level info + Key NPCs */}
        <View style={styles.column}>
          <Text style={styles.subsectionHeader}>{L.targetLevel}</Text>
          <Text style={styles.bodyText}>
            {minLevel === maxLevel ? `Nivel ${minLevel}` : `Niveles ${minLevel}-${maxLevel}`}
          </Text>

          {npcs.length > 0 ? (
            <View>
              <Text style={styles.subsectionHeader}>{L.keyNPCs}</Text>
              {npcs.map(npc => (
                <View key={npc.id} style={styles.bulletRow}>
                  <Text style={styles.bulletMarker}>{'\u25C6'} </Text>
                  <Text style={styles.bulletText}>
                    <Text style={styles.bodyTextBold}>{npc.name}</Text>
                    {npc.role ? ` — ${npc.role}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {campaign.adventure.randomEncounters.length > 0 ? (
            <View>
              <Text style={styles.subsectionHeader}>{L.randomEncounters}</Text>
              {campaign.adventure.randomEncounters.map(table => (
                <EncounterTable key={table.id} table={table} />
              ))}
            </View>
          ) : null}
        </View>
      </View>
      <PageNumber />
    </Page>
  )
}

// ── Map Page ──

function MapPage({ image, campaign, mapIndex }: { image: { mapId: string; dataUrl: string }; campaign: Campaign; mapIndex: number }) {
  const map = campaign.maps.find(m => m.id === image.mapId)
  const mapName = map?.name || `Map ${mapIndex + 1}`

  // Find random encounters (show all encounter tables on first map page, or distribute)
  const encounters = mapIndex === 0 ? campaign.adventure.randomEncounters : []

  return (
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.sectionHeader}>{mapName}</Text>
      <View style={styles.rule} />

      <Image src={image.dataUrl} style={{ ...styles.mapImage, maxHeight: encounters.length > 0 ? 340 : 580 }} />

      {encounters.map(table => (
        <EncounterTable key={table.id} table={table} />
      ))}

      <PageNumber />
    </Page>
  )
}

function EncounterTable({ table }: { table: RandomEncounterTable }) {
  return (
    <View style={{ marginTop: 8 }} wrap={false}>
      <Text style={styles.subsectionHeader}>{table.name} ({table.diceExpression})</Text>
      <View style={styles.rule} />

      <View style={styles.tableHeader}>
        <Text style={styles.tableCellHeaderSmall}>{L.roll}</Text>
        <Text style={styles.tableCellHeaderFlex}>{L.encounter}</Text>
      </View>

      {table.entries.map((entry, i) => (
        <View key={i} style={i % 2 === 1 ? styles.tableRowAlt : styles.tableRow}>
          <Text style={styles.tableCellSmall}>{formatRollRange(entry.roll)}</Text>
          <Text style={styles.tableCellFlex}>
            {entry.quantity ? `${entry.quantity} ` : ''}{entry.description}
          </Text>
        </View>
      ))}
    </View>
  )
}

// ── Room Pages ──

function RoomPages({ campaign }: { campaign: Campaign }) {
  const rooms = campaign.adventure.rooms

  if (rooms.length === 0) return null

  return (
    <Page size="LETTER" style={styles.page} wrap>
      <Text style={styles.sectionHeader}>{L.rooms}</Text>
      <View style={styles.ruleThick} />

      {rooms.map(room => (
        <RoomBlock key={room.id} room={room} campaign={campaign} />
      ))}
      <PageNumber />
    </Page>
  )
}

function RoomBlock({ room, campaign }: { room: AdventureRoom; campaign: Campaign }) {
  const monsters = room.monsterIds.map(id => findMonster(campaign, id)).filter(Boolean) as MonsterDefinition[]

  return (
    <View style={{ marginBottom: 14 }} wrap={false}>
      <Text style={styles.roomHeader}>
        {room.number}. {room.name}
      </Text>
      <View style={styles.rule} />

      {/* Read-aloud description */}
      {room.description ? (
        <View style={styles.calloutBox}>
          <Text style={styles.calloutText}>{room.description}</Text>
        </View>
      ) : null}

      {/* GM Notes */}
      {room.gmNotes ? (
        <Text style={styles.bodyText}>{room.gmNotes}</Text>
      ) : null}

      {/* Creatures */}
      {monsters.length > 0 ? (
        <View style={styles.bulletRow}>
          <Text style={styles.bulletMarker}>{'\u25C6'} </Text>
          <Text style={styles.bulletText}>
            <Text style={styles.bodyTextBold}>Criaturas:</Text>
            {monsters.map(m => m.name).join(', ')}
          </Text>
        </View>
      ) : null}

      {/* Treasure */}
      {room.treasure ? (
        <View style={styles.bulletRow}>
          <Text style={styles.bulletMarker}>{'\u25C6'} </Text>
          <Text style={styles.bulletText}>
            <Text style={styles.bodyTextBold}>Tesoro:</Text>
            {room.treasure}
          </Text>
        </View>
      ) : null}

      {/* Traps */}
      {room.traps.length > 0 ? (
        <View>
          {room.traps.map(trap => (
            <View key={trap.id} style={{ marginBottom: 2 }}>
              <View style={styles.bulletRow}>
                <Text style={styles.bulletMarker}>{'\u25C6'} </Text>
                <Text style={styles.bulletText}>
                  <Text style={styles.bodyTextBold}>Trampa — {trap.name}: </Text>
                  {trap.description}
                </Text>
              </View>
              <View style={{ ...styles.bulletRow, paddingLeft: 16 }}>
                <Text style={styles.bulletMarker}>{'\u25B7'} </Text>
                <Text style={styles.bulletText}>
                  {L.trigger}: {trap.trigger}. {L.detection} CD {trap.detectionDC}, {L.disarm} CD {trap.disarmDC}
                  {trap.damage ? `. ${L.damage}: ${trap.damage}` : ''}
                </Text>
              </View>
              {trap.effect ? (
                <View style={{ ...styles.bulletRow, paddingLeft: 16 }}>
                  <Text style={styles.bulletMarker}>{'\u25B7'} </Text>
                  <Text style={styles.bulletText}>{L.effect}: {trap.effect}</Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {/* Connections */}
      {room.connections.length > 0 ? (
        <View style={styles.bulletRow}>
          <Text style={styles.bulletMarker}>{'\u25C6'} </Text>
          <Text style={styles.bulletText}>
            <Text style={styles.bodyTextBold}>Salidas:</Text>
            {room.connections.join(', ')}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

// ── NPC Pages ──

function NPCPages({ campaign }: { campaign: Campaign }) {
  const npcs = campaign.adventure.npcs
  if (npcs.length === 0) return null

  return (
    <Page size="LETTER" style={styles.page} wrap>
      <Text style={styles.sectionHeader}>{L.npcs}</Text>
      <View style={styles.ruleThick} />

      {npcs.map(npc => (
        <NPCBlock key={npc.id} npc={npc} />
      ))}
      <PageNumber />
    </Page>
  )
}

function NPCBlock({ npc }: { npc: AdventureNPC }) {
  return (
    <View style={{ marginBottom: 12 }} wrap={false}>
      <Text style={styles.roomHeader}>{npc.name}</Text>
      <View style={styles.rule} />

      {(npc.ancestry || npc.role) ? (
        <Text style={styles.italicText}>
          {[npc.ancestry, npc.role].filter(Boolean).join(' — ')}
        </Text>
      ) : null}

      {npc.description ? (
        <Text style={styles.bodyText}>{npc.description}</Text>
      ) : null}

      {npc.personality ? (
        <View style={styles.bulletRow}>
          <Text style={styles.bulletMarker}>{'\u25C6'} </Text>
          <Text style={styles.bulletText}>
            <Text style={styles.bodyTextBold}>Personalidad:</Text>
            {npc.personality}
          </Text>
        </View>
      ) : null}

      {npc.stats && npc.stats.ac !== undefined ? (
        <View style={{ marginTop: 4 }}>
          <Text style={styles.statLine}>
            AC {npc.stats.ac}
            {npc.stats.hp !== undefined ? `, HP ${npc.stats.hp}` : ''}
            {npc.stats.level !== undefined ? `, LV ${npc.stats.level}` : ''}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

// ── Shop Pages ──

function ShopPages({ campaign }: { campaign: Campaign }) {
  const stores = campaign.adventure.stores
  if (stores.length === 0) return null

  return (
    <Page size="LETTER" style={styles.page} wrap>
      <Text style={styles.sectionHeader}>{L.shops}</Text>
      <View style={styles.ruleThick} />

      {stores.map(store => (
        <ShopBlock key={store.id} store={store} />
      ))}
      <PageNumber />
    </Page>
  )
}

function ShopBlock({ store }: { store: AdventureStore }) {
  return (
    <View style={{ marginBottom: 14 }} wrap={false}>
      <Text style={styles.roomHeader}>{store.name}</Text>
      <View style={styles.rule} />

      <Text style={styles.italicText}>
        {store.storeType !== 'custom' ? store.storeType.charAt(0).toUpperCase() + store.storeType.slice(1) : ''}
        {store.keeperName ? ` — ${L.keeper}: ${store.keeperName}` : ''}
        {store.keeperAncestry ? ` (${store.keeperAncestry})` : ''}
      </Text>

      {store.description ? (
        <Text style={styles.bodyText}>{store.description}</Text>
      ) : null}

      {store.items.length > 0 ? (
        <View style={{ marginTop: 4 }}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableCellHeaderFlex}>Item</Text>
            <Text style={styles.tableCellHeaderMedium}>Category</Text>
            <Text style={styles.tableCellHeaderSmall}>{L.price}</Text>
            <Text style={styles.tableCellHeaderSmall}>{L.qty}</Text>
          </View>
          {store.items.map((item, i) => (
            <View key={item.id} style={i % 2 === 1 ? styles.tableRowAlt : styles.tableRow}>
              <Text style={styles.tableCellFlex}>{item.name}</Text>
              <Text style={styles.tableCellMedium}>{item.category}</Text>
              <Text style={styles.tableCellSmall}>{item.price} gp</Text>
              <Text style={styles.tableCellSmall}>{item.quantity === -1 ? '\u221E' : item.quantity}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

// ── Creature Statistics Page ──

function CreatureStatsPages({ campaign }: { campaign: Campaign }) {
  const monsterIds = collectAllMonsterIds(campaign)
  if (monsterIds.length === 0) return null

  const monsters = monsterIds
    .map(id => findMonster(campaign, id))
    .filter(Boolean) as MonsterDefinition[]

  if (monsters.length === 0) return null

  // Split monsters into two columns
  const mid = Math.ceil(monsters.length / 2)
  const leftMonsters = monsters.slice(0, mid)
  const rightMonsters = monsters.slice(mid)

  return (
    <Page size="LETTER" style={styles.page} wrap>
      <Text style={styles.sectionHeader}>{L.creatureStats}</Text>
      <View style={styles.ruleThick} />

      <View style={styles.twoColumn}>
        <View style={styles.column}>
          {leftMonsters.map(m => (
            <StatBlock key={m.id} monster={m} />
          ))}
        </View>
        <View style={styles.column}>
          {rightMonsters.map(m => (
            <StatBlock key={m.id} monster={m} />
          ))}
        </View>
      </View>
      <PageNumber />
    </Page>
  )
}

function StatBlock({ monster }: { monster: MonsterDefinition }) {
  const attacks = monster.attacks.map(atk => {
    const bonus = formatModifier(atk.bonus)
    const multi = atk.multiattack && atk.multiattack > 1 ? `${atk.multiattack}x ` : ''
    return `${multi}${atk.name} ${bonus} (${atk.damage})`
  }).join(', ')

  const statLine = [
    `AC ${monster.ac}`,
    `HP ${monster.hp}`,
    attacks ? `ATK ${attacks}` : null,
    `MV ${formatMovement(monster.movement)}`,
    `S ${formatModifier(monster.stats.STR)}`,
    `D ${formatModifier(monster.stats.DEX)}`,
    `C ${formatModifier(monster.stats.CON)}`,
    `I ${formatModifier(monster.stats.INT)}`,
    `W ${formatModifier(monster.stats.WIS)}`,
    `Ch ${formatModifier(monster.stats.CHA)}`,
    `AL ${formatAlignment(monster.alignment)}`,
    `LV ${monster.level}`,
  ].filter(Boolean).join(', ')

  return (
    <View style={{ marginBottom: 10 }} wrap={false}>
      <Text style={styles.statBlockName}>{monster.name}</Text>
      <View style={styles.statBlockRule} />

      {monster.description ? (
        <Text style={styles.statBlockDescription}>{monster.description}</Text>
      ) : null}

      <Text style={styles.statLine}>{statLine}</Text>

      {monster.abilities.length > 0 ? (
        <View style={{ marginTop: 2 }}>
          {monster.abilities.map((ab, i) => (
            <Text key={i} style={styles.statBlockAbility}>
              <Text style={styles.statLineBold}>{ab.name}. </Text>
              {ab.description}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  )
}

// ── Lore Pages ──

function LorePages({ campaign }: { campaign: Campaign }) {
  const chapters = [...campaign.lore.chapters].sort((a, b) => a.sortOrder - b.sortOrder)
  if (chapters.length === 0) return null

  return (
    <Page size="LETTER" style={styles.page} wrap>
      <Text style={styles.sectionHeader}>{L.lore}</Text>
      <View style={styles.ruleThick} />

      {chapters.map(chapter => (
        <LoreChapterBlock key={chapter.id} chapter={chapter} />
      ))}
      <PageNumber />
    </Page>
  )
}

function LoreChapterBlock({ chapter }: { chapter: LoreChapter }) {
  const sections = [...chapter.sections].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ ...styles.subsectionHeader, fontSize: 13, fontFamily: 'Times-Roman' }}>
        {chapter.title}
      </Text>
      <View style={styles.rule} />

      {sections.map(section => (
        <View key={section.id} style={{ marginBottom: 6 }}>
          {section.title ? (
            <Text style={styles.subsectionHeader}>{section.title}</Text>
          ) : null}
          {section.content ? (
            <Text style={styles.bodyText}>{section.content}</Text>
          ) : null}
        </View>
      ))}
    </View>
  )
}

// ── Main Document ──

export function AdventurePDF({ campaign, mapImages }: AdventurePDFProps) {
  return (
    <Document
      title={campaign.name}
      author={campaign.author}
      subject={`Adventure module: ${campaign.name}`}
      creator="ShadowDark Engine"
    >
      <CoverPage campaign={campaign} />
      <ContentsPage campaign={campaign} />
      <OverviewPage campaign={campaign} />

      {mapImages.map((img, i) => (
        <MapPage key={img.mapId} image={img} campaign={campaign} mapIndex={i} />
      ))}

      {campaign.adventure.rooms.length > 0 ? (
        <RoomPages campaign={campaign} />
      ) : null}

      {campaign.adventure.npcs.length > 0 ? (
        <NPCPages campaign={campaign} />
      ) : null}

      {campaign.adventure.stores.length > 0 ? (
        <ShopPages campaign={campaign} />
      ) : null}

      <CreatureStatsPages campaign={campaign} />

      {campaign.lore.chapters.length > 0 ? (
        <LorePages campaign={campaign} />
      ) : null}
    </Document>
  )
}
