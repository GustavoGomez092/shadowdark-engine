import { useState, useMemo } from 'react'
import type { Character } from '@/schemas/character.ts'
import type { TreasureQuality } from '@/schemas/reference.ts'
import { TREASURE_XP, XP_THRESHOLDS } from '@/schemas/reference.ts'
import { generateGoldReward } from '@/lib/rules/xp.ts'
import { WEAPONS, ARMOR, GEAR, getItemPackId } from '@/data/index.ts'
import { useDataRegistry } from '@/hooks/use-data-registry.ts'
import { dataRegistry } from '@/lib/data/registry.ts'
import { calculateUsedSlots } from '@/lib/rules/inventory.ts'
import { useLocale } from '@/hooks/use-locale.ts'

interface ItemAward {
  itemId: string
  itemName: string
  itemSlots: number
  itemCategory: string
  characterId: string
  characterName: string
}

interface Props {
  characters: Character[]
  avgPartyLevel: number
  hasTreasure: boolean
  encounterType: 'random' | 'story'
  onDistribute: (quality: TreasureQuality, goldPerCharacter: number, bonusXP: number, itemAwards: ItemAward[]) => void
  onSkip: () => void
}

const QUALITY_OPTIONS: { key: TreasureQuality; labelKey: string; xp: number; color: string }[] = [
  { key: 'poor', labelKey: 'rewards.poor', xp: 0, color: 'text-muted-foreground border-border' },
  { key: 'normal', labelKey: 'rewards.normal', xp: 1, color: 'text-blue-400 border-blue-500/30' },
  { key: 'fabulous', labelKey: 'rewards.fabulous', xp: 3, color: 'text-purple-400 border-purple-500/30' },
  { key: 'legendary', labelKey: 'rewards.legendary', xp: 10, color: 'text-amber-400 border-amber-500/30' },
]

