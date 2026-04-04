import { useState } from 'react'
import type { Character, AbilityScore, AppliedTalent } from '@/schemas/character.ts'
import type { InventoryItem } from '@/schemas/inventory.ts'
import { getSpell, getClass } from '@/data/index.ts'
import { getXpToNextLevel, canLevelUp } from '@/lib/rules/character.ts'
import { LevelUpWizard } from './level-up-wizard.tsx'
import { useLocale } from '@/hooks/use-locale.ts'

const ABILITY_KEYS: AbilityScore[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']

interface Props {
  character: Character
  isEditable?: boolean // GM or owning player can edit
  hideInventory?: boolean // hide inventory section (when shown separately in sidebar)
  onHpChange?: (delta: number) => void
  onToggleLuckToken?: () => void
  onEquipItem?: (itemId: string) => void
  onUnequipItem?: (itemId: string) => void
  onDropItem?: (itemId: string) => void
  onUseItem?: (itemId: string) => void
  onAdjustQuantity?: (itemId: string, delta: number) => void
  onNotesChange?: (notes: string) => void
  onRest?: () => void
  onLevelUp?: (updates: { hpRoll: number; talent?: AppliedTalent; newSpellIds?: string[] }) => void
}

export function CharacterSheet({
  character: c,
  isEditable = false,
  hideInventory = false,
  onHpChange,
  onToggleLuckToken,
  onEquipItem,
  onUnequipItem,
  onDropItem,
  onUseItem,
  onAdjustQuantity,
  onNotesChange,
  onRest,
  onLevelUp,
}: Props) {
  const { t, ti, tData, tDataNested } = useLocale()
  const [showLevelUp, setShowLevelUp] = useState(false)
  const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`)
  const xpNeeded = getXpToNextLevel(c)
  const xpThreshold = c.level * 10
  const xpPercent = xpThreshold > 0 ? Math.min(100, (c.xp / xpThreshold) * 100) : 0
  const hpPercent = c.maxHp > 0 ? (c.currentHp / c.maxHp) * 100 : 0

  const hpColor = hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">{c.name}</h2>
            <p className="text-sm text-muted-foreground">{(() => {
              const rangeStart = c.level <= 2 ? 1 : c.level <= 4 ? 3 : c.level <= 6 ? 5 : c.level <= 8 ? 7 : 9
              const rangeEnd = rangeStart + 1
              return tData('titles', `${c.class}-${c.alignment}-${rangeStart}-${rangeEnd}`, 'title', c.title)
            })()}</p>
            <p className="text-sm capitalize">
              {tData('ancestries', c.ancestry, 'name', c.ancestry)} {tData('classes', c.class, 'name', c.class)} · {t('character.level')} {c.level} · {t(`character.alignment.${c.alignment}`)}
            </p>
          </div>
          <div className="text-right">
            {c.hasLuckToken ? (
              <button
                onClick={onToggleLuckToken}
                disabled={!isEditable}
                className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                title={t('character.luckTokenClickToUse')}
              >
                {t('character.luckToken')}
              </button>
            ) : (
              <span className="rounded-full bg-secondary px-3 py-1 text-sm text-muted-foreground">{t('character.noLuck')}</span>
            )}
          </div>
        </div>

        {/* XP Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{ti('character.xpLabel', { current: c.xp, max: xpThreshold })}</span>
            {canLevelUp(c) ? (
              <div className="flex items-center gap-2">
                <span className="font-bold text-primary">{t('character.readyToLevelUp')}</span>
                {onLevelUp && (
                  <button
                    onClick={() => setShowLevelUp(true)}
                    className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-black hover:bg-amber-400 transition animate-pulse"
                  >
                    {t('character.levelUp')}
                  </button>
                )}
              </div>
            ) : (
              <span>{ti('character.xpToNextLevel', { xp: xpNeeded })}</span>
            )}
          </div>
          <div className="h-2 w-full rounded-full bg-secondary">
            <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${xpPercent}%` }} />
          </div>
        </div>
      </div>

      {/* Stat Block */}
      <div className="grid grid-cols-6 gap-2">
        {ABILITY_KEYS.map(key => {
          const val = c.computed.effectiveStats[key]
          const mod = c.computed.modifiers[key]
          return (
            <div key={key} className="rounded-xl border border-border bg-card p-2 text-center">
              <div className="text-[10px] font-bold text-muted-foreground">{key}</div>
              <div className="text-xl font-bold">{val}</div>
              <div className="text-sm font-medium text-muted-foreground">{fmt(mod)}</div>
            </div>
          )
        })}
      </div>

      {/* Combat Stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <div className="text-xs font-semibold text-muted-foreground">{t('character.ac')}</div>
          <div className="text-2xl font-bold">{c.computed.ac}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <div className="text-xs font-semibold text-muted-foreground">{t('character.hp')}</div>
          <div className="flex items-center justify-center gap-1">
            {isEditable && (
              <button onClick={() => onHpChange?.(-1)} className="rounded bg-red-100 px-1.5 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200">−</button>
            )}
            <div>
              <span className="text-2xl font-bold">{c.currentHp}</span>
              <span className="text-sm text-muted-foreground">/{c.maxHp}</span>
            </div>
            {isEditable && (
              <button onClick={() => onHpChange?.(1)} className="rounded bg-green-100 px-1.5 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-200">+</button>
            )}
          </div>
          <div className="mt-1 h-1.5 w-full rounded-full bg-secondary">
            <div className={`h-1.5 rounded-full ${hpColor} transition-all`} style={{ width: `${hpPercent}%` }} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <div className="text-xs font-semibold text-muted-foreground">{t('character.melee')}</div>
          <div className="text-2xl font-bold">{fmt(c.computed.meleeAttackBonus)}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <div className="text-xs font-semibold text-muted-foreground">{t('character.ranged')}</div>
          <div className="text-2xl font-bold">{fmt(c.computed.rangedAttackBonus)}</div>
        </div>
      </div>

      {/* Spell Check (casters only) */}
      {c.computed.spellCheckBonus != null && (
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <div className="text-xs font-semibold text-muted-foreground">{t('character.spellCheck')}</div>
          <div className="text-2xl font-bold">{fmt(c.computed.spellCheckBonus)}</div>
          {c.spells.activeFocusSpell && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {ti('character.focusing', { spell: (() => { const s = getSpell(c.spells.activeFocusSpell.spellId); return s ? tData('spells', s.id, 'name', s.name) : 'Unknown' })() })}
            </p>
          )}
        </div>
      )}

      {/* Class Abilities */}
      {(() => {
        const cls = getClass(c.class)
        if (!cls) return null
        const features = cls.features.filter(f => f.level <= c.level)
        if (features.length === 0) return null
        return (
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-3 font-semibold">{ti('character.abilities', { className: tData('classes', cls.id, 'name', cls.name) })}</h3>
            <div className="space-y-2 text-sm">
              {features.map(f => {
                const featureKey = f.mechanic.type.replace(/_/g, '-')
                return (
                <div key={f.name} className="rounded-lg border border-border p-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{tDataNested('classes', cls.id, ['features', featureKey, 'name'], f.name)}</span>
                    {f.level > 1 && (
                      <span className="text-xs text-muted-foreground">Lv {f.level}</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{tDataNested('classes', cls.id, ['features', featureKey, 'description'], f.description)}</p>
                </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Conditions */}
      {c.conditions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {c.conditions.map(cond => (
            <span key={cond.id} className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-200 capitalize">
              {cond.condition}
              {cond.duration !== undefined && ` (${cond.duration}r)`}
            </span>
          ))}
        </div>
      )}

      {/* Inventory */}
      {!hideInventory && <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">{t('character.inventory')}</h3>
          <span className={`text-sm font-mono ${c.computed.usedGearSlots > c.computed.gearSlots ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
            {ti('character.slots', { used: c.computed.usedGearSlots, max: c.computed.gearSlots })}
          </span>
        </div>

        {/* Gear slot bar */}
        <div className="mb-3 h-2 w-full rounded-full bg-secondary">
          <div
            className={`h-2 rounded-full transition-all ${c.computed.usedGearSlots > c.computed.gearSlots ? 'bg-red-500' : 'bg-primary'}`}
            style={{ width: `${Math.min(100, (c.computed.usedGearSlots / c.computed.gearSlots) * 100)}%` }}
          />
        </div>

        {/* Coins */}
        <div className="mb-3 flex gap-3 text-sm">
          <span className="font-medium text-amber-600 dark:text-amber-400">{c.inventory.coins.gp} gp</span>
          <span className="text-muted-foreground">{c.inventory.coins.sp} sp</span>
          <span className="text-muted-foreground">{c.inventory.coins.cp} cp</span>
        </div>

        {/* Items */}
        {c.inventory.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('common.noItems')}</p>
        ) : (
          <div className="space-y-1">
            {c.inventory.items.map(item => (
              <InventoryRow
                key={item.id}
                item={item}
                onEquip={onEquipItem}
                onUnequip={onUnequipItem}
                onDrop={onDropItem}
                onUse={onUseItem}
                onAdjustQuantity={onAdjustQuantity}
              />
            ))}
          </div>
        )}
      </div>}

      {/* Spells */}
      {c.spells.knownSpells.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 font-semibold">{t('character.spells')}</h3>
          <div className="space-y-2">
            {c.spells.knownSpells.map(ks => {
              const spell = getSpell(ks.spellId)
              if (!spell) return null
              return (
                <div key={ks.spellId} className={`flex items-center justify-between rounded-lg border p-2 text-sm ${
                  ks.isAvailable ? 'border-border' : 'border-border/50 opacity-50'
                }`}>
                  <div>
                    <span className="font-medium">{tData('spells', spell.id, 'name', spell.name)}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{ti('character.tier', { tier: spell.tier })}</span>
                    {spell.isFocus && <span className="ml-1 text-xs text-amber-600">{t('character.focus')}</span>}
                    {ks.hasAdvantage && <span className="ml-1 text-xs text-green-600">{t('character.advantage')}</span>}
                  </div>
                  <span className={`text-xs ${ks.isAvailable ? 'text-green-600' : 'text-red-500'}`}>
                    {ks.isAvailable ? t('character.ready') : t('character.lost')}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Talents */}
      {c.talents.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 font-semibold">{t('character.talents')}</h3>
          <div className="space-y-2 text-sm">
            {c.talents.map(tal => (
              <div key={tal.id} className="rounded-lg border border-border p-2">
                <span className="font-medium">{tal.description}</span>
                <span className="ml-2 text-xs text-muted-foreground">{ti('character.levelLabel', { level: tal.levelGained })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-2 font-semibold">{t('character.notes')}</h3>
        <textarea
          value={c.notes}
          onChange={e => onNotesChange?.(e.target.value)}
          disabled={!isEditable}
          placeholder={t('character.notesPlaceholder')}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-y disabled:opacity-50"
        />
      </div>

      {/* Rest Button */}
      {isEditable && onRest && (
        <button
          onClick={onRest}
          className="w-full rounded-lg border border-border py-2 text-sm font-medium hover:bg-accent transition"
        >
          {t('character.takeRest')}
        </button>
      )}

      {/* Level Up Wizard */}
      {showLevelUp && onLevelUp && (
        <LevelUpWizard
          character={c}
          onComplete={(updates) => {
            onLevelUp(updates)
            setShowLevelUp(false)
          }}
          onCancel={() => setShowLevelUp(false)}
        />
      )}
    </div>
  )
}

function InventoryRow({
  item,
  onEquip,
  onUnequip,
  onDrop,
  onUse,
  onAdjustQuantity,
}: {
  item: InventoryItem
  onEquip?: (id: string) => void
  onUnequip?: (id: string) => void
  onDrop?: (id: string) => void
  onUse?: (id: string) => void
  onAdjustQuantity?: (id: string, delta: number) => void
}) {
  const { t } = useLocale()
  const isEquippable = item.category === 'weapon' || item.category === 'armor' || item.category === 'shield' || item.category === 'magic_item'
  const isUsable = item.category === 'consumable' || item.category === 'light_source'

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/50 px-2 py-1.5 text-sm">
      <div className="flex-1 min-w-0">
        <span className="font-medium">{item.name}</span>
        {item.equipped && <span className="ml-1 text-xs text-primary font-semibold">{t('character.equipped')}</span>}
        {item.magicBonus && <span className="ml-1 text-xs text-purple-600">+{item.magicBonus}</span>}
        {item.quantity > 1 && <span className="ml-1 text-xs text-muted-foreground">x{item.quantity}</span>}
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{item.slots}s</span>
      {(onEquip || onUnequip || onDrop || onUse) && (
        <div className="flex gap-1">
          {isEquippable && !item.equipped && onEquip && (
            <button onClick={() => onEquip(item.id)} className="rounded px-1.5 py-0.5 text-xs bg-secondary hover:bg-accent">{t('common.equip')}</button>
          )}
          {isEquippable && item.equipped && onUnequip && (
            <button onClick={() => onUnequip(item.id)} className="rounded px-1.5 py-0.5 text-xs bg-secondary hover:bg-accent">{t('common.remove')}</button>
          )}
          {isUsable && onUse && (
            <button onClick={() => onUse(item.id)} className="rounded px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200">{t('common.use')}</button>
          )}
          {onAdjustQuantity && (item.category === 'ammo' || item.category === 'ration' || item.quantity > 1) && (
            <>
              <button onClick={() => onAdjustQuantity(item.id, -1)} className="rounded px-1.5 py-0.5 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 font-bold">-1</button>
              <button onClick={() => onAdjustQuantity(item.id, 1)} className="rounded px-1.5 py-0.5 text-xs bg-green-500/10 text-green-400 hover:bg-green-500/20 font-bold">+1</button>
            </>
          )}
          {onDrop && (
            <button onClick={() => onDrop(item.id)} className="rounded px-1.5 py-0.5 text-xs bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200">{t('common.drop')}</button>
          )}
        </div>
      )}
    </div>
  )
}
