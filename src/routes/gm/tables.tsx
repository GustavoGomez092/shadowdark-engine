import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { ANCESTRIES } from "@/data/ancestries.ts"
import { ARMOR } from "@/data/armor.ts"
import { BACKGROUNDS } from "@/data/backgrounds.ts"
import { CLASSES } from "@/data/classes.ts"
import { DEITIES } from "@/data/deities.ts"
import { GEAR } from "@/data/gear.ts"
import { MONSTERS } from "@/data/monsters.ts"
import { SPELLS } from "@/data/spells.ts"
import { generateAdventureName } from "@/data/tables/adventure-names.ts"
import { getRandomHazard } from "@/data/tables/hazards.ts"
import { getRandomName } from "@/data/tables/npc-names.ts"
import { getRandomTrap } from "@/data/tables/traps.ts"
import { WEAPONS } from "@/data/weapons.ts"
import { rollDice } from "@/lib/dice/roller.ts"
import { getAbilityModifier } from "@/schemas/reference.ts"

export const Route = createFileRoute("/gm/tables")({
  component: ReferencePage,
})

type Tab = "rules" | "spells" | "items" | "monsters" | "world" | "generators"

function ReferencePage() {
  const [tab, setTab] = useState<Tab>("rules")
  const [search, setSearch] = useState("")

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold">📖 Reference</h1>
      <p className="mb-6 text-muted-foreground">
        ShadowDark RPG rules, items, spells, and generators
      </p>

      <div className="mb-6 flex flex-wrap gap-1 rounded-lg border border-border p-1 w-fit">
        {(
          [
            ["rules", "Rules"],
            ["spells", "Spells"],
            ["items", "Items"],
            ["monsters", "Monsters"],
            ["world", "World"],
            ["generators", "Generators"],
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

      {tab !== "rules" && tab !== "generators" && tab !== "world" && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="mb-4 w-full max-w-sm rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      )}

      {tab === "rules" && <RulesCheatSheet />}
      {tab === "spells" && <SpellsRef search={search} />}
      {tab === "items" && <ItemsRef search={search} />}
      {tab === "monsters" && <MonstersRef search={search} />}
      {tab === "world" && <WorldRef />}
      {tab === "generators" && <Generators />}
    </main>
  )
}

// ========== RULES ==========
function RulesCheatSheet() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-bold text-primary">Difficulty Classes</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Easy</span>
            <span className="font-mono font-bold">DC 9</span>
          </div>
          <div className="flex justify-between">
            <span>Normal</span>
            <span className="font-mono font-bold">DC 12</span>
          </div>
          <div className="flex justify-between">
            <span>Hard</span>
            <span className="font-mono font-bold">DC 15</span>
          </div>
          <div className="flex justify-between">
            <span>Extreme</span>
            <span className="font-mono font-bold">DC 18</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-bold text-primary">Combat</h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            <span className="text-foreground font-medium">Initiative:</span> d20
            + DEX mod. Highest first, then clockwise.
          </p>
          <p>
            <span className="text-foreground font-medium">Attack:</span> d20 +
            STR (melee) or DEX (ranged) vs AC.
          </p>
          <p>
            <span className="text-foreground font-medium">Nat 20:</span>{" "}
            Critical hit — double damage dice (not modifier).
          </p>
          <p>
            <span className="text-foreground font-medium">Nat 1:</span> Auto
            miss.
          </p>
          <p>
            <span className="text-foreground font-medium">Morale:</span> Half
            numbers/HP → DC 15 WIS or flee.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-bold text-primary">Death & Dying</h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            <span className="text-foreground font-medium">0 HP:</span> Fall
            unconscious and dying.
          </p>
          <p>
            <span className="text-foreground font-medium">Death timer:</span>{" "}
            1d4 + CON mod rounds (min 1).
          </p>
          <p>
            <span className="text-foreground font-medium">Stabilize:</span> Ally
            at close range, DC 15 INT check.
          </p>
          <p>
            <span className="text-foreground font-medium">
              Nat 20 while dying:
            </span>{" "}
            Rise with 1 HP.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-bold text-primary">Light & Darkness</h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            <span className="text-foreground font-medium">Torch:</span> Near
            distance, 1 hour real time.
          </p>
          <p>
            <span className="text-foreground font-medium">Lantern:</span> Double
            near, 1 hour (needs oil).
          </p>
          <p>
            <span className="text-foreground font-medium">Campfire:</span> 3
            torches, up to 8 hours, stationary.
          </p>
          <p>
            <span className="text-foreground font-medium">Darkness:</span>{" "}
            Disadvantage on most tasks. Encounter check every round.
          </p>
          <p>
            <span className="text-foreground font-medium">Ride along:</span> New
            light resets timer to full.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-bold text-primary">Spellcasting</h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            <span className="text-foreground font-medium">Cast:</span> d20 + INT
            (wizard) or WIS (priest) vs DC 10 + tier.
          </p>
          <p>
            <span className="text-foreground font-medium">Fail:</span> Spell
            lost until rest.
          </p>
          <p>
            <span className="text-foreground font-medium">Nat 1 wizard:</span>{" "}
            Spell lost + roll on mishap table.
          </p>
          <p>
            <span className="text-foreground font-medium">Nat 1 priest:</span>{" "}
            Spell lost + penance required.
          </p>
          <p>
            <span className="text-foreground font-medium">Nat 20:</span> Double
            one numerical effect.
          </p>
          <p>
            <span className="text-foreground font-medium">Focus:</span> Check
            each turn. Fail = ends (not lost).
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-bold text-primary">XP & Level Up</h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            <span className="text-foreground font-medium">Level up at:</span>{" "}
            Level × 10 XP. XP resets to 0.
          </p>
          <p>
            <span className="text-foreground font-medium">Poor:</span> 0 XP ·{" "}
            <span className="text-foreground font-medium">Normal:</span> 1 XP ·{" "}
            <span className="text-foreground font-medium">Fabulous:</span> 3 XP
            · <span className="text-foreground font-medium">Legendary:</span> 10
            XP
          </p>
          <p>
            <span className="text-foreground font-medium">
              Each PC gets full XP
            </span>{" "}
            (not split).
          </p>
          <p>
            <span className="text-foreground font-medium">
              Clever thinking:
            </span>{" "}
            GM awards 1 XP.
          </p>
          <p>
            <span className="text-foreground font-medium">Talents:</span> At
            levels 1, 3, 5, 7, 9.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-bold text-primary">Resting</h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            <span className="text-foreground font-medium">Rest:</span> 8 hours
            sleep + 1 ration consumed.
          </p>
          <p>
            <span className="text-foreground font-medium">Restores:</span> All
            HP, all spells, conditions cleared.
          </p>
          <p>
            <span className="text-foreground font-medium">Interruption:</span>{" "}
            DC 12 CON or no benefit.
          </p>
          <p>
            <span className="text-foreground font-medium">
              Encounter checks while resting:
            </span>{" "}
            Unsafe every 3h, Risky every 2h, Deadly every 1h.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-bold text-primary">Ability Modifiers</h3>
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
  const [classFilter, setClassFilter] = useState<"all" | "wizard" | "priest">(
    "all",
  )
  const filtered = SPELLS.filter((s) => {
    if (classFilter !== "all" && s.class !== classFilter) return false
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()))
      return false
    return true
  })

  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-lg border border-border p-1 w-fit">
        {(["all", "wizard", "priest"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setClassFilter(c)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition ${classFilter === c ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
          >
            {c === "all" ? "All" : c.charAt(0).toUpperCase() + c.slice(1)}
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
              <h3 className="font-semibold">{spell.name}</h3>
              <div className="flex gap-1">
                {spell.isFocus && (
                  <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                    Focus
                  </span>
                )}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${spell.class === "wizard" ? "bg-blue-500/20 text-blue-400" : "bg-yellow-500/20 text-yellow-400"}`}
                >
                  {spell.class === "wizard" ? "Wiz" : "Pri"} T{spell.tier}
                </span>
              </div>
            </div>
            <div className="flex gap-3 text-[10px] text-muted-foreground mb-1">
              <span>Range: {spell.range}</span>
              <span>
                Duration: {spell.duration}
                {spell.durationValue ? ` (${spell.durationValue})` : ""}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {spell.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ========== ITEMS ==========
function ItemsRef({ search }: { search: string }) {
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
            Weapons ({weapons.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {weapons.map((w) => (
              <div
                key={w.id}
                className="rounded-lg border border-border bg-card p-2 text-xs"
              >
                <div className="flex justify-between">
                  <span className="font-semibold">{w.name}</span>
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
            Armor ({armor.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {armor.map((a) => (
              <div
                key={a.id}
                className="rounded-lg border border-border bg-card p-2 text-xs"
              >
                <div className="flex justify-between">
                  <span className="font-semibold">{a.name}</span>
                  <span className="text-muted-foreground">
                    {formatCost(a.cost)}
                  </span>
                </div>
                <div className="text-muted-foreground mt-0.5">
                  AC {a.type === "shield" ? "+2" : a.acBase}
                  {a.addDex ? " + DEX" : ""} · {a.slots}s
                  {a.stealthPenalty && " · stealth disadv."}
                  {a.swimPenalty !== "none" &&
                    ` · ${a.swimPenalty === "cannot" ? "no swim" : "swim disadv."}`}
                  {a.isMithral && " · mithral"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {gear.length > 0 && (
        <div>
          <h3 className="mb-2 font-bold text-primary">
            Gear & Consumables ({gear.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {gear.map((g) => (
              <div
                key={g.id}
                className="rounded-lg border border-border bg-card p-2 text-xs"
              >
                <div className="flex justify-between">
                  <span className="font-semibold">{g.name}</span>
                  <span className="text-muted-foreground">
                    {formatCost(g.cost)} · {g.slots}s
                  </span>
                </div>
                <p className="text-muted-foreground mt-0.5 leading-relaxed">
                  {g.description}
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
            <h3 className="text-lg font-bold">{m.name}</h3>
            <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">LV {m.level}</span>
          </div>

          {/* Core stats */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1 rounded-lg bg-secondary/50 p-2 text-center">
              <div className="text-[9px] text-muted-foreground">AC</div>
              <div className="text-lg font-bold">{m.ac}</div>
            </div>
            <div className="flex-1 rounded-lg bg-secondary/50 p-2 text-center">
              <div className="text-[9px] text-muted-foreground">HP</div>
              <div className="text-lg font-bold">{m.hp}</div>
            </div>
            <div className="flex-1 rounded-lg bg-secondary/50 p-2 text-center">
              <div className="text-[9px] text-muted-foreground">Speed</div>
              <div className="text-sm font-bold capitalize">{m.movement.double ? 'Dbl ' : ''}{m.movement.normal}</div>
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
                <span className="font-semibold">{a.name} <span className="text-muted-foreground">{fmt(a.bonus)}</span></span>
                <span className="font-mono text-primary">{a.damage}</span>
              </div>
            ))}
          </div>

          {/* Abilities */}
          {m.abilities.length > 0 && (
            <div className="border-t border-border/30 pt-2 space-y-1">
              {m.abilities.map((a, i) => (
                <p key={i} className="text-[11px]">
                  <span className="font-semibold text-primary">{a.name}:</span>{" "}
                  <span className="text-muted-foreground">{a.description}</span>
                </p>
              ))}
            </div>
          )}

          {/* Tags */}
          {m.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {m.tags.map(tag => (
                <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-[9px] capitalize">{tag}</span>
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
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-bold text-primary">Ancestries</h3>
        <div className="space-y-2">
          {ANCESTRIES.map((a) => (
            <div key={a.id} className="rounded-lg bg-secondary/30 p-2.5">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-sm">{a.name}</span>
                <span className="text-xs font-medium text-primary">{a.traitName}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{a.traitDescription}</p>
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
        <h3 className="mb-3 font-bold text-primary">Classes</h3>
        <div className="space-y-2">
          {CLASSES.map((c) => (
            <div key={c.id} className="rounded-lg bg-secondary/30 p-2.5">
              <div className="flex items-baseline justify-between mb-0.5">
                <span className="font-semibold text-sm">{c.name}</span>
                <span className="font-mono text-xs text-muted-foreground">{c.hitDie}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-1.5">{c.description}</p>
              <div className="flex flex-wrap gap-1">
                {c.features.map(f => (
                  <span key={f.name} className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-medium text-primary">{f.name}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-bold text-primary">Deities</h3>
        <div className="space-y-2">
          {DEITIES.map((d) => (
            <div key={d.id} className="rounded-lg bg-secondary/30 p-2.5">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{d.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${d.alignment === "lawful" ? "bg-blue-500/20 text-blue-400" : d.alignment === "neutral" ? "bg-secondary text-muted-foreground" : "bg-red-500/20 text-red-400"}`}>
                  {d.alignment}
                </span>
              </div>
              <p className="text-[10px] font-semibold text-primary mb-0.5">{d.domain}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{d.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 font-bold text-primary">Backgrounds</h3>
        <div className="grid gap-1.5">
          {BACKGROUNDS.map((b) => (
            <div key={b.id} className="rounded-lg bg-secondary/30 px-3 py-2 text-xs flex items-baseline gap-1.5">
              <span className="font-semibold">{b.name}:</span>{" "}
              <span className="text-muted-foreground">{b.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ========== GENERATORS ==========
function Generators() {
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
            onClick={() => add("Adventure Name", generateAdventureName())}
            className="rounded-lg border border-border p-3 text-left text-sm hover:bg-accent transition"
          >
            <div className="text-base mb-1">🗺️</div>Adventure Name
          </button>
          <button
            onClick={() =>
              add(
                "Trap",
                (() => {
                  const t = getRandomTrap()
                  return `${t.trap} (${t.trigger}) — ${t.effect}`
                })(),
              )
            }
            className="rounded-lg border border-border p-3 text-left text-sm hover:bg-accent transition"
          >
            <div className="text-base mb-1">⚠️</div>Random Trap
          </button>
          <button
            onClick={() =>
              add(
                "Hazard",
                (() => {
                  const h = getRandomHazard()
                  return `${h.movement} / ${h.damage} / ${h.weaken}`
                })(),
              )
            }
            className="rounded-lg border border-border p-3 text-left text-sm hover:bg-accent transition"
          >
            <div className="text-base mb-1">💀</div>Random Hazard
          </button>
          <button
            onClick={() =>
              add(
                "D6 Decider",
                (() => {
                  const r = rollDice("1d6")
                  return r.total >= 4
                    ? `Favorable (${r.total})`
                    : `Unfavorable (${r.total})`
                })(),
              )
            }
            className="rounded-lg border border-border p-3 text-left text-sm hover:bg-accent transition"
          >
            <div className="text-base mb-1">🎲</div>D6 Decider
          </button>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            NPC Names
          </p>
          <div className="flex flex-wrap gap-2">
            {["human", "dwarf", "elf", "halfling", "half-orc", "goblin"].map(
              (a) => (
                <button
                  key={a}
                  onClick={() => add(`${a} Name`, getRandomName(a))}
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
          <h3 className="text-sm font-semibold">Results</h3>
          {results.length > 0 && (
            <button
              onClick={() => setResults([])}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
        <div className="max-h-96 space-y-1.5 overflow-y-auto">
          {results.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Click a generator to see results.
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
