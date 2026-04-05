import { useState } from "react"
import { getMonster, getClass, getItemPackId, getPackColor } from "@/data/index.ts"
import { DiceRoller } from "@/components/dice/dice-roller.tsx"
import { pushRollToast } from "@/components/shared/roll-toast.tsx"
import { generateId } from "@/lib/utils/id.ts"
import type { Character } from "@/schemas/character.ts"
import type { MonsterDefinition, MonsterInstance } from "@/schemas/monsters.ts"
import { getAbilityModifier } from "@/schemas/reference.ts"
import { useLocale } from '@/hooks/use-locale.ts'

type Selection = { type: 'monster'; id: string } | { type: 'character'; id: string } | null

interface Props {
  monsters: MonsterInstance[]
  characters: Character[]
  activeTurnId: string | null
  onSetActiveTurn: (id: string | null) => void
  onBroadcastRoll: (name: string, expression: string, total: number, isNat20: boolean, isNat1: boolean) => void
  onUpdateMonsterHp: (id: string, delta: number) => void
  onDefeatMonster: (id: string) => void
  onRemoveMonster: (id: string) => void
  onUpdateCharacterHp: (id: string, delta: number) => void
  onResolveEncounter: (encounterType: 'random' | 'story') => void
}

export function EncounterPanel({
  monsters,
  characters,
  activeTurnId,
  onSetActiveTurn,
  onBroadcastRoll,
  onUpdateMonsterHp,
  onDefeatMonster,
  onRemoveMonster,
  onUpdateCharacterHp,
  onResolveEncounter,
}: Props) {
  const { t, ti, tData, tDataNested } = useLocale()

  // Translate a monster instance name using the definition overlay
  function translateMonsterName(m: MonsterInstance) {
    const def = getMonster(m.definitionId)
    if (!def) return m.name
    const translated = tData('monsters', m.definitionId, 'name', def.name)
    // If the instance name was customized (e.g., "Goblin 2"), keep the number suffix
    if (m.name === def.name) return translated
    if (m.name.startsWith(def.name + ' ')) {
      const suffix = m.name.slice(def.name.length)
      return translated + suffix
    }
    return m.name
  }

  const [encounterType, setEncounterType] = useState<'random' | 'story'>('random')
  const [selection, setSelection] = useState<Selection>(
    monsters[0] ? { type: 'monster', id: monsters[0].id } : null
  )
  const activeMonsters = monsters.filter((m) => !m.isDefeated)
  const defeatedMonsters = monsters.filter((m) => m.isDefeated)

  const selectedMonster = selection?.type === 'monster' ? monsters.find(m => m.id === selection.id) : null
  const selectedMonsterDef = selectedMonster ? getMonster(selectedMonster.definitionId) : null
  const selectedCharacter = selection?.type === 'character' ? characters.find(c => c.id === selection.id) : null

  // Resolve active turn name
  const activeTurnMonster = activeTurnId ? monsters.find(m => m.id === activeTurnId) : null
  const activeTurnCharacter = activeTurnId ? characters.find(c => c.id === activeTurnId) : null
  const activeTurnName = activeTurnMonster?.name ?? activeTurnCharacter?.name ?? null
  const activeTurnIsMonster = !!activeTurnMonster

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {/* Active Turn Banner */}
      {activeTurnName && (
        <div className={`mb-4 flex items-center justify-between rounded-lg p-3 ${
          activeTurnIsMonster ? 'bg-red-500/10 border border-red-500/20' : 'bg-primary/10 border border-primary/20'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold uppercase ${activeTurnIsMonster ? 'text-red-400' : 'text-primary'}`}>
              {t('combat.activeTurn')}
            </span>
            <span className="font-semibold">{activeTurnName}</span>
          </div>
          <button
            onClick={() => onSetActiveTurn(null)}
            className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            {t('common.clear')}
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold">{t('combat.encounter')}</h2>
          <div className="flex gap-0.5 rounded-lg border border-border p-0.5">
            {(['random', 'story'] as const).map(et => (
              <button
                key={et}
                onClick={() => setEncounterType(et)}
                className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                  encounterType === et ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t(`combat.${et}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
            {ti('combat.activeCount', { count: activeMonsters.length })}
          </span>
          <button
            onClick={() => onResolveEncounter(encounterType)}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition"
          >
            {t('combat.resolveEncounter')}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[200px_1fr_220px]">
        {/* Left: Spawned Threats */}
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('combat.spawnedThreats')}
          </p>
          <div className="space-y-1.5">
            {activeMonsters.map((m) => {
              const hpPercent = m.maxHp > 0 ? (m.currentHp / m.maxHp) * 100 : 0
              const isSelected = selection?.type === 'monster' && selection.id === m.id
              const isActiveTurn = activeTurnId === m.id
              const packColor = getPackColor(getItemPackId(m.definitionId) ?? '')
              return (
                <div
                  key={m.id}
                  onClick={() => setSelection({ type: 'monster', id: m.id })}
                  onDoubleClick={() => onSetActiveTurn(isActiveTurn ? null : m.id)}
                  style={packColor ? { borderLeftColor: packColor, borderLeftWidth: '3px', borderLeftStyle: 'solid' } : undefined}
                  className={`relative w-full cursor-pointer rounded-lg border p-2 text-left transition ${
                    isActiveTurn ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/30" :
                    isSelected ? "border-red-500 bg-red-500/5" : "border-border/50 hover:border-border"
                  }`}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveMonster(m.id) }}
                    className="absolute right-1 top-1 rounded p-0.5 text-[10px] text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                    title="Remove"
                  >✕</button>
                  <div className="flex items-baseline justify-between pr-6">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onSetActiveTurn(isActiveTurn ? null : m.id)
                          setSelection({ type: 'monster', id: m.id })
                        }}
                        className={`text-[9px] font-bold ${isActiveTurn ? 'text-amber-400' : 'text-muted-foreground hover:text-amber-400'}`}
                        title={t('combat.setActiveTurn')}
                      >{isActiveTurn ? '■' : '▷'}</button>
                      <span className="text-sm font-semibold">{translateMonsterName(m)}</span>
                    </div>
                  </div>
                  <div className="mt-1">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className={`font-bold ${hpPercent > 50 ? "text-green-400" : hpPercent > 25 ? "text-amber-400" : "text-red-400"}`}>
                        HP {m.currentHp}/{m.maxHp}
                      </span>
                    </div>
                    <div className="mt-0.5 h-1 w-full rounded-full bg-secondary">
                      <div
                        className={`h-1 rounded-full transition-all ${hpPercent > 50 ? "bg-green-500" : hpPercent > 25 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${hpPercent}%` }}
                      />
                    </div>
                  </div>
                  {m.conditions.length > 0 && (
                    <div className="mt-1 flex gap-1">
                      {m.conditions.map((c) => (
                        <span key={c.id} className="rounded bg-red-500/20 px-1 py-0.5 text-[9px] text-red-400 capitalize">{c.condition}</span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            {defeatedMonsters.length > 0 && (
              <div className="mt-2 border-t border-border/30 pt-2">
                <p className="mb-1 text-[9px] uppercase text-muted-foreground">{t('combat.defeated')}</p>
                {defeatedMonsters.map((m) => (
                  <div key={m.id} className="flex items-center justify-between py-0.5 text-xs text-muted-foreground line-through">
                    <span>{translateMonsterName(m)}</span>
                    <button onClick={() => onRemoveMonster(m.id)} className="text-[10px] hover:text-red-400">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center: Detail Panel (monster or character) */}
        <div>
          {selectedMonster && selectedMonsterDef ? (
            <div className="space-y-4">
              <MonsterDetail
                instance={selectedMonster}
                definition={selectedMonsterDef}
                onHpChange={(delta) => onUpdateMonsterHp(selectedMonster.id, delta)}
                onDefeat={() => onDefeatMonster(selectedMonster.id)}
              />
              {activeTurnId === selectedMonster.id && (
                <DiceRoller characterName={selectedMonster.name} compact onRoll={(result) => {
                  const n20 = result.dice[0]?.isNat20 ?? false
                  const n1 = result.dice[0]?.isNat1 ?? false
                  pushRollToast({
                    id: generateId(),
                    playerName: selectedMonster.name,
                    diceType: result.expression,
                    total: result.total,
                    isNat20: n20,
                    isNat1: n1,
                    timestamp: Date.now(),
                  })
                  onBroadcastRoll(selectedMonster.name, result.expression, result.total, n20, n1)
                }} />
              )}
            </div>
          ) : selectedCharacter ? (
            <CharacterDetail
              character={selectedCharacter}
              onHpChange={(delta) => onUpdateCharacterHp(selectedCharacter.id, delta)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {t('combat.selectThreatOrPartyMember')}
            </div>
          )}
        </div>

        {/* Right: The Party */}
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t('combat.theParty')}
          </p>
          <div className="space-y-1.5">
            {characters.map((c) => {
              const hpPercent = c.maxHp > 0 ? (c.currentHp / c.maxHp) * 100 : 0
              const isSelected = selection?.type === 'character' && selection.id === c.id
              const isActiveTurn = activeTurnId === c.id
              return (
                <div
                  key={c.id}
                  onClick={() => setSelection({ type: 'character', id: c.id })}
                  onDoubleClick={() => onSetActiveTurn(isActiveTurn ? null : c.id)}
                  className={`cursor-pointer rounded-lg border p-2 transition ${
                    isActiveTurn ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/30" :
                    isSelected ? "border-primary bg-primary/5" : "border-border/50 hover:border-border"
                  }`}
                >
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onSetActiveTurn(isActiveTurn ? null : c.id)
                          setSelection({ type: 'character', id: c.id })
                        }}
                        className={`text-[9px] font-bold ${isActiveTurn ? 'text-amber-400' : 'text-muted-foreground hover:text-amber-400'}`}
                        title={t('combat.setActiveTurn')}
                      >{isActiveTurn ? '■' : '▷'}</button>
                      <span className="text-sm font-semibold">{c.name}</span>
                      <span className="text-[10px] text-muted-foreground capitalize">
                        Lv{c.level} {tData('classes', c.class, 'name', c.class)}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">AC {c.computed.ac}</span>
                  </div>
                  <div className="mt-1">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className={`font-bold ${hpPercent > 50 ? "text-green-400" : hpPercent > 25 ? "text-amber-400" : "text-red-400"}`}>
                        HP {c.currentHp}/{c.maxHp}
                      </span>
                    </div>
                    <div className="mt-0.5 h-1 w-full rounded-full bg-secondary">
                      <div
                        className={`h-1 rounded-full transition-all ${hpPercent > 50 ? "bg-green-500" : hpPercent > 25 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${hpPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function MonsterDetail({ instance, definition, onHpChange, onDefeat }: {
  instance: MonsterInstance; definition: MonsterDefinition; onHpChange: (delta: number) => void; onDefeat: () => void
}) {
  const { t, tData } = useLocale()
  const hpPercent = instance.maxHp > 0 ? (instance.currentHp / instance.maxHp) * 100 : 0
  const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`)

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-baseline justify-between">
          <h3 className="text-xl font-bold">{tData('monsters', instance.definitionId, 'name', instance.name)}</h3>
          <span className={`text-2xl font-bold ${hpPercent > 50 ? "text-green-400" : hpPercent > 25 ? "text-amber-400" : "text-red-400"}`}>
            HP {instance.currentHp}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">Level {definition.level} · Max HP {instance.maxHp}</p>
      </div>
      <div className="flex items-center justify-center gap-4">
        <button onClick={() => onHpChange(-5)} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-400 hover:bg-red-500/20">-5</button>
        <button onClick={() => onHpChange(-1)} className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-lg font-bold text-red-400 hover:bg-red-500/20">−</button>
        <div className="text-center">
          <div className="text-3xl font-bold">{instance.currentHp}</div>
          <div className="text-[10px] text-muted-foreground">/ {instance.maxHp}</div>
        </div>
        <button onClick={() => onHpChange(1)} className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-lg font-bold text-green-400 hover:bg-green-500/20">+</button>
        <button onClick={() => onHpChange(5)} className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm font-bold text-green-400 hover:bg-green-500/20">+5</button>
      </div>
      <div className="h-2 w-full rounded-full bg-secondary">
        <div className={`h-2 rounded-full transition-all ${hpPercent > 50 ? "bg-green-500" : hpPercent > 25 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${hpPercent}%` }} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-border p-2"><div className="text-[10px] text-muted-foreground">{t('character.ac')}</div><div className="text-xl font-bold">{definition.ac}</div></div>
        <div className="rounded-lg border border-border p-2"><div className="text-[10px] text-muted-foreground">{t('combat.attack')}</div><div className="text-xl font-bold">{fmt(definition.attacks[0]?.bonus ?? 0)}</div></div>
        <div className="rounded-lg border border-border p-2"><div className="text-[10px] text-muted-foreground">{t('combat.speed')}</div><div className="text-xl font-bold capitalize">{definition.movement.double ? "Dbl " : ""}{definition.movement.normal}</div></div>
      </div>
      <div className="grid grid-cols-6 gap-1 text-center text-xs">
        {(["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const).map((stat) => (
          <div key={stat} className="rounded border border-border/50 p-1">
            <div className="text-[9px] text-muted-foreground">{stat}</div>
            <div className="font-mono font-bold">{definition.stats[stat]}</div>
            <div className="text-[9px] text-muted-foreground">{fmt(getAbilityModifier(definition.stats[stat]))}</div>
          </div>
        ))}
      </div>
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('combat.attacks')}</p>
        <div className="space-y-1">
          {definition.attacks.map((a, i) => (
            <div key={i} className="rounded-lg border border-border/50 px-3 py-2 text-sm">
              <div className="flex items-baseline justify-between"><span className="font-semibold">{a.name}</span><span className="text-xs text-muted-foreground">{a.damage}</span></div>
              {a.specialEffect && <p className="text-xs text-muted-foreground mt-0.5">{a.specialEffect}</p>}
            </div>
          ))}
        </div>
      </div>
      {definition.abilities.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('combat.monsterAbilities')}</p>
          <div className="space-y-1 text-xs">
            {definition.abilities.map((a, i) => (
              <p key={i}><span className="font-semibold">{a.name}:</span> <span className="text-muted-foreground">{a.description}</span></p>
            ))}
          </div>
        </div>
      )}
      {definition.description && (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('combat.monsterDescription')}</p>
          <p className="text-xs text-muted-foreground italic leading-relaxed">{tData('monsters', definition.id, 'description', definition.description)}</p>
        </div>
      )}
      {definition.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {definition.tags.map(tag => (
            <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] capitalize">{tag}</span>
          ))}
        </div>
      )}
      {instance.currentHp <= 0 && !instance.isDefeated && (
        <button onClick={onDefeat} className="w-full rounded-lg bg-red-500/20 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/30 transition">
          {t('combat.markAsDefeated')}
        </button>
      )}
    </div>
  )
}

function CharacterDetail({ character: c, onHpChange }: { character: Character; onHpChange: (delta: number) => void }) {
  const { t, tData } = useLocale()
  const hpPercent = c.maxHp > 0 ? (c.currentHp / c.maxHp) * 100 : 0
  const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`)

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-baseline justify-between">
          <h3 className="text-xl font-bold">{c.name}</h3>
          <span className={`text-2xl font-bold ${hpPercent > 50 ? "text-green-400" : hpPercent > 25 ? "text-amber-400" : "text-red-400"}`}>
            HP {c.currentHp}
          </span>
        </div>
        <p className="text-xs text-muted-foreground capitalize">{tData('titles', `${c.class}-${c.alignment}-${c.level <= 2 ? 1 : c.level <= 4 ? 3 : c.level <= 6 ? 5 : c.level <= 8 ? 7 : 9}-${(c.level <= 2 ? 1 : c.level <= 4 ? 3 : c.level <= 6 ? 5 : c.level <= 8 ? 7 : 9) + 1}`, 'title', c.title)} · {tData('ancestries', c.ancestry, 'name', c.ancestry)} {tData('classes', c.class, 'name', c.class)} · {t('character.level')} {c.level} · {t(`character.alignment.${c.alignment}`)}</p>
      </div>
      <div className="flex items-center justify-center gap-4">
        <button onClick={() => onHpChange(-5)} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-400 hover:bg-red-500/20">-5</button>
        <button onClick={() => onHpChange(-1)} className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-lg font-bold text-red-400 hover:bg-red-500/20">−</button>
        <div className="text-center">
          <div className="text-3xl font-bold">{c.currentHp}</div>
          <div className="text-[10px] text-muted-foreground">/ {c.maxHp}</div>
        </div>
        <button onClick={() => onHpChange(1)} className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-lg font-bold text-green-400 hover:bg-green-500/20">+</button>
        <button onClick={() => onHpChange(5)} className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm font-bold text-green-400 hover:bg-green-500/20">+5</button>
      </div>
      <div className="h-2 w-full rounded-full bg-secondary">
        <div className={`h-2 rounded-full transition-all ${hpPercent > 50 ? "bg-green-500" : hpPercent > 25 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${hpPercent}%` }} />
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="rounded-lg border border-border p-2"><div className="text-[10px] text-muted-foreground">{t('character.ac')}</div><div className="text-xl font-bold">{c.computed.ac}</div></div>
        <div className="rounded-lg border border-border p-2"><div className="text-[10px] text-muted-foreground">{t('character.melee')}</div><div className="text-xl font-bold">{fmt(c.computed.meleeAttackBonus)}</div></div>
        <div className="rounded-lg border border-border p-2"><div className="text-[10px] text-muted-foreground">{t('character.ranged')}</div><div className="text-xl font-bold">{fmt(c.computed.rangedAttackBonus)}</div></div>
        {c.computed.spellCheckBonus != null && (
          <div className="rounded-lg border border-border p-2"><div className="text-[10px] text-muted-foreground">Spell</div><div className="text-xl font-bold">{fmt(c.computed.spellCheckBonus)}</div></div>
        )}
      </div>
      <div className="grid grid-cols-6 gap-1 text-center text-xs">
        {(["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const).map((stat) => (
          <div key={stat} className="rounded border border-border/50 p-1">
            <div className="text-[9px] text-muted-foreground">{stat}</div>
            <div className="font-mono font-bold">{c.computed.effectiveStats[stat]}</div>
            <div className="text-[9px] text-muted-foreground">{fmt(c.computed.modifiers[stat])}</div>
          </div>
        ))}
      </div>
      {c.conditions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {c.conditions.map(cond => (
            <span key={cond.id} className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400 capitalize">{cond.condition}</span>
          ))}
        </div>
      )}
      {c.inventory.items.filter(i => i.equipped && i.weapon).length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('combat.equippedWeapons')}</p>
          <div className="space-y-1">
            {c.inventory.items.filter(i => i.equipped && i.weapon).map(w => (
              <div key={w.id} className="rounded-lg border border-border/50 px-3 py-2 text-sm font-medium">
                {w.name}{w.magicBonus ? ` +${w.magicBonus}` : ''}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Background & Deity */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {c.background && (
          <span><span className="text-muted-foreground">Background:</span> <span className="capitalize">{c.background}</span></span>
        )}
        {c.deity && (
          <span><span className="text-muted-foreground">Deity:</span> <span className="capitalize">{c.deity}</span></span>
        )}
      </div>
      {/* Class Abilities */}
      <CharacterAbilities character={c} />
      {/* Talents */}
      {c.talents.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('character.talents')}</p>
          <div className="space-y-1 text-xs">
            {c.talents.map((t) => (
              <p key={t.id}><span className="font-semibold">{t.description}</span></p>
            ))}
          </div>
        </div>
      )}
      {/* Player Notes */}
      {c.notes && (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('combat.playerNotes')}</p>
          <p className="text-xs text-muted-foreground italic leading-relaxed whitespace-pre-wrap">{c.notes}</p>
        </div>
      )}
    </div>
  )
}

function CharacterAbilities({ character: c }: { character: Character }) {
  const { t, tDataNested } = useLocale()
  const classDef = getClass(c.class)
  if (!classDef) return null
  const activeFeatures = classDef.features.filter(f => f.level <= c.level)
  if (activeFeatures.length === 0) return null
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('combat.classAbilities')}</p>
      <div className="space-y-1 text-xs">
        {activeFeatures.map((f, i) => {
          const fk = f.mechanic.type.replace(/_/g, '-')
          return (
            <p key={i}><span className="font-semibold">{tDataNested('classes', classDef.id, ['features', fk, 'name'], f.name)}:</span> <span className="text-muted-foreground">{tDataNested('classes', classDef.id, ['features', fk, 'description'], f.description)}</span></p>
          )
        })}
      </div>
    </div>
  )
}
