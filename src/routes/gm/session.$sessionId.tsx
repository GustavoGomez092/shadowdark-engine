import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocale } from '@/hooks/use-locale.ts'
import { useSessionStore } from '@/stores/session-store.ts'
import { LoadingScreen } from '@/components/shared/spinner.tsx'
import { AutoScrollContainer } from '@/components/shared/auto-scroll.tsx'
import { ChatMessageRow } from '@/components/shared/chat-message.tsx'
import { createActionLog } from '@/lib/utils/action-log.ts'
import { getGear, getClass, getMonster } from '@/data/index.ts'
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
import { computeCharacterValues, levelUpCharacter, canLevelUp } from '@/lib/rules/character.ts'
import { rollDeathSave, rollInitiative, autoRollMissing } from '@/lib/rules/combat.ts'
import { GMMapViewer } from '@/components/map-viewer/gm-map-viewer.tsx'
import { useMapViewerStore } from '@/stores/map-viewer-store.ts'
import type { CampaignMap } from '@/schemas/map.ts'
import type { MapViewerState, PlayerMapViewState } from '@/schemas/map-viewer.ts'

export const Route = createFileRoute('/gm/session/$sessionId')({
  component: GMSessionPage,
})

function GMSessionPage() {
  const { t, ti, tData, tDataNested } = useLocale()
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
      // Initiative rolls take a dedicated path — short-circuit before the generic toast/chat code below.
      if (message.purpose === 'initiative') {
        const combat = useSessionStore.getState().session?.combat
        if (!combat || combat.phase !== 'initiative') return
        const player = useSessionStore.getState().session?.players[peerId]
        const characterId = player?.characterId
        const row = combat.combatants.find(
          c => c.type === 'pc' && c.referenceId === characterId && c.initiativeRoll === undefined
        )
        if (!row) return
        useSessionStore.getState().applyInitiativeRoll(row.id, message.total, false)
        const character = characterId ? useSessionStore.getState().session?.characters[characterId] : null
        const rollName = character?.name ?? row.name
        const natLabel = message.isNat20 ? ' — NATURAL 20!' : message.isNat1 ? ' — Natural 1' : ''
        pushRollToast({
          id: generateId(), playerName: rollName, diceType: message.expression,
          total: message.total, isNat20: message.isNat20, isNat1: message.isNat1, timestamp: Date.now(),
        })
        addChatMessage({
          id: generateId(), senderId: peerId, senderName: rollName, type: 'roll',
          content: `rolled ${message.expression} → ${message.total}${natLabel} (initiative)`,
          timestamp: Date.now(), isPublic: true,
        })
        gmPeer.broadcast({
          type: 'roll_result',
          roll: { id: generateId(), expression: message.expression, dice: [], modifier: 0, total: message.total, timestamp: Date.now(), rolledBy: rollName },
          characterName: rollName, isPublic: true, context: 'initiative',
        })
        checkAndLockInitiativeOrder()
        setTimeout(() => broadcastStateSyncRef.current(), 50)
        return
      }

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

        // Check if item has quantityPerSlot (ammo, rations)
        const gearDef = storeItem.itemDefinitionId ? getGear(storeItem.itemDefinitionId) : null
        const qty = gearDef?.quantityPerSlot ?? 1

        c.inventory.items.push({
          id: generateId(),
          definitionId: storeItem.itemDefinitionId ?? storeItem.name.toLowerCase().replace(/\s/g, '-'),
          name: storeItem.name,
          category: storeItem.category,
          slots: storeItem.slots,
          quantity: qty,
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

    // === PLAYER DEATH TIMER ROLL ===
    if (message.type === 'player_death_timer_roll') {
      const { characterId, roll, totalRounds } = message as { type: 'player_death_timer_roll'; characterId: string; roll: number; totalRounds: number }
      const char = useSessionStore.getState().session?.characters[characterId]
      if (!char || !char.isDying || char.deathTimer) return // already has timer or not dying

      updateCharacter(characterId, (c) => {
        c.deathTimer = { totalRounds, roundsRemaining: totalRounds, startedAt: Date.now() }
      })
      addChatMessage(createActionLog(`${char.name} rolled a ${roll} on their death timer — ${totalRounds} round${totalRounds !== 1 ? 's' : ''} until death`))
      setTimeout(() => broadcastStateSyncRef.current(), 50)
    }

    // === PLAYER STABILIZE ===
    if (message.type === 'player_stabilize') {
      const { targetId, roll, intMod, total, success } = message as {
        type: 'player_stabilize'; characterId: string; targetId: string
        roll: number; intMod: number; total: number; success: boolean
      }
      const player = useSessionStore.getState().session?.players[peerId]
      if (!player?.characterId) return
      const stabilizer = useSessionStore.getState().session?.characters[player.characterId]
      const target = useSessionStore.getState().session?.characters[targetId]
      if (!stabilizer || !target) return
      if (!target.isDying || !target.deathTimer) return

      if (success) {
        updateCharacter(targetId, (c) => {
          c.currentHp = 1
          c.isDying = false
          c.deathTimer = undefined
        })
        addChatMessage(createActionLog(
          `${stabilizer.name} stabilized ${target.name}! (INT check: ${roll}${intMod >= 0 ? '+' : ''}${intMod} = ${total} vs DC 15) — ${target.name} is back at 1 HP`
        ))
      } else {
        addChatMessage(createActionLog(
          `${stabilizer.name} failed to stabilize ${target.name}. (INT check: ${roll}${intMod >= 0 ? '+' : ''}${intMod} = ${total} vs DC 15)`
        ))
      }
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

    if (message.type === 'player_level_up') {
      const msg = message as import('@/schemas/messages.ts').PlayerLevelUp
      const char = useSessionStore.getState().session?.characters[msg.characterId]
      if (!char) return

      const updated = levelUpCharacter(char, msg.hpRoll, msg.talent)
      if (msg.newSpellIds) {
        for (const spellId of msg.newSpellIds) {
          updated.spells.knownSpells.push({ spellId, isAvailable: true, source: 'class', hasAdvantage: false })
        }
      }
      updateCharacter(msg.characterId, (c) => { Object.assign(c, updated) })
      addChatMessage({
        id: generateId(), senderId: 'system', senderName: 'System',
        type: 'system', content: `${char.name} leveled up to Level ${updated.level}!`,
        timestamp: Date.now(), isPublic: true,
      })
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

  const campaignMapsRef = useRef<CampaignMap[]>([])
  const getPlayerStateForPeer = useCallback((peerId: string): PlayerVisibleState | null => {
    const state = getPlayerVisibleStateRef.current(peerId)
    if (!state) return null
    // Only send map view if this player's character has a token on the map
    const mvState = mapViewerStateRef.current
    const playerCharId = state.myCharacter?.id
    const playerHasToken = playerCharId && mvState.tokens.some(t => t.referenceId === playerCharId)
    if (mvState.activeMapId && playerHasToken) {
      const activeMap = campaignMapsRef.current.find(m => m.id === mvState.activeMapId)
      if (activeMap?.dungeonData) {
        state.mapView = {
          mapId: activeMap.id,
          dungeonData: activeMap.dungeonData,
          seed: (activeMap.dungeonData as any)?.seed || activeMap.seed || 0,
          tokens: mvState.tokens.filter(t => t.visible),
        }
      }
    }
    return state
  }, [])

  const checkAndLockInitiativeOrder = () => {
    const combat = useSessionStore.getState().session?.combat
    if (!combat || combat.phase !== 'initiative') return
    const allRolled = combat.combatants.every(c => c.initiativeRoll !== undefined)
    if (allRolled) {
      useSessionStore.getState().lockInitiativeOrder()
    }
  }

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
      // Reset all players to disconnected and recompute all characters on GM startup
      const store = useSessionStore.getState()
      if (store.session) {
        for (const pid of Object.keys(store.session.players)) {
          store.updatePlayer(pid, { isConnected: false })
        }
        // Force recompute all character values (fixes stale computed data in localStorage)
        for (const char of Object.values(store.session.characters)) {
          try {
            char.computed = computeCharacterValues(char as any)
          } catch { /* ignore */ }
        }
        store.saveNow()
      }

      const existingPeerId = session.room.gmPeerId || undefined
      start(existingPeerId).then(code => {
        // Save the peer ID so reconnection works after refresh
        if (session.room.gmPeerId !== code) {
          useSessionStore.setState((state) => {
            if (state.session) {
              state.session.room.gmPeerId = code
            }
          })
          useSessionStore.getState().saveNow()
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

  // ── Map Viewer ──
  const mapViewerState = useMapViewerStore(s => s.state)
  const setMapViewerState = useMapViewerStore(s => s.setState)

  // Load campaign maps from localStorage for map selection
  const [campaignMaps, setCampaignMaps] = useState<CampaignMap[]>([])
  useEffect(() => {
    try {
      const indexRaw = localStorage.getItem('shadowdark:campaigns:index')
      if (!indexRaw) return
      const index = JSON.parse(indexRaw) as Array<{ id: string }>
      const maps: CampaignMap[] = []
      for (const entry of index) {
        const raw = localStorage.getItem(`shadowdark:campaign:${entry.id}`)
        if (!raw) continue
        const campaign = JSON.parse(raw)
        if (campaign.maps) {
          for (const m of campaign.maps) {
            if ((m.layers && m.layers.length > 0) || m.dungeonData) maps.push(m)
          }
        }
      }
      setCampaignMaps(maps)
      campaignMapsRef.current = maps
    } catch { /* ignore */ }
  }, [])

  // Load map viewer state from session on mount, then save changes back
  const mapViewerLoaded = useRef(false)
  useEffect(() => {
    if (session?.mapViewer) {
      setMapViewerState(session.mapViewer)
    }
    // Mark loaded after a tick so the save effect skips the initial empty state
    requestAnimationFrame(() => { mapViewerLoaded.current = true })
  }, []) // Only on mount

  const mapViewerStateRef = useRef(mapViewerState)
  mapViewerStateRef.current = mapViewerState
  useEffect(() => {
    if (!mapViewerLoaded.current) return // Skip saving until initial load completes
    useSessionStore.setState((state) => {
      if (state.session) {
        state.session.mapViewer = mapViewerState
      }
    })
  }, [mapViewerState])

  // 30-second initiative deadline timer — auto-rolls for combatants who haven't rolled
  useEffect(() => {
    const combat = session?.combat
    if (!combat || combat.phase !== 'initiative' || combat.initiativeDeadline == null) return
    const remaining = combat.initiativeDeadline - Date.now()
    const fireAutoRoll = () => {
      const s = useSessionStore.getState().session
      const c2 = s?.combat
      if (!c2 || c2.phase !== 'initiative') return
      // Derive assigned characters from live store state (avoids depending on post-return `characters`)
      const assignedCharIds = new Set(Object.values(s?.players ?? {}).filter(p => p.characterId).map(p => p.characterId!))
      const liveCharacters = Object.values(s?.characters ?? {}).filter(c => assignedCharIds.has(c.id))
      const updated = autoRollMissing(c2, liveCharacters)
      for (const c of updated.combatants) {
        const original = c2.combatants.find(x => x.id === c.id)
        if (c.initiativeRoll !== undefined && c.initiativeRolledByAuto && original?.initiativeRoll === undefined) {
          useSessionStore.getState().applyInitiativeRoll(c.id, c.initiativeRoll, true)
          addChatMessage(createActionLog(`${c.name} rolled initiative → ${c.initiativeRoll} (auto)`))
        }
      }
      useSessionStore.getState().lockInitiativeOrder()
      setTimeout(() => gmPeer.broadcastStateSync(), 50)
    }
    if (remaining <= 0) {
      fireAutoRoll()
      return
    }
    const id = setTimeout(fireAutoRoll, remaining)
    return () => clearTimeout(id)
  }, [session?.combat?.id, session?.combat?.phase, session?.combat?.initiativeDeadline])

  // Handle map viewer state changes and broadcast
  const handleMapViewerChange = useCallback((newState: MapViewerState) => {
    setMapViewerState(newState)
    setTimeout(() => broadcastStateSyncRef.current(), 100)
  }, [setMapViewerState])

  const handleTokenMove = useCallback((_tokenId: string, _gridX: number, _gridY: number) => {
    setTimeout(() => broadcastStateSyncRef.current(), 50)
  }, [])

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
  const allCharacters = Object.values(session.characters)
  // Only characters assigned to players are "the party"
  const assignedCharIds = new Set(Object.values(session.players).filter(p => p.characterId).map(p => p.characterId!))
  const characters = allCharacters.filter(c => assignedCharIds.has(c.id))
  const activeMonsters = Object.values(session.activeMonsters)
  // Map character ID → player name for assignment hints in dropdown
  const charToPlayer = new Map<string, string>()
  for (const pl of players) {
    if (pl.characterId) charToPlayer.set(pl.characterId, pl.displayName)
  }

  return (
    <main className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Connected Players + Character Assignment */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-semibold shrink-0">{t('gm.connectedPlayers')}</h2>
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
                            if (isPlayerActiveTurn) {
                              useSessionStore.getState().setActiveTurnId(null)
                            } else {
                              // Process death save if character is dying with an active timer
                              const char = session.characters[p.characterId]
                              if (char?.isDying && char.deathTimer && char.deathTimer.roundsRemaining > 0) {
                                const save = rollDeathSave()
                                const remaining = char.deathTimer.roundsRemaining - 1

                                if (save.isNat20) {
                                  updateCharacter(p.characterId, (c) => {
                                    c.currentHp = 1
                                    c.isDying = false
                                    c.deathTimer = undefined
                                  })
                                  addChatMessage(createActionLog(`${char.name} rolled a NAT 20 on their death save and rises with 1 HP!`))
                                } else if (remaining <= 0) {
                                  updateCharacter(p.characterId, (c) => {
                                    c.isDying = false
                                    c.deathTimer = undefined
                                  })
                                  addChatMessage(createActionLog(`${char.name} death save: ${save.roll} — ${char.name} has died.`))
                                } else {
                                  updateCharacter(p.characterId, (c) => {
                                    if (c.deathTimer) c.deathTimer.roundsRemaining = remaining
                                  })
                                  addChatMessage(createActionLog(`${char.name} death save: ${save.roll} (${remaining} round${remaining !== 1 ? 's' : ''} remaining)`))
                                }
                              }
                              useSessionStore.getState().setActiveTurnId(p.characterId)
                            }
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
                        {p.characterId && session.characters[p.characterId] && canLevelUp(session.characters[p.characterId]) && (
                          <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold text-primary uppercase animate-pulse">{t('character.levelUp')}</span>
                        )}
                      </div>
                      <PlayerMenu
                        character={p.characterId ? session.characters[p.characterId] ?? null : null}
                        playerName={p.displayName}
                        onUpdateHp={(delta) => {
                          if (!p.characterId) return
                          const char = session.characters[p.characterId]
                          if (!char) return
                          const charName = char.name
                          const newHp = Math.max(0, Math.min(char.maxHp, char.currentHp + delta))
                          const wasDying = char.isDying
                          const nowDying = newHp <= 0

                          if (nowDying && !wasDying) {
                            // Entering dying state — player will roll their own death timer
                            updateCharacter(p.characterId, (c) => {
                              c.currentHp = newHp
                              c.isDying = true
                              c.deathTimer = undefined
                            })
                            addChatMessage(createActionLog(`GM damaged ${charName} for ${Math.abs(delta)} HP — ${charName} is dying!`))
                          } else if (!nowDying && wasDying) {
                            // Healed out of dying
                            updateCharacter(p.characterId, (c) => {
                              c.currentHp = newHp
                              c.isDying = false
                              c.deathTimer = undefined
                            })
                            addChatMessage(createActionLog(`GM healed ${charName} for ${Math.abs(delta)} HP — ${charName} is back on their feet!`))
                          } else {
                            updateCharacter(p.characterId, (c) => {
                              c.currentHp = newHp
                              c.isDying = nowDying
                            })
                            addChatMessage(createActionLog(`GM ${delta > 0 ? 'healed' : 'damaged'} ${charName} for ${Math.abs(delta)} HP`))
                          }
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
                        onAdjustQuantity={(itemId, delta) => {
                          if (!p.characterId) return
                          const charName = session.characters[p.characterId]?.name ?? p.displayName
                          const item = session.characters[p.characterId]?.inventory.items.find(i => i.id === itemId)
                          if (!item) return

                          updateCharacter(p.characterId, (c) => {
                            const target = c.inventory.items.find(i => i.id === itemId)
                            if (!target) return
                            target.quantity = target.quantity + delta
                            if (target.quantity <= 0) {
                              c.inventory.items = c.inventory.items.filter(i => i.id !== itemId)
                            }
                          })

                          // Re-read after update for accurate log
                          const updatedItem = useSessionStore.getState().session?.characters[p.characterId!]?.inventory.items.find(i => i.id === itemId)
                          const remaining = updatedItem?.quantity ?? 0
                          addChatMessage(createActionLog(`GM ${delta > 0 ? 'added' : 'removed'} ${Math.abs(delta)} unit from ${item.name} for ${charName} (${remaining} left)`))
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
                        {allCharacters.map(c => {
                          const owner = charToPlayer.get(c.id)
                          const taken = owner && owner !== p.displayName
                          return (
                            <option key={c.id} value={c.id} disabled={!!taken}>
                              {c.name} ({tData('ancestries', c.ancestry, 'name', c.ancestry)} {tData('classes', c.class, 'name', c.class)} Lv{c.level}){taken ? ` — ${owner}` : ''}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                    {/* Class Abilities */}
                    {(() => {
                      const char = p.characterId ? session.characters[p.characterId] : null
                      if (!char) return null
                      const cls = getClass(char.class)
                      if (!cls) return null
                      const features = cls.features.filter(f => f.level <= char.level)
                      if (features.length === 0) return null
                      return (
                        <div className="mt-2 rounded-md border border-border/50 bg-background/50 px-2 py-1.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{ti('character.abilities', { className: tData('classes', cls.id, 'name', cls.name) })}</p>
                          <div className="space-y-1">
                            {features.map(f => {
                              const fk = f.mechanic.type.replace(/_/g, '-')
                              return (
                              <div key={f.name}>
                                <span className="text-xs font-medium">{tDataNested('classes', cls.id, ['features', fk, 'name'], f.name)}</span>
                                {f.level > 1 && <span className="ml-1 text-[10px] text-muted-foreground">Lv {f.level}</span>}
                                <p className="text-[11px] text-muted-foreground leading-tight">{tDataNested('classes', cls.id, ['features', fk, 'description'], f.description)}</p>
                              </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })()}
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
        <div className="rounded-xl border border-border bg-card p-3 sm:p-4 flex flex-col h-[240px] sm:h-[320px] lg:h-[480px]">
          <h2 className="mb-3 font-semibold">{t('chat.title')}</h2>
          <AutoScrollContainer className="min-h-0 space-y-1 overflow-y-auto mb-3 flex-1" deps={[session.chatLog.length]}>
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

      {/* Map Viewer */}
      {campaignMaps.length > 0 && (
        <div className="mt-6">
          <GMMapViewer
            campaignMaps={campaignMaps}
            characters={session.characters}
            monsters={session.activeMonsters}
            lightState={session.light}
            mapViewerState={mapViewerState}
            onStateChange={handleMapViewerChange}
            onTokenMove={handleTokenMove}
          />
        </div>
      )}

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
              const char = session.characters[id]
              if (!char) return
              const newHp = Math.max(0, Math.min(char.maxHp, char.currentHp + delta))
              const wasDying = char.isDying
              const nowDying = newHp <= 0

              if (nowDying && !wasDying) {
                // Player will roll their own death timer
                updateCharacter(id, (c) => {
                  c.currentHp = newHp
                  c.isDying = true
                  c.deathTimer = undefined
                })
                addChatMessage(createActionLog(`${char.name} is dying!`))
              } else if (!nowDying && wasDying) {
                updateCharacter(id, (c) => {
                  c.currentHp = newHp
                  c.isDying = false
                  c.deathTimer = undefined
                })
                addChatMessage(createActionLog(`${char.name} is back on their feet!`))
              } else {
                updateCharacter(id, (c) => {
                  c.currentHp = newHp
                  c.isDying = nowDying
                })
              }
              setTimeout(() => gmPeer.broadcastStateSync(), 50)
            }}
            onResolveEncounter={(encounterType) => {
              const hasTreasure = encounterType === 'story' ? true : rollForTreasure()
              setRewardsState({ show: true, hasTreasure, encounterType })
            }}
            combat={session.combat}
            onRollInitiative={() => {
              const assignedCharacters = characters.filter(c => Object.values(session.players).some(p => p.characterId === c.id))
              const liveMonsters = activeMonsters
                .filter(m => !m.isDefeated)
                .map(m => {
                  const def = getMonster(m.definitionId)
                  return def ? { instance: m, definition: def } : null
                })
                .filter((x): x is { instance: typeof activeMonsters[number]; definition: NonNullable<ReturnType<typeof getMonster>> } => !!x)
              if (assignedCharacters.length === 0 || liveMonsters.length === 0) return
              const combat = rollInitiative(assignedCharacters, liveMonsters)
              useSessionStore.getState().setCombat(combat)
              setTimeout(() => {
                gmPeer.broadcastStateSync()
                gmPeer.broadcast({ type: 'initiative_request', combat })
              }, 50)
            }}
            onEndCombat={() => {
              useSessionStore.getState().endCombat()
              setTimeout(() => gmPeer.broadcastStateSync(), 50)
            }}
            onAdvanceTurn={() => {
              useSessionStore.getState().advanceCombatTurn()
              setTimeout(() => gmPeer.broadcastStateSync(), 50)
            }}
            onForceInitiativeRoll={(combatantId) => {
              const combat = useSessionStore.getState().session?.combat
              const row = combat?.combatants.find(c => c.id === combatantId)
              if (!combat || !row || row.type !== 'pc') return
              const character = characters.find(c => c.id === row.referenceId)
              if (!character) return
              const updated = autoRollMissing(combat, [character])
              const single = updated.combatants.find(c => c.id === combatantId)
              if (single?.initiativeRoll != null) {
                useSessionStore.getState().applyInitiativeRoll(combatantId, single.initiativeRoll, true)
                addChatMessage(createActionLog(`${row.name} rolled initiative → ${single.initiativeRoll} (auto)`))
                checkAndLockInitiativeOrder()
                setTimeout(() => gmPeer.broadcastStateSync(), 50)
              }
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
        <h2 className="mb-3 font-semibold">{t('gm.dangerLevel')}</h2>
        <div className="flex gap-2">
          {(['safe', 'unsafe', 'risky', 'deadly'] as const).map(level => (
            <button
              key={level}
              onClick={() => useSessionStore.getState().setDangerLevel(level)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                session.dangerLevel === level
                  ? level === 'deadly' ? 'bg-red-500 text-white' :
                    level === 'risky' ? 'bg-amber-500 text-white' :
                    level === 'unsafe' ? 'bg-blue-500 text-white' :
                    'bg-green-600 text-white'
                  : 'border border-border hover:bg-accent'
              }`}
            >
              {t(`gm.${level}`)}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {session.dangerLevel === 'safe' && t('gm.dangerSafe')}
          {session.dangerLevel === 'unsafe' && t('gm.dangerUnsafe')}
          {session.dangerLevel === 'risky' && t('gm.dangerRisky')}
          {session.dangerLevel === 'deadly' && t('gm.dangerDeadly')}
        </p>
      </div>


    </main>
  )
}

function GMChatInput({ onSend }: { onSend: (content: string) => void }) {
  const { t } = useLocale()
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
        placeholder={t('chat.typeMessage')}
        className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
      />
      <button type="submit" className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
        {t('common.send')}
      </button>
    </form>
  )
}

