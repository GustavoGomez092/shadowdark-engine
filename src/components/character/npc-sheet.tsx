import type { Character, AbilityScore } from '@/schemas/character.ts'

const ABILITY_KEYS: AbilityScore[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']

const abilityMod = (score: number) => Math.floor((score - 10) / 2)

interface Props {
  character: Character
  isEditable?: boolean
  onHpChange?: (delta: number) => void
  onNotesChange?: (notes: string) => void
}

function fmtMod(n: number) {
  return n >= 0 ? `+${n}` : `${n}`
}

/**
 * Statblock-style sheet for an NPC controlled as a Character (character.isNpc).
 * Shows authored AC/HP/attacks/abilities instead of class features/talents/spells.
 */
export function NpcSheet({ character: c, isEditable = false, onHpChange, onNotesChange }: Props) {
  const npc = c.npc!
  const stats = c.baseStats

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{c.name}</h2>
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-500 border border-amber-500/30">NPC</span>
            </div>
            <p className="text-sm text-muted-foreground capitalize">
              {c.ancestry} · Nivel {c.level} · {c.alignment}
              {npc.role ? ` · ${npc.role}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* AC / HP / Movement */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">CA</div>
          <div className="text-2xl font-bold">{npc.ac}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">PG</div>
          <div className="flex items-center justify-center gap-1.5">
            {isEditable && onHpChange && (
              <button onClick={() => onHpChange(-1)} className="h-5 w-5 rounded border border-border text-xs hover:bg-accent">−</button>
            )}
            <span className="text-2xl font-bold">{c.currentHp}<span className="text-sm text-muted-foreground">/{c.maxHp}</span></span>
            {isEditable && onHpChange && (
              <button onClick={() => onHpChange(1)} className="h-5 w-5 rounded border border-border text-xs hover:bg-accent">+</button>
            )}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Movimiento</div>
          <div className="text-lg font-bold capitalize">{npc.movement?.normal ?? 'near'}</div>
        </div>
      </div>

      {/* Ability scores */}
      <div className="grid grid-cols-6 gap-2">
        {ABILITY_KEYS.map(k => (
          <div key={k} className="rounded-lg border border-border bg-card p-2 text-center">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</div>
            <div className="text-lg font-bold">{stats[k]}</div>
            <div className="text-[10px] text-muted-foreground">{fmtMod(abilityMod(stats[k]))}</div>
          </div>
        ))}
      </div>

      {/* Attacks */}
      {npc.attacks.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold">Ataques</h3>
          <div className="space-y-1.5">
            {npc.attacks.map((a, i) => (
              <div key={i} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">{a.name}</span>
                <span className="text-muted-foreground">{fmtMod(a.bonus)} · {a.damage} · {a.range}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Abilities */}
      {npc.abilities.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold">Habilidades</h3>
          <div className="space-y-2">
            {npc.abilities.map((ab, i) => (
              <div key={i}>
                <div className="text-sm font-medium">{ab.name}</div>
                <div className="text-xs text-muted-foreground leading-relaxed">{ab.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Personality + notes */}
      {npc.personality && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-1 text-sm font-semibold">Personalidad</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{npc.personality}</p>
        </div>
      )}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-2 text-sm font-semibold">Notas</h3>
        {isEditable && onNotesChange ? (
          <textarea
            value={c.notes}
            onChange={e => onNotesChange(e.target.value)}
            rows={3}
            className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        ) : (
          <p className="whitespace-pre-wrap text-xs text-muted-foreground leading-relaxed">{c.notes || '—'}</p>
        )}
      </div>
    </div>
  )
}
