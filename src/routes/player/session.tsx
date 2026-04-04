import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { useLocale } from '@/hooks/use-locale.ts'
import { LOCALE_LABELS } from '@/i18n/index.ts'
import { usePlayerStore } from '@/stores/player-store.ts'
import { usePlayerPeer } from '@/hooks/use-peer-connection.ts'
import { CharacterSheet } from '@/components/character/character-sheet.tsx'
import { CharacterCreator } from '@/components/character/character-creator.tsx'
import { DiceRoller } from '@/components/dice/dice-roller.tsx'
import { EncounterView } from '@/components/combat/encounter-view.tsx'
import { LightControls } from '@/components/player/light-controls.tsx'
import { ShopWidget } from '@/components/player/shop-widget.tsx'
import { StabilizeWidget } from '@/components/player/stabilize-widget.tsx'
import { Spinner, LoadingScreen } from '@/components/shared/spinner.tsx'
import { AutoScrollContainer } from '@/components/shared/auto-scroll.tsx'
import { ChatMessageRow } from '@/components/shared/chat-message.tsx'
import { pushRollToast } from '@/components/shared/roll-toast.tsx'
import { rollDice } from '@/lib/dice/roller.ts'
import { getAbilityModifier } from '@/schemas/reference.ts'
import type { Character } from '@/schemas/character.ts'
import type { PlayerVisibleState } from '@/schemas/session.ts'
import type { GMToPlayerMessage } from '@/schemas/messages.ts'

export const Route = createFileRoute('/player/session')({
  component: PlayerSessionPage,
})

