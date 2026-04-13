import { useState, useEffect, useRef } from "react"
import { DiceRoller } from "@/components/dice/dice-roller.tsx"
import { useLocale } from "@/hooks/use-locale.ts"
import { useDataRegistry } from "@/hooks/use-data-registry.ts"
import {
  ANCESTRIES, ARMOR, BACKGROUNDS, CLASSES, COMMON_LANGUAGES, DEITIES,
  GEAR, MONSTERS, RARE_LANGUAGES, SPELLS, TITLES, WEAPONS,
  getSpellsByClassAndTier,
} from "@/data/index.ts"
import { generateAdventureName } from "@/data/tables/adventure-names.ts"
import { getRandomHazard } from "@/data/tables/hazards.ts"
import { getRandomName } from "@/data/tables/npc-names.ts"
import { getRandomTrap } from "@/data/tables/traps.ts"
import { rollDice } from "@/lib/dice/roller.ts"
import { getAbilityModifier } from "@/schemas/reference.ts"

type Tab = "rules" | "spells" | "items" | "monsters" | "world" | "generators" | "classes" | "charCreation" | "tools"

// ========== SPANISH CLASS TRANSLATIONS ==========
const CLASS_ES: Record<string, {
  name: string
  description: string
  features: Record<string, { name: string; description: string }>
  talents: string[]
}> = {
  fighter: {
    name: 'Guerrero',
    description: 'Maestros de armas y armaduras, los guerreros sobresalen en el combate físico.',
    features: {
      'Hauler': { name: 'Cargador', description: 'Añade tu modificador de CON (si es positivo) a tu capacidad de espacios de equipo.' },
      'Grit': { name: 'Determinación', description: 'Elige STR o DEX. Tienes ventaja en chequeos de ese tipo para superar una fuerza opuesta.' },
      'Weapon Mastery': { name: 'Maestría con Armas', description: 'Elige un tipo de arma. Ganas +1 al ataque y daño con ese tipo, más la mitad de tu nivel (redondeado hacia abajo).' },
    },
    talents: [
      'Ganas Maestría con Armas con un tipo de arma adicional',
      '+1 a ataques cuerpo a cuerpo y a distancia',
      '+2 a STR, DEX o CON',
      'Elige un tipo de armadura. +1 CA con esa armadura.',
      'Elige un talento o +2 puntos para distribuir en estadísticas',
    ],
  },
  priest: {
    name: 'Sacerdote',
    description: 'Lanzadores de hechizos divinos devotos de su deidad, los sacerdotes curan aliados y castigan enemigos.',
    features: {
      'Turn Undead': { name: 'Expulsar Muertos Vivientes', description: 'Conoces el hechizo Expulsar Muertos Vivientes gratis. No cuenta para tu número de hechizos conocidos.' },
      'Spellcasting': { name: 'Lanzamiento de Hechizos', description: 'Puedes lanzar hechizos de sacerdote usando tu modificador de WIS.' },
    },
    talents: [
      'Ganas ventaja al lanzar un hechizo que conoces',
      '+1 a ataques cuerpo a cuerpo o a distancia',
      '+1 a chequeos de lanzamiento de hechizos de sacerdote',
      '+2 a STR o WIS',
      'Elige un talento o +2 puntos para distribuir en estadísticas',
    ],
  },
  thief: {
    name: 'Ladrón',
    description: 'Astutos y sigilosos, los ladrones sobresalen en encontrar trampas, abrir cerraduras y atacar desde las sombras.',
    features: {
      'Backstab': { name: 'Puñalada Trasera', description: 'Si golpeas a una criatura que no es consciente de tu ataque, infliges un dado de daño de arma extra. Añade dados de arma adicionales iguales a la mitad de tu nivel (redondeado hacia abajo).' },
      'Thievery': { name: 'Hurto', description: 'Eres experto en habilidades de ladrón. Tienes ventaja en chequeos de escalar, sigilo, ocultarse, disfrazarse, encontrar y desactivar trampas, y tareas delicadas como robar bolsillos y abrir cerraduras.' },
    },
    talents: [
      'Ganas ventaja en tiradas de iniciativa',
      'Puñalada Trasera inflige +1 dado de daño',
      '+2 a STR, DEX o CHA',
      '+1 a ataques cuerpo a cuerpo y a distancia',
      'Elige un talento o +2 puntos para distribuir en estadísticas',
    ],
  },
  wizard: {
    name: 'Mago',
    description: 'Lanzadores de hechizos arcanos que empuñan magia poderosa a través del estudio y el intelecto.',
    features: {
      'Spellcasting': { name: 'Lanzamiento de Hechizos', description: 'Puedes lanzar hechizos de mago usando tu modificador de INT.' },
      'Learning Spells': { name: 'Aprender Hechizos', description: 'Puedes aprender permanentemente un hechizo de mago de un pergamino de hechizo estudiándolo durante un día y teniendo éxito en un chequeo de INT DC 15. El pergamino se consume tanto si tienes éxito como si fallas.' },
    },
    talents: [
      'Fabrica un objeto mágico aleatorio (ver Guía del GM)',
      '+2 a INT o +1 a chequeos de lanzamiento de hechizos de mago',
      'Ganas ventaja al lanzar un hechizo que conoces',
      'Aprende un hechizo de mago adicional de cualquier tier que conozcas',
      'Elige un talento o +2 puntos para distribuir en estadísticas',
    ],
  },
  bard: {
    name: 'Bardo',
    description: 'Los bardos son vagabundos bienvenidos y sabios consejeros; su tarea es proteger y compartir el conocimiento transmitido a través de las eras.',
    features: {
      'Bardic Arts': { name: 'Artes Bárdicas', description: 'Estás entrenado en oratoria, artes escénicas, sabiduría y diplomacia. Tienes ventaja en chequeos relacionados.' },
      'Presence': { name: 'Presencia', description: 'Haz un chequeo de CHA DC 12 para Inspirar (un objetivo en rango cercano gana un token de suerte) o Fascinar (foco: hipnotiza a todos los objetivos elegidos de nivel 4 o menos dentro de rango cercano).' },
      'Magical Dabbler': { name: 'Aficionado Mágico', description: 'Puedes activar pergaminos de hechizo y varitas usando Carisma como tu estadística de lanzamiento. Si fallas críticamente, tira en la tabla de percances del mago.' },
      'Prolific': { name: 'Prolífico', description: 'Añade 1d6 a tus tiradas de aprendizaje. Los grupos que celebran con 1 o más bardos añaden 1d6 a sus tiradas.' },
    },
    talents: [
      'Ganas ventaja al lanzar un pergamino/varita que uses',
      '+1 a ataques cuerpo a cuerpo y a distancia',
      '+2 a STR, DEX, CON, INT, WIS o CHA',
      '+1 a tiradas de Aficionado Mágico O CD de Presencia mejorada (solo puedes tomar cada una una vez)',
      'Elige un talento o +2 puntos para distribuir en estadísticas',
    ],
  },
  ranger: {
    name: 'Explorador',
    description: 'Rastreadores hábiles, vagabundos sigilosos y guerreros sin igual que llaman hogar a las tierras salvajes.',
    features: {
      'Wayfinder': { name: 'Rastreador', description: 'Tienes ventaja en chequeos asociados con navegación, rastreo, supervivencia, sigilo y animales salvajes.' },
      'Herbalism': { name: 'Herbalismo', description: 'Haz un chequeo de INT para preparar un remedio herbal: Ungüento (DC 11, cura 1 PG), Estimulante (DC 12, no puede ser sorprendido 10 rondas), Mataenemigos (DC 13, VTJ en ataques vs un tipo de criatura), Restaurativo (DC 14, termina veneno/enfermedad), Curativo (DC 15, como Poción de Curación). Los remedios no usados expiran en 3 rondas.' },
    },
    talents: [
      'Ganas ventaja en chequeos de Herbalismo',
      '+1 a ataques y daño cuerpo a cuerpo o a distancia',
      '+2 a STR, DEX, INT o WIS',
      'Aumenta un dado de daño de arma en un paso',
      'Elige un talento o +2 puntos para distribuir en estadísticas',
    ],
  },
  warlock: {
    name: 'Brujo',
    description: 'Guerreros aullantes con dientes afilados, profetas de ojos salvajes que predican La Disolución, y cazadores de saber encapuchados que portan la Marca oculta de Shune.',
    features: {
      'Patron': { name: 'Patrón', description: 'Elige un patrón al que servir. Tu patrón es la fuente de tus dones sobrenaturales. Si tu patrón está descontento contigo, puede retener sus dones.' },
      'Patron Boon': { name: 'Don del Patrón', description: 'A nivel 1, ganas un talento aleatorio de Don del Patrón basado en tu patrón elegido. Cada vez que ganas una nueva tirada de talento, puedes elegir tirar en tu tabla de Don del Patrón.' },
    },
    talents: [
      'Tira en tu tabla de Don del Patrón',
      '+1 a ataques cuerpo a cuerpo y a distancia',
      '+2 a STR, DEX, CON, INT, WIS o CHA',
      '+1 a tiradas de daño',
      'Elige un talento o +2 puntos para distribuir en estadísticas',
    ],
  },
  witch: {
    name: 'Bruja',
    description: 'Brujas cacareantes encorvadas sobre calderos, chamanes cantantes untados en sangre y arcilla, y doncellas marginadas con ojos lechosos que ven portentos y secretos.',
    features: {
      'Spellcasting': { name: 'Lanzamiento de Hechizos', description: 'Puedes lanzar hechizos de bruja usando tu modificador de CHA. La CD es 10 + el tier del hechizo. Con un 1 natural, tira en la tabla de Percance Diabólico.' },
      'Familiar': { name: 'Familiar', description: 'Tienes un animal pequeño (cuervo, rata, rana, etc.) que te sirve lealmente y puede hablar Común. Tu familiar puede ser la fuente de los hechizos que lanzas. Si muere, puedes restaurarlo sacrificando permanentemente 1d4 PG.' },
    },
    talents: [
      'Ganas ventaja al lanzar un hechizo que conoces',
      '+1 a chequeos de lanzamiento de hechizos de bruja',
      'Aprende un hechizo de bruja adicional de cualquier tier que conozcas',
      '+2 a INT o CHA',
      'Elige un talento o +2 puntos para distribuir en estadísticas',
    ],
  },
  'knight-of-st-ydris': {
    name: 'Caballero de San Ydris',
    description: 'Caballeros malditos que caminan el sendero de San Ydris el Impío, el Poseído. Abrazan la oscuridad para combatirla, purificando el mal con una ráfaga de acero y hechicería prohibida.',
    features: {
      'Demonic Possession': { name: 'Posesión Demoníaca', description: '3/día, ganas un bonificador de +1 a tus tiradas de daño que dura 3 rondas. Además, añade la mitad de tu nivel al bonificador de daño (redondeado hacia abajo).' },
      'Spellcasting': { name: 'Lanzamiento de Hechizos', description: 'A partir del nivel 3, puedes lanzar hechizos de bruja usando tu modificador de CHA. Con un 1 natural, tira en la tabla de Percance Diabólico.' },
    },
    talents: [
      'Ganas ventaja al lanzar un hechizo que conoces',
      '+1 a ataques cuerpo a cuerpo y a distancia',
      '+1 a chequeos de lanzamiento de hechizos de bruja',
      '+2 a STR, CON o CHA',
      'Elige un talento o +2 puntos para distribuir en estadísticas',
    ],
  },
  seer: {
    name: 'Vidente',
    description: 'Adivinadores funestos que huelen a humo y sangre. Desenredan los susurros de los dioses leyendo las runas, los huesos y las estrellas. Su conocimiento del destino les permite doblegarlo.',
    features: {
      'Spellcasting': { name: 'Lanzamiento de Hechizos', description: 'Puedes lanzar hechizos de vidente usando tu modificador de WIS. La CD es 10 + el tier del hechizo. Con un 1 natural, debes completar la Penitencia del Vidente.' },
      'Omen': { name: 'Presagio', description: '3/día, haz un chequeo de WIS DC 9. Con éxito, ganas un token de suerte (no puedes tener más de uno a la vez).' },
      'Destined': { name: 'Destinado', description: 'Cada vez que usas un token de suerte, añade 1d6 a la tirada.' },
    },
    talents: [
      'Ganas ventaja al lanzar un hechizo que conoces',
      '+1 a chequeos de lanzamiento de hechizos de vidente',
      '+2 a STR, DEX, CON, INT, WIS o CHA',
      'Aprende un hechizo de vidente adicional de cualquier tier que conozcas',
      'Elige un talento o +2 puntos para distribuir en estadísticas',
    ],
  },
  'basilisk-warrior': {
    name: 'Guerrero Basilisco',
    description: 'Guerreros de ojos ardientes que cubren su piel con barro y piedra. Su antiguo estilo de combate imita la pose regia y los golpes feroces del basilisco.',
    features: {
      'Stone Skin': { name: 'Piel de Piedra', description: 'Añade 2 + la mitad de tu nivel (redondeado hacia abajo) a tu CA. Tienes ventaja en chequeos para ocultarte en entornos naturales.' },
      'Basilisk Blood': { name: 'Sangre de Basilisco', description: 'Tienes ventaja en chequeos de CON para evitar enfermedades dañinas, venenos o aflicciones.' },
      'Petrifying Gaze': { name: 'Mirada Petrificante', description: 'Una criatura de tu nivel o menos que mire a tus ojos debe pasar un chequeo de CON DC 15 o quedar petrificada durante 1d4 rondas. Usos por día iguales a tu modificador de CON (mínimo 1).' },
    },
    talents: [
      'Ganas +1 CA (mejora de armadura natural)',
      '+1 a ataques cuerpo a cuerpo y a distancia',
      '+2 a STR, DEX, CON o WIS',
      '+1 a tiradas de daño',
      'Elige un talento o +2 puntos para distribuir en estadísticas',
    ],
  },
  'desert-rider': {
    name: 'Jinete del Desierto',
    description: 'Bárbaros aullantes que tronan por la arena en caballos salvajes, espías élficos que blanden espadas curvas sobre camellos plateados, o bandidos envueltos en sedas coloridas que cabalgan esbeltos corceles del desierto.',
    features: {
      'Charge': { name: 'Carga', description: '3/día, puedes cargar al combate moviendo al menos cerca antes de atacar. Cada vez que lo haces, tus ataques cuerpo a cuerpo infligen daño doble esa ronda.' },
      'Mount': { name: 'Montura', description: 'Tienes un camello o caballo común que viene cuando lo llamas y nunca se asusta. Mientras cabalgas, ambos obtienen un bonificador a la CA igual a la mitad de tu nivel (redondeado hacia abajo). Tu montura tiene niveles adicionales iguales a la mitad de tu nivel (redondeado hacia abajo).' },
    },
    talents: [
      'Tu montura gana +2 al ataque y daño',
      '+1 a ataques cuerpo a cuerpo y a distancia',
      '+2 a STR, DEX, CON o CHA',
      '+1 a tiradas de daño',
      'Elige un talento o +2 puntos para distribuir en estadísticas',
    ],
  },
  'pit-fighter': {
    name: 'Luchador de Foso',
    description: 'Guerreros empapados en sangre que se rodean en una arena rugiente, bandidos del desierto marcados con cicatrices que duelen por el derecho a liderar su banda, o pendencieros de taberna que nunca rechazan un desafío.',
    features: {
      'Flourish': { name: 'Floritura', description: '3/día, recupera 1d6 puntos de golpe cuando golpeas a un enemigo con un ataque cuerpo a cuerpo.' },
      'Relentless': { name: 'Implacable', description: '3/día, cuando eres reducido a 0 PG, haz un chequeo de CON DC 18. Con éxito, quedas en 1 PG en su lugar.' },
      'Implacable': { name: 'Inquebrantable', description: 'Tienes ventaja en chequeos de Constitución para resistir heridas, veneno o soportar ambientes extremos.' },
      'Last Stand': { name: 'Último Aliento', description: 'Te levantas de moribundo con 1 punto de golpe con una tirada natural de d20 de 18-20.' },
    },
    talents: [
      '+1 a ataques cuerpo a cuerpo',
      '+1 a ataques cuerpo a cuerpo y a distancia',
      '+2 a STR, DEX, CON o CHA',
      '+1 a tiradas de daño',
      'Elige un talento o +2 puntos para distribuir en estadísticas',
    ],
  },
  'sea-wolf': {
    name: 'Lobo de Mar',
    description: 'Asaltantes marinos que merodean las islas en busca de botín en botes con cabeza de dragón. Cuando suena el cuerno de guerra, se convierten en feroces berserkers y doncellas escuderas que esperan complacer a sus dioses con una muerte valiente.',
    features: {
      'Seafarer': { name: 'Marinero', description: 'Tienes ventaja en chequeos relacionados con navegar y tripular barcos.' },
      'Old Gods': { name: 'Dioses Antiguos', description: 'Cada día, tu propósito se alinea con uno de los Dioses Antiguos. Elige después de descansar: Odín (recupera 1d4 PG al matar), Freya (token de suerte + bonificador de 1d6 al usarlo), o Loki (ventaja en chequeos de mentir/sigilo/ocultarse).' },
      'Shield Wall': { name: 'Muro de Escudos', description: 'Si empuñas un escudo, puedes usar tu acción para tomar una postura defensiva. Tu CA se convierte en 20 durante ese tiempo.' },
    },
    talents: [
      'Entrar en Frenesí (habilidad especial)',
      '+1 a ataques cuerpo a cuerpo y a distancia',
      '+2 a STR, DEX, CON o WIS',
      '+1 a tiradas de daño',
      'Elige un talento o +2 puntos para distribuir en estadísticas',
    ],
  },
  'ras-godai': {
    name: 'Ras-Godai',
    description: 'Asesinos vestidos de negro que entrenan desde la infancia dentro de un monasterio oculto del desierto. Obtienen sus poderes hechiceros de una legendaria flor de loto negro que les fue entregada por un demonio.',
    features: {
      'Smoke Step': { name: 'Paso de Humo', description: '3/día, teletranspórtate a un lugar que puedas ver dentro de rango cercano. Esto no usa tu acción.' },
      'Black Lotus': { name: 'Loto Negro', description: 'Ganaste el derecho a comer un pétalo de la legendaria flor de loto negro y sobreviviste. Tira un talento en la tabla de Talentos del Loto Negro.' },
      'Trained Assassin': { name: 'Asesino Entrenado', description: 'Tienes ventaja en chequeos de sigilo y ocultarte. Tus ataques infligen daño doble contra objetivos que no son conscientes de tu presencia.' },
    },
    talents: [
      'Tira un talento adicional de Loto Negro',
      '+1 a ataques cuerpo a cuerpo',
      '+2 a STR, DEX, CON o CHA',
      'Ganas un uso adicional de Paso de Humo por día',
      'Elige un talento o +2 puntos para distribuir en estadísticas',
    ],
  },
}

