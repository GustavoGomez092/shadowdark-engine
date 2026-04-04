import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useLocale } from "@/hooks/use-locale.ts"
import { ANCESTRIES, ARMOR, BACKGROUNDS, CLASSES, DEITIES, GEAR, MONSTERS, SPELLS, WEAPONS } from "@/data/index.ts"
import { useDataRegistry } from "@/hooks/use-data-registry.ts"
import { generateAdventureName } from "@/data/tables/adventure-names.ts"
import { getRandomHazard } from "@/data/tables/hazards.ts"
import { getRandomName } from "@/data/tables/npc-names.ts"
import { getRandomTrap } from "@/data/tables/traps.ts"
import { rollDice } from "@/lib/dice/roller.ts"
import { getAbilityModifier } from "@/schemas/reference.ts"

export const Route = createFileRoute("/gm/tables")({
  component: ReferencePage,
})

type Tab = "rules" | "spells" | "items" | "monsters" | "world" | "generators"

function ReferencePage() {
  useDataRegistry()
  const { t } = useLocale()
  const [tab, setTab] = useState<Tab>("rules")
  const [search, setSearch] = useState("")

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-bold">📖 {t('reference.title')}</h1>
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

      {tab !== "rules" && tab !== "generators" && tab !== "world" && (
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
      {tab === "generators" && <Generators />}
    </main>
  )
}

// ========== RULES ==========
function RulesCheatSheet() {
  const { t } = useLocale()
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
        <h3 className="mb-3 font-bold text-primary">{t('reference.rules.lightDarkness')}</h3>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            <span className="text-foreground font-medium">{t('reference.rules.torchLabel')}</span>{" "}
            {t('reference.rules.torchDesc')}
          </p>
          <p>
            <span className="text-foreground font-medium">{t('reference.rules.lanternLabel')}</span>{" "}
            {t('reference.rules.lanternDesc')}
          </p>
          <p>
            <span className="text-foreground font-medium">{t('reference.rules.campfireLabel')}</span>{" "}
            {t('reference.rules.campfireDesc')}
          </p>
          <p>
            <span className="text-foreground font-medium">{t('reference.rules.darknessLabel')}</span>{" "}
            {t('reference.rules.darknessDesc')}
          </p>
          <p>
            <span className="text-foreground font-medium">{t('reference.rules.rideAlongLabel')}</span>{" "}
            {t('reference.rules.rideAlongDesc')}
          </p>
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
            <span className="text-foreground font-medium">
              {t('reference.rules.encounterChecksLabel')}
            </span>{" "}
            {t('reference.rules.encounterChecksDesc')}
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
  const { t, tData } = useLocale()
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
  const { t, tData } = useLocale()
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
                {c.features.map(f => (
                  <span key={f.name} className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-medium text-primary">{f.name}</span>
                ))}
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
            <div className="text-base mb-1">🗺️</div>{t('reference.generators.adventureName')}
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
            <div className="text-base mb-1">⚠️</div>{t('reference.generators.randomTrap')}
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
            <div className="text-base mb-1">💀</div>{t('reference.generators.randomHazard')}
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
            <div className="text-base mb-1">🎲</div>{t('reference.generators.d6Decider')}
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
