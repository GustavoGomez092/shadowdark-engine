# ShadowDark Engine - Data Pack Creation Guide

This guide documents every data type, field, validation rule, and convention needed to create valid data packs for the ShadowDark Engine. It is written to be self-contained so that a data pack can be authored without access to the application source code.

---

## Table of Contents

1. [Overview](#overview)
2. [Pack JSON Structure](#pack-json-structure)
3. [Data Categories](#data-categories)
   - [Monsters](#monsters)
   - [Spells](#spells)
   - [Weapons](#weapons)
   - [Armor](#armor)
   - [Gear](#gear)
   - [Backgrounds](#backgrounds)
   - [Deities](#deities)
   - [Languages](#languages)
   - [Ancestries](#ancestries)
   - [Classes](#classes)
4. [Complete Example Pack](#complete-example-pack)
5. [Validation Rules](#validation-rules)
6. [Tips and Best Practices](#tips-and-best-practices)
7. [Type Reference Tables](#type-reference-tables)

---

## Overview

Data packs are user-created JSON bundles that extend the ShadowDark Engine with custom content. They can add new monsters, spells, weapons, armor, gear, backgrounds, deities, languages, ancestries, and character classes.

Key facts:

- Data packs are stored in the browser's **localStorage**. They persist across sessions on the same browser but are not synced between devices.
- Each pack can contain any combination of the 10 data categories. All categories are optional -- a pack with only monsters is perfectly valid.
- Packs can be **enabled or disabled** at any time. Disabled packs are retained in storage but their content is excluded from the game.
- If a pack entry shares an `id` with a core data entry, the **pack entry overrides the core entry**. This is intentional and allows packs to modify base-game content.
- All schemas use Zod's `.passthrough()`, meaning extra fields beyond what is documented here are preserved (not stripped). You can add custom metadata to entries and it will survive validation.

---

## Pack JSON Structure

A data pack is a single JSON object with these top-level fields:

| Field         | Type     | Required | Description |
|---------------|----------|----------|-------------|
| `id`          | string   | Yes      | Unique identifier for the pack. Use kebab-case (e.g., `"my-homebrew-pack"`). |
| `name`        | string   | Yes      | Human-readable display name (e.g., `"My Homebrew Pack"`). |
| `author`      | string   | Yes      | Name of the pack creator. |
| `version`     | string   | Yes      | Semantic version string (e.g., `"1.0.0"`). |
| `description` | string   | Yes      | Short summary of what the pack contains. |
| `color`       | string   | No       | CSS color value used for visual tagging in the UI (e.g., `"#e74c3c"`, `"rgb(46,204,113)"`, `"purple"`). Appears as a colored border/badge on entries from this pack. |
| `enabled`     | boolean  | No       | Whether the pack is active. Defaults to `true` when first added. |
| `data`        | object   | Yes      | The content object containing arrays of game entities. |

The `data` object has these optional array fields:

| Field          | Type                   | Description |
|----------------|------------------------|-------------|
| `monsters`     | MonsterDefinition[]    | Custom monsters and NPCs. |
| `spells`       | SpellDefinition[]      | Custom spells for wizards and priests. |
| `weapons`      | WeaponDefinition[]     | Custom weapons. |
| `armor`        | ArmorDefinition[]      | Custom armor and shields. |
| `gear`         | GearDefinition[]       | General equipment, consumables, ammo, etc. |
| `backgrounds`  | BackgroundDefinition[] | Character backgrounds. |
| `deities`      | DeityDefinition[]      | Gods and divine patrons. |
| `languages`    | LanguageDefinition[]   | Languages characters can learn. |
| `ancestries`   | AncestryDefinition[]   | Playable ancestries (races). |
| `classes`      | ClassDefinition[]      | Playable character classes. |

Minimal skeleton:

```json
{
  "id": "my-pack",
  "name": "My Pack",
  "author": "Your Name",
  "version": "1.0.0",
  "description": "A custom data pack.",
  "color": "#3498db",
  "data": {}
}
```

---

## Data Categories

### Monsters

Monster definitions represent creatures the GM can add to encounters.

#### Field Reference

| Field          | Type              | Required | Description |
|----------------|-------------------|----------|-------------|
| `id`           | string            | Yes      | Unique identifier (kebab-case). |
| `name`         | string            | Yes      | Display name. |
| `description`  | string            | No       | Flavor text. |
| `level`        | number            | Yes      | Challenge level (typically 0-15+). |
| `ac`           | number            | Yes      | Armor class. |
| `acSource`     | string            | No       | Flavor for AC origin (e.g., `"natural"`, `"chainmail"`). |
| `hp`           | number            | Yes      | Average hit points. |
| `hpDice`       | string            | No       | Dice expression for rolling HP (e.g., `"2d8+2"`). |
| `attacks`      | MonsterAttack[]   | Yes      | Array of attack objects (see below). |
| `movement`     | MonsterMovement   | Yes      | Movement capabilities (see below). |
| `stats`        | AbilityScores     | Yes      | Object with keys `STR`, `DEX`, `CON`, `INT`, `WIS`, `CHA` (all numbers). |
| `alignment`    | Alignment         | Yes      | One of: `"lawful"`, `"neutral"`, `"chaotic"`. |
| `abilities`    | MonsterAbility[]  | Yes      | Array of special abilities (can be empty `[]`). |
| `checksMorale` | boolean           | Yes      | Whether the monster makes morale checks. Undead/constructs typically use `false`. |
| `tags`         | string[]          | Yes      | Creature type tags (e.g., `["undead"]`, `["beast", "aquatic"]`). |

**MonsterAttack fields:**

| Field           | Type          | Required | Description |
|-----------------|---------------|----------|-------------|
| `name`          | string        | Yes      | Attack name (e.g., `"Claw"`, `"Longbow"`). |
| `bonus`         | number        | Yes      | Attack roll modifier. |
| `damage`        | string        | Yes      | Dice expression (e.g., `"1d6+2"`, `"2d8"`). |
| `damageType`    | string        | No       | Type of damage (e.g., `"fire"`, `"necrotic"`). |
| `range`         | RangeCategory | Yes      | One of: `"close"`, `"near"`, `"far"`. |
| `multiattack`   | number        | No       | Number of times this attack is made per turn. |
| `specialEffect` | string        | No       | Description of special on-hit effects. |

**MonsterMovement fields:**

| Field    | Type          | Required | Description |
|----------|---------------|----------|-------------|
| `normal` | RangeCategory | Yes      | Base walking speed. Typically `"near"`. |
| `double` | boolean       | No       | If `true`, the creature moves double near. |
| `fly`    | RangeCategory | No       | Flying speed. |
| `swim`   | RangeCategory | No       | Swimming speed. |
| `climb`  | RangeCategory | No       | Climbing speed. |
| `burrow` | RangeCategory | No       | Burrowing speed. |

**MonsterAbility fields:**

| Field        | Type                    | Required | Description |
|--------------|-------------------------|----------|-------------|
| `name`       | string                  | Yes      | Ability name. |
| `description`| string                  | Yes      | Full text description. |
| `mechanic`   | MonsterAbilityMechanic  | No       | Structured mechanic for automation (see type reference). |

**MonsterAbilityMechanic types:**

| `type`                | Additional Fields | Description |
|-----------------------|-------------------|-------------|
| `damage_resistance`   | `source: string`  | Only damaged by a specific source. |
| `damage_immunity`     | `damageType: string` | Immune to a damage type. |
| `condition_immunity`  | `condition: string` | Immune to a condition. |
| `morale_immunity`     | (none)            | Never checks morale. |
| `regeneration`        | `amount: string`, `prevention?: string` | Regenerates HP each round. |
| `spellcasting`        | `spells: string[]`, `stat: string`, `dc: number` | Can cast named spells. |
| `custom`              | `key: string`, `value: unknown` | Catch-all for homebrew mechanics. |

#### Example

```json
{
  "id": "shadow-drake",
  "name": "Shadow Drake",
  "description": "A small draconic creature that dwells in darkness.",
  "level": 4,
  "ac": 14,
  "acSource": "natural",
  "hp": 22,
  "hpDice": "4d8+4",
  "attacks": [
    {
      "name": "Bite",
      "bonus": 4,
      "damage": "1d8+2",
      "range": "close"
    },
    {
      "name": "Shadow Breath",
      "bonus": 4,
      "damage": "2d6",
      "damageType": "necrotic",
      "range": "near",
      "specialEffect": "DC 13 DEX or blinded for 1 round"
    }
  ],
  "movement": {
    "normal": "near",
    "fly": "near"
  },
  "stats": { "STR": 14, "DEX": 16, "CON": 12, "INT": 8, "WIS": 12, "CHA": 10 },
  "alignment": "chaotic",
  "abilities": [
    {
      "name": "Shadow Meld",
      "description": "In dim light or darkness the shadow drake is invisible while motionless."
    },
    {
      "name": "Light Sensitivity",
      "description": "Disadvantage on attacks while in bright light."
    }
  ],
  "checksMorale": true,
  "tags": ["dragon", "shadow"]
}
```

**How the app uses these fields:** Monsters are listed in the GM encounter builder. `level` is used for XP budgeting. `attacks`, `stats`, and `ac` drive the combat tracker. `checksMorale` triggers morale roll prompts when conditions are met. `tags` are used for filtering and for mechanics that reference creature types (e.g., Turn Undead checks the `"undead"` tag).

---

### Spells

Spell definitions represent castable spells for wizard and priest classes (and expansion caster classes).

#### Field Reference

| Field            | Type          | Required | Description |
|------------------|---------------|----------|-------------|
| `id`             | string        | Yes      | Unique identifier (kebab-case). |
| `name`           | string        | Yes      | Display name. |
| `tier`           | number (1-5)  | Yes      | Spell tier. Must be an integer from 1 to 5. |
| `class`          | SpellClass    | Yes      | One of: `"wizard"`, `"priest"`. |
| `range`          | string        | Yes      | One of: `"self"`, `"touch"`, `"close"`, `"near"`, `"far"`. |
| `duration`       | SpellDuration | Yes      | One of: `"instant"`, `"rounds"`, `"focus"`, `"hours"`, `"days"`, `"permanent"`, `"special"`. |
| `durationValue`  | number        | No       | Numeric qualifier (e.g., `5` means 5 rounds, `10` means 10 rounds). |
| `isFocus`        | boolean       | Yes      | If `true`, the spell requires ongoing concentration. |
| `description`    | string        | Yes      | Full spell description text. |
| `effects`        | SpellEffect[] | Yes      | Array of structured effect objects (see below). |
| `hasAdvantage`   | boolean       | No       | If `true`, the caster rolls the spellcasting check with advantage. |

**SpellEffect types:**

| `type`      | Additional Fields | Description |
|-------------|-------------------|-------------|
| `damage`    | `dice: string`, `damageType?: string` | Deals damage (e.g., `"2d6"`). |
| `healing`   | `dice: string` | Restores HP. |
| `buff`      | `stat?: AbilityScore`, `bonus: number`, `duration?: number` | Grants a stat or attack bonus. |
| `condition` | `condition: ConditionType`, `duration?: number`, `saveDC?: number` | Applies a condition. |
| `ac_bonus`  | `amount: number` | Grants bonus to AC. |
| `light`     | `range: RangeCategory`, `durationRealMinutes: number` | Creates light (tracked by real-time timer). |
| `utility`   | `description: string` | Non-combat effect, described in text. |
| `custom`    | `key: string`, `value: unknown` | Catch-all for homebrew effects. |

#### Example

```json
{
  "id": "shadow-bolt",
  "name": "Shadow Bolt",
  "tier": 2,
  "class": "wizard",
  "range": "far",
  "duration": "instant",
  "isFocus": false,
  "description": "A bolt of pure shadow streaks toward a target within far range, dealing 2d8 necrotic damage.",
  "effects": [
    { "type": "damage", "dice": "2d8", "damageType": "necrotic" }
  ]
}
```

**How the app uses these fields:** Spells appear in the character spell list filtered by `class` and `tier`. The casting check DC is computed as `10 + tier`. `isFocus` triggers the focus spell tracker. `effects` drive automated HP changes, condition application, and timer creation. `durationValue` populates round counters.

---

### Weapons

Weapon definitions describe melee and ranged weapons characters can equip.

#### Field Reference

| Field             | Type             | Required | Description |
|-------------------|------------------|----------|-------------|
| `id`              | string           | Yes      | Unique identifier (kebab-case). |
| `name`            | string           | Yes      | Display name. |
| `type`            | string           | Yes      | One of: `"melee"`, `"ranged"`. |
| `damage`          | DieType          | Yes      | Damage die. One of: `"d4"`, `"d6"`, `"d8"`, `"d10"`, `"d12"`. |
| `range`           | RangeCategory    | Yes      | One of: `"close"`, `"near"`, `"far"`. Melee weapons are typically `"close"`. |
| `properties`      | WeaponProperty[] | Yes      | Array of property strings (can be empty `[]`). |
| `versatileDamage` | DieType          | No       | Higher damage die when wielded two-handed. Only relevant if `"versatile"` is in `properties`. |
| `cost`            | number           | Yes      | Cost in gold pieces. Use decimals for silver/copper: `0.5` = 5 sp, `0.05` = 5 cp. |
| `slots`           | number           | Yes      | Number of gear slots occupied. |
| `description`     | string           | No       | Flavor text or special notes. |

**WeaponProperty values:** `"finesse"`, `"loading"`, `"thrown"`, `"two_handed"`, `"versatile"`

#### Example

```json
{
  "id": "war-pick",
  "name": "War Pick",
  "type": "melee",
  "damage": "d8",
  "range": "close",
  "properties": [],
  "cost": 8,
  "slots": 1,
  "description": "A piercing military weapon favored by dwarven soldiers."
}
```

**How the app uses these fields:** Weapons appear in the inventory shop and on the character sheet. `damage` is rolled during attacks. `properties` affect combat mechanics: `"finesse"` allows DEX for melee attacks, `"thrown"` allows melee weapons to be used at range, `"two_handed"` prevents shield use, `"versatile"` unlocks the `versatileDamage` die, and `"loading"` limits attacks per round. `cost` is used for purchasing and selling. `slots` counts against the character's gear slot capacity.

---

### Armor

Armor definitions describe protective equipment.

#### Field Reference

| Field            | Type      | Required | Description |
|------------------|-----------|----------|-------------|
| `id`             | string    | Yes      | Unique identifier (kebab-case). |
| `name`           | string    | Yes      | Display name. |
| `type`           | ArmorType | Yes      | One of: `"leather"`, `"chainmail"`, `"plate"`, `"shield"`. |
| `acBase`         | number    | Yes      | Base AC value (e.g., 11 for leather, 13 for chainmail, 15 for plate, 2 for shield). |
| `addDex`         | boolean   | Yes      | Whether the wearer adds their DEX modifier to AC. |
| `stealthPenalty` | boolean   | Yes      | Whether the armor imposes disadvantage on stealth checks. |
| `swimPenalty`    | string    | Yes      | One of: `"none"`, `"disadvantage"`, `"cannot"`. |
| `cost`           | number    | Yes      | Cost in gold pieces. |
| `slots`          | number    | Yes      | Gear slots occupied. |
| `isMithral`      | boolean   | Yes      | Whether this is a mithral variant. Mithral armor has reduced penalties. |

#### Example

```json
{
  "id": "elven-chainmail",
  "name": "Elven Chainmail",
  "type": "chainmail",
  "acBase": 13,
  "addDex": true,
  "stealthPenalty": false,
  "swimPenalty": "none",
  "cost": 200,
  "slots": 1,
  "isMithral": true
}
```

**How the app uses these fields:** Armor is equipped from the inventory to compute the character's AC. `acBase` is the starting value, `addDex` determines if DEX modifier applies. Shields add their `acBase` as a bonus on top of worn armor. `stealthPenalty` and `swimPenalty` are checked during relevant skill checks. `isMithral` affects class proficiency rules (some classes can wear mithral chainmail but not regular chainmail).

---

### Gear

Gear definitions cover all general equipment: ammo, rations, light sources, consumables, and miscellaneous items.

#### Field Reference

| Field             | Type           | Required | Description |
|-------------------|----------------|----------|-------------|
| `id`              | string         | Yes      | Unique identifier (kebab-case). |
| `name`            | string         | Yes      | Display name. |
| `category`        | ItemCategory   | Yes      | One of the item category values (see type reference). |
| `cost`            | number         | Yes      | Cost in gold pieces. Use decimals: `0.5` = 5 sp, `0.05` = 5 cp. |
| `slots`           | number         | Yes      | Gear slots occupied. |
| `description`     | string         | Yes      | Item description. |
| `quantityPerSlot` | number         | No       | How many of the item fit in one slot (e.g., 20 arrows per slot). |
| `mechanics`       | GearMechanic[] | No       | Structured mechanics for automated effects. |

**GearMechanic fields:**

| Field         | Type          | Required | Description |
|---------------|---------------|----------|-------------|
| `type`        | string        | Yes      | One of: `"light_source"`, `"healing"`, `"advantage"`, `"damage"`, `"utility"`. |
| `value`       | number        | No       | Numeric value (e.g., HP healed). |
| `dieValue`    | string        | No       | Dice expression (e.g., `"1d6"`). |
| `range`       | RangeCategory | No       | Range of effect. |
| `description` | string        | No       | Text description of the mechanic. |

#### Example

```json
{
  "id": "smoke-bomb",
  "name": "Smoke Bomb",
  "category": "consumable",
  "cost": 5,
  "slots": 1,
  "description": "Creates a cloud of thick smoke at near range, obscuring vision for 3 rounds.",
  "mechanics": [
    {
      "type": "utility",
      "range": "near",
      "description": "Obscures vision in close area for 3 rounds"
    }
  ]
}
```

**How the app uses these fields:** Gear appears in the inventory and shop. `category` determines how the item behaves: `"ammo"` tracks quantity, `"light_source"` integrates with the torch timer, `"consumable"` tracks uses and expended state, `"ration"` counts toward rest supplies. `quantityPerSlot` sets the per-slot stacking limit. `mechanics` drive automated effects when items are used.

---

### Backgrounds

Backgrounds are short character origin descriptions chosen during character creation.

#### Field Reference

| Field         | Type   | Required | Description |
|---------------|--------|----------|-------------|
| `id`          | string | Yes      | Unique identifier (kebab-case). |
| `name`        | string | Yes      | Display name. |
| `description` | string | Yes      | Brief description of the background. |

#### Example

```json
{
  "id": "monster-hunter",
  "name": "Monster Hunter",
  "description": "You have tracked and slain many beasts across the wilds."
}
```

**How the app uses these fields:** Backgrounds appear in the character creation dropdown and on the character sheet. The `description` provides the GM context for adjudicating background-related checks (e.g., a character with the "Monster Hunter" background might get advantage on tracking beast-type creatures).

---

### Deities

Deity definitions represent gods that priest characters (and others) can worship.

#### Field Reference

| Field         | Type      | Required | Description |
|---------------|-----------|----------|-------------|
| `id`          | string    | Yes      | Unique identifier (kebab-case). |
| `name`        | string    | Yes      | Display name. |
| `alignment`   | Alignment | Yes      | One of: `"lawful"`, `"neutral"`, `"chaotic"`. |
| `domain`      | string    | Yes      | Comma-separated domains (e.g., `"War, justice"`). |
| `description` | string    | Yes      | Flavor description of the deity. |

#### Example

```json
{
  "id": "thar-the-forge",
  "name": "Thar the Forge",
  "alignment": "lawful",
  "domain": "Smithing, craft, endurance",
  "description": "God of the forge and patron of dwarven smiths. Teaches that true strength is forged through labor."
}
```

**How the app uses these fields:** Deities appear in the character creation dropdown filtered by `alignment` (priests must match their deity's alignment). The `domain` field is displayed on the character sheet. The `description` is shown in deity selection and reference views.

---

### Languages

Language definitions represent languages that characters can learn.

#### Field Reference

| Field             | Type   | Required | Description |
|-------------------|--------|----------|-------------|
| `id`              | string | Yes      | Unique identifier (kebab-case). |
| `name`            | string | Yes      | Display name. |
| `rarity`          | string | Yes      | One of: `"common"`, `"rare"`. |
| `typicalSpeakers` | string | Yes      | Who typically speaks this language. |

#### Example

```json
{
  "id": "abyssal",
  "name": "Abyssal",
  "rarity": "rare",
  "typicalSpeakers": "Demons of the Abyss"
}
```

**How the app uses these fields:** Languages appear in character creation and on the character sheet. `rarity` affects availability -- `"common"` languages can be freely selected, while `"rare"` languages are typically granted by specific class features, backgrounds, or GM decision.

---

### Ancestries

Ancestry definitions represent playable character races with unique mechanical traits.

#### Field Reference

| Field              | Type                | Required | Description |
|--------------------|---------------------|----------|-------------|
| `id`               | string              | Yes      | Unique identifier (kebab-case, e.g., `"fire-genasi"`). |
| `name`             | string              | Yes      | Display name. |
| `traitName`        | string              | Yes      | Name of the ancestry's special trait (e.g., `"Stout"`, `"Farsight"`). |
| `traitDescription` | string              | Yes      | Full text description of the trait. |
| `mechanics`        | AncestryMechanic[]  | Yes      | Array of structured mechanical effects. |
| `languages`        | string[]            | Yes      | Languages the ancestry knows by default. |

**AncestryMechanic fields:**

| Field         | Type                  | Required | Description |
|---------------|-----------------------|----------|-------------|
| `type`        | AncestryMechanicType  | Yes      | The mechanic type (see type reference). |
| `value`       | number                | No       | Numeric value for the mechanic (e.g., bonus amount). |
| `duration`    | number                | No       | Duration in rounds. |
| `usesPerDay`  | number                | No       | Number of daily uses. |
| `isChoice`    | boolean               | No       | If `true`, this is one option in a choice group. |
| `choiceGroup` | string                | No       | Identifies which choice group this belongs to. Mechanics with the same `choiceGroup` are mutually exclusive. |

#### Example

```json
{
  "id": "fire-genasi",
  "name": "Fire Genasi",
  "traitName": "Inner Flame",
  "traitDescription": "+1 bonus to melee damage rolls. Once per day, you can wreathe your weapon in flame for 3 rounds, dealing an extra 1d4 fire damage.",
  "mechanics": [
    { "type": "bonus_melee_damage", "value": 1 },
    { "type": "bonus_melee_attack", "value": 0, "duration": 3, "usesPerDay": 1 }
  ],
  "languages": ["Common", "Primordial"]
}
```

**How the app uses these fields:** Ancestries appear in character creation. `mechanics` are applied to the character's computed values: `bonus_hp` adds to max HP, `advantage_hp_roll` triggers advantage on level-up HP rolls, attack/spell bonuses modify the relevant check totals. `isChoice` and `choiceGroup` present the player with a selection during creation (e.g., elves choose between ranged attack bonus or spellcasting bonus). `languages` are automatically added to the character's known languages.

---

### Classes

Class definitions are the most complex data type. They define a playable character class with hit die, proficiencies, features, talent table, and optional spellcasting.

#### Field Reference

| Field                 | Type               | Required | Description |
|-----------------------|--------------------|----------|-------------|
| `id`                  | string             | Yes      | Unique identifier (kebab-case). |
| `name`                | string             | Yes      | Display name. |
| `description`         | string             | Yes      | Class flavor description. |
| `hitDie`              | DieType            | Yes      | Hit die type. One of: `"d4"`, `"d6"`, `"d8"`, `"d10"`, `"d12"`. |
| `weaponProficiencies` | string[]           | Yes      | Array of weapon IDs the class can use, or `["all"]` for all weapons. |
| `armorProficiencies`  | ArmorProficiency[] | Yes      | Array of armor proficiency values. |
| `features`            | ClassFeature[]     | Yes      | Array of class features gained at specific levels. |
| `talentTable`         | TalentTableEntry[] | Yes      | The 2d6 talent roll table. |
| `spellcasting`        | SpellcastingConfig | No       | Present only for spellcasting classes. |
| `spellsKnownByLevel`  | number[][]         | No       | Required if `spellcasting` is present. Array of 10 arrays (one per level), each containing 5 numbers: `[tier1, tier2, tier3, tier4, tier5]` spells known. |

**ArmorProficiency values:** `"none"`, `"leather"`, `"chainmail"`, `"plate"`, `"shield"`, `"mithral_chainmail"`

**ClassFeature fields:**

| Field       | Type                 | Required | Description |
|-------------|----------------------|----------|-------------|
| `name`      | string               | Yes      | Feature name. |
| `level`     | number               | Yes      | Level at which the feature is gained. |
| `description` | string             | Yes      | Full text description. |
| `mechanic`  | ClassFeatureMechanic | Yes      | Structured mechanic object (see type reference). |

**TalentTableEntry fields:**

| Field         | Type                    | Required | Description |
|---------------|-------------------------|----------|-------------|
| `roll`        | number or [number, number] | Yes   | Single value or `[low, high]` range on a 2d6 roll. |
| `description` | string                  | Yes      | Text description of the talent. |
| `mechanic`    | TalentMechanic          | Yes      | Structured mechanic object (see type reference). |

**SpellcastingConfig fields:**

| Field       | Type   | Required | Description |
|-------------|--------|----------|-------------|
| `stat`      | string | Yes      | Ability score used for spellcasting. One of: `"INT"`, `"WIS"`, `"CHA"`. |
| `spellList` | string | Yes      | Which spell list the class uses. One of: `"wizard"`, `"priest"`, `"witch"`, `"seer"`. |

#### Example

```json
{
  "id": "warden",
  "name": "Warden",
  "description": "Nature guardians who draw power from the wild places of the world.",
  "hitDie": "d8",
  "weaponProficiencies": ["club", "dagger", "longbow", "longsword", "shortbow", "spear", "staff"],
  "armorProficiencies": ["leather", "chainmail", "shield", "mithral_chainmail"],
  "features": [
    {
      "name": "Nature's Ward",
      "level": 1,
      "description": "You can cast priest spells using your WIS modifier. Your magic draws from nature rather than a deity.",
      "mechanic": { "type": "spellcasting", "stat": "WIS" }
    },
    {
      "name": "Wayfinder",
      "level": 1,
      "description": "You have advantage on checks for tracking, foraging, navigating, and surviving in wilderness.",
      "mechanic": { "type": "wayfinder", "skills": ["tracking", "foraging", "navigating", "wilderness_survival"] }
    }
  ],
  "talentTable": [
    { "roll": 2, "description": "Gain advantage on casting one spell you know", "mechanic": { "type": "spell_advantage" } },
    { "roll": [3, 6], "description": "+1 to melee and ranged attacks", "mechanic": { "type": "attack_bonus", "melee": 1, "ranged": 1 } },
    { "roll": [7, 9], "description": "+1 to priest spellcasting checks", "mechanic": { "type": "spellcasting_bonus", "amount": 1 } },
    { "roll": [10, 11], "description": "+2 to STR or WIS stat", "mechanic": { "type": "stat_bonus", "stats": ["STR", "WIS"], "amount": 2 } },
    { "roll": 12, "description": "Choose a talent or +2 points to distribute to stats", "mechanic": { "type": "choose_talent_or_stats" } }
  ],
  "spellcasting": { "stat": "WIS", "spellList": "priest" },
  "spellsKnownByLevel": [
    [2, 0, 0, 0, 0],
    [3, 0, 0, 0, 0],
    [3, 1, 0, 0, 0],
    [3, 2, 0, 0, 0],
    [3, 2, 1, 0, 0],
    [3, 2, 2, 0, 0],
    [3, 3, 2, 1, 0],
    [3, 3, 2, 2, 0],
    [3, 3, 2, 2, 1],
    [3, 3, 3, 2, 2]
  ]
}
```

**How the app uses these fields:** Classes are the core of character creation. `hitDie` determines HP per level. `weaponProficiencies` and `armorProficiencies` determine which equipment the character can use effectively. `features` are displayed on the character sheet and their `mechanic` values drive automated bonuses (attack bonuses, advantage grants, backstab damage, etc.). The `talentTable` is rolled on (2d6) at levels 1, 3, 5, 7, and 9. `spellcasting` enables the spell management UI and `spellsKnownByLevel` controls how many spells of each tier the character can know at each level.

---

## Complete Example Pack

Below is a complete, valid data pack with one entry of each type:

```json
{
  "id": "shadow-realms",
  "name": "Shadow Realms Expansion",
  "author": "Homebrew Author",
  "version": "1.0.0",
  "description": "Creatures, spells, and equipment from the Shadow Realms setting.",
  "color": "#6c3483",
  "data": {
    "monsters": [
      {
        "id": "shadow-realms-shade-stalker",
        "name": "Shade Stalker",
        "description": "A predator from the shadow plane that hunts by sensing life force.",
        "level": 3,
        "ac": 13,
        "acSource": "natural",
        "hp": 15,
        "hpDice": "3d8+3",
        "attacks": [
          {
            "name": "Shadow Claws",
            "bonus": 3,
            "damage": "1d6+2",
            "damageType": "necrotic",
            "range": "close",
            "multiattack": 2
          }
        ],
        "movement": { "normal": "near" },
        "stats": { "STR": 14, "DEX": 15, "CON": 12, "INT": 6, "WIS": 14, "CHA": 8 },
        "alignment": "chaotic",
        "abilities": [
          {
            "name": "Life Sense",
            "description": "The shade stalker can sense living creatures within far range, even through walls."
          },
          {
            "name": "Shadow Step",
            "description": "Once per round, the shade stalker can teleport from one shadow to another within near range."
          }
        ],
        "checksMorale": true,
        "tags": ["shadow", "predator"]
      }
    ],
    "spells": [
      {
        "id": "shadow-realms-shadow-cloak",
        "name": "Shadow Cloak",
        "tier": 1,
        "class": "wizard",
        "range": "self",
        "duration": "focus",
        "isFocus": true,
        "description": "You wrap yourself in living shadow. You have advantage on stealth checks and gain +1 AC while in dim light or darkness.",
        "effects": [
          { "type": "ac_bonus", "amount": 1 },
          { "type": "utility", "description": "Advantage on stealth checks in dim light or darkness" }
        ]
      }
    ],
    "weapons": [
      {
        "id": "shadow-realms-umbral-blade",
        "name": "Umbral Blade",
        "type": "melee",
        "damage": "d8",
        "range": "close",
        "properties": ["finesse"],
        "cost": 15,
        "slots": 1,
        "description": "A blade forged from solidified shadow. Flickers at the edges."
      }
    ],
    "armor": [
      {
        "id": "shadow-realms-shadow-silk",
        "name": "Shadow Silk Armor",
        "type": "leather",
        "acBase": 12,
        "addDex": true,
        "stealthPenalty": false,
        "swimPenalty": "none",
        "cost": 50,
        "slots": 1,
        "isMithral": false
      }
    ],
    "gear": [
      {
        "id": "shadow-realms-darkstone-lantern",
        "name": "Darkstone Lantern",
        "category": "light_source",
        "cost": 10,
        "slots": 1,
        "description": "A lantern that emits a pale violet light. Illuminates near range for 8 hours. Does not flicker or produce heat.",
        "mechanics": [
          { "type": "light_source", "range": "near", "value": 480 }
        ]
      }
    ],
    "backgrounds": [
      {
        "id": "shadow-realms-shadow-touched",
        "name": "Shadow-Touched",
        "description": "You spent time in the Shadow Realm and returned changed. You can see in dim light as if it were bright."
      }
    ],
    "deities": [
      {
        "id": "shadow-realms-nyx",
        "name": "Nyx, the Umbral Queen",
        "alignment": "neutral",
        "domain": "Shadow, secrets, transitions",
        "description": "Goddess of the space between light and dark. She guards the boundary between the mortal world and the Shadow Realm."
      }
    ],
    "languages": [
      {
        "id": "shadow-realms-umbral",
        "name": "Umbral",
        "rarity": "rare",
        "typicalSpeakers": "Shadow plane denizens"
      }
    ],
    "ancestries": [
      {
        "id": "shadow-realms-shade-kin",
        "name": "Shade-Kin",
        "traitName": "Shadow Born",
        "traitDescription": "Once per day, you can become invisible for 3 rounds. You have darkvision to near range.",
        "mechanics": [
          { "type": "invisibility_1day", "duration": 3, "usesPerDay": 1 }
        ],
        "languages": ["Common", "Umbral"]
      }
    ],
    "classes": [
      {
        "id": "shadow-realms-shadow-dancer",
        "name": "Shadow Dancer",
        "description": "Shadow dancers blend martial skill with shadow magic, slipping between darkness and striking unseen.",
        "hitDie": "d6",
        "weaponProficiencies": ["dagger", "shortsword", "shortbow", "crossbow"],
        "armorProficiencies": ["leather", "mithral_chainmail"],
        "features": [
          {
            "name": "Backstab",
            "level": 1,
            "description": "If you hit a creature unaware of your attack, deal an extra weapon die of damage.",
            "mechanic": { "type": "backstab", "extraDice": 1 }
          },
          {
            "name": "Spellcasting",
            "level": 1,
            "description": "You can cast wizard spells using your CHA modifier. Your magic draws from the Shadow Realm.",
            "mechanic": { "type": "spellcasting", "stat": "CHA" }
          }
        ],
        "talentTable": [
          { "roll": 2, "description": "Gain advantage on initiative rolls", "mechanic": { "type": "initiative_advantage" } },
          { "roll": [3, 5], "description": "Backstab deals +1 dice of damage", "mechanic": { "type": "backstab_extra_dice", "amount": 1 } },
          { "roll": [6, 8], "description": "+1 to wizard spellcasting checks", "mechanic": { "type": "spellcasting_bonus", "amount": 1 } },
          { "roll": [9, 11], "description": "+2 to DEX or CHA stat", "mechanic": { "type": "stat_bonus", "stats": ["DEX", "CHA"], "amount": 2 } },
          { "roll": 12, "description": "Choose a talent or +2 points to distribute to stats", "mechanic": { "type": "choose_talent_or_stats" } }
        ],
        "spellcasting": { "stat": "CHA", "spellList": "wizard" },
        "spellsKnownByLevel": [
          [1, 0, 0, 0, 0],
          [2, 0, 0, 0, 0],
          [2, 1, 0, 0, 0],
          [2, 2, 0, 0, 0],
          [3, 2, 0, 0, 0],
          [3, 2, 1, 0, 0],
          [3, 2, 2, 0, 0],
          [3, 3, 2, 1, 0],
          [3, 3, 2, 2, 0],
          [3, 3, 3, 2, 1]
        ]
      }
    ]
  }
}
```

---

## Validation Rules

When a data pack is imported, it is validated using Zod schemas. Understanding these rules prevents import failures.

### Global Rules

- The top-level `id`, `name`, `author`, `version`, and `description` must all be **non-empty strings**.
- The `data` object is required but every key inside it is optional.
- Each data key must contain an **array** (not a single object). Even one monster must be wrapped in `[...]`.

### Per-Category Rules

**Monsters:**
- `id`, `name` must be strings.
- `level`, `ac`, `hp` must be numbers.
- `attacks` must be an array of objects. Each attack must have `name` (string), `bonus` (number), `damage` (string), and `range` (one of `"close"`, `"near"`, `"far"`).
- `movement` must have at least `normal` as a RangeCategory.
- `stats` must have all six keys: `STR`, `DEX`, `CON`, `INT`, `WIS`, `CHA` (all numbers).
- `alignment` must be `"lawful"`, `"neutral"`, or `"chaotic"`.
- `abilities` must be an array of objects with `name` and `description` strings.
- `checksMorale` must be a boolean.
- `tags` must be an array of strings.

**Spells:**
- `tier` must be an integer from 1 to 5 (inclusive).
- `class` must be a string (validated loosely; `"wizard"` and `"priest"` are the standard values).
- `range` must be a string (accepted values: `"self"`, `"touch"`, `"close"`, `"near"`, `"far"`).
- `duration` must be a string (accepted values: `"instant"`, `"rounds"`, `"focus"`, `"hours"`, `"days"`, `"permanent"`, `"special"`).
- `isFocus` must be a boolean.
- `effects` must be an array of objects, each with at minimum a `type` string.

**Weapons:**
- `type` must be exactly `"melee"` or `"ranged"`.
- `damage` must be a string (die type like `"d6"`).
- `range` must be `"close"`, `"near"`, or `"far"`.
- `properties` must be an array of strings.
- `cost` and `slots` must be numbers.

**Armor:**
- `type` must be a string (standard values: `"leather"`, `"chainmail"`, `"plate"`, `"shield"`).
- `acBase` must be a number.
- `addDex`, `stealthPenalty`, `isMithral` must be booleans.
- `swimPenalty` must be exactly `"none"`, `"disadvantage"`, or `"cannot"`.
- `cost` and `slots` must be numbers.

**Gear:**
- `id`, `name`, `description` must be strings.
- `category` must be a string.
- `cost` and `slots` must be numbers.

**Backgrounds:**
- `id`, `name`, `description` must be strings.

**Deities:**
- `id`, `name`, `domain`, `description` must be strings.
- `alignment` must be `"lawful"`, `"neutral"`, or `"chaotic"`.

**Languages:**
- `rarity` must be exactly `"common"` or `"rare"`.
- `typicalSpeakers` must be a string.

**Ancestries:**
- `traitName` and `traitDescription` must be strings.
- `mechanics` must be an array of objects, each with at minimum a `type` string.
- `languages` must be an array of strings.

**Classes:**
- `hitDie` must be a string (e.g., `"d6"`).
- `weaponProficiencies` and `armorProficiencies` must be arrays of strings.
- `features` must be an array of objects with `name` (string), `level` (number), `description` (string), and `mechanic` (object with `type` string).
- `talentTable` must be an array of objects with `roll` (number or `[number, number]` tuple), `description` (string), and `mechanic` (object with `type` string).

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Expected string, received undefined` | A required string field is missing. | Add the missing field. |
| `Expected number, received string` | A numeric field was given a string like `"12"`. | Remove the quotes: use `12` not `"12"`. |
| `Expected array, received object` | A single entry was passed instead of an array. | Wrap in brackets: `[{ ... }]`. |
| `Invalid enum value` | A restricted field has a typo or invalid value. | Check the allowed values in this guide. |
| `Expected boolean, received undefined` | A required boolean field was omitted. | Add the field with `true` or `false`. |

### Passthrough Behavior

All schemas use `.passthrough()`, which means:
- Extra fields you add to any object are **preserved** and will not cause validation errors.
- This lets you embed custom metadata (e.g., `"source": "Tome of Shadows"`, `"pageNumber": 42`) on any entry.
- However, the app will only read the documented fields. Custom fields are stored but ignored by game mechanics.

---

## Tips and Best Practices

### ID Naming Conventions

- Use **kebab-case** for all IDs: `"fire-bolt"`, `"shadow-knight"`, `"plate-of-the-sun"`.
- **Prefix IDs with your pack name** to avoid collisions with core data or other packs: `"mypack-fire-bolt"` instead of `"fire-bolt"`.
- Keep IDs stable across versions. Changing an ID breaks references from saved characters.

### Overriding Core Data

- If you give a pack entry the **same `id`** as a core entry (e.g., `"longsword"`), your pack entry will override it when the pack is enabled.
- This is useful for house rules: override `"longsword"` to change its damage die, or override a spell to change its description.
- Be intentional about this. Accidental ID collisions cause confusing behavior. Use the pack-prefix convention to avoid it.

### Pack Colors

- The `color` field puts a visible badge or border on every entry from your pack in the UI.
- Use distinct, recognizable colors: `"#e74c3c"` (red), `"#3498db"` (blue), `"#2ecc71"` (green), `"#9b59b6"` (purple).
- This helps GMs and players quickly identify which content comes from which pack.
- If no `color` is set, entries from the pack will have no special visual indicator.

### Enabling and Disabling

- Packs can be toggled on/off in the Data Pack Manager.
- When a pack is disabled, all its entries are removed from the active game data, but the pack JSON remains in localStorage.
- This is non-destructive: re-enabling restores all content instantly.

### Talent Table Design

- The talent table is a 2d6 roll (range 2-12).
- You must cover the full range from 2 to 12. Use ranges like `[3, 6]` to cover multiple values.
- Typical distribution: rare/powerful results on 2 and 12, common results in the 7-9 range.
- Always include `{ "type": "choose_talent_or_stats" }` on roll 12 (or another high value) as a flexible option.

### Spells Known Table

- The `spellsKnownByLevel` array must have exactly **10 entries** (one per level, 1-10).
- Each entry is an array of **5 numbers**: `[tier1, tier2, tier3, tier4, tier5]`.
- These represent the maximum number of spells the class can know at each tier for that level.
- Spells of higher tiers should unlock gradually (tier 2 at level 3-4, tier 3 at level 5-6, etc.).

### General Tips

- Validate your JSON before importing. Use any JSON validator to catch syntax errors (missing commas, unquoted keys, trailing commas).
- Keep descriptions concise but complete. The app displays them in tooltips and detail panels.
- For `cost`, remember the decimal convention: `1` = 1 gp, `0.5` = 5 sp, `0.1` = 1 sp, `0.05` = 5 cp, `0.01` = 1 cp.
- Test your pack by importing it, creating a character with your custom class/ancestry, and running through the combat flow.

---

## Type Reference Tables

### Alignment

| Value       | Description |
|-------------|-------------|
| `"lawful"`  | Lawful alignment. |
| `"neutral"` | Neutral alignment. |
| `"chaotic"` | Chaotic alignment. |

### RangeCategory

| Value     | Approximate Distance |
|-----------|---------------------|
| `"close"` | Within melee range (~5 feet). |
| `"near"`  | Nearby (~25-30 feet). |
| `"far"`   | Distant (~50+ feet). |

### DieType

| Value    | Description |
|----------|-------------|
| `"d4"`   | Four-sided die. |
| `"d6"`   | Six-sided die. |
| `"d8"`   | Eight-sided die. |
| `"d10"`  | Ten-sided die. |
| `"d12"`  | Twelve-sided die. |
| `"d20"`  | Twenty-sided die. |
| `"d100"` | Percentile die. |

### SpellTier

| Value | DC to Cast |
|-------|-----------|
| `1`   | 11        |
| `2`   | 12        |
| `3`   | 13        |
| `4`   | 14        |
| `5`   | 15        |

### SpellClass

| Value      | Description |
|------------|-------------|
| `"wizard"` | Arcane spells cast using INT. |
| `"priest"` | Divine spells cast using WIS. |

### SpellDuration

| Value         | Description |
|---------------|-------------|
| `"instant"`   | Effect happens immediately with no lingering duration. |
| `"rounds"`    | Lasts a number of combat rounds (see `durationValue`). |
| `"focus"`     | Lasts as long as the caster maintains concentration. |
| `"hours"`     | Lasts a number of hours (see `durationValue`). |
| `"days"`      | Lasts a number of days (see `durationValue`). |
| `"permanent"` | Lasts until dispelled or a condition is met. |
| `"special"`   | Duration is described in the spell text. |

### SpellEffect Types

| `type`      | Required Fields | Optional Fields | Description |
|-------------|----------------|-----------------|-------------|
| `damage`    | `dice`         | `damageType`    | Deals damage. `dice` is a dice expression like `"2d6"`. |
| `healing`   | `dice`         |                 | Restores HP. `dice` is a dice expression like `"1d6"`. |
| `buff`      | `bonus`        | `stat`, `duration` | Grants a numeric bonus. `stat` is an AbilityScore. |
| `condition` | `condition`    | `duration`, `saveDC` | Applies a status condition. |
| `ac_bonus`  | `amount`       |                 | Grants a bonus to AC. |
| `light`     | `range`, `durationRealMinutes` | | Creates light tracked by real-time timer. |
| `utility`   | `description`  |                 | Non-mechanical effect described in text. |
| `custom`    | `key`, `value` |                 | Open-ended custom effect. |

### WeaponProperty

| Value          | Mechanical Effect |
|----------------|-------------------|
| `"finesse"`    | Can use DEX instead of STR for melee attack and damage rolls. |
| `"loading"`    | Can only fire once per round regardless of extra attacks. |
| `"thrown"`     | Melee weapon can be thrown for a ranged attack. |
| `"two_handed"` | Requires both hands; cannot use a shield simultaneously. |
| `"versatile"`  | Can be wielded one-handed or two-handed. Two-handed uses `versatileDamage`. |

### ArmorType

| Value         | Typical AC | Notes |
|---------------|-----------|-------|
| `"leather"`   | 11 + DEX  | No penalties. |
| `"chainmail"` | 13 + DEX  | Stealth disadvantage, swim disadvantage. |
| `"plate"`     | 15        | No DEX bonus. Stealth disadvantage, cannot swim. |
| `"shield"`    | +2        | Added on top of worn armor AC. |

### ArmorProficiency

| Value                | Description |
|----------------------|-------------|
| `"none"`             | No armor proficiency. |
| `"leather"`          | Can wear leather armor. |
| `"chainmail"`        | Can wear chainmail armor. |
| `"plate"`            | Can wear plate armor. |
| `"shield"`           | Can use shields. |
| `"mithral_chainmail"`| Can wear mithral chainmail (reduced penalties). |

### ItemCategory

| Value           | Description |
|-----------------|-------------|
| `"weapon"`      | Weapons (usually defined in `weapons`, not `gear`). |
| `"armor"`       | Armor pieces (usually defined in `armor`, not `gear`). |
| `"shield"`      | Shields (usually defined in `armor`, not `gear`). |
| `"gear"`        | General adventuring equipment. |
| `"consumable"`  | Single-use or limited-use items (potions, scrolls). |
| `"treasure"`    | Valuables, gems, art objects. |
| `"magic_item"`  | Magical items with special properties. |
| `"ammo"`        | Ammunition (arrows, bolts, etc.). Tracked by quantity. |
| `"ration"`      | Food and water. Required for resting. |
| `"light_source"`| Torches, lanterns, etc. Integrated with the torch timer. |
| `"coins"`       | Currency (handled by the coin pouch, rarely used in gear). |

### ConditionType

| Value           | Description |
|-----------------|-------------|
| `"blinded"`     | Cannot see. Attacks have disadvantage. |
| `"charmed"`     | Cannot attack the charmer. |
| `"deafened"`    | Cannot hear. |
| `"paralyzed"`   | Cannot move or act. |
| `"poisoned"`    | Disadvantage on attacks and checks. |
| `"sleeping"`    | Unconscious until awakened. |
| `"dazed"`       | Limited actions. |
| `"grabbed"`     | Movement restricted. |
| `"frightened"`  | Disadvantage on checks while source is visible. |
| `"invisible"`   | Cannot be seen. Attacks against have disadvantage. |
| `"prone"`       | Lying on the ground. Melee attacks against have advantage. |
| `"restrained"`  | Speed is 0. Attacks against have advantage. |
| `"stunned"`     | Cannot move or act. Attacks against have advantage. |
| `"unconscious"` | Falls prone and is unaware. |
| `"afraid"`      | Expanded fear condition. |
| `"banished"`    | Sent to another plane. |
| `"beguiled"`    | Magically manipulated. |
| `"compelled"`   | Forced to act against will. |
| `"cursed"`      | Suffering a supernatural affliction. |
| `"diseased"`    | Suffering from illness. |
| `"drained"`     | Life energy sapped. |
| `"enfeebled"`   | Physical capability reduced. |
| `"fragile"`     | Brittle, takes extra damage. |
| `"gibbering"`   | Cannot speak coherently. |
| `"laughing"`    | Uncontrollable laughter. |
| `"life-drained"`| Severe life energy loss. |
| `"mesmerized"`  | Entranced, unable to act. |
| `"petrified"`   | Turned to stone. |
| `"polymorphed"` | Transformed into another form. |
| `"possessed"`   | Body controlled by another entity. |
| `"stuck"`       | Physically adhered/trapped. |
| `"stupified"`   | Mentally dulled. |

### AbilityScore

| Value   | Full Name    |
|---------|-------------|
| `"STR"` | Strength    |
| `"DEX"` | Dexterity   |
| `"CON"` | Constitution|
| `"INT"` | Intelligence|
| `"WIS"` | Wisdom      |
| `"CHA"` | Charisma    |

### Ancestry (Core Values)

| Value        | Name     |
|--------------|----------|
| `"dwarf"`    | Dwarf    |
| `"elf"`      | Elf      |
| `"goblin"`   | Goblin   |
| `"halfling"` | Halfling |
| `"half-orc"` | Half-Orc |
| `"human"`    | Human    |
| `"kobold"`   | Kobold   |

Custom ancestries can use any string ID.

### CharacterClass (Core Values)

| Value                  | Name               | Source |
|------------------------|--------------------| ------|
| `"fighter"`            | Fighter            | Core  |
| `"priest"`             | Priest             | Core  |
| `"thief"`              | Thief              | Core  |
| `"wizard"`             | Wizard             | Core  |
| `"bard"`               | Bard               | Expansion |
| `"ranger"`             | Ranger             | Expansion |
| `"warlock"`            | Warlock            | Expansion |
| `"witch"`              | Witch              | Expansion |
| `"knight-of-st-ydris"` | Knight of St. Ydris | Expansion |
| `"seer"`               | Seer               | Expansion |
| `"basilisk-warrior"`   | Basilisk Warrior   | Expansion |
| `"desert-rider"`       | Desert Rider       | Expansion |
| `"pit-fighter"`        | Pit Fighter        | Expansion |
| `"sea-wolf"`           | Sea Wolf           | Expansion |
| `"ras-godai"`          | Ras Godai          | Expansion |

Custom classes can use any string ID.

### AncestryMechanicType

| Value                      | Description | Typical Fields |
|----------------------------|-------------|----------------|
| `"bonus_hp"`               | Grants extra starting HP. | `value`: number of bonus HP. |
| `"advantage_hp_roll"`      | HP rolls per level are made with advantage. | (none) |
| `"bonus_ranged_attack"`    | Bonus to ranged attack rolls. | `value`: bonus amount. |
| `"bonus_spellcasting"`     | Bonus to spellcasting checks. | `value`: bonus amount. |
| `"cannot_be_surprised"`    | The character can never be surprised. | (none) |
| `"invisibility_1day"`      | Can become invisible once per day. | `duration`: rounds. `usesPerDay`: 1. |
| `"bonus_melee_attack"`     | Bonus to melee attack rolls. | `value`: bonus amount. |
| `"bonus_melee_damage"`     | Bonus to melee damage rolls. | `value`: bonus amount. |
| `"extra_talent_level1"`    | Gains an extra talent roll at level 1. | (none) |
| `"luck_token_session_start"` | Starts each session with a luck token. | (none) |

### ClassFeatureMechanic Types

| `type`                | Fields | Description |
|-----------------------|--------|-------------|
| `"weapon_mastery"`    | `bonus: number` | +bonus to attack and damage with a chosen weapon type. |
| `"grit"`              | `stat: "STR" \| "DEX"` | Advantage on checks with the chosen stat to overcome opposing force. |
| `"hauler"`            | (none) | Add CON modifier to gear slot capacity. |
| `"backstab"`          | `extraDice: number` | Extra weapon dice of damage on unaware targets. |
| `"thievery"`          | `skills: string[]` | Advantage on listed thief skills. |
| `"turn_undead"`       | (none) | Knows Turn Undead spell for free. |
| `"spellcasting"`      | `stat: AbilityScore` | Can cast spells using the specified ability. |
| `"scroll_learning"`   | (none) | Can learn spells from scrolls. |
| `"bardic_arts"`       | `skills: string[]` | Advantage on listed bardic skills. |
| `"presence"`          | `description: string` | Social influence ability. |
| `"magical_dabbler"`   | `stat: AbilityScore` | Limited spellcasting from another class's list. |
| `"prolific"`          | (none) | Creates things more efficiently. |
| `"wayfinder"`         | `skills: string[]` | Advantage on wilderness/tracking skills. |
| `"herbalism"`         | `stat: AbilityScore` | Can create herbal remedies. |
| `"demonic_possession"` | `usesPerDay: number`, `damageBonus: number`, `rounds: number` | Channel demonic power for bonus damage. |
| `"patron"`            | `description: string` | Has a warlock patron with described powers. |
| `"patron_boon"`       | (none) | Gains a boon from patron. |
| `"familiar"`          | (none) | Has a magical familiar companion. |
| `"omen"`              | `usesPerDay: number`, `dc: number` | Can read omens/portents. |
| `"destined"`          | (none) | Fated by prophecy; has destiny mechanics. |
| `"stone_skin"`        | `acBonus: number` | Natural AC bonus from hardened skin. |
| `"basilisk_blood"`    | (none) | Has basilisk blood running through veins. |
| `"petrifying_gaze"`   | `dc: number` | Can petrify with a gaze attack. |
| `"charge"`            | `usesPerDay: number` | Can make mounted/rushing charge attacks. |
| `"mount"`             | (none) | Has a special mount companion. |
| `"flourish"`          | `usesPerDay: number` | Can perform combat flourishes for extra effect. |
| `"relentless"`        | `usesPerDay: number`, `dc: number` | Can push past injury to keep fighting. |
| `"implacable"`        | (none) | Cannot be slowed or stopped by terrain/effects. |
| `"last_stand"`        | `threshold: number` | Gains bonuses when HP drops below threshold. |
| `"seafarer"`          | (none) | Advantage on ship/ocean-related checks. |
| `"old_gods"`          | (none) | Draws power from ancient nature spirits. |
| `"shield_wall"`       | `ac: number` | Can form a shield wall granting AC bonus to allies. |
| `"smoke_step"`        | `usesPerDay: number` | Can teleport short distances via smoke/shadow. |
| `"black_lotus"`       | (none) | Can use black lotus poison techniques. |
| `"trained_assassin"`  | (none) | Expert in assassination techniques. |

### TalentMechanic Types

| `type`                      | Fields | Description |
|-----------------------------|--------|-------------|
| `"weapon_mastery_extra"`    | (none) | Gain Weapon Mastery with one additional weapon type. |
| `"attack_bonus"`            | `melee: number`, `ranged: number` | Bonus to melee and/or ranged attack rolls. |
| `"stat_bonus"`              | `stats: AbilityScore[]`, `amount: number` | Add `amount` to one of the listed stats (player chooses). |
| `"armor_mastery"`           | (none) | +1 AC from one chosen armor type. |
| `"spell_advantage"`         | (none) | Gain advantage on casting one known spell. |
| `"learn_spell"`             | (none) | Learn one additional spell. |
| `"spellcasting_bonus"`      | `amount: number` | Bonus to spellcasting check rolls. |
| `"make_magic_item"`         | (none) | Can craft a magic item. |
| `"backstab_extra_dice"`     | `amount: number` | Backstab deals extra weapon dice. |
| `"initiative_advantage"`    | (none) | Advantage on initiative rolls. |
| `"choose_talent_or_stats"`  | (none) | Choose any talent from the table, or distribute +2 to stats. |
| `"magical_dabbler_bonus"`   | `amount: number` | Bonus to magical dabbler spellcasting. |
| `"improved_presence"`       | (none) | Enhanced social presence ability. |
| `"find_random_wand"`        | (none) | Find a random magical wand. |
| `"herbalism_advantage"`     | (none) | Advantage on herbalism checks. |
| `"increased_weapon_damage"` | (none) | Increased damage with weapons. |
| `"melee_attack_bonus"`      | `amount: number` | Bonus to melee attack rolls only. |
| `"ranged_attack_damage_bonus"` | `amount: number` | Bonus to ranged attack damage only. |
| `"damage_bonus"`            | `amount: number` | Flat bonus to all damage rolls. |
| `"ac_bonus"`                | `amount: number` | Flat bonus to AC. |
| `"patron_boon_roll"`        | (none) | Roll on the patron boon table. |
| `"go_berserk"`              | (none) | Can enter a berserker rage. |
| `"duality"`                 | (none) | Can switch between two aspects/modes. |
| `"additional_smoke_step"`   | (none) | Gain one additional use of smoke step per day. |
| `"poisons_training"`        | (none) | Trained in the use of poisons. |
| `"additional_black_lotus"`  | (none) | Gain one additional use of black lotus technique per day. |

### MonsterAbilityMechanic Types

| `type`                 | Fields | Description |
|------------------------|--------|-------------|
| `"damage_resistance"`  | `source: string` | Only damaged by the named source (e.g., `"silver weapons"`). |
| `"damage_immunity"`    | `damageType: string` | Immune to the named damage type (e.g., `"fire"`). |
| `"condition_immunity"` | `condition: string` | Immune to the named condition (e.g., `"poisoned"`). |
| `"morale_immunity"`    | (none) | Never makes morale checks. |
| `"regeneration"`       | `amount: string`, `prevention?: string` | Regenerates HP (e.g., `"1d6"` per round). `prevention` describes what stops it. |
| `"spellcasting"`       | `spells: string[]`, `stat: string`, `dc: number` | Can cast listed spells with the given DC. |
| `"custom"`             | `key: string`, `value: unknown` | Open-ended homebrew mechanic. |

### SpellcastingConfig spellList

| Value      | Description |
|------------|-------------|
| `"wizard"` | Uses the wizard spell list (arcane, INT-based by default). |
| `"priest"` | Uses the priest spell list (divine, WIS-based by default). |
| `"witch"`  | Uses the witch spell list (expansion). |
| `"seer"`   | Uses the seer spell list (expansion). |

---

*End of Data Pack Creation Guide*
