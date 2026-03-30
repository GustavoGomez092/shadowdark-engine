import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { usePlayerStore } from '@/stores/player-store.ts'
import { usePlayerPeer } from '@/hooks/use-peer-connection.ts'
import { CharacterSheet } from '@/components/character/character-sheet.tsx'
import { CharacterCreator } from '@/components/character/character-creator.tsx'
import { DiceRoller } from '@/components/dice/dice-roller.tsx'
import { EncounterView } from '@/components/combat/encounter-view.tsx'
import { LightControls } from '@/components/player/light-controls.tsx'
import { ShopWidget } from '@/components/player/shop-widget.tsx'
import { Spinner, LoadingScreen } from '@/components/shared/spinner.tsx'
import { AutoScrollContainer } from '@/components/shared/auto-scroll.tsx'
import { ChatMessageRow } from '@/components/shared/chat-message.tsx'
import { pushRollToast } from '@/components/shared/roll-toast.tsx'
import type { Character } from '@/schemas/character.ts'
import type { PlayerVisibleState } from '@/schemas/session.ts'
import type { GMToPlayerMessage } from '@/schemas/messages.ts'

export const Route = createFileRoute('/player/session')({
  component: PlayerSessionPage,
})

function PlayerSessionPage() {
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
                Leave & Rejoin
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
              Cancel & Leave
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
          <p className="text-sm text-muted-foreground">Playing as {displayName}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                <span className="text-sm text-muted-foreground">Connected</span>
              </>
            ) : (
              <>
                <Spinner size="sm" />
                <span className="text-sm text-amber-400">Reconnecting...</span>
              </>
            )}
          </div>
          <button
            onClick={handleLeave}
            className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-accent transition"
          >
            Leave
          </button>
        </div>
      </div>

      {!isConnected && (
        <div className="mb-4 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-amber-400 flex items-center gap-2">
          <Spinner size="sm" className="border-amber-400/30 border-t-amber-400" />
          Reconnecting to GM... Showing last known state.
        </div>
      )}

      {state ? (
        <>
        {/* Darkness Banner — hidden when light system is paused */}
        {state.light.isInDarkness && !state.light.isPaused && (
          <div className="mb-4 rounded-lg bg-red-500/15 border border-red-500/30 p-3 text-center animate-pulse">
            <span className="text-sm font-bold text-red-400">🌑 TOTAL DARKNESS</span>
            <p className="text-xs text-red-400/70 mt-0.5">Disadvantage on most tasks. Light a torch to see!</p>
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
                  <span className="text-xs font-bold text-amber-400 uppercase">It's your turn!</span>
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
                        <span className="ml-1 text-xs text-muted-foreground capitalize">{c.class} {c.level}</span>
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
              <h2 className="mb-3 text-sm font-semibold">Chat</h2>
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
                <h2 className="mb-3 text-sm font-semibold">Monsters</h2>
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
          <p className="mt-4 text-muted-foreground">Waiting for session data...</p>
        </div>
      )}
    </main>
  )
}

function ChatInput({ onSend, disabled }: { onSend: (content: string) => void; disabled?: boolean }) {
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
        placeholder={disabled ? 'Reconnecting...' : 'Type a message...'}
        disabled={disabled}
        className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled}
        className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
      >
        Send
      </button>
    </form>
  )
}

function RestButton({ character, onRest }: { character: Character; onRest: () => void }) {
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
        <h3 className="text-sm font-bold text-amber-400 mb-2">Take a Rest (8 hours)</h3>
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
            {hasRation ? 'Rest Now' : 'No Rations Available'}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="rounded-lg border border-border px-4 py-2 text-xs hover:bg-accent transition"
          >
            Cancel
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
      Take a Rest (8 hours + ration){needsRest && <span className="ml-1 text-amber-400">•</span>}
    </button>
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