const PROF_ES: Record<string, string> = {
  leather: 'Cuero',
  chainmail: 'Cota de Malla',
  plate: 'Placas',
  shield: 'Escudo',
  mithral_chainmail: 'Cota de Mithral',
  none: 'Ninguna',
  all: 'Todas',
  all_melee: 'Todas cuerpo a cuerpo',
  club: 'Garrote',
  crossbow: 'Ballesta',
  dagger: 'Daga',
  mace: 'Maza',
  longsword: 'Espada Larga',
  staff: 'Bastón',
  warhammer: 'Martillo de Guerra',
  shortbow: 'Arco Corto',
  shortsword: 'Espada Corta',
  longbow: 'Arco Largo',
  spear: 'Lanza',
  stave: 'Vara',
  boomerang: 'Bumerán',
  'spear-thrower': 'Lanzador de Lanzas',
  pike: 'Pica',
  javelin: 'Jabalina',
  scimitar: 'Cimitarra',
  whip: 'Látigo',
  handaxe: 'Hacha de Mano',
  greataxe: 'Gran Hacha',
  blowgun: 'Cerbatana',
  bolas: 'Boleadoras',
  'razor-chain': 'Cadena con Cuchillas',
  shuriken: 'Shuriken',
}

export function ReferencePage() {
  useDataRegistry()
  const { t, locale } = useLocale()
  const [tab, setTab] = useState<Tab>("rules")
  const [search, setSearch] = useState("")

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold">{t('reference.title')}</h1>
      <p className="mb-6 text-muted-foreground">
        {t('reference.description')}
      </p>

      <div className="mb-6 flex flex-wrap gap-1 rounded-lg border border-border p-1 w-fit">
        {(
          [
            ["rules", t('reference.tabs.rules')],
            ["spells", t('reference.tabs.spells')],
            ["items", t('reference.tabs.items')],
            ["monsters", t('reference.tabs.monsters')],
            ["world", t('reference.tabs.world')],
            ["classes", t('reference.tabs.classes')],
            ["charCreation", t('reference.tabs.charCreation')],
            ["tools", locale === 'es' ? 'Herramientas' : 'Tools'],
            ["generators", t('reference.tabs.generators')],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => {
              setTab(key)
              setSearch("")
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {(tab === "spells" || tab === "items" || tab === "monsters" || tab === "classes") && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('reference.searchPlaceholder')}
          className="mb-4 w-full max-w-sm rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      )}

      {tab === "rules" && <RulesCheatSheet />}
      {tab === "spells" && <SpellsRef search={search} />}
      {tab === "items" && <ItemsRef search={search} />}
      {tab === "monsters" && <MonstersRef search={search} />}
      {tab === "world" && <WorldRef />}
      {tab === "classes" && <ClassesRef search={search} />}
      {tab === "charCreation" && <CharacterCreationRef />}
      {tab === "tools" && <ToolsTab />}
      {tab === "generators" && <Generators />}
    </main>
  )
}

// ========== RULES ==========
function RulesCheatSheet() {
  const { t, locale } = useLocale()
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-bold text-primary">{t('reference.rules.difficultyClasses')}</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>{t('reference.rules.easy')}</span>
            <span className="font-mono font-bold">DC 9</span>
          </div>
          <div className="flex justify-between">
            <span>{t('reference.rules.normal')}</span>
            <span className="font-mono font-bold">DC 12</span>
          </div>
          <div className="flex justify-between">
            <span>{t('reference.rules.hard')}</span>
            <span className="font-mono font-bold">DC 15</span>
          </div>
          <div className="flex justify-between">
            <span>{t('reference.rules.extreme')}</span>
            <span className="font-mono font-bold">DC 18</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-bold text-primary">{t('reference.rules.combat')}</h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            <span className="text-foreground font-medium">{t('reference.rules.initiativeLabel')}</span>{" "}
            {t('reference.rules.initiativeDesc')}
          </p>
          <p>
            <span className="text-foreground font-medium">{t('reference.rules.attackLabel')}</span>{" "}
            {t('reference.rules.attackDesc')}
          </p>
          <p>
            <span className="text-foreground font-medium">{t('reference.rules.nat20Label')}</span>{" "}
            {t('reference.rules.nat20Desc')}
          </p>
          <p>
            <span className="text-foreground font-medium">{t('reference.rules.nat1Label')}</span>{" "}
            {t('reference.rules.nat1Desc')}
          </p>
          <p>
            <span className="text-foreground font-medium">{t('reference.rules.moraleLabel')}</span>{" "}
            {t('reference.rules.moraleDesc')}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-bold text-primary">{t('reference.rules.deathDying')}</h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            <span className="text-foreground font-medium">{t('reference.rules.zeroHpLabel')}</span>{" "}
            {t('reference.rules.zeroHpDesc')}
          </p>
          <p>
            <span className="text-foreground font-medium">{t('reference.rules.deathTimerLabel')}</span>{" "}
            {t('reference.rules.deathTimerDesc')}
          </p>
          <p>
            <span className="text-foreground font-medium">{t('reference.rules.stabilizeLabel')}</span>{" "}
            {t('reference.rules.stabilizeDesc')}
          </p>
          <p>
            <span className="text-foreground font-medium">
              {t('reference.rules.nat20DyingLabel')}
            </span>{" "}
            {t('reference.rules.nat20DyingDesc')}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-bold text-primary">{t('reference.rules.resting')}</h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            <span className="text-foreground font-medium">{t('reference.rules.restLabel')}</span>{" "}
            {t('reference.rules.restDesc')}
          </p>
          <p>
            <span className="text-foreground font-medium">{t('reference.rules.restoresLabel')}</span>{" "}
            {t('reference.rules.restoresDesc')}
          </p>
          <p>
            <span className="text-foreground font-medium">{t('reference.rules.interruptionLabel')}</span>{" "}
            {t('reference.rules.interruptionDesc')}
          </p>
          <p>
            <span className="text-foreground font-medium">{t('reference.rules.encounterChecksLabel')}</span>{" "}
            {t('reference.rules.encounterChecksDesc')}
          </p>
        </div>
      </div>

      {/* Torch Tracking & Mishaps */}
      <div className="rounded-xl border border-orange-500/20 bg-card p-4 sm:col-span-2">
        <h3 className="mb-3 font-bold text-orange-400">
          {locale === 'es' ? 'Antorchas y Fuentes de Luz' : 'Torches & Light Sources'}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h4 className="text-xs font-bold text-orange-300 mb-2">
              {locale === 'es' ? 'Seguimiento en Tiempo Real' : 'Real-Time Tracking'}
            </h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>{locale === 'es'
                ? 'En Shadowdark, la luz se mide en TIEMPO REAL. Cuando enciendes una antorcha, inicia un temporizador de 1 hora real. Cuando se acaba, la antorcha se apaga.'
                : 'In Shadowdark, light is tracked in REAL TIME. When you light a torch, start a real 1-hour timer. When it runs out, the torch goes out.'}</p>
              <div className="rounded-lg bg-secondary/30 p-2 mt-2 space-y-1">
                <div className="flex justify-between"><span className="font-medium text-foreground">{locale === 'es' ? 'Antorcha' : 'Torch'}</span><span>1 {locale === 'es' ? 'hora real' : 'real hour'} · {locale === 'es' ? 'cercano' : 'near'}</span></div>
                <div className="flex justify-between"><span className="font-medium text-foreground">{locale === 'es' ? 'Linterna' : 'Lantern'}</span><span>4 {locale === 'es' ? 'horas reales' : 'real hours'} · {locale === 'es' ? 'cercano' : 'near'}</span></div>
                <div className="flex justify-between"><span className="font-medium text-foreground">{locale === 'es' ? 'Fogata' : 'Campfire'}</span><span>8 {locale === 'es' ? 'horas' : 'hours'} · {locale === 'es' ? 'doble cercano' : 'double near'}</span></div>
                <div className="flex justify-between"><span className="font-medium text-foreground">{locale === 'es' ? 'Hechizo Luz' : 'Light spell'}</span><span>1 {locale === 'es' ? 'hora (concentración)' : 'hour (focus)'} · {locale === 'es' ? 'cercano' : 'near'}</span></div>
              </div>
              <div className="mt-2 space-y-1 text-[10px] text-muted-foreground">
                <p><span className="text-foreground font-medium">{locale === 'es' ? 'Oscuridad:' : 'Darkness:'}</span> {locale === 'es' ? 'Desventaja en la mayoría de tareas. Chequeo de encuentro cada ronda.' : 'Disadvantage on most tasks. Encounter check every round.'}</p>
                <p><span className="text-foreground font-medium">{locale === 'es' ? 'Acompañar:' : 'Ride Along:'}</span> {locale === 'es' ? 'Una nueva luz reinicia el temporizador al máximo.' : 'A new light source resets the timer to maximum.'}</p>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold text-orange-300 mb-2">
              {locale === 'es' ? 'Tabla de Percances de Antorcha (1d6)' : 'Torch Mishap Table (1d6)'}
            </h4>
            <p className="text-[10px] text-muted-foreground mb-2">
              {locale === 'es'
                ? 'Cada vez que un PJ recibe daño, cae al suelo, o entra en contacto con agua, tira 1d6 por cada antorcha encendida que lleve:'
                : 'Each time a PC takes damage, falls prone, or contacts water, roll 1d6 for each lit torch they carry:'}
            </p>
            <div className="space-y-0.5">
              {[
                { roll: '1', en: 'The torch goes out immediately.', es: 'La antorcha se apaga inmediatamente.' },
                { roll: '2', en: 'The torch sputters — it goes out at the end of this round unless sheltered.', es: 'La antorcha chisporrotea — se apaga al final de esta ronda a menos que se proteja.' },
                { roll: '3-6', en: 'The torch stays lit.', es: 'La antorcha sigue encendida.' },
              ].map(m => (
                <div key={m.roll} className={`flex gap-2 rounded px-2 py-1 text-xs ${m.roll === '2' ? 'bg-secondary/20' : ''}`}>
                  <span className="font-mono font-bold text-orange-400 w-6 shrink-0 text-right">{m.roll}</span>
                  <span className="text-muted-foreground">{locale === 'es' ? m.es : m.en}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 italic">
              {locale === 'es'
                ? 'Consejo: Usa el temporizador integrado del motor ShadowDark para rastrear las antorchas automáticamente.'
                : 'Tip: Use the ShadowDark Engine\'s built-in timer to track torches automatically.'}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-bold text-primary">{t('reference.rules.spellcasting')}</h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            <span className="text-foreground font-medium">{t('reference.rules.castLabel')}</span>{" "}
            {t('reference.rules.castDesc')}
          </p>
          <p>
            <span className="text-foreground font-medium">{t('reference.rules.failLabel')}</span>{" "}
            {t('reference.rules.failDesc')}
          </p>
          <p>
            <span className="text-foreground font-medium">{t('reference.rules.nat1WizardLabel')}</span>{" "}
            {t('reference.rules.nat1WizardDesc')}
          </p>
          <p>
            <span className="text-foreground font-medium">{t('reference.rules.nat1PriestLabel')}</span>{" "}
            {t('reference.rules.nat1PriestDesc')}
          </p>
          <p>
            <span className="text-foreground font-medium">{t('reference.rules.nat20SpellLabel')}</span>{" "}
            {t('reference.rules.nat20SpellDesc')}
          </p>
          <p>
            <span className="text-foreground font-medium">{t('reference.rules.focusLabel')}</span>{" "}
            {t('reference.rules.focusDesc')}
          </p>
        </div>
      </div>

      {/* Wizard Mishap Table */}
      <div className="rounded-xl border border-red-500/20 bg-card p-4">
        <h3 className="mb-3 font-bold text-red-400">
          {locale === 'es' ? 'Tabla de Percances del Mago (1d12)' : 'Wizard Mishap Table (1d12)'}
        </h3>
        <p className="text-xs text-muted-foreground mb-2">
          {locale === 'es'
            ? 'Cuando un mago saca un 1 natural al lanzar un hechizo, tira 1d12:'
            : 'When a wizard rolls a natural 1 on a spell check, roll 1d12:'}
        </p>
        <div className="space-y-0.5">
          {[
            { roll: 1, en: 'Devastation! Roll twice and combine both effects (reroll further 1s).', es: '¡Devastación! Tira dos veces y combina ambos efectos (vuelve a tirar si sale 1).' },
            { roll: 2, en: 'Explosion! Take 1d8 damage.', es: '¡Explosión! Sufres 1d8 de daño.' },
            { roll: 3, en: 'Refraction! Target yourself with the spell.', es: '¡Refracción! El hechizo te afecta a ti mismo.' },
            { roll: 4, en: 'Your hand slipped! Target a random ally.', es: '¡Se te escapó! El hechizo afecta a un aliado aleatorio.' },
            { roll: 5, en: "Mind wound! Can't cast this spell for a week.", es: '¡Herida mental! No puedes lanzar este hechizo durante una semana.' },
            { roll: 6, en: 'Discorporation! One random piece of gear vanishes forever.', es: '¡Descorporeización! Una pieza de equipo desaparece para siempre.' },
            { roll: 7, en: 'Spell worm! Lose a random spell each turn until DC 12 CON; regain after rest.', es: '¡Gusano de hechizo! Pierdes un hechizo cada turno hasta superar CON DC 12; recuperas al descansar.' },
            { roll: 8, en: 'Harmonic failure! Lose a random spell until rest.', es: '¡Fallo armónico! Pierdes un hechizo aleatorio hasta descansar.' },
            { roll: 9, en: 'Poof! All light within near range suppressed for 10 rounds.', es: '¡Puf! Toda la luz en rango cercano se suprime 10 rondas.' },
            { roll: 10, en: 'The horror! Scream uncontrollably for 3 rounds.', es: '¡El horror! Gritas incontrolablemente 3 rondas.' },
            { roll: 11, en: 'Energy surge! Glow purple 10 rounds. Enemies have advantage vs you.', es: '¡Oleada de energía! Brillas púrpura 10 rondas. Enemigos tienen ventaja contra ti.' },
            { roll: 12, en: 'Unstable conduit! Disadvantage on same-tier spells for 10 rounds.', es: '¡Conducto inestable! Desventaja en hechizos del mismo tier 10 rondas.' },
          ].map(m => (
            <div key={m.roll} className={`flex gap-2 rounded px-2 py-1 text-xs ${m.roll % 2 === 0 ? 'bg-secondary/20' : ''}`}>
              <span className="font-mono font-bold text-red-400 w-5 shrink-0 text-right">{m.roll}</span>
              <span className="text-muted-foreground">{locale === 'es' ? m.es : m.en}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Priest Penance Costs */}
      <div className="rounded-xl border border-yellow-500/20 bg-card p-4">
        <h3 className="mb-3 font-bold text-yellow-400">
          {locale === 'es' ? 'Penitencia del Sacerdote' : 'Priest Penance'}
        </h3>
        <p className="text-xs text-muted-foreground mb-2">
          {locale === 'es'
            ? 'Cuando un sacerdote pierde un hechizo, debe sacrificar oro en un templo para recuperarlo:'
            : 'When a priest loses a spell, they must sacrifice gold at a temple to recover it:'}
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { tier: 1, gp: 5 }, { tier: 2, gp: 20 }, { tier: 3, gp: 40 }, { tier: 4, gp: 90 }, { tier: 5, gp: 150 },
          ].map(p => (
            <div key={p.tier} className="rounded-lg bg-secondary/30 px-4 py-2 text-center">
              <div className="font-bold text-sm text-yellow-400">Tier {p.tier}</div>
              <div className="text-xs text-muted-foreground">{p.gp} gp</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-bold text-primary">{t('reference.rules.xpLevelUp')}</h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            <span className="text-foreground font-medium">{t('reference.rules.levelUpAtLabel')}</span>{" "}
            {t('reference.rules.levelUpAtDesc')}
          </p>
          <p>
            <span className="text-foreground font-medium">{t('reference.rules.poorLabel')}</span> {t('reference.rules.poorValue')} ·{" "}
            <span className="text-foreground font-medium">{t('reference.rules.normalLabel')}</span> {t('reference.rules.normalValue')} ·{" "}
            <span className="text-foreground font-medium">{t('reference.rules.fabulousLabel')}</span> {t('reference.rules.fabulousValue')}
            {" "}· <span className="text-foreground font-medium">{t('reference.rules.legendaryLabel')}</span> {t('reference.rules.legendaryValue')}
          </p>
          <p>
            <span className="text-foreground font-medium">
              {t('reference.rules.fullXpLabel')}
            </span>{" "}
            {t('reference.rules.fullXpDesc')}
          </p>
          <p>
            <span className="text-foreground font-medium">
              {t('reference.rules.cleverThinkingLabel')}
            </span>{" "}
            {t('reference.rules.cleverThinkingDesc')}
          </p>
          <p>
            <span className="text-foreground font-medium">{t('reference.rules.talentsLabel')}</span>{" "}
            {t('reference.rules.talentsDesc')}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-bold text-primary">{t('reference.rules.abilityModifiers')}</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
          {[
            [1, "-4"],
            [4, "-3"],
            [6, "-2"],
            [8, "-1"],
            [10, "+0"],
            [12, "+1"],
            [14, "+2"],
            [16, "+3"],
            [18, "+4"],
          ].map(([score, mod]) => (
            <div key={String(score)} className="flex justify-between">
              <span className="text-muted-foreground">
                {String(score)}-{Number(score) + 1}
              </span>
              <span className="font-mono font-bold">{mod}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ========== SPELLS ==========
function SpellsRef({ search }: { search: string }) {
  const { t, tData } = useLocale()
  const [classFilter, setClassFilter] = useState<"all" | "wizard" | "priest">(
    "all",
  )
  const filtered = SPELLS.filter((s) => {
    if (classFilter !== "all" && s.class !== classFilter) return false
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()))
      return false
    return true
  })

  const classFilterLabels: Record<string, string> = {
    all: t('reference.spells.all'),
    wizard: t('reference.spells.wizard'),
    priest: t('reference.spells.priest'),
  }

  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-lg border border-border p-1 w-fit">
        {(["all", "wizard", "priest"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setClassFilter(c)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition ${classFilter === c ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
          >
            {classFilterLabels[c]}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((spell) => (
          <div
            key={spell.id}
            className="rounded-xl border border-border bg-card p-3"
          >
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-semibold">{tData('spells', spell.id, 'name', spell.name)}</h3>
              <div className="flex gap-1">
                {spell.isFocus && (
                  <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                    {t('reference.spells.focus')}
                  </span>
                )}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${spell.class === "wizard" ? "bg-blue-500/20 text-blue-400" : "bg-yellow-500/20 text-yellow-400"}`}
                >
                  {spell.class === "wizard" ? t('reference.spells.wizAbbr') : t('reference.spells.priAbbr')} {t('reference.spells.tier')}{spell.tier}
                </span>
              </div>
            </div>
            <div className="flex gap-3 text-[10px] text-muted-foreground mb-1">
              <span>{t('reference.spells.range')} {spell.range}</span>
              <span>
                {t('reference.spells.duration')} {spell.duration}
                {spell.durationValue ? ` (${spell.durationValue})` : ""}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {tData('spells', spell.id, 'description', spell.description)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ========== ITEMS ==========
function ItemsRef({ search }: { search: string }) {
  const { t, tData } = useLocale()
  const q = search.toLowerCase()
  const weapons = WEAPONS.filter((w) => !q || w.name.toLowerCase().includes(q))
  const armor = ARMOR.filter((a) => !q || a.name.toLowerCase().includes(q))
  const gear = GEAR.filter((g) => !q || g.name.toLowerCase().includes(q))

  function formatCost(gp: number) {
    return gp >= 1
      ? `${gp} gp`
      : gp >= 0.1
        ? `${Math.round(gp * 10)} sp`
        : `${Math.round(gp * 100)} cp`
  }

  return (
    <div className="space-y-6">
      {weapons.length > 0 && (
        <div>
          <h3 className="mb-2 font-bold text-primary">
            {t('reference.items.weapons')} ({weapons.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {weapons.map((w) => (
              <div
                key={w.id}
                className="rounded-lg border border-border bg-card p-2 text-xs"
              >
                <div className="flex justify-between">
                  <span className="font-semibold">{tData('weapons', w.id, 'name', w.name)}</span>
                  <span className="text-muted-foreground">
                    {formatCost(w.cost)}
                  </span>
                </div>
                <div className="text-muted-foreground mt-0.5">
                  {w.damage}
                  {w.versatileDamage ? "/" + w.versatileDamage : ""} · {w.type}{" "}
                  · {w.range} · {w.slots}s
                  {w.properties.length > 0 &&
                    ` · ${w.properties.map((p) => p.replace("_", "-")).join(", ")}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {armor.length > 0 && (
        <div>
          <h3 className="mb-2 font-bold text-primary">
            {t('reference.items.armor')} ({armor.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {armor.map((a) => (
              <div
                key={a.id}
                className="rounded-lg border border-border bg-card p-2 text-xs"
              >
                <div className="flex justify-between">
                  <span className="font-semibold">{tData('armor', a.id, 'name', a.name)}</span>
                  <span className="text-muted-foreground">
                    {formatCost(a.cost)}
                  </span>
                </div>
                <div className="text-muted-foreground mt-0.5">
                  AC {a.type === "shield" ? "+2" : a.acBase}
                  {a.addDex ? " + DEX" : ""} · {a.slots}s
                  {a.stealthPenalty && ` · ${t('reference.items.stealthDisadv')}`}
                  {a.swimPenalty !== "none" &&
                    ` · ${a.swimPenalty === "cannot" ? t('reference.items.noSwim') : t('reference.items.swimDisadv')}`}
                  {a.isMithral && ` · ${t('reference.items.mithral')}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {gear.length > 0 && (
        <div>
          <h3 className="mb-2 font-bold text-primary">
            {t('reference.items.gearConsumables')} ({gear.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {gear.map((g) => (
              <div
                key={g.id}
                className="rounded-lg border border-border bg-card p-2 text-xs"
              >
                <div className="flex justify-between">
                  <span className="font-semibold">{tData('gear', g.id, 'name', g.name)}</span>
                  <span className="text-muted-foreground">
                    {formatCost(g.cost)} · {g.slots}s
                  </span>
                </div>
                <p className="text-muted-foreground mt-0.5 leading-relaxed">
                  {tData('gear', g.id, 'description', g.description)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ========== MONSTERS ==========
function MonstersRef({ search }: { search: string }) {
  const { t, tData, tDataNested } = useLocale()
  const filtered = MONSTERS.filter(
    (m) => !search || m.name.toLowerCase().includes(search.toLowerCase()),
  )
  const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`)

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {filtered.map((m) => (
        <div key={m.id} className="rounded-xl border border-border bg-card p-4">
          {/* Header */}
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="text-lg font-bold">{tData('monsters', m.id, 'name', m.name)}</h3>
            <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">{t('reference.monsters.lv')} {m.level}</span>
          </div>

          {/* Core stats */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1 rounded-lg bg-secondary/50 p-2 text-center">
              <div className="text-[9px] text-muted-foreground">{t('reference.monsters.ac')}</div>
              <div className="text-lg font-bold">{m.ac}</div>
            </div>
            <div className="flex-1 rounded-lg bg-secondary/50 p-2 text-center">
              <div className="text-[9px] text-muted-foreground">{t('reference.monsters.hp')}</div>
              <div className="text-lg font-bold">{m.hp}</div>
            </div>
            <div className="flex-1 rounded-lg bg-secondary/50 p-2 text-center">
              <div className="text-[9px] text-muted-foreground">{t('reference.monsters.speed')}</div>
              <div className="text-sm font-bold capitalize">{m.movement.double ? t('reference.monsters.double') + ' ' : ''}{m.movement.normal}</div>
            </div>
          </div>

          {/* Ability scores */}
          <div className="grid grid-cols-6 gap-1 mb-3">
            {(["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const).map((s) => (
              <div key={s} className="rounded border border-border/50 p-1 text-center">
                <div className="text-[8px] font-semibold text-muted-foreground">{s}</div>
                <div className="text-xs font-bold">{m.stats[s]}</div>
                <div className="text-[9px] text-muted-foreground">{fmt(getAbilityModifier(m.stats[s]))}</div>
              </div>
            ))}
          </div>

          {/* Attacks */}
          <div className="space-y-1 mb-2">
            {m.attacks.map((a, i) => (
              <div key={i} className="flex items-baseline justify-between rounded-lg bg-secondary/30 px-2 py-1 text-xs">
                <span className="font-semibold">{tDataNested('monsters', m.id, ['attacks', a.name], a.name)} <span className="text-muted-foreground">{fmt(a.bonus)}</span></span>
                <span className="font-mono text-primary">{a.damage}</span>
              </div>
            ))}
          </div>

          {/* Abilities */}
          {m.abilities.length > 0 && (
            <div className="border-t border-border/30 pt-2 space-y-1">
              {m.abilities.map((a, i) => (
                <p key={i} className="text-[11px]">
                  <span className="font-semibold text-primary">{tDataNested('monsters', m.id, ['abilities', a.name, 'name'], a.name)}:</span>{" "}
                  <span className="text-muted-foreground">{tDataNested('monsters', m.id, ['abilities', a.name, 'description'], a.description)}</span>
                </p>
              ))}
            </div>
          )}

          {/* Tags */}
          {m.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {m.tags.map(tag => (
                <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-[9px] capitalize">{tData('monsters', '__tags', tag, tag)}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ========== WORLD ==========
function WorldRef() {
  const { locale, t, tData } = useLocale()
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-bold text-primary">{t('reference.world.ancestries')}</h3>
        <div className="space-y-2">
          {ANCESTRIES.map((a) => (
            <div key={a.id} className="rounded-lg bg-secondary/30 p-2.5">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-sm">{tData('ancestries', a.id, 'name', a.name)}</span>
                <span className="text-xs font-medium text-primary">{tData('ancestries', a.id, 'traitName', a.traitName)}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{tData('ancestries', a.id, 'traitDescription', a.traitDescription)}</p>
              <div className="mt-1.5 flex gap-1">
                {a.languages.map(l => (
                  <span key={l} className="rounded-full bg-secondary px-2 py-0.5 text-[9px]">{l}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-bold text-primary">{t('reference.world.classes')}</h3>
        <div className="space-y-2">
          {CLASSES.map((c) => (
            <div key={c.id} className="rounded-lg bg-secondary/30 p-2.5">
              <div className="flex items-baseline justify-between mb-0.5">
                <span className="font-semibold text-sm">{tData('classes', c.id, 'name', c.name)}</span>
                <span className="font-mono text-xs text-muted-foreground">{c.hitDie}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-1.5">{tData('classes', c.id, 'description', c.description)}</p>
              <div className="flex flex-wrap gap-1">
                {c.features.map(f => {
                  const classEs = CLASS_ES[c.id]
                  const fName = locale === 'es' && classEs?.features[f.name]?.name ? classEs.features[f.name].name : f.name
                  return (
                    <span key={f.name} className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-medium text-primary">{fName}</span>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-bold text-primary">{t('reference.world.deities')}</h3>
        <div className="space-y-2">
          {DEITIES.map((d) => (
            <div key={d.id} className="rounded-lg bg-secondary/30 p-2.5">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{tData('deities', d.id, 'name', d.name)}</span>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${d.alignment === "lawful" ? "bg-blue-500/20 text-blue-400" : d.alignment === "neutral" ? "bg-secondary text-muted-foreground" : "bg-red-500/20 text-red-400"}`}>
                  {d.alignment}
                </span>
              </div>
              <p className="text-[10px] font-semibold text-primary mb-0.5">{d.domain}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{tData('deities', d.id, 'description', d.description)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-bold text-primary">{t('reference.world.backgrounds')}</h3>
        <div className="grid gap-1.5">
          {BACKGROUNDS.map((b) => (
            <div key={b.id} className="rounded-lg bg-secondary/30 px-3 py-2 text-xs flex items-baseline gap-1.5">
              <span className="font-semibold">{tData('backgrounds', b.id, 'name', b.name)}:</span>{" "}
              <span className="text-muted-foreground">{tData('backgrounds', b.id, 'description', b.description)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ========== CLASSES (detailed) ==========
function ClassesRef({ search }: { search: string }) {
  const { locale, t, tData } = useLocale()
  const q = search.toLowerCase()
  const filtered = CLASSES.filter((c) => {
    if (!q) return true
    if (c.name.toLowerCase().includes(q)) return true
    if (locale === 'es' && CLASS_ES[c.id]?.name.toLowerCase().includes(q)) return true
    return false
  })

  const weaponsLabel = locale === 'es' ? 'Armas' : 'Weapons'
  const armorLabel = locale === 'es' ? 'Armadura' : 'Armor'
  const featuresLabel = locale === 'es' ? 'Rasgos' : 'Features'
  const talentTableLabel = locale === 'es' ? 'Tabla de Talentos' : 'Talent Table'
  const spellcastingLabel = locale === 'es' ? 'Lanzamiento de Hechizos' : 'Spellcasting'
  const spellcastingStatLabel = locale === 'es' ? 'Stat de lanzamiento' : 'Casting stat'
  const spellListLabel = locale === 'es' ? 'Lista de hechizos' : 'Spell list'
  const spellsKnownLabel = locale === 'es' ? 'Hechizos conocidos por nivel (Tier 1-5)' : 'Spells known by level (Tier 1-5)'
  const rollLabel = locale === 'es' ? 'Tirada' : 'Roll'
  const talentLabel = locale === 'es' ? 'Talento' : 'Talent'

  function formatRoll(roll: number | [number, number]) {
    return Array.isArray(roll) ? `${roll[0]}-${roll[1]}` : String(roll)
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {filtered.map((c) => (
        <div key={c.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="text-lg font-bold">{tData('classes', c.id, 'name', c.name)}</h3>
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
              {t('reference.classes.hitDie')}: {c.hitDie}
            </span>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            {tData('classes', c.id, 'description', c.description)}
          </p>

          {/* Proficiencies */}
          <div className="space-y-1 mb-3 text-xs">
            <p>
              <span className="font-semibold text-primary">{weaponsLabel}:</span>{" "}
              <span className="text-muted-foreground">{c.weaponProficiencies.map(p => locale === 'es' ? (PROF_ES[p] ?? p) : p).join(', ')}</span>
            </p>
            <p>
              <span className="font-semibold text-primary">{armorLabel}:</span>{" "}
              <span className="text-muted-foreground">
                {c.armorProficiencies[0] === 'none'
                  ? (locale === 'es' ? 'Ninguna' : 'None')
                  : c.armorProficiencies.map(p => locale === 'es' ? (PROF_ES[p] ?? p) : p).join(', ')}
              </span>
            </p>
          </div>

          {/* Features */}
          <div className="mb-3">
            <h4 className="text-xs font-bold text-primary mb-1">{featuresLabel}</h4>
            <div className="space-y-1.5">
              {c.features.map((f) => {
                const classEs = CLASS_ES[c.id]
                const fName = locale === 'es' && classEs?.features[f.name]?.name ? classEs.features[f.name].name : f.name
                const fDesc = locale === 'es' && classEs?.features[f.name]?.description ? classEs.features[f.name].description : f.description
                return (
                  <div key={f.name} className="rounded-lg bg-secondary/30 px-2.5 py-1.5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold">{fName}</span>
                      {f.level > 1 && (
                        <span className="text-[9px] text-muted-foreground">Lv {f.level}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{fDesc}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Talent Table */}
          <div className="mb-3">
            <h4 className="text-xs font-bold text-primary mb-1">{talentTableLabel}</h4>
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="px-2 py-1 text-left font-semibold w-16">{rollLabel}</th>
                    <th className="px-2 py-1 text-left font-semibold">{talentLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {c.talentTable.map((row, i) => {
                    const classEs = CLASS_ES[c.id]
                    const talentDesc = locale === 'es' && classEs?.talents[i] ? classEs.talents[i] : row.description
                    return (
                      <tr key={i} className={i % 2 === 0 ? '' : 'bg-secondary/20'}>
                        <td className="px-2 py-1 font-mono font-bold">{formatRoll(row.roll)}</td>
                        <td className="px-2 py-1 text-muted-foreground">{talentDesc}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Spellcasting info */}
          {c.spellcasting && (
            <div>
              <h4 className="text-xs font-bold text-primary mb-1">{spellcastingLabel}</h4>
              <div className="rounded-lg bg-secondary/30 p-2.5 text-[11px] space-y-1">
                <p>
                  <span className="font-semibold">{spellcastingStatLabel}:</span>{" "}
                  <span className="text-muted-foreground">{c.spellcasting.stat}</span>
                </p>
                <p>
                  <span className="font-semibold">{spellListLabel}:</span>{" "}
                  <span className="text-muted-foreground capitalize">{c.spellcasting.spellList}</span>
                </p>
                {c.spellsKnownByLevel && (
                  <div>
                    <p className="font-semibold mb-0.5">{spellsKnownLabel}:</p>
                    <div className="grid grid-cols-5 gap-1 text-center text-[9px]">
                      {c.spellsKnownByLevel.map((tiers, lvl) => (
                        <div key={lvl} className="rounded bg-secondary/50 px-1 py-0.5">
                          <div className="font-bold">Lv{lvl + 1}</div>
                          <div className="text-muted-foreground">{tiers.join('/')}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ========== CHARACTER CREATION ==========
function CharacterCreationRef() {
  const { locale, t, tData } = useLocale()
  const [expandedClass, setExpandedClass] = useState<string | null>(null)
  const [expandedSpellClass, setExpandedSpellClass] = useState<string | null>(null)

  const formatProf = (p: string) => {
    if (locale === 'es' && PROF_ES[p]) return PROF_ES[p]
    if (p === 'all' || p === 'all_melee') return p === 'all' ? 'All' : 'All melee'
    if (p === 'none') return 'None'
    return p.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div className="space-y-4">
      {/* Step 1: Roll Ability Scores */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-2 font-bold text-primary">
          {locale === 'es' ? '1. Tirar Puntuaciones de Habilidad' : '1. Roll Ability Scores'}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          {locale === 'es'
            ? 'Tira 3d6 en orden para cada habilidad: STR, DEX, CON, INT, WIS, CHA. Si ninguna puntuacion es 14 o mayor, puedes volver a tirar.'
            : 'Roll 3d6 in order for each ability: STR, DEX, CON, INT, WIS, CHA. If no score is 14 or higher, you may reroll.'}
        </p>
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-secondary/50">
                <th className="px-3 py-1.5 text-left font-semibold">{locale === 'es' ? 'Puntuacion' : 'Score'}</th>
                <th className="px-3 py-1.5 text-left font-semibold">{locale === 'es' ? 'Modificador' : 'Modifier'}</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['1-3', '-4'], ['4-5', '-3'], ['6-7', '-2'], ['8-9', '-1'],
                ['10-11', '+0'], ['12-13', '+1'], ['14-15', '+2'], ['16-17', '+3'], ['18+', '+4'],
              ].map(([score, mod], i) => (
                <tr key={score} className={i % 2 === 0 ? '' : 'bg-secondary/20'}>
                  <td className="px-3 py-1 font-mono">{score}</td>
                  <td className="px-3 py-1 font-mono font-bold">{mod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Step 2: Choose Ancestry */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-2 font-bold text-primary">
          {locale === 'es' ? '2. Elegir Ascendencia' : '2. Choose Ancestry'}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          {locale === 'es'
            ? 'Elige una de las 7 ascendencias disponibles. Cada una tiene un rasgo unico e idiomas.'
            : 'Choose one of the 7 available ancestries. Each has a unique trait and languages.'}
        </p>
        <div className="space-y-2">
          {ANCESTRIES.map((a) => (
            <div key={a.id} className="rounded-lg bg-secondary/30 p-2.5">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-sm">{tData('ancestries', a.id, 'name', a.name)}</span>
                <span className="text-xs font-medium text-primary">{tData('ancestries', a.id, 'traitName', a.traitName)}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{tData('ancestries', a.id, 'traitDescription', a.traitDescription)}</p>
              <div className="mt-1 flex gap-1">
                {a.languages.map(l => (
                  <span key={l} className="rounded-full bg-secondary px-2 py-0.5 text-[9px]">{l}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step 3: Choose Class */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-2 font-bold text-primary">
          {locale === 'es' ? '3. Elegir Clase' : '3. Choose Class'}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          {locale === 'es'
            ? 'Elige una clase. Esto determina tus dados de golpe, competencias y habilidades. Haz clic en una clase para ver sus detalles completos.'
            : 'Choose a class. This determines your hit die, proficiencies, and abilities. Click a class to see full details.'}
        </p>
        <div className="space-y-2">
          {CLASSES.map((c) => {
            const isExpanded = expandedClass === c.id
            return (
              <div key={c.id} className="rounded-lg bg-secondary/30 overflow-hidden">
                <button
                  onClick={() => setExpandedClass(isExpanded ? null : c.id)}
                  className="w-full p-2.5 text-left hover:bg-secondary/50 transition"
                >
                  <div className="flex items-baseline justify-between mb-0.5">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-sm">{tData('classes', c.id, 'name', c.name)}</span>
                      <span className="text-[10px] text-muted-foreground italic">{tData('classes', c.id, 'description', c.description)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground" title={locale === 'es' ? 'Dado de golpe (para calcular PG)' : 'Hit die (for calculating HP)'}>HP: {c.hitDie}</span>
                      <span className="text-xs text-muted-foreground">{isExpanded ? '\u25B2' : '\u25BC'}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {c.features.slice(0, 3).map(f => {
                      const classEs = CLASS_ES[c.id]
                      const fName = locale === 'es' && classEs?.features[f.name]?.name ? classEs.features[f.name].name : f.name
                      return (
                        <span key={f.name} className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-medium text-primary">{fName}</span>
                      )
                    })}
                    {c.spellcasting && (
                      <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[9px] font-medium text-purple-400">
                        {locale === 'es' ? 'Lanzador' : 'Spellcaster'} ({c.spellcasting.stat})
                      </span>
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border/30 p-3 space-y-3">
                    {/* Proficiencies */}
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <h5 className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">
                          {locale === 'es' ? 'Competencia con Armas' : 'Weapon Proficiencies'}
                        </h5>
                        <div className="flex flex-wrap gap-1">
                          {c.weaponProficiencies.map(w => (
                            <span key={w} className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">{formatProf(w)}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h5 className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">
                          {locale === 'es' ? 'Competencia con Armadura' : 'Armor Proficiencies'}
                        </h5>
                        <div className="flex flex-wrap gap-1">
                          {c.armorProficiencies.map(a => (
                            <span key={a} className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">{formatProf(a)}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    <div>
                      <h5 className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">
                        {locale === 'es' ? 'Rasgos de Clase' : 'Class Features'}
                      </h5>
                      <div className="space-y-1.5">
                        {c.features.map(f => {
                          const classEs = CLASS_ES[c.id]
                          const fName = locale === 'es' && classEs?.features[f.name]?.name ? classEs.features[f.name].name : f.name
                          const fDesc = locale === 'es' && classEs?.features[f.name]?.description ? classEs.features[f.name].description : f.description
                          return (
                            <div key={f.name} className="rounded-lg bg-card/50 border border-border/30 p-2">
                              <div className="flex items-baseline gap-2 mb-0.5">
                                <span className="text-xs font-semibold">{fName}</span>
                                {f.level > 1 && (
                                  <span className="text-[9px] text-muted-foreground">
                                    ({locale === 'es' ? `Nivel ${f.level}` : `Level ${f.level}`})
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground leading-relaxed">{fDesc}</p>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Spellcasting info (if applicable) */}
                    {c.spellcasting && c.spellsKnownByLevel && (
                      <div>
                        <h5 className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1">
                          {locale === 'es' ? 'Lanzamiento de Hechizos' : 'Spellcasting'}
                        </h5>
                        <div className="rounded-lg bg-purple-500/5 border border-purple-500/20 p-2.5 space-y-2">
                          <p className="text-[11px] text-muted-foreground">
                            <span className="font-semibold text-foreground">
                              {locale === 'es' ? 'Estadistica de lanzamiento: ' : 'Casting stat: '}
                            </span>
                            {c.spellcasting.stat}
                            <span className="mx-2">|</span>
                            <span className="font-semibold text-foreground">
                              {locale === 'es' ? 'Lista de hechizos: ' : 'Spell list: '}
                            </span>
                            {c.spellcasting.spellList.charAt(0).toUpperCase() + c.spellcasting.spellList.slice(1)}
                          </p>

                          {/* Spells Known Table */}
                          <div className="rounded-lg border border-border/50 overflow-hidden">
                            <table className="w-full text-[10px]">
                              <thead>
                                <tr className="bg-secondary/50">
                                  <th className="px-2 py-1 text-left font-semibold">{locale === 'es' ? 'Niv.' : 'Lv.'}</th>
                                  <th className="px-2 py-1 text-center font-semibold">T1</th>
                                  <th className="px-2 py-1 text-center font-semibold">T2</th>
                                  <th className="px-2 py-1 text-center font-semibold">T3</th>
                                  <th className="px-2 py-1 text-center font-semibold">T4</th>
                                  <th className="px-2 py-1 text-center font-semibold">T5</th>
                                </tr>
                              </thead>
                              <tbody>
                                {c.spellsKnownByLevel.map((row, lvl) => (
                                  <tr key={lvl} className={lvl % 2 === 0 ? '' : 'bg-secondary/20'}>
                                    <td className="px-2 py-0.5 font-mono font-bold">{lvl + 1}</td>
                                    {row.map((count, tier) => (
                                      <td key={tier} className={`px-2 py-0.5 text-center font-mono ${count > 0 ? 'text-purple-400 font-bold' : 'text-muted-foreground/50'}`}>
                                        {count}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step 4: Choose Background */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-2 font-bold text-primary">
          {locale === 'es' ? '4. Elegir Trasfondo' : '4. Choose Background'}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          {locale === 'es'
            ? `Tira 1d${BACKGROUNDS.length} o elige un trasfondo de la lista. Tu trasfondo te da ventaja en chequeos relevantes.`
            : `Roll 1d${BACKGROUNDS.length} or choose a background from the list. Your background gives you advantage on relevant checks.`}
        </p>
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {BACKGROUNDS.map((b, i) => (
            <div key={b.id} className="rounded-lg bg-secondary/30 px-2.5 py-1.5 text-xs flex gap-2">
              <span className="font-mono text-muted-foreground shrink-0 w-5 text-right">{i + 1}.</span>
              <div>
                <span className="font-semibold">{tData('backgrounds', b.id, 'name', b.name)}</span>
                <span className="text-muted-foreground"> -- {tData('backgrounds', b.id, 'description', b.description)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step 5: Choose Alignment */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-2 font-bold text-primary">
          {locale === 'es' ? '5. Elegir Alineamiento' : '5. Choose Alignment'}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          {locale === 'es'
            ? 'Elige una de las tres alineaciones. Esto afecta a que deidades puedes adorar y como los NPCs pueden reaccionar ante ti.'
            : 'Choose one of the three alignments. This affects which deities you can worship and how NPCs may react to you.'}
        </p>
        <div className="flex gap-3">
          {[
            { key: 'lawful', en: 'Lawful', es: 'Legal', color: 'bg-blue-500/20 text-blue-400' },
            { key: 'neutral', en: 'Neutral', es: 'Neutral', color: 'bg-secondary text-foreground' },
            { key: 'chaotic', en: 'Chaotic', es: 'Caotico', color: 'bg-red-500/20 text-red-400' },
          ].map(({ key, en, es, color }) => (
            <div key={key} className={`rounded-lg px-4 py-2 text-sm font-bold ${color}`}>
              {locale === 'es' ? es : en}
            </div>
          ))}
        </div>
      </div>

      {/* Step 6: Choose Deity */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-2 font-bold text-primary">
          {locale === 'es' ? '6. Elegir Deidad' : '6. Choose Deity'}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          {locale === 'es'
            ? 'Elige una deidad (requerido para sacerdotes). Hay 16 deidades agrupadas por alineamiento.'
            : 'Choose a deity (required for priests). There are 16 deities grouped by alignment.'}
        </p>
        {(['lawful', 'neutral', 'chaotic'] as const).map((alignment) => {
          const deities = DEITIES.filter(d => d.alignment === alignment)
          return (
            <div key={alignment} className="mb-3">
              <h4 className={`text-xs font-bold mb-1 ${
                alignment === 'lawful' ? 'text-blue-400' : alignment === 'chaotic' ? 'text-red-400' : 'text-muted-foreground'
              }`}>
                {alignment === 'lawful' ? (locale === 'es' ? 'Legal' : 'Lawful') :
                 alignment === 'neutral' ? 'Neutral' :
                 (locale === 'es' ? 'Caotico' : 'Chaotic')} ({deities.length})
              </h4>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {deities.map(d => (
                  <div key={d.id} className="rounded-lg bg-secondary/30 px-2.5 py-1.5 text-xs">
                    <span className="font-semibold">{tData('deities', d.id, 'name', d.name)}</span>
                    <span className="text-[10px] text-primary ml-1">{d.domain}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Step 7: Choose Languages */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-2 font-bold text-primary">
          {locale === 'es' ? '7. Elegir Idiomas' : '7. Choose Languages'}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          {locale === 'es'
            ? 'Tu ascendencia determina tus idiomas iniciales. Los humanos obtienen un idioma comun adicional.'
            : 'Your ancestry determines your starting languages. Humans get one additional common language.'}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <h4 className="text-xs font-bold text-primary mb-1">{locale === 'es' ? 'Idiomas Comunes' : 'Common Languages'}</h4>
            <div className="flex flex-wrap gap-1">
              {COMMON_LANGUAGES.map(l => (
                <span key={l.id} className="rounded-full bg-secondary px-2.5 py-1 text-xs">
                  {l.name} <span className="text-[9px] text-muted-foreground">({l.typicalSpeakers})</span>
                </span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold text-primary mb-1">{locale === 'es' ? 'Idiomas Raros' : 'Rare Languages'}</h4>
            <div className="flex flex-wrap gap-1">
              {RARE_LANGUAGES.map(l => (
                <span key={l.id} className="rounded-full bg-secondary px-2.5 py-1 text-xs">
                  {l.name} <span className="text-[9px] text-muted-foreground">({l.typicalSpeakers})</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Step 8: Starting Gear */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-2 font-bold text-primary">
          {locale === 'es' ? '8. Equipo Inicial' : '8. Starting Gear'}
        </h3>
        <p className="text-xs text-muted-foreground mb-2">
          {locale === 'es'
            ? 'Todos los personajes comienzan con un kit de exploracion, equipo de clase y oro para comprar equipo adicional.'
            : 'All characters start with a crawling kit, class-specific gear, and gold to buy additional equipment.'}
        </p>
        <div className="space-y-2 text-xs">
          <div className="rounded-lg bg-secondary/30 p-2.5">
            <span className="font-semibold">{locale === 'es' ? 'Kit de Exploracion' : 'Crawling Kit'}</span>
            <p className="text-muted-foreground mt-0.5">
              {locale === 'es'
                ? 'Mochila, cuerda (60 pies), raciones (3), pedernal, antorchas (2), espada corta o garrote.'
                : 'Backpack, rope (60 ft), rations (3), flint & steel, torches (2), shortsword or club.'}
            </p>
          </div>
          <div className="rounded-lg bg-secondary/30 p-2.5">
            <span className="font-semibold">{locale === 'es' ? 'Equipo de Clase' : 'Class Gear'}</span>
            <p className="text-muted-foreground mt-0.5">
              {locale === 'es'
                ? 'Cada clase recibe armas y armaduras adicionales segun su tipo. Los lanzadores de hechizos tambien obtienen hechizos iniciales.'
                : 'Each class receives additional weapons and armor based on type. Spellcasters also get starting spells.'}
            </p>
          </div>
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-amber-400">{locale === 'es' ? 'Oro Inicial' : 'Starting Gold'}</span>
              <span className="font-mono font-bold text-amber-400">2d6 x 5 gp</span>
            </div>
            <p className="text-muted-foreground mt-0.5">
              {locale === 'es'
                ? 'Tira 2d6 y multiplica por 5 para determinar tus monedas de oro iniciales (promedio 35 mo). Usa este oro para comprar equipo adicional de la pestana de Objetos.'
                : 'Roll 2d6 and multiply by 5 to determine your starting gold pieces (average 35 gp). Use this gold to buy additional equipment from the Items tab.'}
            </p>
            <div className="mt-1.5 flex items-center gap-3 text-[10px]">
              <span className="text-muted-foreground">
                {locale === 'es' ? 'Rango: 10-60 mo' : 'Range: 10-60 gp'}
              </span>
              <span className="text-muted-foreground">|</span>
              <span className="text-muted-foreground">
                {locale === 'es' ? 'Promedio: 35 mo' : 'Average: 35 gp'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Step 9: Calculate HP */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-2 font-bold text-primary">
          {locale === 'es' ? '9. Calcular HP' : '9. Calculate HP'}
        </h3>
        <p className="text-xs text-muted-foreground mb-2">
          {locale === 'es'
            ? 'Tira tu dado de golpe de clase + modificador de CON (minimo 1 HP). Los enanos obtienen +2 HP y tiran con ventaja.'
            : 'Roll your class hit die + CON modifier (minimum 1 HP). Dwarves get +2 HP and roll with advantage.'}
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { die: 'd4', classes: locale === 'es' ? 'Mago, Ladron, Bruja' : 'Wizard, Thief, Witch' },
            { die: 'd6', classes: locale === 'es' ? 'Sacerdote, Bardo, Brujo, Vidente, Caballero, Ras-Godai' : 'Priest, Bard, Warlock, Seer, Knight, Ras-Godai' },
            { die: 'd8', classes: locale === 'es' ? 'Guerrero, Explorador, Guerrero Basilisco, Jinete, Luchador, Lobo de Mar' : 'Fighter, Ranger, Basilisk Warrior, Desert Rider, Pit Fighter, Sea Wolf' },
          ].map(({ die, classes }) => (
            <div key={die} className="rounded-lg bg-secondary/30 p-2.5 text-center">
              <div className="text-lg font-bold font-mono text-primary">{die}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{classes}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Step 10: Choose Spells */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-2 font-bold text-primary">
          {locale === 'es' ? '10. Elegir Hechizos (si es lanzador)' : '10. Choose Spells (if spellcaster)'}
        </h3>

        {/* How Spellcasting Works */}
        <div className="rounded-lg bg-secondary/30 p-3 mb-4">
          <h4 className="text-xs font-bold text-primary mb-2">
            {locale === 'es' ? 'Como Funciona el Lanzamiento de Hechizos' : 'How Spellcasting Works'}
          </h4>
          <p className="text-[11px] text-muted-foreground mb-2">
            {locale === 'es'
              ? 'Para lanzar un hechizo, haz un chequeo con tu estadistica de lanzamiento contra CD 10 + nivel del hechizo. Los hechizos van del Tier 1 (CD 11) al Tier 5 (CD 15).'
              : 'To cast a spell, make a check with your casting stat vs DC 10 + spell tier. Spells range from Tier 1 (DC 11) to Tier 5 (DC 15).'}
          </p>
          <div className="space-y-2">
            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-2">
              <span className="text-xs font-bold text-blue-400">
                {locale === 'es' ? 'Mago (INT)' : 'Wizard (INT)'}
              </span>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                {locale === 'es'
                  ? 'Exito: el hechizo funciona. Fallo: el hechizo se pierde hasta descansar. Natural 1: el hechizo se pierde y tira en la tabla de Percances del Mago.'
                  : 'Success: spell works. Failure: spell is lost until rest. Nat 1: spell is lost AND roll on the Wizard Mishap table.'}
              </p>
            </div>
            <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-2">
              <span className="text-xs font-bold text-yellow-400">
                {locale === 'es' ? 'Sacerdote (WIS)' : 'Priest (WIS)'}
              </span>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                {locale === 'es'
                  ? 'Exito: el hechizo funciona. Fallo: el hechizo se pierde y debes hacer penitencia (orar 1 turno). Natural 1: la deidad esta enojada, todos los hechizos se pierden hasta penitencia.'
                  : 'Success: spell works. Failure: spell is lost and you must do penance (pray for 1 turn). Nat 1: deity is angered, ALL spells lost until penance.'}
              </p>
            </div>
            <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-2">
              <span className="text-xs font-bold text-purple-400">
                {locale === 'es' ? 'Bruja (CHA) / Vidente (WIS)' : 'Witch (CHA) / Seer (WIS)'}
              </span>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                {locale === 'es'
                  ? 'Funcionan de manera similar. Brujas: Natural 1 causa un Percance Diabolico. Videntes: Natural 1 requiere Penitencia del Vidente.'
                  : 'Work similarly. Witches: Nat 1 causes a Diabolical Mishap. Seers: Nat 1 requires Seer Penance.'}
              </p>
            </div>
          </div>
          <div className="mt-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-2">
            <span className="text-xs font-bold text-amber-400">
              {locale === 'es' ? 'Hechizos de Concentracion (Focus)' : 'Focus Spells'}
            </span>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
              {locale === 'es'
                ? 'Marcados con *, los hechizos de concentracion duran mientras mantengas la concentracion. Solo puedes concentrarte en un hechizo a la vez. Recibir dano o realizar otra accion puede romper la concentracion.'
                : 'Marked with *, focus spells last as long as you concentrate. You can only focus on one spell at a time. Taking damage or performing another action can break focus.'}
            </p>
          </div>
        </div>

        {/* Starting spells summary */}
        <p className="text-xs text-muted-foreground mb-3">
          {locale === 'es'
            ? 'Los magos comienzan con 3 hechizos de Tier 1. Los sacerdotes comienzan con 2 hechizos de Tier 1 (mas Expulsar Muertos Vivientes gratis). Las brujas comienzan con 3 hechizos de Tier 1. Los videntes comienzan con 1 hechizo de Tier 1.'
            : 'Wizards start with 3 Tier 1 spells. Priests start with 2 Tier 1 spells (plus Turn Undead for free). Witches start with 3 Tier 1 spells. Seers start with 1 Tier 1 spell.'}
        </p>

        {/* Tier 1 Spells by class with details */}
        {(['wizard', 'priest'] as const).map((cls) => {
          const tier1 = getSpellsByClassAndTier(cls, 1)
          const isExpanded = expandedSpellClass === cls
          const colorClass = cls === 'wizard' ? 'blue' : 'yellow'
          return (
            <div key={cls} className="mb-3">
              <button
                onClick={() => setExpandedSpellClass(isExpanded ? null : cls)}
                className="flex items-center gap-2 w-full text-left mb-1"
              >
                <h4 className={`text-xs font-bold text-${colorClass}-400`}>
                  {cls === 'wizard' ? (locale === 'es' ? 'Hechizos de Mago Tier 1' : 'Wizard Tier 1 Spells') :
                    (locale === 'es' ? 'Hechizos de Sacerdote Tier 1' : 'Priest Tier 1 Spells')}
                  {' '}({tier1.length})
                </h4>
                <span className="text-xs text-muted-foreground">{isExpanded ? '\u25B2' : '\u25BC'}</span>
              </button>

              {!isExpanded ? (
                <div className="flex flex-wrap gap-1.5">
                  {tier1.map(s => (
                    <span key={s.id} className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                      cls === 'wizard' ? 'bg-blue-500/15 text-blue-400' : 'bg-yellow-500/15 text-yellow-400'
                    }`}>
                      {tData('spells', s.id, 'name', s.name)}
                      {s.isFocus ? ' *' : ''}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {tier1.map(s => (
                    <div key={s.id} className={`rounded-lg border p-2.5 ${
                      cls === 'wizard' ? 'bg-blue-500/5 border-blue-500/20' : 'bg-yellow-500/5 border-yellow-500/20'
                    }`}>
                      <div className="flex items-start justify-between mb-1">
                        <span className={`text-xs font-bold ${cls === 'wizard' ? 'text-blue-400' : 'text-yellow-400'}`}>
                          {tData('spells', s.id, 'name', s.name)}
                          {s.isFocus ? ' *' : ''}
                        </span>
                      </div>
                      <div className="flex gap-3 text-[9px] text-muted-foreground mb-1">
                        <span>{locale === 'es' ? 'Alcance' : 'Range'}: {s.range}</span>
                        <span>{locale === 'es' ? 'Duracion' : 'Duration'}: {s.duration}{s.durationValue ? ` (${s.durationValue})` : ''}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        {tData('spells', s.id, 'description', s.description)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        <p className="text-[10px] text-muted-foreground italic">
          {locale === 'es' ? '* = hechizo de concentracion (focus)' : '* = focus spell (maintained by concentrating)'}
        </p>
      </div>

      {/* Step 11: Final Details */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-2 font-bold text-primary">
          {locale === 'es' ? '11. Detalles Finales' : '11. Final Details'}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          {locale === 'es'
            ? 'Completa tu personaje con los toques finales.'
            : 'Finish your character with the final touches.'}
        </p>
        <div className="space-y-2 text-xs">
          <div className="rounded-lg bg-secondary/30 p-2.5">
            <span className="font-semibold">{locale === 'es' ? 'Nombre' : 'Name'}</span>
            <p className="text-muted-foreground mt-0.5">
              {locale === 'es'
                ? 'Elige un nombre para tu personaje. Usa la pestana de Generadores para inspiracion.'
                : 'Choose a name for your character. Use the Generators tab for inspiration.'}
            </p>
          </div>
          <div className="rounded-lg bg-secondary/30 p-2.5">
            <span className="font-semibold">{locale === 'es' ? 'Trasfondo Breve' : 'Short Backstory'}</span>
            <p className="text-muted-foreground mt-0.5">
              {locale === 'es'
                ? 'Escribe 1-2 oraciones sobre el pasado de tu personaje. En ShadowDark, los personajes son aventureros desesperados que arriesgan sus vidas por riquezas.'
                : 'Write 1-2 sentences about your character\'s past. In ShadowDark, characters are desperate adventurers who risk their lives for treasure.'}
            </p>
          </div>
          <div className="rounded-lg bg-secondary/30 p-2.5">
            <span className="font-semibold">{locale === 'es' ? 'Titulo Inicial' : 'Starting Title'}</span>
            <p className="text-muted-foreground mt-0.5 mb-2">
              {locale === 'es'
                ? 'Tu titulo se determina por tu clase, alineamiento y nivel. A nivel 1, los titulos iniciales son:'
                : 'Your title is determined by your class, alignment, and level. At level 1, starting titles are:'}
            </p>
            <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {(() => {
                const seen = new Set<string>()
                return TITLES.filter(t => {
                  if (t.levelRange[0] !== 1) return false
                  const key = `${t.class}-${t.alignment}`
                  if (seen.has(key)) return false
                  seen.add(key)
                  return true
                }).slice(0, 12).map(t => (
                  <div key={`${t.class}-${t.alignment}`} className="rounded bg-secondary/50 px-2 py-1 text-[10px]">
                    <span className="font-semibold capitalize">{t.class.replace(/-/g, ' ')}</span>
                    <span className={`ml-1 ${
                      t.alignment === 'lawful' ? 'text-blue-400' : t.alignment === 'chaotic' ? 'text-red-400' : 'text-muted-foreground'
                    }`}>({t.alignment})</span>
                    <span className="text-primary ml-1">{t.title}</span>
                  </div>
                ))
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ========== TOOLS ==========

interface LightTimer {
  id: string
  label: string
  totalSeconds: number
  remainingSeconds: number
  active: boolean
}

interface LightPreset {
  key: string
  icon: string
  labelEn: string
  labelEs: string
  defaultMinutes: number
}

const DEFAULT_PRESETS: LightPreset[] = [
  { key: 'torch', icon: '🔥', labelEn: 'Torch', labelEs: 'Antorcha', defaultMinutes: 60 },
  { key: 'lantern', icon: '🏮', labelEn: 'Lantern', labelEs: 'Linterna', defaultMinutes: 240 },
  { key: 'campfire', icon: '🪵', labelEn: 'Campfire', labelEs: 'Fogata', defaultMinutes: 480 },
  { key: 'light_spell', icon: '✨', labelEn: 'Light Spell', labelEs: 'Hechizo Luz', defaultMinutes: 60 },
  { key: 'custom', icon: '⏱', labelEn: 'Custom', labelEs: 'Personalizado', defaultMinutes: 10 },
]

const STORAGE_KEY = 'shadowdark:light-presets'

function loadPresetDurations(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function savePresetDurations(durations: Record<string, number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(durations))
}

function ToolsTab() {
  const { locale } = useLocale()
  const [timers, setTimers] = useState<LightTimer[]>([])
  const [customDurations, setCustomDurations] = useState<Record<string, number>>(loadPresetDurations)
  const [showConfig, setShowConfig] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Tick all active timers every second
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimers(prev => prev.map(t => {
        if (!t.active || t.remainingSeconds <= 0) return t
        const next = t.remainingSeconds - 1
        return { ...t, remainingSeconds: next, active: next > 0 }
      }))
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  function getPresetMinutes(preset: LightPreset): number {
    return customDurations[preset.key] ?? preset.defaultMinutes
  }

  function updatePresetDuration(key: string, minutes: number) {
    const next = { ...customDurations, [key]: minutes }
    setCustomDurations(next)
    savePresetDurations(next)
  }

  function resetAllDurations() {
    setCustomDurations({})
    localStorage.removeItem(STORAGE_KEY)
  }

  function addTimer(label: string, minutes: number) {
    setTimers(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      label,
      totalSeconds: minutes * 60,
      remainingSeconds: minutes * 60,
      active: true,
    }])
  }

  function toggleTimer(id: string) {
    setTimers(prev => prev.map(t => t.id === id ? { ...t, active: !t.active } : t))
  }

  function resetTimer(id: string) {
    setTimers(prev => prev.map(t => t.id === id ? { ...t, remainingSeconds: t.totalSeconds, active: false } : t))
  }

  function removeTimer(id: string) {
    setTimers(prev => prev.filter(t => t.id !== id))
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  function formatDuration(minutes: number): string {
    if (minutes >= 60) return `${minutes / 60}h`
    return `${minutes}m`
  }

  return (
    <div className="space-y-6">
      {/* Light Source Tracker */}
      <div className="rounded-xl border border-orange-500/20 bg-card p-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-orange-400">
            {locale === 'es' ? 'Rastreador de Fuentes de Luz' : 'Light Source Tracker'}
          </h3>
          <button onClick={() => setShowConfig(!showConfig)}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition ${showConfig ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'border border-border hover:bg-accent'}`}>
            {showConfig ? (locale === 'es' ? 'Cerrar Config.' : 'Close Config') : '⚙️'}
          </button>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          {locale === 'es'
            ? 'Shadowdark usa tiempo REAL para las fuentes de luz. Haz clic en un botón para iniciar un temporizador.'
            : 'Shadowdark uses REAL TIME for light sources. Click a button to start a timer.'}
        </p>

        {/* Duration configurator */}
        {showConfig && (
          <div className="rounded-lg border border-orange-500/20 bg-secondary/20 p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-orange-300">
                {locale === 'es' ? 'Configurar Duraciones' : 'Configure Durations'}
              </h4>
              <button onClick={resetAllDurations} className="text-[10px] text-muted-foreground hover:text-foreground">
                {locale === 'es' ? 'Restaurar predeterminados' : 'Reset to defaults'}
              </button>
            </div>
            <div className="space-y-2">
              {DEFAULT_PRESETS.map(p => {
                const current = getPresetMinutes(p)
                const isCustomized = customDurations[p.key] !== undefined
                return (
                  <div key={p.key} className="flex items-center gap-3">
                    <span className="w-5 text-center">{p.icon}</span>
                    <span className="text-xs font-medium w-24">{locale === 'es' ? p.labelEs : p.labelEn}</span>
                    <input type="number" min={1} max={999} value={current}
                      onChange={e => updatePresetDuration(p.key, Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 rounded border border-input bg-background px-2 py-1 text-xs text-center outline-none focus:ring-1 focus:ring-ring" />
                    <span className="text-[10px] text-muted-foreground">{locale === 'es' ? 'minutos' : 'minutes'}</span>
                    {isCustomized && (
                      <span className="text-[9px] text-orange-400">
                        ({locale === 'es' ? 'por defecto' : 'default'}: {p.defaultMinutes}m)
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Preset buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {DEFAULT_PRESETS.map(p => {
            const minutes = getPresetMinutes(p)
            const label = locale === 'es' ? p.labelEs : p.labelEn
            return (
              <button key={p.key} onClick={() => addTimer(label, minutes)}
                className="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm font-medium hover:bg-secondary/60 transition flex items-center gap-2">
                <span>{p.icon}</span>
                <span>{label}</span>
                <span className="text-xs text-muted-foreground">({formatDuration(minutes)})</span>
              </button>
            )
          })}
        </div>

        {/* Active timers */}
        {timers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            {locale === 'es' ? 'No hay temporizadores activos. Haz clic arriba para añadir uno.' : 'No active timers. Click above to add one.'}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {timers.map(timer => {
              const pct = timer.totalSeconds > 0 ? (timer.remainingSeconds / timer.totalSeconds) * 100 : 0
              const isLow = pct < 20 && pct > 0
              const isDead = timer.remainingSeconds <= 0
              return (
                <div key={timer.id} className={`rounded-xl border p-3 transition ${
                  isDead ? 'border-red-500/40 bg-red-500/5' : isLow ? 'border-orange-500/40 bg-orange-500/5' : 'border-border bg-secondary/20'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">{timer.label}</span>
                    <button onClick={() => removeTimer(timer.id)} className="text-xs text-red-400 hover:text-red-300">✕</button>
                  </div>
                  {/* Progress bar */}
                  <div className="h-2 rounded-full bg-secondary/40 mb-2 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ${
                      isDead ? 'bg-red-500' : isLow ? 'bg-orange-500' : 'bg-primary'
                    }`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`font-mono text-xl font-bold ${isDead ? 'text-red-400' : isLow ? 'text-orange-400' : 'text-foreground'}`}>
                      {isDead ? (locale === 'es' ? 'APAGADA' : 'OUT') : formatTime(timer.remainingSeconds)}
                    </span>
                    <div className="flex gap-1">
                      {!isDead && (
                        <button onClick={() => toggleTimer(timer.id)}
                          className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                            timer.active ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'border border-border hover:bg-accent'
                          }`}>
                          {timer.active ? (locale === 'es' ? 'Pausar' : 'Pause') : (locale === 'es' ? 'Reanudar' : 'Resume')}
                        </button>
                      )}
                      <button onClick={() => resetTimer(timer.id)}
                        className="rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-accent transition">
                        {locale === 'es' ? 'Reiniciar' : 'Reset'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Dice Roller */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-lg font-bold text-primary">
          {locale === 'es' ? 'Tirador de Dados' : 'Dice Roller'}
        </h3>
        <DiceRoller characterName={locale === 'es' ? 'Mesa' : 'Table'} />
      </div>
    </div>
  )
}

// ========== GENERATORS ==========
function Generators() {
  const { t, ti } = useLocale()
  const [results, setResults] = useState<
    { id: number; label: string; value: string }[]
  >([])
  let nextId = results.length

  function add(label: string, value: string) {
    setResults((prev) => [{ id: nextId++, label, value }, ...prev].slice(0, 30))
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <button
            onClick={() => add(t('reference.generators.adventureName'), generateAdventureName())}
            className="rounded-lg border border-border p-3 text-left text-sm hover:bg-accent transition"
          >
            <div className="text-base mb-1">{t('reference.generators.adventureName')}</div>
          </button>
          <button
            onClick={() =>
              add(
                t('reference.generators.trap'),
                (() => {
                  const tr = getRandomTrap()
                  return `${tr.trap} (${tr.trigger}) — ${tr.effect}`
                })(),
              )
            }
            className="rounded-lg border border-border p-3 text-left text-sm hover:bg-accent transition"
          >
            <div className="text-base mb-1">{t('reference.generators.randomTrap')}</div>
          </button>
          <button
            onClick={() =>
              add(
                t('reference.generators.hazard'),
                (() => {
                  const h = getRandomHazard()
                  return `${h.movement} / ${h.damage} / ${h.weaken}`
                })(),
              )
            }
            className="rounded-lg border border-border p-3 text-left text-sm hover:bg-accent transition"
          >
            <div className="text-base mb-1">{t('reference.generators.randomHazard')}</div>
          </button>
          <button
            onClick={() =>
              add(
                t('reference.generators.d6Decider'),
                (() => {
                  const r = rollDice("1d6")
                  return r.total >= 4
                    ? `${t('reference.generators.favorable')} (${r.total})`
                    : `${t('reference.generators.unfavorable')} (${r.total})`
                })(),
              )
            }
            className="rounded-lg border border-border p-3 text-left text-sm hover:bg-accent transition"
          >
            <div className="text-base mb-1">{t('reference.generators.d6Decider')}</div>
          </button>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            {t('reference.generators.npcNames')}
          </p>
          <div className="flex flex-wrap gap-2">
            {["human", "dwarf", "elf", "halfling", "half-orc", "goblin"].map(
              (a) => (
                <button
                  key={a}
                  onClick={() => add(ti('reference.generators.name', { ancestry: a }), getRandomName(a))}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs capitalize hover:bg-accent transition"
                >
                  {a}
                </button>
              ),
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">{t('reference.generators.results')}</h3>
          {results.length > 0 && (
            <button
              onClick={() => setResults([])}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              {t('reference.generators.clear')}
            </button>
          )}
        </div>
        <div className="max-h-96 space-y-1.5 overflow-y-auto">
          {results.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t('reference.generators.clickToSeeResults')}
            </p>
          ) : (
            results.map((r) => (
              <div
                key={r.id}
                className="rounded-lg border border-border/50 p-2 text-xs"
              >
                <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {r.label}
                </div>
                <div className="font-medium">{r.value}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