function PlayerSessionPage() {
  const { t, ti, tData, locale, setLocale, availableLocales } = useLocale()
  const navigate = useNavigate()
  const hydrate = usePlayerStore(s => s.hydrate)
  const hydrated = usePlayerStore(s => s.hydrated)
  const state = usePlayerStore(s => s.state)
  const displayName = usePlayerStore(s => s.displayName)
  const connectionInfo = usePlayerStore(s => s.connectionInfo)
  const setPlayerState = usePlayerStore(s => s.setState)
  const reset = usePlayerStore(s => s.reset)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const hasAttemptedReconnect = useRef(false)
  const [deathDialogOpen, setDeathDialogOpen] = useState(false)
  const [stabilizeResult, setStabilizeResult] = useState<{
    targetName: string; roll: number; intScore: number; intMod: number; total: number; success: boolean
  } | null>(null)

  // Open death dialog when character enters dying state with no timer
  const myCharIsDying = state?.myCharacter?.isDying ?? false
  const myCharHasTimer = !!state?.myCharacter?.deathTimer
  useEffect(() => {
    if (myCharIsDying && !myCharHasTimer) {
      setDeathDialogOpen(true)
    }
    if (!myCharIsDying) {
      setDeathDialogOpen(false)
    }
  }, [myCharIsDying, myCharHasTimer])

  // Hydrate from localStorage on client only (avoids SSR mismatch)
  useEffect(() => { hydrate() }, [hydrate])

  const handleStateSync = (newState: PlayerVisibleState) => {
    setPlayerState(newState)
    setIsReconnecting(false)
  }

  const handleMessage = (message: GMToPlayerMessage) => {
    if (message.type === 'roll_result') {
      // Skip if this is our own roll bounced back (we already toasted it locally)
      const myName = state?.myCharacter?.name
      if (message.characterName === myName) return

      pushRollToast({
        id: message.roll.id,
        playerName: message.characterName,
        diceType: message.roll.expression,
        total: message.roll.total,
        isNat20: message.roll.dice[0]?.isNat20 ?? false,
        isNat1: message.roll.dice[0]?.isNat1 ?? false,
        timestamp: Date.now(),
      })
    }
  }

  const { isConnected, isJoined, error, connect, send, disconnect } = usePlayerPeer({
    onStateSync: handleStateSync,
    onMessage: handleMessage,
  })

  // Auto-reconnect on page load if we have saved connection info
  useEffect(() => {
    if (hasAttemptedReconnect.current) return
    if (!connectionInfo || isConnected || isJoined) return

    hasAttemptedReconnect.current = true
    setIsReconnecting(true)

    // Timeout: if not connected within 10s, stop the spinner and show cached state
    const timeout = setTimeout(() => {
      setIsReconnecting(false)
    }, 10000)

    connect(
      connectionInfo.roomCode,
      connectionInfo.displayName,
      connectionInfo.password,
      connectionInfo.characterId,
    ).catch(() => {
      clearTimeout(timeout)
      setIsReconnecting(false)
    })

    return () => clearTimeout(timeout)
  }, [connectionInfo, isConnected, isJoined, connect])

  function handleLeave() {
    disconnect()
    reset()
    navigate({ to: '/player/join' })
  }

  // Show reconnecting screen
  if (isReconnecting && !isConnected) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        {error ? (
          <>
            <p className="text-lg font-semibold text-red-400">Connection Failed</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground">The GM may have a new room code. Ask them for the updated code.</p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => { setIsReconnecting(false) }}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent transition"
              >
                View Cached Session
              </button>
              <button
                onClick={handleLeave}
                className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition"
              >
                {t('player.leaveAndRejoin')}
              </button>
            </div>
          </>
        ) : (
          <>
            <Spinner size="lg" />
            <p className="text-lg font-semibold">Reconnecting...</p>
            <p className="text-sm text-muted-foreground">Rejoining {state?.room.name ?? 'session'}</p>
            <button
              onClick={handleLeave}
              className="mt-4 rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent transition"
            >
              {t('player.cancelAndLeave')}
            </button>
          </>
        )}
      </main>
    )
  }

  // Wait for hydration before deciding
  if (!hydrated) {
    return <LoadingScreen message="Loading session..." />
  }

  // No state and no connection info — send to join
  if (!state && !connectionInfo) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <p className="mb-4 text-lg text-muted-foreground">Not connected to a game session</p>
        <button
          onClick={() => navigate({ to: '/player/join' })}
          className="rounded-lg bg-primary px-6 py-2 font-semibold text-primary-foreground hover:opacity-90"
        >
          Join a Game
        </button>
      </main>
    )
  }

  // Have cached state but not connected yet — show cached state with reconnecting banner
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{state?.room.name ?? 'Session'}</h1>
          <p className="text-sm text-muted-foreground">{ti('player.playingAs', { name: displayName ?? '' })}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                <span className="text-sm text-muted-foreground">{t('player.connected')}</span>
              </>
            ) : (
              <>
                <Spinner size="sm" />
                <span className="text-sm text-amber-400">{t('player.reconnecting')}</span>
              </>
            )}
          </div>
          <select
            value={locale}
            onChange={e => setLocale(e.target.value as typeof locale)}
            className="rounded-lg border border-border bg-card px-2 py-1 text-xs outline-none"
          >
            {availableLocales.map(l => (
              <option key={l} value={l}>{LOCALE_LABELS[l]}</option>
            ))}
          </select>
          <button
            onClick={handleLeave}
            className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent transition"
          >
            {t('player.leave')}
          </button>
        </div>
      </div>

      {!isConnected && (
        <div className="mb-4 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-amber-400 flex items-center gap-2">
          <Spinner size="sm" className="border-amber-400/30 border-t-amber-400" />
          Reconnecting to GM... Showing last known state.
        </div>
      )}

      {/* Stabilize Result Dialog — stays open until manually dismissed */}
      {stabilizeResult && (
        <StabilizeResultDialog result={stabilizeResult} onClose={() => setStabilizeResult(null)} />
      )}

      {/* Death Timer Roll Dialog — pops up when dying, stays until dismissed */}
      {deathDialogOpen && state?.myCharacter && (
        <DeathTimerRoll
          character={state.myCharacter}
          onRoll={(roll, totalRounds) => {
            send({ type: 'player_death_timer_roll', characterId: state.myCharacter!.id, roll, totalRounds })
          }}
          onClose={() => setDeathDialogOpen(false)}
        />
      )}

      {state ? (
        <>
        {/* Darkness Banner — hidden when light system is paused */}
        {state.light.isInDarkness && !state.light.isPaused && (
          <div className="mb-4 rounded-lg bg-red-500/15 border border-red-500/30 p-3 text-center animate-pulse">
            <span className="text-sm font-bold text-red-400">🌑 {t('light.darknessWarning')}</span>
            <p className="text-xs text-red-400/70 mt-0.5">{t('light.darknessDescription')}</p>
          </div>
        )}

        {/* Encounter view — shown when monsters are present */}
        {state.visibleMonsters.length > 0 && (
          <div className="mb-6">
            <EncounterView
              monsters={state.visibleMonsters}
              myCharacter={state.myCharacter}
              otherCharacters={state.otherCharacters}
              activeTurnId={state.activeTurnId}
            />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Main: Character Sheet — full inventory, equip/drop managed by GM via P2P */}
          <div>
            {state.myCharacter ? (<>
              {/* Death Timer Display — shown when dying with active timer */}
              {state.myCharacter.isDying && state.myCharacter.deathTimer && (
                <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-center animate-pulse">
                  <p className="text-lg font-bold text-red-400">You are dying</p>
                  <p className="text-sm text-red-300 mt-1">
                    {state.myCharacter.deathTimer.roundsRemaining} round{state.myCharacter.deathTimer.roundsRemaining !== 1 ? 's' : ''} remaining
                  </p>
                </div>
              )}
              <CharacterSheet
                character={state.myCharacter}
                onEquipItem={(itemId) => {
                  send({ type: 'player_inventory', characterId: state.myCharacter!.id, action: { type: 'equip', itemId } })
                }}
                onUnequipItem={(itemId) => {
                  send({ type: 'player_inventory', characterId: state.myCharacter!.id, action: { type: 'unequip', itemId } })
                }}
                onDropItem={(itemId) => {
                  send({ type: 'player_inventory', characterId: state.myCharacter!.id, action: { type: 'drop', itemId } })
                }}
                onUseItem={(itemId) => {
                  send({ type: 'player_inventory', characterId: state.myCharacter!.id, action: { type: 'use', itemId } })
                }}
                onNotesChange={(notes) => {
                  send({ type: 'player_character_update', characterId: state.myCharacter!.id, updates: { notes } })
                }}
                onLevelUp={(updates) => {
                  send({ type: 'player_level_up', characterId: state.myCharacter!.id, hpRoll: updates.hpRoll, talent: updates.talent, newSpellIds: updates.newSpellIds })
                }}
              />
              {/* Rest Button */}
              <RestButton character={state.myCharacter} onRest={() => {
                send({ type: 'player_rest', characterId: state.myCharacter!.id, useRation: true })
              }} />
            </>) : (
              <NoCharacterView
                playerName={displayName ?? 'Player'}
                onCreateCharacter={(character) => {
                  send({ type: 'player_create_character', character })
                }}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Dice Roller — visible when it's this player's active turn */}
            {state.activeTurnId && state.myCharacter && state.activeTurnId === state.myCharacter.id && (
              <div>
                <div className="mb-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-center">
                  <span className="text-xs font-bold text-amber-400 uppercase">{t('combat.activeTurn')}</span>
                </div>
                <DiceRoller
                  characterName={state.myCharacter.name}
                  compact
                  onRoll={(result) => {
                    pushRollToast({
                      id: result.id,
                      playerName: state.myCharacter!.name,
                      diceType: result.expression,
                      total: result.total,
                      isNat20: result.dice[0]?.isNat20 ?? false,
                      isNat1: result.dice[0]?.isNat1 ?? false,
                      timestamp: Date.now(),
                    })
                    send({
                      type: 'player_roll',
                      expression: result.expression,
                      total: result.total,
                      isNat20: result.dice[0]?.isNat20 ?? false,
                      isNat1: result.dice[0]?.isNat1 ?? false,
                      purpose: 'manual',
                      isPublic: true,
                    })
                  }}
                />
              </div>
            )}

            {/* Stabilize Widget — shown when player is alive and there are dying allies */}
            {state.myCharacter && !state.myCharacter.isDying && state.myCharacter.currentHp > 0 && (() => {
              const dyingAllies = state.otherCharacters.filter(c => c.isDying && c.hasDeathTimer)
              if (dyingAllies.length === 0) return null
              const isMyTurn = state.activeTurnId === state.myCharacter!.id
              return (
                <StabilizeWidget
                  myCharacter={state.myCharacter!}
                  dyingAllies={dyingAllies}
                  isMyTurn={isMyTurn}
                  onStabilize={(targetId, roll, intMod, total, success, targetName, intScore) => {
                    setStabilizeResult({ targetName, roll, intScore, intMod, total, success })
                    send({ type: 'player_stabilize', characterId: state.myCharacter!.id, targetId, roll, intMod, total, success })
                  }}
                />
              )
            })()}

            {/* Light Controls + Status */}
            {state.myCharacter && (
              <LightControls
                character={state.myCharacter}
                isInDarkness={state.light.isInDarkness}
                hasActiveLight={state.light.timers.some(t => t.isActive && !t.isExpired)}
                isPaused={state.light.isPaused}
                onLightTorch={(itemId) => send({ type: 'player_inventory', characterId: state.myCharacter!.id, action: { type: 'light', itemId } })}
                onLightLantern={(lanternId, oilId) => send({ type: 'player_inventory', characterId: state.myCharacter!.id, action: { type: 'light_lantern', lanternId, oilId } })}
                onLightCampfire={(torchIds) => send({ type: 'player_inventory', characterId: state.myCharacter!.id, action: { type: 'light_campfire', torchIds } })}
              />
            )}

            {/* Shop — when a store is active */}
            {state.activeStore && state.myCharacter && (
              <ShopWidget
                store={state.activeStore}
                character={state.myCharacter}
                onBuy={(storeId, itemId, _itemName, _price) => {
                  send({ type: 'player_shop', characterId: state.myCharacter!.id, action: 'buy', storeId, itemId, quantity: 1 })
                }}
                onSell={(storeId, itemId, _itemName, _sellPrice) => {
                  send({ type: 'player_shop', characterId: state.myCharacter!.id, action: 'sell', storeId, itemId, quantity: 1 })
                }}
              />
            )}

            {state.otherCharacters.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h2 className="mb-3 text-sm font-semibold">Party Members</h2>
                <div className="space-y-2">
                  {state.otherCharacters.map(c => (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium">{c.name}</span>
                        <span className="ml-1 text-xs text-muted-foreground capitalize">{tData('classes', c.class, 'name', c.class)} {c.level}</span>
                      </div>
                      <span className={`text-xs font-medium ${
                        c.hpStatus === 'healthy' ? 'text-green-400' :
                        c.hpStatus === 'wounded' ? 'text-amber-400' :
                        c.hpStatus === 'critical' ? 'text-red-400' :
                        c.hpStatus === 'dying' ? 'text-red-500 animate-pulse' :
                        'text-muted-foreground'
                      }`}>
                        {c.hpStatus}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold">{t('chat.title')}</h2>
              <AutoScrollContainer className="max-h-48 space-y-1 overflow-y-auto mb-2" deps={[state.chatLog.length]}>
                {state.chatLog.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No messages yet.</p>
                ) : (
                  state.chatLog.slice(-30).map(msg => (
                    <ChatMessageRow key={msg.id} msg={msg} />
                  ))
                )}
              </AutoScrollContainer>
              <ChatInput
                disabled={!isConnected}
                onSend={(content) => {
                  send({ type: 'player_chat', content, isAction: false })
                }}
              />
            </div>

            {state.visibleMonsters.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h2 className="mb-3 text-sm font-semibold">{t('nav.monsters')}</h2>
                <div className="space-y-1">
                  {state.visibleMonsters.map(m => (
                    <div key={m.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{m.name}</span>
                      <span className={`text-xs ${
                        m.hpStatus === 'healthy' ? 'text-red-400' :
                        m.hpStatus === 'wounded' ? 'text-amber-400' :
                        'text-green-400'
                      }`}>
                        {m.hpStatus}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16">
          <Spinner size="lg" />
          <p className="mt-4 text-muted-foreground">{t('player.waitingForSession')}</p>
        </div>
      )}
    </main>
  )
}

function ChatInput({ onSend, disabled }: { onSend: (content: string) => void; disabled?: boolean }) {
  const { t } = useLocale()
  const [value, setValue] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim() || disabled) return
    onSend(value.trim())
    setValue('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-1">
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={disabled ? t('chat.reconnecting') : t('chat.typeMessage')}
        disabled={disabled}
        className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled}
        className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
      >
        {t('common.send')}
      </button>
    </form>
  )
}

function RestButton({ character, onRest }: { character: Character; onRest: () => void }) {
  const { t } = useLocale()
  const [showConfirm, setShowConfirm] = useState(false)
  const c = character
  const hpMissing = c.maxHp - c.currentHp
  const hasRation = c.inventory.items.some(i => i.category === 'ration')
  const lostSpells = c.spells.knownSpells.filter(s => !s.isAvailable)
  const hasConditions = c.conditions.length > 0
  const needsRest = hpMissing > 0 || lostSpells.length > 0 || hasConditions || c.isDying

  if (showConfirm) {
    return (
      <div className="mt-4 rounded-xl border border-amber-500/30 bg-card p-4">
        <h3 className="text-sm font-bold text-amber-400 mb-2">{t('character.takeRest')}</h3>
        <div className="text-xs space-y-1.5 mb-4">
          <p className="text-muted-foreground">Requires 8 hours of sleep and <span className="text-foreground font-medium">1 ration</span> (consumed).</p>

          <div className="border-t border-border/50 pt-1.5 mt-1.5">
            <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Effects</p>
            <div className="space-y-0.5">
              <p>HP: <span className="text-muted-foreground">{c.currentHp}/{c.maxHp}</span> → <span className="text-green-400 font-medium">{c.maxHp}/{c.maxHp}</span>
                {hpMissing > 0 && <span className="text-green-400 ml-1">(+{hpMissing})</span>}
              </p>
              {lostSpells.length > 0 && (
                <p>Spells restored: <span className="text-green-400 font-medium">{lostSpells.length} spell{lostSpells.length > 1 ? 's' : ''}</span></p>
              )}
              {hasConditions && (
                <p>Conditions cleared: <span className="text-green-400 font-medium">{c.conditions.map(co => co.condition).join(', ')}</span></p>
              )}
              {c.isDying && (
                <p className="text-green-400 font-medium">No longer dying</p>
              )}
              <p>Ancestry trait: <span className="text-green-400">refreshed</span></p>
              <p className="text-muted-foreground mt-1">Consumes 1 ration{!hasRation && <span className="text-red-400 font-medium"> — you have none!</span>}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { onRest(); setShowConfirm(false) }}
            disabled={!hasRation}
            className="flex-1 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-40"
          >
            {hasRation ? t('character.restNow') : t('character.noRations')}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="rounded-lg border border-border px-4 py-2 text-xs hover:bg-accent transition"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="mt-4 w-full rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-accent transition"
    >
      {t('character.takeRest')}{needsRest && <span className="ml-1 text-amber-400">•</span>}
    </button>
  )
}

function StabilizeResultDialog({ result, onClose }: {
  result: { targetName: string; roll: number; intScore: number; intMod: number; total: number; success: boolean }
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
        <h2 className="text-xl font-bold mb-1">Stabilize {result.targetName}</h2>
        <p className="text-sm text-muted-foreground mb-4">DC 15 INT check</p>

        <div className="rounded-xl bg-background border border-border p-4 space-y-2 mb-4">
          <div className="flex items-center justify-center gap-3 text-sm">
            <div className="rounded-lg bg-card border border-border px-3 py-1.5">
              <span className="text-xs text-muted-foreground block">d20</span>
              <span className="text-lg font-bold">{result.roll}</span>
            </div>
            <span className="text-muted-foreground text-lg">+</span>
            <div className="rounded-lg bg-card border border-border px-3 py-1.5">
              <span className="text-xs text-muted-foreground block">INT ({result.intScore})</span>
              <span className="text-lg font-bold">{result.intMod >= 0 ? '+' : ''}{result.intMod}</span>
            </div>
            <span className="text-muted-foreground text-lg">=</span>
            <div className={`rounded-lg border px-3 py-1.5 ${
              result.success
                ? 'bg-green-500/20 border-green-500/30'
                : 'bg-red-500/20 border-red-500/30'
            }`}>
              <span className={`text-xs block ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                vs DC 15
              </span>
              <span className={`text-lg font-bold ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                {result.total}
              </span>
            </div>
          </div>

          <p className={`text-2xl font-bold mt-2 ${result.success ? 'text-green-400' : 'text-red-400'}`}>
            {result.success ? `${result.targetName} stabilized!` : 'Failed to stabilize'}
          </p>
          {result.success ? (
            <p className="text-xs text-muted-foreground">
              {result.targetName} is back on their feet with 1 HP.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {result.targetName} is still dying. Their death timer continues.
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-accent transition"
        >
          Close
        </button>
      </div>
    </div>
  )
}

function DeathTimerRoll({ character, onRoll, onClose }: { character: Character; onRoll: (roll: number, totalRounds: number) => void; onClose: () => void }) {
  const [result, setResult] = useState<{ roll: number; conMod: number; conScore: number; total: number } | null>(null)

  function handleRoll() {
    const conScore = character.computed.effectiveStats.CON
    const conMod = getAbilityModifier(conScore)
    const roll = rollDice('1d4')
    const total = Math.max(1, roll.total + conMod)
    setResult({ roll: roll.total, conMod, conScore, total })
    onRoll(roll.total, total)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-red-500/40 bg-card p-6 text-center shadow-2xl">
        <div className="mb-2 text-4xl">&#x1F480;</div>
        <h2 className="text-xl font-bold text-red-400 mb-2">You are dying!</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Your HP has dropped to 0. Roll to determine how many rounds you have before death.
        </p>

        {!result ? (
          <button
            onClick={handleRoll}
            className="w-full rounded-lg bg-red-600 py-3 text-lg font-bold text-white transition hover:bg-red-500 active:scale-95"
          >
            Roll Death Timer (1d4 + CON)
          </button>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 space-y-2">
              <div className="flex items-center justify-center gap-3 text-sm">
                <div className="rounded-lg bg-background border border-border px-3 py-1.5">
                  <span className="text-xs text-muted-foreground block">d4</span>
                  <span className="text-lg font-bold">{result.roll}</span>
                </div>
                <span className="text-muted-foreground text-lg">+</span>
                <div className="rounded-lg bg-background border border-border px-3 py-1.5">
                  <span className="text-xs text-muted-foreground block">CON ({result.conScore})</span>
                  <span className="text-lg font-bold">{result.conMod >= 0 ? '+' : ''}{result.conMod}</span>
                </div>
                <span className="text-muted-foreground text-lg">=</span>
                <div className="rounded-lg bg-red-500/20 border border-red-500/30 px-3 py-1.5">
                  <span className="text-xs text-red-400 block">Total</span>
                  <span className="text-lg font-bold text-red-400">{result.total}</span>
                </div>
              </div>
              <p className="text-2xl font-bold text-red-400 mt-2">
                {result.total} round{result.total !== 1 ? 's' : ''} until death
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              An ally can try to stabilize you (DC 15 INT). A natural 20 on your death save will revive you with 1 HP.
            </p>
            <button
              onClick={onClose}
              className="w-full rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-accent transition"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function NoCharacterView({ playerName, onCreateCharacter }: { playerName: string; onCreateCharacter: (character: Character) => void }) {
  const [showCreator, setShowCreator] = useState(false)

  if (showCreator) {
    return (
      <CharacterCreator
        playerId={playerName}
        maxRerolls={6}
        onComplete={(character) => {
          onCreateCharacter(character)
          setShowCreator(false)
        }}
        onCancel={() => setShowCreator(false)}
      />
    )
  }

  return (
    <div className="rounded-xl border border-dashed border-border py-12 text-center">
      <p className="text-lg text-muted-foreground mb-2">No character assigned</p>
      <p className="text-sm text-muted-foreground mb-4">Wait for the GM to assign you a character, or create your own.</p>
      <button
        onClick={() => setShowCreator(true)}
        className="rounded-lg bg-primary px-6 py-2.5 font-semibold text-primary-foreground hover:opacity-90 transition"
      >
        Create My Character
      </button>
    </div>
  )
}
