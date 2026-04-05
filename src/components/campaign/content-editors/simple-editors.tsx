import { useState } from 'react'
import { generateId } from '@/lib/utils/id.ts'
import type { WeaponDefinition, ArmorDefinition, GearDefinition } from '@/schemas/inventory.ts'
import type { BackgroundDefinition, DeityDefinition, LanguageDefinition } from '@/schemas/reference.ts'
import type { AncestryDefinition } from '@/schemas/character.ts'

// ── Factory functions ──

export function createEmptyWeapon(): WeaponDefinition {
  return { id: generateId(), name: '', type: 'melee', damage: 'd6' as any, range: 'close' as const, properties: [], cost: 1, slots: 1 }
}
export function createEmptyArmor(): ArmorDefinition {
  return { id: generateId(), name: '', type: 'leather', acBase: 11, addDex: true, stealthPenalty: false, swimPenalty: 'none' as const, cost: 10, slots: 1, isMithral: false }
}
export function createEmptyGear(): GearDefinition {
  return { id: generateId(), name: '', category: 'gear', cost: 1, slots: 1, description: '' }
}
export function createEmptyBackground(): BackgroundDefinition {
  return { id: generateId(), name: '', description: '' }
}
export function createEmptyDeity(): DeityDefinition {
  return { id: generateId(), name: '', alignment: 'neutral' as const, domain: '', description: '' }
}
export function createEmptyLanguage(): LanguageDefinition {
  return { id: generateId(), name: '', rarity: 'common' as const, typicalSpeakers: '' }
}
export function createEmptyAncestry(): AncestryDefinition {
  return { id: generateId(), name: '', traitName: '', traitDescription: '', mechanics: [], languages: ['Common'] }
}

// ── Generic Modal Shell ──

