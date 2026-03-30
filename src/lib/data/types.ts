import type { MonsterDefinition } from '@/schemas/monsters.ts'
import type { SpellDefinition } from '@/schemas/spells.ts'
import type { WeaponDefinition, ArmorDefinition, GearDefinition } from '@/schemas/inventory.ts'
import type { BackgroundDefinition, DeityDefinition, LanguageDefinition } from '@/schemas/reference.ts'
import type { AncestryDefinition, ClassDefinition } from '@/schemas/character.ts'

export interface DataPack {
  id: string
  name: string
  author: string
  version: string
  description: string
  data: DataPackContent
}

export interface DataPackContent {
  monsters?: MonsterDefinition[]
  spells?: SpellDefinition[]
  weapons?: WeaponDefinition[]
  armor?: ArmorDefinition[]
  gear?: GearDefinition[]
  backgrounds?: BackgroundDefinition[]
  deities?: DeityDefinition[]
  languages?: LanguageDefinition[]
  ancestries?: AncestryDefinition[]
  classes?: ClassDefinition[]
}

export interface DataPackMeta {
  id: string
  name: string
  author: string
  version: string
  description: string
  counts: {
    monsters: number
    spells: number
    weapons: number
    armor: number
    gear: number
    backgrounds: number
    deities: number
    languages: number
    ancestries: number
    classes: number
  }
  addedAt: number
}
