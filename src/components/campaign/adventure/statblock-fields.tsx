import type { MonsterAttack, MonsterAbility } from '@/schemas/monsters.ts'
import type { AbilityScores } from '@/schemas/character.ts'
import type { NpcStats } from '@/lib/campaign/npc-statblock.ts'

interface Props {
  stats: NpcStats
  onChange: (stats: NpcStats) => void
}

const ABILITIES: (keyof AbilityScores)[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']

/**
 * Editable statblock fields for an NPC (level, AC, HP, alignment, movement,
 * ability scores, attacks, abilities). Controlled — emits a full NpcStats on
 * every change.
 */
export function StatblockFields({ stats, onChange }: Props) {
  const set = (patch: Partial<NpcStats>) => onChange({ ...stats, ...patch })
  const setStat = (k: keyof AbilityScores, v: number) => onChange({ ...stats, stats: { ...stats.stats, [k]: v } })

  const setAttack = (i: number, patch: Partial<MonsterAttack>) =>
    onChange({ ...stats, attacks: stats.attacks.map((a, j) => j === i ? { ...a, ...patch } : a) })
  const addAttack = () => onChange({ ...stats, attacks: [...stats.attacks, { name: 'Attack', bonus: 0, damage: '1d6', range: 'close' }] })
  const removeAttack = (i: number) => onChange({ ...stats, attacks: stats.attacks.filter((_, j) => j !== i) })

  const setAbility = (i: number, patch: Partial<MonsterAbility>) =>
    onChange({ ...stats, abilities: stats.abilities.map((a, j) => j === i ? { ...a, ...patch } : a) })
  const addAbility = () => onChange({ ...stats, abilities: [...stats.abilities, { name: '', description: '' }] })
  const removeAbility = (i: number) => onChange({ ...stats, abilities: stats.abilities.filter((_, j) => j !== i) })

  const inputCls = 'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="space-y-4 rounded-lg border border-border/60 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Statblock</div>

      {/* Level / AC / HP / Alignment */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Level</label>
          <input type="number" value={stats.level} onChange={e => set({ level: parseInt(e.target.value) || 0 })} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">AC</label>
          <input type="number" value={stats.ac} onChange={e => set({ ac: parseInt(e.target.value) || 0 })} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">HP</label>
          <input type="number" value={stats.hp} onChange={e => set({ hp: parseInt(e.target.value) || 1 })} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Alignment</label>
          <select value={stats.alignment} onChange={e => set({ alignment: e.target.value as NpcStats['alignment'] })} className={inputCls}>
            <option value="lawful">Lawful</option>
            <option value="neutral">Neutral</option>
            <option value="chaotic">Chaotic</option>
          </select>
        </div>
      </div>

      {/* Movement */}
      <div className="sm:w-1/3">
        <label className="mb-1 block text-xs font-semibold text-muted-foreground">Movement</label>
        <select value={stats.movement.normal} onChange={e => set({ movement: { normal: e.target.value as 'none' | 'close' | 'near' | 'far' } })} className={inputCls}>
          <option value="none">None (immobile)</option>
          <option value="close">Close</option>
          <option value="near">Near</option>
          <option value="far">Far</option>
        </select>
      </div>

      {/* Ability scores */}
      <div>
        <label className="mb-2 block text-xs font-semibold text-muted-foreground">Ability Scores</label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {ABILITIES.map(k => (
            <div key={k} className="text-center">
              <div className="mb-1 text-[10px] font-bold text-muted-foreground">{k}</div>
              <input type="number" value={stats.stats[k]} onChange={e => setStat(k, parseInt(e.target.value) || 10)}
                className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-center text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
          ))}
        </div>
      </div>

      {/* Attacks */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-semibold text-muted-foreground">Attacks</label>
          <button type="button" onClick={addAttack} className="text-xs text-primary hover:underline">+ Add Attack</button>
        </div>
        <div className="space-y-2">
          {stats.attacks.map((atk, i) => (
            <div key={i} className="grid grid-cols-2 items-center gap-2 sm:grid-cols-5">
              <input type="text" value={atk.name} onChange={e => setAttack(i, { name: e.target.value })} placeholder="Name" className="rounded border border-input bg-background px-2 py-1 text-sm outline-none" />
              <input type="number" value={atk.bonus} onChange={e => setAttack(i, { bonus: parseInt(e.target.value) || 0 })} placeholder="Bonus" className="rounded border border-input bg-background px-2 py-1 text-sm outline-none" />
              <input type="text" value={atk.damage} onChange={e => setAttack(i, { damage: e.target.value })} placeholder="Damage" className="rounded border border-input bg-background px-2 py-1 text-sm outline-none" />
              <select value={atk.range} onChange={e => setAttack(i, { range: e.target.value as 'close' | 'near' | 'far' })} className="rounded border border-input bg-background px-2 py-1 text-sm outline-none">
                <option value="close">Close</option>
                <option value="near">Near</option>
                <option value="far">Far</option>
              </select>
              <button type="button" onClick={() => removeAttack(i)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
            </div>
          ))}
        </div>
      </div>

      {/* Abilities */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-semibold text-muted-foreground">Special Abilities</label>
          <button type="button" onClick={addAbility} className="text-xs text-primary hover:underline">+ Add Ability</button>
        </div>
        <div className="space-y-2">
          {stats.abilities.map((ab, i) => (
            <div key={i} className="rounded-lg border border-border/50 p-2">
              <div className="flex gap-2">
                <input type="text" value={ab.name} onChange={e => setAbility(i, { name: e.target.value })} placeholder="Ability name" className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm outline-none" />
                <button type="button" onClick={() => removeAbility(i)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
              </div>
              <textarea value={ab.description} onChange={e => setAbility(i, { description: e.target.value })} placeholder="Description" rows={2}
                className="mt-2 w-full rounded border border-input bg-background px-2 py-1 text-xs outline-none resize-y" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
