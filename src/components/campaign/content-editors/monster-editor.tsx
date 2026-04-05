import { useState } from 'react'
import { generateId } from '@/lib/utils/id.ts'
import type { MonsterDefinition, MonsterAttack, MonsterAbility } from '@/schemas/monsters.ts'
import type { AbilityScores } from '@/schemas/reference.ts'

const EMPTY_STATS: AbilityScores = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 }

const TAGS = ['humanoid', 'undead', 'beast', 'construct', 'aberration', 'dragon', 'fey', 'fiend', 'elemental', 'ooze', 'plant', 'spellcaster', 'boss']

export function createEmptyMonster(): MonsterDefinition {
  return {
    id: generateId(),
    name: '',
    description: '',
    level: 1,
    ac: 12,
    hp: 6,
    hpDice: '1d8',
    attacks: [{ name: 'Attack', bonus: 2, damage: '1d6', range: 'close' as const }],
    movement: { normal: 'near' as const },
    stats: { ...EMPTY_STATS },
    alignment: 'neutral' as const,
    abilities: [],
    checksMorale: true,
    tags: [],
  }
}

interface Props {
  monster: MonsterDefinition
  onSave: (monster: MonsterDefinition) => void
  onCancel: () => void
}

export function MonsterEditor({ monster: initial, onSave, onCancel }: Props) {
  const [m, setM] = useState<MonsterDefinition>({ ...initial, stats: { ...initial.stats }, attacks: initial.attacks.map(a => ({ ...a })), abilities: initial.abilities.map(a => ({ ...a })), tags: [...initial.tags] })

  function update<K extends keyof MonsterDefinition>(key: K, value: MonsterDefinition[K]) {
    setM(prev => ({ ...prev, [key]: value }))
  }

  function updateStat(stat: keyof AbilityScores, value: number) {
    setM(prev => ({ ...prev, stats: { ...prev.stats, [stat]: value } }))
  }

  function updateAttack(index: number, updates: Partial<MonsterAttack>) {
    setM(prev => {
      const attacks = [...prev.attacks]
      attacks[index] = { ...attacks[index], ...updates }
      return { ...prev, attacks }
    })
  }

  function addAttack() {
    setM(prev => ({ ...prev, attacks: [...prev.attacks, { name: 'Attack', bonus: 0, damage: '1d6', range: 'close' as const }] }))
  }

  function removeAttack(index: number) {
    setM(prev => ({ ...prev, attacks: prev.attacks.filter((_, i) => i !== index) }))
  }

  function updateAbility(index: number, updates: Partial<MonsterAbility>) {
    setM(prev => {
      const abilities = [...prev.abilities]
      abilities[index] = { ...abilities[index], ...updates }
      return { ...prev, abilities }
    })
  }

  function addAbility() {
    setM(prev => ({ ...prev, abilities: [...prev.abilities, { name: '', description: '' }] }))
  }

  function removeAbility(index: number) {
    setM(prev => ({ ...prev, abilities: prev.abilities.filter((_, i) => i !== index) }))
  }

  function toggleTag(tag: string) {
    setM(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag],
    }))
  }

  function randomizeStats() {
    const roll3d6 = () => Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6) + 3
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
    const level = Math.floor(Math.random() * 10) + 1
    const hp = Math.max(1, level * (Math.floor(Math.random() * 4) + 3) + Math.floor(Math.random() * 6))
    const hpDieSize = level <= 2 ? 6 : level <= 5 ? 8 : level <= 8 ? 10 : 12
    const hpDieCount = Math.max(1, Math.ceil(hp / (hpDieSize / 2 + 0.5)))
    const ac = 10 + Math.floor(level / 2) + Math.floor(Math.random() * 4)
    const atkBonus = Math.floor(level / 2) + 1 + Math.floor(Math.random() * 2)
    const dmgDie = level <= 2 ? '1d6' : level <= 5 ? '1d8' : level <= 8 ? '2d6' : '2d8'
    const movement = pick(['close', 'near', 'far'] as const)
    const alignment = pick(['lawful', 'neutral', 'chaotic'] as const)
    const atkName = pick(['Bite', 'Claw', 'Slam', 'Strike', 'Slash', 'Sting', 'Lash', 'Gore'])
    const atkRange = pick(['close', 'near'] as const)

    setM(prev => ({
      ...prev,
      level,
      ac,
      hp,
      hpDice: `${hpDieCount}d${hpDieSize}`,
      movement: { ...prev.movement, normal: movement },
      alignment,
      checksMorale: Math.random() > 0.3,
      stats: { STR: roll3d6(), DEX: roll3d6(), CON: roll3d6(), INT: roll3d6(), WIS: roll3d6(), CHA: roll3d6() },
      attacks: [{ name: atkName, bonus: atkBonus, damage: dmgDie, range: atkRange }],
      tags: prev.tags.length > 0 ? prev.tags : [pick(TAGS)],
    }))
  }

  function handleSave() {
    // Auto-generate ID from name if empty
    const saved = { ...m }
    if (!saved.id) saved.id = saved.name.toLowerCase().replace(/\s+/g, '-')
    onSave(saved)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {initial.name ? `Edit: ${initial.name}` : 'New Monster'}
          </h2>
          <button
            onClick={randomizeStats}
            className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition"
          >
            Randomize Stats
          </button>
        </div>

        <div className="space-y-4">
          {/* Basic Info */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Name *</label>
              <input type="text" value={m.name} onChange={e => update('name', e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">ID</label>
              <input type="text" value={m.id} onChange={e => update('id', e.target.value)}
                placeholder="auto-generated"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring font-mono text-xs" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Description</label>
            <textarea value={m.description ?? ''} onChange={e => update('description', e.target.value)}
              rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-y" />
          </div>

          {/* Combat Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Level</label>
              <input type="number" value={m.level} onChange={e => update('level', parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">AC</label>
              <input type="number" value={m.ac} onChange={e => update('ac', parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">HP</label>
              <input type="number" value={m.hp} onChange={e => update('hp', parseInt(e.target.value) || 1)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">HP Dice</label>
              <input type="text" value={m.hpDice ?? ''} onChange={e => update('hpDice', e.target.value)}
                placeholder="e.g. 2d8+2"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          {/* Alignment & Movement */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Alignment</label>
              <select value={m.alignment} onChange={e => update('alignment', e.target.value as 'lawful' | 'neutral' | 'chaotic')}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
                <option value="lawful">Lawful</option>
                <option value="neutral">Neutral</option>
                <option value="chaotic">Chaotic</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Movement</label>
              <select value={m.movement.normal} onChange={e => update('movement', { ...m.movement, normal: e.target.value as 'close' | 'near' | 'far' })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
                <option value="close">Close</option>
                <option value="near">Near</option>
                <option value="far">Far</option>
              </select>
            </div>
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={m.checksMorale} onChange={e => update('checksMorale', e.target.checked)} className="rounded" />
                Checks Morale
              </label>
            </div>
          </div>

          {/* Ability Scores */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-muted-foreground">Ability Scores</label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const).map(stat => (
                <div key={stat} className="text-center">
                  <div className="text-[10px] font-bold text-muted-foreground mb-1">{stat}</div>
                  <input type="number" value={m.stats[stat]} onChange={e => updateStat(stat, parseInt(e.target.value) || 10)}
                    className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-center text-sm outline-none focus:ring-2 focus:ring-ring" />
                </div>
              ))}
            </div>
          </div>

          {/* Attacks */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground">Attacks</label>
              <button onClick={addAttack} className="text-xs text-primary hover:underline">+ Add Attack</button>
            </div>
            <div className="space-y-2">
              {m.attacks.map((atk, i) => (
                <div key={i} className="rounded-lg border border-border/50 p-3">
                  <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                    <input type="text" value={atk.name} onChange={e => updateAttack(i, { name: e.target.value })}
                      placeholder="Name" className="rounded border border-input bg-background px-2 py-1 text-sm outline-none" />
                    <input type="number" value={atk.bonus} onChange={e => updateAttack(i, { bonus: parseInt(e.target.value) || 0 })}
                      placeholder="Bonus" className="rounded border border-input bg-background px-2 py-1 text-sm outline-none" />
                    <input type="text" value={atk.damage} onChange={e => updateAttack(i, { damage: e.target.value })}
                      placeholder="Damage" className="rounded border border-input bg-background px-2 py-1 text-sm outline-none" />
                    <select value={atk.range} onChange={e => updateAttack(i, { range: e.target.value as 'close' | 'near' | 'far' })}
                      className="rounded border border-input bg-background px-2 py-1 text-sm outline-none">
                      <option value="close">Close</option>
                      <option value="near">Near</option>
                      <option value="far">Far</option>
                    </select>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input type="text" value={atk.specialEffect ?? ''} onChange={e => updateAttack(i, { specialEffect: e.target.value || undefined })}
                      placeholder="Special effect (optional)" className="flex-1 rounded border border-input bg-background px-2 py-1 text-xs outline-none" />
                    <button onClick={() => removeAttack(i)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Abilities */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground">Special Abilities</label>
              <button onClick={addAbility} className="text-xs text-primary hover:underline">+ Add Ability</button>
            </div>
            <div className="space-y-2">
              {m.abilities.map((ab, i) => (
                <div key={i} className="rounded-lg border border-border/50 p-3">
                  <div className="flex gap-2">
                    <input type="text" value={ab.name} onChange={e => updateAbility(i, { name: e.target.value })}
                      placeholder="Ability name" className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm outline-none" />
                    <button onClick={() => removeAbility(i)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                  </div>
                  <textarea value={ab.description} onChange={e => updateAbility(i, { description: e.target.value })}
                    placeholder="Description" rows={2}
                    className="mt-2 w-full rounded border border-input bg-background px-2 py-1 text-xs outline-none resize-y" />
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-muted-foreground">Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full px-3 py-1 text-xs transition ${
                    m.tags.includes(tag)
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'bg-secondary text-muted-foreground border border-border hover:text-foreground'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent transition">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!m.name.trim()}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-40">
            Save Monster
          </button>
        </div>
      </div>
    </div>
  )
}