function EditorModal({ title, onSave, onCancel, disabled, children }: {
  title: string; onSave: () => void; onCancel: () => void; disabled?: boolean; children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <div className="space-y-4">{children}</div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent transition">Cancel</button>
          <button onClick={onSave} disabled={disabled} className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-40">Save</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"

// ── Weapon Editor ──

export function WeaponEditor({ weapon: initial, onSave, onCancel }: { weapon: WeaponDefinition; onSave: (w: WeaponDefinition) => void; onCancel: () => void }) {
  const [w, setW] = useState({ ...initial, properties: [...initial.properties] })
  const u = <K extends keyof WeaponDefinition>(k: K, v: WeaponDefinition[K]) => setW(p => ({ ...p, [k]: v }))
  const PROPS = ['finesse', 'loading', 'thrown', 'two_handed', 'versatile']
  const toggleProp = (p: string) => setW(prev => ({ ...prev, properties: prev.properties.includes(p) ? prev.properties.filter(x => x !== p) : [...prev.properties, p] }))

  return (
    <EditorModal title={initial.name ? `Edit: ${initial.name}` : 'New Weapon'} onSave={() => onSave(w)} onCancel={onCancel} disabled={!w.name.trim()}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name *"><input type="text" value={w.name} onChange={e => u('name', e.target.value)} className={inputCls} /></Field>
        <Field label="Type"><select value={w.type} onChange={e => u('type', e.target.value as 'melee' | 'ranged')} className={inputCls}><option value="melee">Melee</option><option value="ranged">Ranged</option></select></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Damage"><input type="text" value={w.damage} onChange={e => u('damage', e.target.value as any)} placeholder="d6" className={inputCls} /></Field>
        <Field label="Range"><select value={w.range} onChange={e => u('range', e.target.value as any)} className={inputCls}><option value="close">Close</option><option value="near">Near</option><option value="far">Far</option></select></Field>
        <Field label="Cost (gp)"><input type="number" value={w.cost} onChange={e => u('cost', parseFloat(e.target.value) || 0)} className={inputCls} /></Field>
        <Field label="Slots"><input type="number" value={w.slots} onChange={e => u('slots', parseInt(e.target.value) || 1)} className={inputCls} /></Field>
      </div>
      <div>
        <label className="mb-2 block text-xs font-semibold text-muted-foreground">Properties</label>
        <div className="flex flex-wrap gap-1.5">
          {PROPS.map(p => (
            <button key={p} onClick={() => toggleProp(p)} className={`rounded-full px-3 py-1 text-xs transition ${w.properties.includes(p) ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-secondary text-muted-foreground border border-border'}`}>{p.replace('_', ' ')}</button>
          ))}
        </div>
      </div>
    </EditorModal>
  )
}

// ── Armor Editor ──

export function ArmorEditor({ armor: initial, onSave, onCancel }: { armor: ArmorDefinition; onSave: (a: ArmorDefinition) => void; onCancel: () => void }) {
  const [a, setA] = useState({ ...initial })
  const u = <K extends keyof ArmorDefinition>(k: K, v: ArmorDefinition[K]) => setA(p => ({ ...p, [k]: v }))

  return (
    <EditorModal title={initial.name ? `Edit: ${initial.name}` : 'New Armor'} onSave={() => onSave(a)} onCancel={onCancel} disabled={!a.name.trim()}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name *"><input type="text" value={a.name} onChange={e => u('name', e.target.value)} className={inputCls} /></Field>
        <Field label="Type"><select value={a.type} onChange={e => u('type', e.target.value)} className={inputCls}><option value="leather">Leather</option><option value="chainmail">Chainmail</option><option value="plate">Plate</option><option value="shield">Shield</option></select></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="AC Base"><input type="number" value={a.acBase} onChange={e => u('acBase', parseInt(e.target.value) || 0)} className={inputCls} /></Field>
        <Field label="Cost (gp)"><input type="number" value={a.cost} onChange={e => u('cost', parseFloat(e.target.value) || 0)} className={inputCls} /></Field>
        <Field label="Slots"><input type="number" value={a.slots} onChange={e => u('slots', parseInt(e.target.value) || 1)} className={inputCls} /></Field>
        <Field label="Swim Penalty"><select value={a.swimPenalty} onChange={e => u('swimPenalty', e.target.value as any)} className={inputCls}><option value="none">None</option><option value="disadvantage">Disadvantage</option><option value="cannot">Cannot</option></select></Field>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={a.addDex} onChange={e => u('addDex', e.target.checked)} className="rounded" />Add DEX</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={a.stealthPenalty} onChange={e => u('stealthPenalty', e.target.checked)} className="rounded" />Stealth Penalty</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={a.isMithral} onChange={e => u('isMithral', e.target.checked)} className="rounded" />Mithral</label>
      </div>
    </EditorModal>
  )
}

// ── Gear Editor ──

export function GearEditor({ gear: initial, onSave, onCancel }: { gear: GearDefinition; onSave: (g: GearDefinition) => void; onCancel: () => void }) {
  const [g, setG] = useState({ ...initial })
  const u = <K extends keyof GearDefinition>(k: K, v: GearDefinition[K]) => setG(p => ({ ...p, [k]: v }))

  return (
    <EditorModal title={initial.name ? `Edit: ${initial.name}` : 'New Gear'} onSave={() => onSave(g)} onCancel={onCancel} disabled={!g.name.trim()}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name *"><input type="text" value={g.name} onChange={e => u('name', e.target.value)} className={inputCls} /></Field>
        <Field label="Category"><select value={g.category} onChange={e => u('category', e.target.value)} className={inputCls}>
          <option value="gear">Gear</option><option value="consumable">Consumable</option><option value="treasure">Treasure</option><option value="magic_item">Magic Item</option><option value="ammo">Ammo</option><option value="ration">Ration</option><option value="light_source">Light Source</option>
        </select></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Cost (gp)"><input type="number" value={g.cost} onChange={e => u('cost', parseFloat(e.target.value) || 0)} className={inputCls} /></Field>
        <Field label="Slots"><input type="number" value={g.slots} onChange={e => u('slots', parseInt(e.target.value) || 1)} className={inputCls} /></Field>
      </div>
      <Field label="Description *"><textarea value={g.description} onChange={e => u('description', e.target.value)} rows={3} className={inputCls + " resize-y"} /></Field>
    </EditorModal>
  )
}

// ── Background Editor ──

export function BackgroundEditor({ background: initial, onSave, onCancel }: { background: BackgroundDefinition; onSave: (b: BackgroundDefinition) => void; onCancel: () => void }) {
  const [b, setB] = useState({ ...initial })
  return (
    <EditorModal title={initial.name ? `Edit: ${initial.name}` : 'New Background'} onSave={() => onSave(b)} onCancel={onCancel} disabled={!b.name.trim()}>
      <Field label="Name *"><input type="text" value={b.name} onChange={e => setB(p => ({ ...p, name: e.target.value }))} className={inputCls} /></Field>
      <Field label="Description *"><textarea value={b.description} onChange={e => setB(p => ({ ...p, description: e.target.value }))} rows={3} className={inputCls + " resize-y"} /></Field>
    </EditorModal>
  )
}

// ── Deity Editor ──

export function DeityEditor({ deity: initial, onSave, onCancel }: { deity: DeityDefinition; onSave: (d: DeityDefinition) => void; onCancel: () => void }) {
  const [d, setD] = useState({ ...initial })
  const u = <K extends keyof DeityDefinition>(k: K, v: DeityDefinition[K]) => setD(p => ({ ...p, [k]: v }))

  return (
    <EditorModal title={initial.name ? `Edit: ${initial.name}` : 'New Deity'} onSave={() => onSave(d)} onCancel={onCancel} disabled={!d.name.trim()}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name *"><input type="text" value={d.name} onChange={e => u('name', e.target.value)} className={inputCls} /></Field>
        <Field label="Alignment"><select value={d.alignment} onChange={e => u('alignment', e.target.value as any)} className={inputCls}><option value="lawful">Lawful</option><option value="neutral">Neutral</option><option value="chaotic">Chaotic</option></select></Field>
      </div>
      <Field label="Domain"><input type="text" value={d.domain} onChange={e => u('domain', e.target.value)} placeholder="e.g., War, Healing" className={inputCls} /></Field>
      <Field label="Description"><textarea value={d.description} onChange={e => u('description', e.target.value)} rows={3} className={inputCls + " resize-y"} /></Field>
    </EditorModal>
  )
}

// ── Language Editor ──

export function LanguageEditor({ language: initial, onSave, onCancel }: { language: LanguageDefinition; onSave: (l: LanguageDefinition) => void; onCancel: () => void }) {
  const [l, setL] = useState({ ...initial })
  const u = <K extends keyof LanguageDefinition>(k: K, v: LanguageDefinition[K]) => setL(p => ({ ...p, [k]: v }))

  return (
    <EditorModal title={initial.name ? `Edit: ${initial.name}` : 'New Language'} onSave={() => onSave(l)} onCancel={onCancel} disabled={!l.name.trim()}>
      <Field label="Name *"><input type="text" value={l.name} onChange={e => u('name', e.target.value)} className={inputCls} /></Field>
      <Field label="Rarity"><select value={l.rarity} onChange={e => u('rarity', e.target.value as any)} className={inputCls}><option value="common">Common</option><option value="rare">Rare</option></select></Field>
      <Field label="Typical Speakers"><input type="text" value={l.typicalSpeakers} onChange={e => u('typicalSpeakers', e.target.value)} placeholder="e.g., Humans, Elves" className={inputCls} /></Field>
    </EditorModal>
  )
}

// ── Ancestry Editor ──

export function AncestryEditor({ ancestry: initial, onSave, onCancel }: { ancestry: AncestryDefinition; onSave: (a: AncestryDefinition) => void; onCancel: () => void }) {
  const [a, setA] = useState({ ...initial, mechanics: initial.mechanics.map(m => ({ ...m })), languages: [...initial.languages] })
  const u = <K extends keyof AncestryDefinition>(k: K, v: AncestryDefinition[K]) => setA(p => ({ ...p, [k]: v }))

  return (
    <EditorModal title={initial.name ? `Edit: ${initial.name}` : 'New Ancestry'} onSave={() => onSave(a)} onCancel={onCancel} disabled={!a.name.trim()}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name *"><input type="text" value={a.name} onChange={e => u('name', e.target.value)} className={inputCls} /></Field>
        <Field label="Trait Name *"><input type="text" value={a.traitName} onChange={e => u('traitName', e.target.value)} placeholder="e.g., Stout, Farsight" className={inputCls} /></Field>
      </div>
      <Field label="Trait Description *"><textarea value={a.traitDescription} onChange={e => u('traitDescription', e.target.value)} rows={3} className={inputCls + " resize-y"} /></Field>
      <Field label="Languages (comma-separated)">
        <input type="text" value={a.languages.join(', ')} onChange={e => u('languages', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} placeholder="Common, Elvish" className={inputCls} />
      </Field>
    </EditorModal>
  )
}
