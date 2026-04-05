import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useCampaignStore } from '@/stores/campaign-store.ts'
import { useLocale } from '@/hooks/use-locale.ts'
import { ContentList } from '@/components/campaign/content-editors/content-list.tsx'
import { MonsterEditor, createEmptyMonster } from '@/components/campaign/content-editors/monster-editor.tsx'
import { SpellEditor, createEmptySpell } from '@/components/campaign/content-editors/spell-editor.tsx'
import {
  WeaponEditor, ArmorEditor, GearEditor, BackgroundEditor, DeityEditor, LanguageEditor, AncestryEditor,
  createEmptyWeapon, createEmptyArmor, createEmptyGear, createEmptyBackground, createEmptyDeity, createEmptyLanguage, createEmptyAncestry,
} from '@/components/campaign/content-editors/simple-editors.tsx'
import type { MonsterDefinition } from '@/schemas/monsters.ts'
import type { SpellDefinition } from '@/schemas/spells.ts'
import type { WeaponDefinition, ArmorDefinition, GearDefinition } from '@/schemas/inventory.ts'
import type { BackgroundDefinition, DeityDefinition, LanguageDefinition } from '@/schemas/reference.ts'
import type { AncestryDefinition } from '@/schemas/character.ts'

export const Route = createFileRoute('/campaign/$campaignId/content')({
  component: ContentEditorsPage,
})

type ContentTab = 'monsters' | 'spells' | 'weapons' | 'armor' | 'gear' | 'backgrounds' | 'deities' | 'languages' | 'ancestries'

const TABS: { key: ContentTab; label: string }[] = [
  { key: 'monsters', label: 'Monsters' },
  { key: 'spells', label: 'Spells' },
  { key: 'weapons', label: 'Weapons' },
  { key: 'armor', label: 'Armor' },
  { key: 'gear', label: 'Gear' },
  { key: 'ancestries', label: 'Ancestries' },
  { key: 'backgrounds', label: 'Backgrounds' },
  { key: 'deities', label: 'Deities' },
  { key: 'languages', label: 'Languages' },
]

