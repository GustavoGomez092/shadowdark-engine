import { useState } from 'react'
import { ANCESTRIES, CLASSES, BACKGROUNDS, DEITIES } from '@/data/index.ts'
import { useDataRegistry } from '@/hooks/use-data-registry.ts'
import type { AbilityScores, AbilityScore, Ancestry, CharacterClass } from '@/schemas/character.ts'
import type { Alignment } from '@/schemas/reference.ts'
import { getAbilityModifier } from '@/schemas/reference.ts'
import { rollDice } from '@/lib/dice/roller.ts'
import { createCharacter, rollStartingHP, rollStartingGold, getStartingLanguages } from '@/lib/rules/character.ts'
import type { Character } from '@/schemas/character.ts'
import { useLocale } from '@/hooks/use-locale.ts'

const ABILITY_KEYS: AbilityScore[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']
const STEP_KEYS = [
  'character.creator.rollStats',
  'character.creator.ancestry',
  'character.creator.class',
  'character.creator.details',
  'character.creator.review',
] as const

interface Props {
  playerId: string
  onComplete: (character: Character) => void
  onCancel: () => void
  maxRerolls?: number // undefined = unlimited (GM), number = player limit
}

export function CharacterCreator({ playerId, onComplete, onCancel, maxRerolls }: Props) {
  useDataRegistry()
  const { t, ti, tData } = useLocale()
  const [step, setStep] = useState(0)
  const [stats, setStats] = useState<AbilityScores | null>(null)
  const [rerollsUsed, setRerollsUsed] = useState(0)
  const [ancestry, setAncestry] = useState<Ancestry | null>(null)
  const [elfChoice, setElfChoice] = useState<'ranged' | 'spellcasting' | undefined>(undefined)
  const [characterClass, setCharacterClass] = useState<CharacterClass | null>(null)
  const [name, setName] = useState('')
  const [background, setBackground] = useState(BACKGROUNDS[0].id)
  const [alignment, setAlignment] = useState<Alignment>('lawful')
  const [deity, setDeity] = useState<string | undefined>(undefined)

  function rollStats(isFreeReroll: boolean) {
    const newStats = {} as AbilityScores
    for (const key of ABILITY_KEYS) {
      const r = rollDice('3d6')
      newStats[key] = r.total
    }
    setStats(newStats)
    // Only consume a reroll if player had a valid set (stat >= 14) and chose to reroll anyway
    if (!isFreeReroll && stats !== null) {
      setRerollsUsed(prev => prev + 1)
    }
  }

  const hasHighStat = stats ? ABILITY_KEYS.some(k => stats[k] >= 14) : false
  const rerollsRemaining = maxRerolls !== undefined ? maxRerolls - rerollsUsed : undefined
  const canReroll = rerollsRemaining === undefined || rerollsRemaining > 0 || !hasHighStat

  function canProceed(): boolean {
    switch (step) {
      case 0: return stats !== null
      case 1: return ancestry !== null && (ancestry !== 'elf' || elfChoice !== undefined)
      case 2: return characterClass !== null
      case 3: return name.trim().length > 0
      case 4: return true
      default: return false
    }
  }

  function handleCreate() {
    if (!stats || !ancestry || !characterClass) return

    const conMod = getAbilityModifier(stats.CON)
    const startingHp = rollStartingHP(characterClass, conMod, ancestry === 'dwarf')
    const languages = getStartingLanguages(ancestry)

    const character = createCharacter({
      name: name.trim(),
      playerId,
      ancestry,
      characterClass,
      alignment,
      background,
      deity: characterClass === 'priest' ? deity : undefined,
      baseStats: stats,
      elfChoice: ancestry === 'elf' ? elfChoice : undefined,
      languages,
      talents: [], // talents are rolled separately after creation
      startingHp,
    })

    // Set starting gold
    const gold = rollStartingGold()
    const withGold = {
      ...character,
      inventory: {
        ...character.inventory,
        coins: { gp: gold, sp: 0, cp: 0 },
      },
    }

    onComplete(withGold)
  }

  const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Step indicators */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {STEP_KEYS.map((key, i) => (
          <div key={key} className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
              i === step ? 'bg-primary text-primary-foreground' :
              i < step ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'
            }`}>
              {i + 1}
            </div>
            <span className={`hidden text-sm sm:inline ${i === step ? 'font-semibold' : 'text-muted-foreground'}`}>
              {t(key)}
            </span>
            {i < STEP_KEYS.length - 1 && <div className="mx-1 h-px w-6 bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 0: Roll Stats */}
      {step === 0 && (
        <div>
          <h2 className="mb-4 text-2xl font-bold">{t('character.creator.rollAbilityScores')}</h2>
          <p className="mb-6 text-muted-foreground">{t('character.creator.rollDescription')}</p>

          {!stats ? (
            <button onClick={() => rollStats(true)} className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90 transition">
              {t('character.creator.rollForEachStat')}
            </button>
          ) : (
            <div>
              <div className="mb-6 grid grid-cols-3 gap-4 sm:grid-cols-6">
                {ABILITY_KEYS.map(key => (
                  <div key={key} className="rounded-xl border border-border bg-card p-3 text-center">
                    <div className="text-xs font-semibold text-muted-foreground">{key}</div>
                    <div className="text-2xl font-bold">{stats[key]}</div>
                    <div className="text-sm text-muted-foreground">{fmt(getAbilityModifier(stats[key]))}</div>
                  </div>
                ))}
              </div>
              {!hasHighStat && (
                <p className="mb-4 text-sm text-amber-400">
                  {t('character.creator.noStatHighEnough')}
                </p>
              )}
              {rerollsRemaining !== undefined && (
                <p className="mb-2 text-xs text-muted-foreground">
                  {ti('character.creator.rerollsRemaining', { remaining: rerollsRemaining, max: maxRerolls })}
                  {!hasHighStat && ` ${t('character.creator.thisRerollIsFree')}`}
                </p>
              )}
              <button
                onClick={() => rollStats(!hasHighStat)}
                disabled={!canReroll}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {!hasHighStat ? t('character.creator.freeReroll') :
                 rerollsRemaining !== undefined ? ti('character.creator.rerollWithCount', { count: rerollsRemaining }) : t('character.creator.rerollAll')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 1: Ancestry */}
      {step === 1 && (
        <div>
          <h2 className="mb-4 text-2xl font-bold">{t('character.creator.chooseAncestry')}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {ANCESTRIES.map(a => (
              <button
                key={a.id}
                onClick={() => { setAncestry(a.id); if (a.id !== 'elf') setElfChoice(undefined); }}
                className={`rounded-xl border p-4 text-left transition ${
                  ancestry === a.id ? 'border-primary bg-primary/5 ring-2 ring-primary' : 'border-border bg-card hover:border-primary/50'
                }`}
              >
                <h3 className="font-bold">{tData('ancestries', a.id, 'name', a.name)}</h3>
                <p className="text-sm font-medium text-primary">{tData('ancestries', a.id, 'traitName', a.traitName)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{tData('ancestries', a.id, 'traitDescription', a.traitDescription)}</p>
                <div className="mt-2 flex gap-1">
                  {a.languages.map(l => (
                    <span key={l} className="rounded bg-secondary px-1.5 py-0.5 text-xs">{l}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>

          {ancestry === 'elf' && (
            <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <h3 className="mb-2 font-semibold">{t('character.creator.farsightChoice')}</h3>
              <div className="flex gap-3">
                {(['ranged', 'spellcasting'] as const).map(choice => (
                  <button
                    key={choice}
                    onClick={() => setElfChoice(choice)}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                      elfChoice === choice ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-accent'
                    }`}
                  >
                    {choice === 'ranged' ? t('character.creator.rangedAttacks') : t('character.creator.spellcasting')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Class */}
      {step === 2 && (
        <div>
          <h2 className="mb-4 text-2xl font-bold">{t('character.creator.chooseClass')}</h2>
          <div className="grid gap-3 sm:grid-cols-2 items-start">
            {CLASSES.map(c => {
              const isSelected = characterClass === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => setCharacterClass(c.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    isSelected ? 'border-primary bg-primary/5 ring-2 ring-primary' : 'border-border bg-card hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-bold">{tData('classes', c.id, 'name', c.name)}</h3>
                    <span className="text-sm font-mono text-muted-foreground">{c.hitDie}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{tData('classes', c.id, 'description', c.description)}</p>

                  {/* Collapsed: feature names only */}
                  {!isSelected && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {c.features.map(f => (
                        <span key={f.name} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium">{f.name}</span>
                      ))}
                    </div>
                  )}

                  {/* Expanded: full feature descriptions */}
                  {isSelected && (
                    <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
                      {c.features.map(f => (
                        <div key={f.name}>
                          <p className="text-xs font-semibold text-primary">{f.name}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
                        </div>
                      ))}
                      <div className="pt-1">
                        <p className="text-[10px] text-muted-foreground">
                          {ti('character.creator.weapons', { list: c.weaponProficiencies.join(', ') })}
                        </p>
                        <p className="text-[10px] text-muted-foreground capitalize">
                          {ti('character.creator.armor', { list: c.armorProficiencies.join(', ').replace(/_/g, ' ') })}
                        </p>
                      </div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Step 3: Details */}
      {step === 3 && (
        <div>
          <h2 className="mb-4 text-2xl font-bold">{t('character.creator.characterDetails')}</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold">{t('character.creator.name')}</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('character.creator.namePlaceholder')}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">{t('character.creator.backgroundLabel')}</label>
              <select
                value={background}
                onChange={e => setBackground(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                {BACKGROUNDS.map(b => (
                  <option key={b.id} value={b.id}>{tData('backgrounds', b.id, 'name', b.name)} — {tData('backgrounds', b.id, 'description', b.description)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">{t('character.creator.alignment')}</label>
              <div className="flex gap-2">
                {(['lawful', 'neutral', 'chaotic'] as const).map(a => (
                  <button
                    key={a}
                    onClick={() => setAlignment(a)}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize transition ${
                      alignment === a ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-accent'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {characterClass === 'priest' && (
              <div>
                <label className="mb-1 block text-sm font-semibold">{t('character.creator.deityLabel')}</label>
                <select
                  value={deity ?? ''}
                  onChange={e => setDeity(e.target.value || undefined)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">{t('character.creator.selectDeity')}</option>
                  {DEITIES.filter(d => d.alignment === alignment || d.alignment === 'neutral').map(d => (
                    <option key={d.id} value={d.id}>{tData('deities', d.id, 'name', d.name)} ({d.alignment}) — {d.domain}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && stats && ancestry && characterClass && (
        <div>
          <h2 className="mb-4 text-2xl font-bold">{t('character.creator.reviewCharacter')}</h2>
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl font-bold">{name || t('character.creator.unnamed')}</h3>
              <span className="text-sm text-muted-foreground capitalize">{alignment}</span>
            </div>
            <p className="text-muted-foreground capitalize">
              {ancestry} {characterClass} · Level 1
            </p>

            <div className="grid grid-cols-6 gap-2 text-center">
              {ABILITY_KEYS.map(key => (
                <div key={key} className="rounded-lg border border-border p-2">
                  <div className="text-xs font-semibold text-muted-foreground">{key}</div>
                  <div className="text-lg font-bold">{stats[key]}</div>
                  <div className="text-xs text-muted-foreground">{fmt(getAbilityModifier(stats[key]))}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="font-semibold">{t('character.background')}</span> {(() => { const b = BACKGROUNDS.find(b => b.id === background); return b ? tData('backgrounds', b.id, 'name', b.name) : '' })()}</div>
              {deity && <div><span className="font-semibold">{t('character.deity')}</span> {(() => { const d = DEITIES.find(d => d.id === deity); return d ? tData('deities', d.id, 'name', d.name) : '' })()}</div>}
              <div><span className="font-semibold">{t('character.creator.hitDie')}</span> {CLASSES.find(c => c.id === characterClass)?.hitDie}</div>
            </div>

            <button
              onClick={handleCreate}
              className="w-full rounded-lg bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90 transition"
            >
              {t('character.creator.createCharacter')}
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex justify-between">
        <button
          onClick={() => step === 0 ? onCancel() : setStep(step - 1)}
          className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent transition"
        >
          {step === 0 ? t('common.cancel') : t('common.back')}
        </button>
        {step < STEP_KEYS.length - 1 && (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
          >
            {t('common.next')}
          </button>
        )}
      </div>
    </div>
  )
}
