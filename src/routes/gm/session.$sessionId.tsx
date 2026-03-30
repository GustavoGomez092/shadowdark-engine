import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSessionStore } from '@/stores/session-store.ts'
import { LoadingScreen } from '@/components/shared/spinner.tsx'
import { AutoScrollContainer } from '@/components/shared/auto-scroll.tsx'
import { ChatMessageRow } from '@/components/shared/chat-message.tsx'
import { createActionLog } from '@/lib/utils/action-log.ts'
import { pushRollToast } from '@/components/shared/roll-toast.tsx'
import { EncounterPanel } from '@/components/gm/encounter-panel.tsx'
import { RewardsDialog } from '@/components/gm/rewards-dialog.tsx'
import { PlayerMenu } from '@/components/gm/player-menu.tsx'
import { LightTracker } from '@/components/light/light-tracker.tsx'
import { rollForTreasure, distributeEncounterRewards } from '@/lib/rules/xp.ts'
import { TREASURE_XP } from '@/schemas/reference.ts'
import { createLightTimer, pauseAllTimers, resumeAllTimers, tickLightState } from '@/lib/rules/light.ts'
import { useGMPeer } from '@/hooks/use-peer-connection.ts'
import type { PlayerToGMMessage } from '@/schemas/messages.ts'
import type { PlayerVisibleState } from '@/schemas/session.ts'
import { generateId } from '@/lib/utils/id.ts'
import { gmPeer } from '@/lib/peer/gm-peer-singleton.ts'
import { computeCharacterValues } from '@/lib/rules/character.ts'

export const Route = createFileRoute('/gm/session/$sessionId')({
  component: GMSessionPage,
})