function ContentEditorsPage() {
  const { t } = useLocale()
  const campaign = useCampaignStore(s => s.campaign)
  const updateContent = useCampaignStore(s => s.updateContent)

  const [tab, setTab] = useState<ContentTab>('monsters')
  const [editing, setEditing] = useState<any>(null)

  if (!campaign) return null

  const content = campaign.content

  function saveItem<K extends ContentTab>(key: K, item: any) {
    updateContent(c => {
      const arr = (c[key] ?? []) as any[]
      const idx = arr.findIndex((i: any) => i.id === item.id)
      if (idx >= 0) arr[idx] = item
      else arr.push(item)
      ;(c as any)[key] = arr
    })
    setEditing(null)
  }

  function deleteItem(key: ContentTab, id: string) {
    updateContent(c => {
      ;(c as any)[key] = ((c as any)[key] ?? []).filter((i: any) => i.id !== id)
    })
  }

  return (
    <main className="mx-auto max-w-5xl px-3 py-4 sm:px-4 sm:py-8">
      <h1 className="mb-4 text-2xl font-bold">{t('campaign.nav.content')}</h1>

      {/* Tab Bar */}
      <div className="-mx-3 mb-6 flex gap-1 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0 scrollbar-hide">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
              tab === t.key
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'border border-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            {t.label}
            {((content[t.key] as any[]) ?? []).length > 0 && (
              <span className="ml-1.5 rounded-full bg-secondary px-1.5 py-0.5 text-[10px]">
                {((content[t.key] as any[]) ?? []).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content for active tab */}
      {tab === 'monsters' && (
        <>
          <ContentList<MonsterDefinition>
            items={content.monsters ?? []}
            typeName="Monster"
            onAdd={() => setEditing(createEmptyMonster())}
            onEdit={m => setEditing(m)}
            onDelete={id => deleteItem('monsters', id)}
            renderSummary={m => `LV ${m.level} · AC ${m.ac} · HP ${m.hp}`}
          />
          {editing && <MonsterEditor monster={editing} onSave={m => saveItem('monsters', m)} onCancel={() => setEditing(null)} />}
        </>
      )}

      {tab === 'spells' && (
        <>
          <ContentList<SpellDefinition>
            items={content.spells ?? []}
            typeName="Spell"
            onAdd={() => setEditing(createEmptySpell())}
            onEdit={s => setEditing(s)}
            onDelete={id => deleteItem('spells', id)}
            renderSummary={s => `Tier ${s.tier} · ${s.class} · ${s.range}`}
          />
          {editing && <SpellEditor spell={editing} onSave={s => saveItem('spells', s)} onCancel={() => setEditing(null)} />}
        </>
      )}

      {tab === 'weapons' && (
        <>
          <ContentList<WeaponDefinition>
            items={content.weapons ?? []}
            typeName="Weapon"
            onAdd={() => setEditing(createEmptyWeapon())}
            onEdit={w => setEditing(w)}
            onDelete={id => deleteItem('weapons', id)}
            renderSummary={w => `${w.type} · ${w.damage} · ${w.cost}gp`}
          />
          {editing && <WeaponEditor weapon={editing} onSave={w => saveItem('weapons', w)} onCancel={() => setEditing(null)} />}
        </>
      )}

      {tab === 'armor' && (
        <>
          <ContentList<ArmorDefinition>
            items={content.armor ?? []}
            typeName="Armor"
            onAdd={() => setEditing(createEmptyArmor())}
            onEdit={a => setEditing(a)}
            onDelete={id => deleteItem('armor', id)}
            renderSummary={a => `${a.type} · AC ${a.acBase} · ${a.cost}gp`}
          />
          {editing && <ArmorEditor armor={editing} onSave={a => saveItem('armor', a)} onCancel={() => setEditing(null)} />}
        </>
      )}

      {tab === 'gear' && (
        <>
          <ContentList<GearDefinition>
            items={content.gear ?? []}
            typeName="Gear"
            onAdd={() => setEditing(createEmptyGear())}
            onEdit={g => setEditing(g)}
            onDelete={id => deleteItem('gear', id)}
            renderSummary={g => `${g.category} · ${g.slots}s · ${g.cost}gp`}
          />
          {editing && <GearEditor gear={editing} onSave={g => saveItem('gear', g)} onCancel={() => setEditing(null)} />}
        </>
      )}

      {tab === 'backgrounds' && (
        <>
          <ContentList<BackgroundDefinition>
            items={content.backgrounds ?? []}
            typeName="Background"
            onAdd={() => setEditing(createEmptyBackground())}
            onEdit={b => setEditing(b)}
            onDelete={id => deleteItem('backgrounds', id)}
            renderSummary={b => b.description.slice(0, 60)}
          />
          {editing && <BackgroundEditor background={editing} onSave={b => saveItem('backgrounds', b)} onCancel={() => setEditing(null)} />}
        </>
      )}

      {tab === 'deities' && (
        <>
          <ContentList<DeityDefinition>
            items={content.deities ?? []}
            typeName="Deity"
            onAdd={() => setEditing(createEmptyDeity())}
            onEdit={d => setEditing(d)}
            onDelete={id => deleteItem('deities', id)}
            renderSummary={d => `${d.alignment} · ${d.domain}`}
          />
          {editing && <DeityEditor deity={editing} onSave={d => saveItem('deities', d)} onCancel={() => setEditing(null)} />}
        </>
      )}

      {tab === 'languages' && (
        <>
          <ContentList<LanguageDefinition>
            items={content.languages ?? []}
            typeName="Language"
            onAdd={() => setEditing(createEmptyLanguage())}
            onEdit={l => setEditing(l)}
            onDelete={id => deleteItem('languages', id)}
            renderSummary={l => `${l.rarity} · ${l.typicalSpeakers}`}
          />
          {editing && <LanguageEditor language={editing} onSave={l => saveItem('languages', l)} onCancel={() => setEditing(null)} />}
        </>
      )}

      {tab === 'ancestries' && (
        <>
          <ContentList<AncestryDefinition>
            items={content.ancestries ?? []}
            typeName="Ancestry"
            onAdd={() => setEditing(createEmptyAncestry())}
            onEdit={a => setEditing(a)}
            onDelete={id => deleteItem('ancestries', id)}
            renderSummary={a => `${a.traitName} · ${a.languages.join(', ')}`}
          />
          {editing && <AncestryEditor ancestry={editing} onSave={a => saveItem('ancestries', a)} onCancel={() => setEditing(null)} />}
        </>
      )}
    </main>
  )
}