export function RewardsDialog({ characters, avgPartyLevel, hasTreasure, encounterType, onDistribute, onSkip }: Props) {
  const { t, ti } = useLocale()
  useDataRegistry()
  const ALL_REWARD_ITEMS = useMemo(() => [
    ...WEAPONS.map(w => ({ id: w.id, name: w.name, slots: w.slots, category: 'weapon' as const })),
    ...ARMOR.map(a => ({ id: a.id, name: a.name, slots: a.slots, category: 'armor' as const })),
    ...GEAR.filter(g => g.category === 'magic_item' || g.category === 'consumable' || g.category === 'treasure')
      .map(g => ({ id: g.id, name: g.name, slots: g.slots, category: g.category })),
  ], [WEAPONS, ARMOR, GEAR])
  const [quality, setQuality] = useState<TreasureQuality>('normal')
  const [gold, setGold] = useState(() => generateGoldReward(avgPartyLevel))
  const [bonusXP, setBonusXP] = useState(0)
  const [itemAwards, setItemAwards] = useState<ItemAward[]>([])
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const itemPacks = dataRegistry.getPacks().filter(p => p.enabled && (p.counts.weapons + p.counts.armor + p.counts.gear) > 0)
  const [itemSearch, setItemSearch] = useState('')
  const [selectedItemId, setSelectedItemId] = useState('')
  const [selectedCharId, setSelectedCharId] = useState('')

  const xpFromTreasure = TREASURE_XP[quality]
  const totalXP = xpFromTreasure + bonusXP

  const selectedItem = ALL_REWARD_ITEMS.find(i => i.id === selectedItemId)

  function addItemAward() {
    if (!selectedItemId || !selectedCharId || !selectedItem) return
    const char = characters.find(c => c.id === selectedCharId)
    if (!char) return
    setItemAwards(prev => [...prev, {
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      itemSlots: selectedItem.slots,
      itemCategory: selectedItem.category,
      characterId: char.id,
      characterName: char.name,
    }])
    setSelectedItemId('')
    setSelectedCharId('')
    setItemSearch('')
  }

  function removeItemAward(index: number) {
    setItemAwards(prev => prev.filter((_, i) => i !== index))
  }

  // Calculate available slots per character (accounting for pending awards)
  function getAvailableSlots(charId: string): number {
    const char = characters.find(c => c.id === charId)
    if (!char) return 0
    const used = calculateUsedSlots(char.inventory)
    const pendingSlots = itemAwards.filter(a => a.characterId === charId).reduce((sum, a) => sum + a.itemSlots, 0)
    const max = char.computed.gearSlots
    return max - used - pendingSlots
  }

  if (!hasTreasure) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 text-center">
          <div className="text-4xl mb-3">💨</div>
          <h2 className="text-xl font-bold mb-2">{t('rewards.noTreasureFound')}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {encounterType === 'random'
              ? t('rewards.randomNoTreasure')
              : t('rewards.storyNoTreasure')}
          </p>
          <button onClick={onSkip} className="w-full rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground hover:opacity-90 transition">
            {t('common.continue')}
          </button>
        </div>
      </div>
    )
  }

  let sourceFilteredItems = ALL_REWARD_ITEMS
  if (sourceFilter === 'core') sourceFilteredItems = sourceFilteredItems.filter(i => !getItemPackId(i.id))
  else if (sourceFilter !== 'all') sourceFilteredItems = sourceFilteredItems.filter(i => getItemPackId(i.id) === sourceFilter)

  const filteredItems = itemSearch
    ? sourceFilteredItems.filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase()))
    : sourceFilteredItems

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8">
      <div className="mx-4 w-full max-w-lg rounded-xl border border-border bg-card p-6">
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">⚔️</div>
          <h2 className="text-xl font-bold">{t('rewards.encounterResolved')}</h2>
          <p className="text-xs text-muted-foreground capitalize">{ti('rewards.encounterType', { type: encounterType })}</p>
        </div>

        {/* Treasure Quality */}
        <div className="mb-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('rewards.treasureQuality')}</label>
          <div className="flex gap-2">
            {QUALITY_OPTIONS.map(q => (
              <button key={q.key} onClick={() => setQuality(q.key)}
                className={`flex-1 rounded-lg border py-2 text-center text-sm font-semibold transition ${
                  quality === q.key ? `${q.color} bg-current/10 ring-1 ring-current` : 'border-border text-muted-foreground hover:text-foreground'
                }`}>
                <div>{t(q.labelKey)}</div>
                <div className="text-[10px] opacity-70">{q.xp} XP</div>
              </button>
            ))}
          </div>
        </div>

        {/* Gold */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('rewards.goldPerCharacter')}</label>
          <div className="flex items-center gap-2">
            <button onClick={() => setGold(g => Math.max(0, g - 5))} className="rounded-lg border border-border px-3 py-1.5 text-sm font-bold hover:bg-accent">-5</button>
            <button onClick={() => setGold(g => Math.max(0, g - 1))} className="rounded-lg border border-border px-3 py-1.5 text-sm font-bold hover:bg-accent">-1</button>
            <div className="flex-1 text-center">
              <input type="number" value={gold} onChange={e => setGold(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-20 rounded-lg border border-input bg-background px-2 py-1 text-center text-lg font-bold outline-none focus:ring-2 focus:ring-ring" />
              <span className="ml-1 text-sm text-muted-foreground">gp</span>
            </div>
            <button onClick={() => setGold(g => g + 1)} className="rounded-lg border border-border px-3 py-1.5 text-sm font-bold hover:bg-accent">+1</button>
            <button onClick={() => setGold(g => g + 5)} className="rounded-lg border border-border px-3 py-1.5 text-sm font-bold hover:bg-accent">+5</button>
          </div>
        </div>

        {/* Bonus XP */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('rewards.bonusXp')}</label>
          <div className="flex items-center gap-2">
            <button onClick={() => setBonusXP(b => Math.max(0, b - 1))} className="rounded-lg border border-border px-3 py-1.5 text-sm font-bold hover:bg-accent">−</button>
            <span className="w-12 text-center text-lg font-bold">{bonusXP}</span>
            <button onClick={() => setBonusXP(b => b + 1)} className="rounded-lg border border-border px-3 py-1.5 text-sm font-bold hover:bg-accent">+</button>
          </div>
        </div>

        {/* Item Awards */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('rewards.awardItems')}</label>
            {itemPacks.length > 0 && (
              <select
                value={sourceFilter}
                onChange={e => setSourceFilter(e.target.value)}
                className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs outline-none"
              >
                <option value="all">{t('common.allSources')}</option>
                <option value="core">{t('common.coreOnly')}</option>
                {itemPacks.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex gap-2 mb-2">
            <div className="flex-1">
              <input
                type="text"
                value={itemSearch}
                onChange={e => { setItemSearch(e.target.value); setSelectedItemId('') }}
                placeholder={t('rewards.searchItem')}
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
              {itemSearch && !selectedItemId && (
                <div className="absolute z-10 mt-1 max-h-32 w-64 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                  {filteredItems.slice(0, 10).map(item => (
                    <button key={item.id} onClick={() => { setSelectedItemId(item.id); setItemSearch(item.name) }}
                      className="w-full px-2 py-1 text-left text-xs hover:bg-accent">{item.name} <span className="text-muted-foreground">{item.slots}s</span></button>
                  ))}
                </div>
              )}
            </div>
            <select value={selectedCharId} onChange={e => setSelectedCharId(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1 text-xs outline-none">
              <option value="">{t('rewards.hero')}</option>
              {characters.map(c => {
                const available = getAvailableSlots(c.id)
                const canFit = selectedItem ? available >= selectedItem.slots : true
                return (
                  <option key={c.id} value={c.id} disabled={!canFit}>
                    {c.name} ({available}s free){!canFit ? ' — full' : ''}
                  </option>
                )
              })}
            </select>
            <button onClick={addItemAward} disabled={!selectedItemId || !selectedCharId}
              className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-30">{t('common.add')}</button>
          </div>
          {itemAwards.length > 0 && (
            <div className="space-y-1">
              {itemAwards.map((award, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-border/50 px-2 py-1 text-xs">
                  <span><span className="font-medium">{award.itemName}</span> → <span className="text-primary">{award.characterName}</span></span>
                  <button onClick={() => removeItemAward(i)} className="text-red-400 hover:text-red-300">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="mb-4 rounded-lg bg-secondary p-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">{t('rewards.xpFromTreasure')}</span>
            <span className="font-bold">{xpFromTreasure}</span>
          </div>
          {bonusXP > 0 && (
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">{t('rewards.bonusXpLabel')}</span>
              <span className="font-bold">+{bonusXP}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold border-t border-border/50 pt-1 mt-1">
            <span>{t('rewards.totalPerCharacter')}</span>
            <span className="text-primary">{ti('rewards.totalXpAndGold', { xp: totalXP, gold })}</span>
          </div>
          {itemAwards.length > 0 && (
            <div className="text-xs text-muted-foreground mt-1">{ti('rewards.itemsAwarded', { count: itemAwards.length })}</div>
          )}
        </div>

        {/* Party Preview */}
        <div className="mb-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('rewards.partyRewardsPreview')}</label>
          <div className="space-y-1.5">
            {characters.map(c => {
              const threshold = XP_THRESHOLDS[c.level] ?? 0
              const newXP = c.xp + totalXP
              const willLevelUp = newXP >= threshold && c.level < 10
              const charItems = itemAwards.filter(a => a.characterId === c.id)

              return (
                <div key={c.id} className={`rounded-lg border p-2 text-sm ${willLevelUp ? 'border-amber-500/30 bg-amber-500/5' : 'border-border/50'}`}>
                  <div className="flex items-baseline justify-between">
                    <span className="font-medium capitalize">{c.name} <span className="text-xs text-muted-foreground">Lv{c.level} {c.class}</span></span>
                    {willLevelUp && <span className="text-[10px] font-bold text-amber-400 uppercase">{t('rewards.levelUpExclaim')}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    XP: {c.xp}/{threshold} → <span className={willLevelUp ? 'text-amber-400 font-bold' : 'text-primary'}>{newXP}/{threshold}</span>
                    {' · '}Gold: {c.inventory.coins.gp} → <span className="text-primary">{c.inventory.coins.gp + gold}</span> gp
                  </div>
                  {charItems.length > 0 && (
                    <div className="text-xs text-primary mt-0.5">+ {charItems.map(a => a.itemName).join(', ')}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={() => onDistribute(quality, gold, bonusXP, itemAwards)}
            className="flex-1 rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground hover:opacity-90 transition">
            {t('rewards.distributeRewards')}
          </button>
          <button onClick={onSkip} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-accent transition">{t('common.skip')}</button>
        </div>
      </div>
    </div>
  )
}

export type { ItemAward }