function GMSessionPage() {
  const navigate = useNavigate()
  const { sessionId } = Route.useParams()
  const session = useSessionStore(s => s.session)
  const loadSession = useSessionStore(s => s.loadSession)
  const addPlayer = useSessionStore(s => s.addPlayer)
  const updatePlayer = useSessionStore(s => s.updatePlayer)
  const removePlayer = useSessionStore(s => s.removePlayer)
  const addChatMessage = useSessionStore(s => s.addChatMessage)
  const updateMonster = useSessionStore(s => s.updateMonster)
  const removeMonster = useSessionStore(s => s.removeMonster)
  const updateCharacter = useSessionStore(s => s.updateCharacter)
  const getPlayerVisibleState = useSessionStore(s => s.getPlayerVisibleState)

  // Load session from localStorage if not already loaded or if different session
  useEffect(() => {
    if (!session || session.room.id !== sessionId) {
      loadSession(sessionId)
    }
  }, [session, sessionId, loadSession])

  // Stable callback refs to avoid re-creating the peer host
  const getPlayerVisibleStateRef = useRef(getPlayerVisibleState)
  getPlayerVisibleStateRef.current = getPlayerVisibleState
  const broadcastStateSyncRef = useRef(() => {})

  const handlePlayerJoin = useCallback((peerId: string, displayName: string, password?: string, existingCharacterId?: string) => {
    const currentSession = useSessionStore.getState().session
    if (!currentSession) return { success: false, error: 'No active session' }

    // Check password
    if (currentSession.room.password && password !== currentSession.room.password) {
      return { success: false, error: 'wrong_password' }
    }

    // Check for existing player with same name (reconnecting)
    const existingEntry = Object.entries(currentSession.players).find(
      ([_, p]) => p.displayName === displayName
    )

    if (existingEntry) {
      // Reconnecting — remove old entry, preserve character assignment
      const [oldPeerId, oldPlayer] = existingEntry
      const charId = existingCharacterId ?? oldPlayer.characterId
      removePlayer(oldPeerId)
      addPlayer({
        peerId,
        displayName,
        characterId: charId,
        isConnected: true,
        lastSeen: Date.now(),
        joinedAt: oldPlayer.joinedAt,
      })
      addChatMessage({
        id: generateId(),
        senderId: 'system',
        senderName: 'System',
        type: 'system',
        content: `${displayName} has reconnected.`,
        timestamp: Date.now(),
        isPublic: true,
      })
      return { success: true, characterId: charId }
    }

    // New player — check capacity
    const playerCount = Object.keys(currentSession.players).length
    if (playerCount >= currentSession.room.maxPlayers) {
      return { success: false, error: 'room_full' }
    }

    addPlayer({
      peerId,
      displayName,
      characterId: existingCharacterId,
      isConnected: true,
      lastSeen: Date.now(),
      joinedAt: Date.now(),
    })

    addChatMessage({
      id: generateId(),
      senderId: 'system',
      senderName: 'System',
      type: 'system',
      content: `${displayName} has joined the game.`,
      timestamp: Date.now(),
      isPublic: true,
    })

    return { success: true, characterId: existingCharacterId }
  }, [addPlayer, addChatMessage])

  const handlePlayerMessage = useCallback((peerId: string, message: PlayerToGMMessage) => {
    if (message.type === 'player_chat') {
      const player = useSessionStore.getState().session?.players[peerId]
      addChatMessage({
        id: generateId(),
        senderId: peerId,
        senderName: player?.displayName ?? 'Unknown',
        type: message.isAction ? 'action' : 'chat',
        content: message.content,
        timestamp: Date.now(),
        whisperTo: message.whisperTo,
        isPublic: !message.whisperTo,
      })
      // Broadcast updated state so player sees their own message
      setTimeout(() => broadcastStateSyncRef.current(), 50)
    }

    if (message.type === 'player_roll') {
      const player = useSessionStore.getState().session?.players[peerId]
      const playerName = player?.displayName ?? 'Unknown'
      const charId = player?.characterId
      const charName = charId ? useSessionStore.getState().session?.characters[charId]?.name : null
      const rollName = charName ?? playerName

      const natLabel = message.isNat20 ? ' — NATURAL 20!' : message.isNat1 ? ' — Natural 1' : ''

      // Show toast on GM screen
      pushRollToast({
        id: generateId(),
        playerName: rollName,
        diceType: message.expression,
        total: message.total,
        isNat20: message.isNat20,
        isNat1: message.isNat1,
        timestamp: Date.now(),
      })

      // Add to chat log (visible to everyone)
      addChatMessage({
        id: generateId(),
        senderId: peerId,
        senderName: rollName,
        type: 'roll',
        content: `rolled ${message.expression} → ${message.total}${natLabel}`,
        timestamp: Date.now(),
        isPublic: true,
      })

      // Broadcast roll result to ALL players as a dedicated message
      gmPeer.broadcast({
        type: 'roll_result',
        roll: {
          id: generateId(),
          expression: message.expression,
          dice: [],
          modifier: 0,
          total: message.total,
          timestamp: Date.now(),
          rolledBy: rollName,
        },
        characterName: rollName,
        isPublic: true,
        context: `rolled ${message.expression} → ${message.total}${natLabel}`,
      })

      // Broadcast state sync so chat updates for everyone
      setTimeout(() => broadcastStateSyncRef.current(), 50)
    }

    // === LIGHT TORCH ===
    if (message.type === 'player_inventory' && message.action.type === 'light') {
      const player = useSessionStore.getState().session?.players[peerId]
      if (!player?.characterId) return
      const charName = useSessionStore.getState().session?.characters[player.characterId]?.name ?? 'Someone'
      const torchItemId = (message.action as { type: 'light'; itemId: string }).itemId
      const s = useSessionStore.getState().session
      if (!s) return

      // Consume torch from inventory
      updateCharacter(player.characterId, (c) => {
        c.inventory.items = c.inventory.items.filter(i => i.id !== torchItemId)
      })

      // Timer reset logic: if active timer exists, reset it. Otherwise create new.
      const torchMs = (s.settings?.torchDurationMinutes ?? 60) * 60000
      const activeTimer = s.light.timers.find(t => t.isActive && !t.isExpired && t.type !== 'campfire')
      if (activeTimer) {
        const resetTimers = s.light.timers.map(t =>
          t.id === activeTimer.id ? { ...t, startedAt: Date.now(), durationMs: torchMs, accumulatedPauseMs: 0, pausedAt: undefined } : t
        )
        useSessionStore.getState().setLight({ ...s.light, timers: resetTimers, isInDarkness: false })
      } else {
        const timer = createLightTimer('torch', player.characterId, torchMs)
        useSessionStore.getState().setLight({ ...s.light, timers: [...s.light.timers, timer], isInDarkness: false })
      }

      addChatMessage(createActionLog(`${charName} lit a torch 🔥${activeTimer ? ' (timer reset)' : ''}`))
      setTimeout(() => broadcastStateSyncRef.current(), 50)
    }

    // === LIGHT LANTERN ===
    if (message.type === 'player_inventory' && message.action.type === 'light_lantern') {
      const player = useSessionStore.getState().session?.players[peerId]
      if (!player?.characterId) return
      const charName = useSessionStore.getState().session?.characters[player.characterId]?.name ?? 'Someone'
      const { oilId } = message.action as { type: 'light_lantern'; lanternId: string; oilId: string }
      const s = useSessionStore.getState().session
      if (!s) return

      // Consume oil flask (lantern stays)
      updateCharacter(player.characterId, (c) => {
        c.inventory.items = c.inventory.items.filter(i => i.id !== oilId)
      })

      // Timer reset logic
      const lanternMs = (s.settings?.lanternDurationMinutes ?? 60) * 60000
      const activeTimer = s.light.timers.find(t => t.isActive && !t.isExpired && t.type !== 'campfire')
      if (activeTimer) {
        const resetTimers = s.light.timers.map(t =>
          t.id === activeTimer.id ? { ...t, type: 'lantern' as const, startedAt: Date.now(), durationMs: lanternMs, accumulatedPauseMs: 0, pausedAt: undefined, range: 'double_near' as const } : t
        )
        useSessionStore.getState().setLight({ ...s.light, timers: resetTimers, isInDarkness: false })
      } else {
        const timer = createLightTimer('lantern', player.characterId, lanternMs)
        useSessionStore.getState().setLight({ ...s.light, timers: [...s.light.timers, timer], isInDarkness: false })
      }

      addChatMessage(createActionLog(`${charName} lit a lantern 🏮${activeTimer ? ' (timer reset)' : ''}`))
      setTimeout(() => broadcastStateSyncRef.current(), 50)
    }

    // === MAKE CAMPFIRE ===
    if (message.type === 'player_inventory' && message.action.type === 'light_campfire') {
      const player = useSessionStore.getState().session?.players[peerId]
      if (!player?.characterId) return
      const charName = useSessionStore.getState().session?.characters[player.characterId]?.name ?? 'Someone'
      const { torchIds } = message.action as { type: 'light_campfire'; torchIds: string[] }
      const s = useSessionStore.getState().session
      if (!s) return

      // Consume 3 torches
      updateCharacter(player.characterId, (c) => {
        c.inventory.items = c.inventory.items.filter(i => !torchIds.includes(i.id))
      })

      // Campfire is separate — doesn't replace torch/lantern timer
      const campfireMs = (s.settings?.campfireDurationMinutes ?? 480) * 60000
      const timer = createLightTimer('campfire', player.characterId, campfireMs)
      useSessionStore.getState().setLight({ ...s.light, timers: [...s.light.timers, timer], isInDarkness: false })

      const campfireHours = Math.round((s.settings?.campfireDurationMinutes ?? 480) / 60)
      addChatMessage(createActionLog(`${charName} made a campfire 🔥 (up to ${campfireHours} hours)`))
      setTimeout(() => broadcastStateSyncRef.current(), 50)
    }

    // === EQUIP / UNEQUIP ===
    if (message.type === 'player_inventory' && (message.action.type === 'equip' || message.action.type === 'unequip')) {
      const player = useSessionStore.getState().session?.players[peerId]
      if (!player?.characterId) return
      const charName = useSessionStore.getState().session?.characters[player.characterId]?.name ?? 'Someone'
      const actionItemId = (message.action as { itemId: string }).itemId
      const itemName = useSessionStore.getState().session?.characters[player.characterId]?.inventory.items.find(i => i.id === actionItemId)?.name ?? 'item'
      const isEquip = message.action.type === 'equip'

      updateCharacter(player.characterId, (c) => {
        const item = c.inventory.items.find(i => i.id === actionItemId)
        if (!item) return
        if (isEquip) {
          // Unequip same category first (armor/shield exclusion)
          if (item.category === 'armor' || item.category === 'shield') {
            c.inventory.items.forEach(i => { if (i.category === item.category && i.equipped) i.equipped = false })
          }
          item.equipped = true
        } else {
          item.equipped = false
        }
      })

      addChatMessage(createActionLog(`${charName} ${isEquip ? 'equipped' : 'unequipped'} ${itemName}`))
      setTimeout(() => broadcastStateSyncRef.current(), 50)
    }

    if (message.type === 'player_inventory' && message.action.type === 'drop') {
      const player = useSessionStore.getState().session?.players[peerId]
      if (!player?.characterId) return
      const char = useSessionStore.getState().session?.characters[player.characterId]
      const charName = char?.name ?? 'Someone'
      const itemName = char?.inventory.items.find(i => i.id === (message.action as { type: 'drop'; itemId: string }).itemId)?.name ?? 'item'

      updateCharacter(player.characterId, (c) => {
        c.inventory.items = c.inventory.items.filter(i => i.id !== (message.action as { type: 'drop'; itemId: string }).itemId)
      })

      addChatMessage(createActionLog(`${charName} dropped ${itemName}`))
      setTimeout(() => broadcastStateSyncRef.current(), 50)
    }

    // === SHOP: BUY ===
    if (message.type === 'player_shop' && message.action === 'buy') {
      const player = useSessionStore.getState().session?.players[peerId]
      if (!player?.characterId) return
      const s = useSessionStore.getState().session
      if (!s) return
      const char = s.characters[player.characterId]
      const charName = char?.name ?? 'Someone'
      const store = s.stores.find(st => st.id === message.storeId)
      const storeItem = store?.items.find(i => i.id === message.itemId)
      if (!storeItem || !char) return

      // Check affordability
      const totalGold = char.inventory.coins.gp + char.inventory.coins.sp / 10 + char.inventory.coins.cp / 100
      if (totalGold < storeItem.price) return

      // Deduct gold and add item
      updateCharacter(player.characterId, (c) => {
        // Simple gold deduction (from gp first)
        let remaining = Math.round(storeItem.price * 100) // in cp
        let { gp, sp, cp } = c.inventory.coins
        const cpSpend = Math.min(cp, remaining); cp -= cpSpend; remaining -= cpSpend
        const spSpend = Math.min(sp, Math.ceil(remaining / 10)); sp -= spSpend; remaining -= spSpend * 10
        if (remaining > 0) { const gpSpend = Math.ceil(remaining / 100); gp -= gpSpend; const change = gpSpend * 100 - remaining; sp += Math.floor(change / 10); cp += change % 10 }
        c.inventory.coins = { gp, sp, cp }

        c.inventory.items.push({
          id: generateId(),
          definitionId: storeItem.itemDefinitionId ?? storeItem.name.toLowerCase().replace(/\s/g, '-'),
          name: storeItem.name,
          category: storeItem.category,
          slots: storeItem.slots,
          quantity: 1,
          equipped: false,
          isIdentified: true,
        })
      })

      // Decrease store quantity if not unlimited
      if (storeItem.quantity > 0) {
        useSessionStore.getState().updateStore(message.storeId, (st) => {
          const item = st.items.find(i => i.id === message.itemId)
          if (item) item.quantity -= 1
          if (item && item.quantity <= 0) st.items = st.items.filter(i => i.id !== message.itemId)
        })
      }

      addChatMessage(createActionLog(`${charName} bought ${storeItem.name} for ${storeItem.price >= 1 ? storeItem.price + ' gp' : Math.round(storeItem.price * 10) + ' sp'}`))
      setTimeout(() => broadcastStateSyncRef.current(), 50)
    }

    // === SHOP: SELL ===
    if (message.type === 'player_shop' && message.action === 'sell') {
      const player = useSessionStore.getState().session?.players[peerId]
      if (!player?.characterId) return
      const char = useSessionStore.getState().session?.characters[player.characterId]
      const charName = char?.name ?? 'Someone'
      const item = char?.inventory.items.find(i => i.id === message.itemId)
      if (!item) return

      const sellPrice = Math.max(1, Math.floor(item.slots * 2))

      updateCharacter(player.characterId, (c) => {
        c.inventory.items = c.inventory.items.filter(i => i.id !== message.itemId)
        c.inventory.coins.gp += sellPrice
      })

      addChatMessage(createActionLog(`${charName} sold ${item.name} for ${sellPrice} gp`))
      setTimeout(() => broadcastStateSyncRef.current(), 50)
    }

    // === REST ===
    if (message.type === 'player_rest') {
      const player = useSessionStore.getState().session?.players[peerId]
      if (!player?.characterId) return
      const char = useSessionStore.getState().session?.characters[player.characterId]
      if (!char) return
      const charName = char.name

      // Check for ration
      const rationIndex = char.inventory.items.findIndex(i => i.category === 'ration')
      if (rationIndex === -1) return // no ration, can't rest

      const hpHealed = char.maxHp - char.currentHp
      const spellsRestored = char.spells.knownSpells.filter(s => !s.isAvailable).length

      updateCharacter(player.characterId, (c) => {
        // Consume 1 ration
        const ri = c.inventory.items.findIndex(i => i.category === 'ration')
        if (ri >= 0) {
          if (c.inventory.items[ri].quantity > 1) {
            c.inventory.items[ri].quantity -= 1
          } else {
            c.inventory.items.splice(ri, 1)
          }
        }
        // Restore HP
        c.currentHp = c.maxHp
        c.isDying = false
        c.deathTimer = undefined
        c.ancestryTraitUsed = false
        // Restore spells
        c.spells.knownSpells.forEach(s => { s.isAvailable = true })
        c.spells.activeFocusSpell = undefined
        // Clear non-permanent stat mods and conditions
        c.statModifications = c.statModifications.filter(m => m.permanent)
        c.conditions = []
      })

      const effects = []
      if (hpHealed > 0) effects.push(`+${hpHealed} HP`)
      if (spellsRestored > 0) effects.push(`${spellsRestored} spell${spellsRestored > 1 ? 's' : ''} restored`)
      effects.push('1 ration consumed')

      addChatMessage(createActionLog(`${charName} took a rest 💤 (${effects.join(', ')})`))
      setTimeout(() => broadcastStateSyncRef.current(), 50)
    }

    // === PLAYER CHARACTER CREATION ===
    if (message.type === 'player_create_character') {
      const player = useSessionStore.getState().session?.players[peerId]
      if (!player) return
      const character = (message as { type: 'player_create_character'; character: any }).character
      if (!character?.id || !character?.name) return

      // Add character to session
      useSessionStore.getState().addCharacter(character)
      // Auto-assign to the player who created it
      updatePlayer(peerId, { characterId: character.id })

      addChatMessage(createActionLog(`${player.displayName} created ${character.name} (${character.ancestry} ${character.class})`))
      setTimeout(() => broadcastStateSyncRef.current(), 50)
    }
  }, [addChatMessage, updateCharacter, updatePlayer])

  const handlePlayerDisconnect = useCallback((peerId: string) => {
    const player = useSessionStore.getState().session?.players[peerId]
    if (player) {
      updatePlayer(peerId, { isConnected: false, lastSeen: Date.now() })
      addChatMessage({
        id: generateId(),
        senderId: 'system',
        senderName: 'System',
        type: 'system',
        content: `${player.displayName} has disconnected.`,
        timestamp: Date.now(),
        isPublic: true,
      })
    }
  }, [updatePlayer, addChatMessage])

  const getPlayerStateForPeer = useCallback((peerId: string): PlayerVisibleState | null => {
    return getPlayerVisibleStateRef.current(peerId)
  }, [])

  const { isReady, start, broadcastStateSync, kick } = useGMPeer({
    onPlayerJoin: handlePlayerJoin,
    onPlayerMessage: handlePlayerMessage,
    onPlayerDisconnect: handlePlayerDisconnect,
    getPlayerState: getPlayerStateForPeer,
  })

  broadcastStateSyncRef.current = broadcastStateSync

  // Start peer host when session is active — reuse existing peer ID on refresh
  useEffect(() => {
    if (session && !isReady) {
      // Reset all players to disconnected on GM startup (they'll reconnect)
      const store = useSessionStore.getState()
      if (store.session) {
        for (const pid of Object.keys(store.session.players)) {
          store.updatePlayer(pid, { isConnected: false })
        }
      }

      const existingPeerId = session.room.gmPeerId || undefined
      start(existingPeerId).then(code => {
        // Save the peer ID so reconnection works after refresh
        if (session.room.gmPeerId !== code) {
          const s = useSessionStore.getState()
          if (s.session) {
            s.session.room.gmPeerId = code
            s.saveNow()
          }
        }
      }).catch(err => console.error('Failed to start peer:', err))
    }
  }, [session, isReady, start])

  // Tick light timers every 5 seconds and broadcast every 60 seconds
  useEffect(() => {
    if (!isReady) return
    const tickInterval = setInterval(() => {
      const s = useSessionStore.getState().session
      if (s && s.light.timers.length > 0 && !s.light.isPaused) {
        const updated = tickLightState(s.light)
        if (updated.isInDarkness !== s.light.isInDarkness || updated.timers.some((t, i) => t.isExpired !== s.light.timers[i]?.isExpired)) {
          useSessionStore.getState().setLight(updated)
          gmPeer.broadcastStateSync()
        }
      }
    }, 5000)
    const syncInterval = setInterval(() => {
      broadcastStateSync()
    }, 60000)
    return () => { clearInterval(tickInterval); clearInterval(syncInterval) }
  }, [isReady, broadcastStateSync])

  const [rewardsState, setRewardsState] = useState<{ show: boolean; hasTreasure: boolean; encounterType: 'random' | 'story' }>({ show: false, hasTreasure: false, encounterType: 'random' })

  // Loading while PeerJS starts
  if (session && !isReady) {
    return <LoadingScreen message="Starting room..." />
  }

  // Redirect if no session
  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <p className="mb-4 text-lg text-muted-foreground">No active session</p>
        <button
          onClick={() => navigate({ to: '/gm/create' })}
          className="rounded-lg bg-primary px-6 py-2 font-semibold text-primary-foreground hover:opacity-90"
        >
          Create a Game
        </button>
      </main>
    )
  }

  const players = Object.values(session.players)
  // Only characters assigned to players are "the party"
  const assignedCharIds = new Set(Object.values(session.players).filter(p => p.characterId).map(p => p.characterId!))
  const characters = Object.values(session.characters).filter(c => assignedCharIds.has(c.id))
  const activeMonsters = Object.values(session.activeMonsters)

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Connected Players + Character Assignment */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-semibold">Connected Players</h2>
          {players.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No players connected. Share the room code with your players.
            </p>
          ) : (
            <div className="space-y-2">
              {players.map(p => {
                const isPlayerActiveTurn = p.characterId ? session.activeTurnId === p.characterId : false
                return (
                  <div key={p.peerId} className={`rounded-lg border p-3 transition ${
                    isPlayerActiveTurn ? 'border-amber-500/40 bg-amber-500/5' : 'border-border/50'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (!p.characterId) return
                            const newId = isPlayerActiveTurn ? null : p.characterId
                            useSessionStore.getState().setActiveTurnId(newId)
                            setTimeout(() => gmPeer.broadcastStateSync(), 50)
                          }}
                          disabled={!p.characterId}
                          className={`text-[10px] font-bold transition ${
                            isPlayerActiveTurn ? 'text-amber-400' :
                            p.characterId ? 'text-muted-foreground hover:text-amber-400' : 'text-muted-foreground/30'
                          }`}
                          title={isPlayerActiveTurn ? 'End turn' : 'Set active turn'}
                        >{isPlayerActiveTurn ? '■' : '▷'}</button>
                        <div className={`h-2 w-2 rounded-full ${p.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-sm font-medium">{p.displayName}</span>
                        {isPlayerActiveTurn && (
                          <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-400 uppercase">Active</span>
                        )}
                      </div>
                      <PlayerMenu
                        character={p.characterId ? session.characters[p.characterId] ?? null : null}
                        playerName={p.displayName}
                        onUpdateHp={(delta) => {
                          if (!p.characterId) return
                          const charName = session.characters[p.characterId]?.name ?? p.displayName
                          updateCharacter(p.characterId, (c) => {
                            c.currentHp = Math.max(0, Math.min(c.maxHp, c.currentHp + delta))
                            c.isDying = c.currentHp <= 0
                          })
                          addChatMessage(createActionLog(`GM ${delta > 0 ? 'healed' : 'damaged'} ${charName} for ${Math.abs(delta)} HP`))
                          setTimeout(() => gmPeer.broadcastStateSync(), 50)
                        }}
                        onUpdateXp={(delta) => {
                          if (!p.characterId) return
                          const charName = session.characters[p.characterId]?.name ?? p.displayName
                          updateCharacter(p.characterId, (c) => { c.xp += delta })
                          addChatMessage(createActionLog(`GM awarded ${charName} ${delta} XP`))
                          setTimeout(() => gmPeer.broadcastStateSync(), 50)
                        }}
                        onAddGold={(amount) => {
                          if (!p.characterId) return
                          const charName = session.characters[p.characterId]?.name ?? p.displayName
                          updateCharacter(p.characterId, (c) => { c.inventory.coins.gp += amount })
                          addChatMessage(createActionLog(`GM gave ${charName} ${amount} gp`))
                          setTimeout(() => gmPeer.broadcastStateSync(), 50)
                        }}
                        onAddItem={(item) => {
                          if (!p.characterId) return
                          const charName = session.characters[p.characterId]?.name ?? p.displayName
                          updateCharacter(p.characterId, (c) => {
                            c.inventory.items.push(item)
                          })
                          addChatMessage(createActionLog(`GM gave ${charName} a ${item.name}`))
                          setTimeout(() => gmPeer.broadcastStateSync(), 50)
                        }}
                        onRemoveItem={(itemId) => {
                          if (!p.characterId) return
                          const charName = session.characters[p.characterId]?.name ?? p.displayName
                          const itemName = session.characters[p.characterId]?.inventory.items.find(i => i.id === itemId)?.name ?? 'item'
                          updateCharacter(p.characterId, (c) => {
                            c.inventory.items = c.inventory.items.filter(i => i.id !== itemId)
                          })
                          addChatMessage(createActionLog(`GM removed ${itemName} from ${charName}`))
                          setTimeout(() => gmPeer.broadcastStateSync(), 50)
                        }}
                        onToggleLuckToken={() => {
                          if (!p.characterId) return
                          const charName = session.characters[p.characterId]?.name ?? p.displayName
                          const has = session.characters[p.characterId]?.hasLuckToken
                          updateCharacter(p.characterId, (c) => { c.hasLuckToken = !c.hasLuckToken })
                          addChatMessage(createActionLog(has ? `GM removed luck token from ${charName}` : `GM granted ${charName} a luck token ★`))
                          setTimeout(() => gmPeer.broadcastStateSync(), 50)
                        }}
                        onKick={() => {
                          kick(p.peerId, 'Kicked by GM')
                          removePlayer(p.peerId)
                        }}
                      />
                    </div>
                    {/* Character assignment */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Character:</span>
                      <select
                        value={p.characterId ?? ''}
                        onChange={e => {
                          const charId = e.target.value || undefined
                          updatePlayer(p.peerId, { characterId: charId })
                          setTimeout(() => broadcastStateSyncRef.current(), 50)
                        }}
                        className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs outline-none"
                      >
                        <option value="">— None —</option>
                        {characters.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.ancestry} {c.class} Lv{c.level})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {characters.length === 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              No characters created yet. Go to Characters to create some.
            </p>
          )}
        </div>

        {/* Chat Log */}
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col">
          <h2 className="mb-3 font-semibold">Chat</h2>
          <AutoScrollContainer className="max-h-60 min-h-[100px] space-y-1 overflow-y-auto mb-3 flex-1" deps={[session.chatLog.length]}>
            {session.chatLog.length === 0 ? (
              <p className="text-sm text-muted-foreground">No messages yet.</p>
            ) : (
              session.chatLog.slice(-50).map(msg => (
                <ChatMessageRow key={msg.id} msg={msg} />
              ))
            )}
          </AutoScrollContainer>
          <GMChatInput onSend={(content) => {
            addChatMessage({
              id: generateId(),
              senderId: 'gm',
              senderName: 'GM',
              type: 'chat',
              content,
              timestamp: Date.now(),
              isPublic: true,
            })
            setTimeout(() => broadcastStateSyncRef.current(), 50)
          }} />
        </div>
      </div>

      {/* Light Tracker */}
      <div className="mt-6">
        <LightTracker
          lightState={session.light}
          isGM
          onAddLight={(type, carrierId) => {
            const timer = createLightTimer(type, carrierId)
            const newLight = { ...session.light, timers: [...session.light.timers, timer], isInDarkness: false }
            useSessionStore.getState().setLight(newLight)
            setTimeout(() => gmPeer.broadcastStateSync(), 50)
          }}
          onPauseAll={() => {
            useSessionStore.getState().setLight(pauseAllTimers(session.light))
            setTimeout(() => gmPeer.broadcastStateSync(), 50)
          }}
          onResumeAll={() => {
            useSessionStore.getState().setLight(resumeAllTimers(session.light))
            setTimeout(() => gmPeer.broadcastStateSync(), 50)
          }}
          onRemoveTimer={(timerId) => {
            const newTimers = session.light.timers.filter(t => t.id !== timerId)
            const hasActive = newTimers.some(t => t.isActive && !t.isExpired)
            useSessionStore.getState().setLight({ ...session.light, timers: newTimers, isInDarkness: !hasActive })
            setTimeout(() => gmPeer.broadcastStateSync(), 50)
          }}
        />
      </div>

      {/* Encounter Panel — shows when monsters are active */}
      {activeMonsters.length > 0 && (
        <div className="mt-6">
          <EncounterPanel
            monsters={activeMonsters}
            characters={characters}
            activeTurnId={session.activeTurnId}
            onSetActiveTurn={(id) => {
              useSessionStore.getState().setActiveTurnId(id)
              setTimeout(() => gmPeer.broadcastStateSync(), 50)
            }}
            onBroadcastRoll={(name, expression, total, isNat20, isNat1) => {
              const natLabel = isNat20 ? ' — NATURAL 20!' : isNat1 ? ' — Natural 1' : ''
              addChatMessage({
                id: generateId(),
                senderId: 'gm',
                senderName: name,
                type: 'roll',
                content: `rolled ${expression} → ${total}${natLabel}`,
                timestamp: Date.now(),
                isPublic: true,
              })
              gmPeer.broadcast({
                type: 'roll_result',
                roll: { id: generateId(), expression, dice: [], modifier: 0, total, timestamp: Date.now(), rolledBy: name },
                characterName: name,
                isPublic: true,
                context: `rolled ${expression} → ${total}${natLabel}`,
              })
              setTimeout(() => broadcastStateSyncRef.current(), 50)
            }}
            onUpdateMonsterHp={(id, delta) => {
              updateMonster(id, (m) => {
                m.currentHp = Math.max(0, Math.min(m.maxHp, m.currentHp + delta))
              })
              setTimeout(() => gmPeer.broadcastStateSync(), 50)
            }}
            onDefeatMonster={(id) => {
              updateMonster(id, (m) => { m.isDefeated = true })
              setTimeout(() => gmPeer.broadcastStateSync(), 50)
            }}
            onRemoveMonster={(id) => {
              removeMonster(id)
              setTimeout(() => gmPeer.broadcastStateSync(), 50)
            }}
            onUpdateCharacterHp={(id, delta) => {
              updateCharacter(id, (c) => {
                c.currentHp = Math.max(0, Math.min(c.maxHp, c.currentHp + delta))
                c.isDying = c.currentHp <= 0
                Object.assign(c, { computed: computeCharacterValues(c as any) })
              })
              setTimeout(() => gmPeer.broadcastStateSync(), 50)
            }}
            onResolveEncounter={(encounterType) => {
              const hasTreasure = encounterType === 'story' ? true : rollForTreasure()
              setRewardsState({ show: true, hasTreasure, encounterType })
            }}
          />
        </div>
      )}

      {/* Rewards Dialog */}
      {rewardsState.show && (
        <RewardsDialog
          characters={characters}
          avgPartyLevel={characters.length > 0 ? Math.round(characters.reduce((sum, c) => sum + c.level, 0) / characters.length) : 1}
          hasTreasure={rewardsState.hasTreasure}
          encounterType={rewardsState.encounterType}
          onDistribute={(quality, goldPerCharacter, bonusXP, itemAwards) => {
            const { updated, levelUps } = distributeEncounterRewards(characters, quality, bonusXP, goldPerCharacter)
            // Apply XP + gold updates to each character
            for (const char of updated) {
              updateCharacter(char.id, (draft) => {
                draft.xp = char.xp
                draft.inventory.coins.gp = char.inventory.coins.gp
              })
            }
            // Award items
            for (const award of itemAwards) {
              updateCharacter(award.characterId, (draft) => {
                draft.inventory.items.push({
                  id: generateId(),
                  definitionId: award.itemId,
                  name: award.itemName,
                  category: award.itemCategory as any,
                  slots: award.itemSlots,
                  quantity: 1,
                  equipped: false,
                  isIdentified: true,
                })
              })
            }
            // Remove all monsters
            for (const m of activeMonsters) {
              removeMonster(m.id)
            }
            // Clear active turn
            useSessionStore.getState().setActiveTurnId(null)
            // Chat message
            const xpTotal = (TREASURE_XP[quality] ?? 0) + bonusXP
            const levelUpNames = levelUps.map(id => characters.find(c => c.id === id)?.name).filter(Boolean)
            const itemLog = itemAwards.length > 0 ? ` Items: ${itemAwards.map(a => `${a.itemName} → ${a.characterName}`).join(', ')}.` : ''
            addChatMessage({
              id: generateId(),
              senderId: 'system',
              senderName: 'System',
              type: 'system',
              content: `Encounter resolved! Each hero earned ${xpTotal} XP and ${goldPerCharacter} gp.${levelUpNames.length > 0 ? ` Level up: ${levelUpNames.join(', ')}!` : ''}${itemLog}`,
              timestamp: Date.now(),
              isPublic: true,
            })
            setRewardsState({ show: false, hasTreasure: false, encounterType: 'random' })
            setTimeout(() => gmPeer.broadcastStateSync(), 50)
          }}
          onSkip={() => {
            // Remove all monsters without rewards
            for (const m of activeMonsters) {
              removeMonster(m.id)
            }
            useSessionStore.getState().setActiveTurnId(null)
            addChatMessage({
              id: generateId(),
              senderId: 'system',
              senderName: 'System',
              type: 'system',
              content: rewardsState.hasTreasure ? 'Encounter resolved. Rewards skipped.' : 'Encounter resolved. No treasure found.',
              timestamp: Date.now(),
              isPublic: true,
            })
            setRewardsState({ show: false, hasTreasure: false, encounterType: 'random' })
            setTimeout(() => gmPeer.broadcastStateSync(), 50)
          }}
        />
      )}

      {/* Danger Level */}
      <div className="mt-6 rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 font-semibold">Danger Level</h2>
        <div className="flex gap-2">
          {(['unsafe', 'risky', 'deadly'] as const).map(level => (
            <button
              key={level}
              onClick={() => useSessionStore.getState().setDangerLevel(level)}
              className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition ${
                session.dangerLevel === level
                  ? level === 'deadly' ? 'bg-red-500 text-white' :
                    level === 'risky' ? 'bg-amber-500 text-white' :
                    'bg-blue-500 text-white'
                  : 'border border-border hover:bg-accent'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {session.dangerLevel === 'unsafe' && 'Check for random encounters every 3 crawling rounds.'}
          {session.dangerLevel === 'risky' && 'Check for random encounters every 2 crawling rounds.'}
          {session.dangerLevel === 'deadly' && 'Check for random encounters every crawling round.'}
        </p>
      </div>

    </main>
  )
}

function GMChatInput({ onSend }: { onSend: (content: string) => void }) {
  const [value, setValue] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim()) return
    onSend(value.trim())
    setValue('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Type a message as GM..."
        className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
      />
      <button type="submit" className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
        Send
      </button>
    </form>
  )
}

