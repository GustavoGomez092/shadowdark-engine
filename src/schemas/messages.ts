import type { DiceRollResult } from './dice.ts';
import type { PlayerVisibleState, PublicMonsterInfo, PublicStoreInfo } from './session.ts';
import type { CombatState } from './combat.ts';
import type { LightState } from './light.ts';
import type { RangeCategory } from './reference.ts';
import type { PlayerMapViewState } from './map-viewer.ts';

// ============ Envelope ============

export interface P2PMessageEnvelope {
  id: string;
  timestamp: number;
  senderId: string;
  type: string;
  payload: PlayerToGMMessage | GMToPlayerMessage;
  seq: number;
  authToken?: string;
}

// ============ Player → GM ============

export type PlayerToGMMessage =
  | JoinRoomRequest
  | PlayerChatMessage
  | PlayerRollRequest
  | PlayerAttackRequest
  | PlayerSpellCastRequest
  | PlayerMoveRequest
  | PlayerInventoryAction
  | PlayerEndTurnAction
  | PlayerRestRequest
  | PlayerLuckTokenUse
  | PlayerShopAction
  | PlayerCharacterUpdate
  | PlayerLevelUp
  | PlayerCreateCharacter
  | PlayerStabilizeAction
  | PlayerDeathTimerRoll
  | PlayerPing;

export interface JoinRoomRequest {
  type: 'join_room';
  displayName: string;
  password?: string;
  existingCharacterId?: string;
}

export interface PlayerChatMessage {
  type: 'player_chat';
  content: string;
  isAction: boolean;
  whisperTo?: string;
}

export interface PlayerRollRequest {
  type: 'player_roll';
  expression: string;
  total: number;
  isNat20: boolean;
  isNat1: boolean;
  purpose?: string;
  isPublic: boolean;
}

export interface PlayerAttackRequest {
  type: 'player_attack';
  attackerId: string;
  targetId: string;
  weaponId: string;
  attackType: 'melee' | 'ranged';
}

export interface PlayerSpellCastRequest {
  type: 'player_spell_cast';
  casterId: string;
  spellId: string;
  targetId?: string;
  usingScroll?: boolean;
  usingWand?: boolean;
  scrollItemId?: string;
  wandItemId?: string;
}

export interface PlayerMoveRequest {
  type: 'player_move';
  characterId: string;
  direction: 'closer' | 'further';
  isDoubleMove: boolean;
}

export interface PlayerInventoryAction {
  type: 'player_inventory';
  characterId: string;
  action: InventoryActionType;
}

export type InventoryActionType =
  | { type: 'equip'; itemId: string }
  | { type: 'unequip'; itemId: string }
  | { type: 'drop'; itemId: string; quantity?: number }
  | { type: 'use'; itemId: string }
  | { type: 'light'; itemId: string }
  | { type: 'light_lantern'; lanternId: string; oilId: string }
  | { type: 'light_campfire'; torchIds: string[] }
  | { type: 'extinguish'; itemId: string };

export interface PlayerEndTurnAction {
  type: 'player_end_turn';
  characterId: string;
}

export interface PlayerRestRequest {
  type: 'player_rest';
  characterId: string;
  useRation: boolean;
}

export interface PlayerLuckTokenUse {
  type: 'player_luck_token';
  characterId: string;
  rerollMessageId: string;
}

export interface PlayerShopAction {
  type: 'player_shop';
  characterId: string;
  action: 'buy' | 'sell';
  storeId: string;
  itemId: string;
  quantity: number;
}

export interface PlayerCharacterUpdate {
  type: 'player_character_update';
  characterId: string;
  updates: { notes?: string };
}

export interface PlayerLevelUp {
  type: 'player_level_up';
  characterId: string;
  hpRoll: number;
  talent?: import('@/schemas/character.ts').AppliedTalent;
  newSpellIds?: string[];
}

export interface PlayerCreateCharacter {
  type: 'player_create_character';
  character: import('@/schemas/character.ts').Character;
}

export interface PlayerStabilizeAction {
  type: 'player_stabilize';
  characterId: string; // the character attempting to stabilize
  targetId: string;    // the dying character to stabilize
  roll: number;        // the d20 result
  intMod: number;      // INT modifier
  total: number;       // roll + intMod
  success: boolean;    // total >= 15
}

export interface PlayerDeathTimerRoll {
  type: 'player_death_timer_roll';
  characterId: string;
  roll: number;        // the d4 result
  totalRounds: number; // roll + CON mod (min 1)
}

export interface PlayerPing {
  type: 'player_ping';
  sentAt: number;
}

// ============ GM → Player ============

export type GMToPlayerMessage =
  | JoinRoomResponse
  | StateSyncMessage
  | StatePatchMessage
  | GMChatMessage
  | RollResultBroadcast
  | CombatUpdateMessage
  | LightUpdateMessage
  | EncounterRevealMessage
  | StoreOpenMessage
  | StoreCloseMessage
  | ForceDisconnectMessage
  | RoomCodeChangedMessage
  | PongMessage
  | ErrorMessage
  | MapSyncMessage
  | TokenMoveMessage;

export interface JoinRoomResponse {
  type: 'join_room_response';
  success: boolean;
  error?: 'wrong_password' | 'room_full' | 'name_taken' | 'banned';
  initialState?: PlayerVisibleState;
  assignedCharacterId?: string;
}

export interface StateSyncMessage {
  type: 'state_sync';
  state: PlayerVisibleState;
  serverTime: number;
}

export interface StatePatch {
  op: 'add' | 'remove' | 'replace';
  path: string;
  value?: unknown;
}

export interface StatePatchMessage {
  type: 'state_patch';
  patches: StatePatch[];
  serverTime: number;
}

export interface GMChatMessage {
  type: 'gm_chat';
  content: string;
  isSystem: boolean;
  isAIGenerated: boolean;
}

export interface RollResultBroadcast {
  type: 'roll_result';
  roll: DiceRollResult;
  characterName: string;
  isPublic: boolean;
  context?: string;
}

export interface CombatUpdateMessage {
  type: 'combat_update';
  combat: CombatState | null;
}

export interface LightUpdateMessage {
  type: 'light_update';
  light: LightState;
}

export interface EncounterRevealMessage {
  type: 'encounter_reveal';
  encounter: {
    monsters: PublicMonsterInfo[];
    startingDistance: RangeCategory;
    activity: string;
  };
}

export interface StoreOpenMessage {
  type: 'store_open';
  store: PublicStoreInfo;
}

export interface StoreCloseMessage {
  type: 'store_close';
}

export interface ForceDisconnectMessage {
  type: 'force_disconnect';
  reason: string;
}

export interface RoomCodeChangedMessage {
  type: 'room_code_changed';
  newRoomCode: string;
}

export interface PongMessage {
  type: 'pong';
  originalSentAt: number;
  respondedAt: number;
}

export interface ErrorMessage {
  type: 'error';
  code: string;
  message: string;
  inResponseTo?: string;
}

// ── Map Viewer Messages ──

export interface MapSyncMessage {
  type: 'map_sync';
  mapView: PlayerMapViewState | null;
}

export interface TokenMoveMessage {
  type: 'token_move';
  tokenId: string;
  gridX: number;
  gridY: number;
}
