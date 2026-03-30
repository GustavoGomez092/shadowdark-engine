import type { Character, Ancestry, CharacterClass } from './character.ts';
import type { ActiveCondition } from './character.ts';
import type { DiceRollResult } from './dice.ts';
import type { DangerLevel, RangeCategory } from './reference.ts';
import type { MonsterInstance } from './monsters.ts';
import type { CombatState } from './combat.ts';
import type { LightState } from './light.ts';
import type { RandomEncounter } from './encounters.ts';
import type { GameStore, StoreItem } from './stores.ts';
import type { AIConversation } from './ai.ts';
import type { Alignment } from './reference.ts';

export const SCHEMA_VERSION = 1;

export interface RoomConfig {
  id: string; // also the PeerJS peer ID / room code
  name: string;
  password?: string; // hashed
  createdAt: number;
  gmPeerId: string;
  maxPlayers: number; // default 6
}

export interface ConnectedPlayer {
  peerId: string;
  displayName: string;
  characterId?: string;
  isConnected: boolean;
  lastSeen: number;
  joinedAt: number;
}

// THE MASTER STATE — lives in GM's localStorage
export interface SessionState {
  schemaVersion: number;
  room: RoomConfig;
  characters: Record<string, Character>;
  players: Record<string, ConnectedPlayer>;
  activeMonsters: Record<string, MonsterInstance>;
  combat: CombatState | null;
  light: LightState;
  dangerLevel: DangerLevel;
  crawlingRoundsSinceCheck: number;
  activeTurnId: string | null; // ID of monster or character whose turn it is
  activeEncounters: RandomEncounter[];
  stores: GameStore[];
  chatLog: ChatMessage[];
  rollHistory: DiceRollResult[];
  gmNotes: string; // private, never sent to players
  aiConversations: AIConversation[]; // private, never sent to players
  settings: GameSettings;
  meta: SessionMeta;
}

export interface GameSettings {
  torchDurationMinutes: number;    // default 60 (1 hour real time)
  lanternDurationMinutes: number;  // default 60
  campfireDurationMinutes: number; // default 480 (8 hours)
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  torchDurationMinutes: 60,
  lanternDurationMinutes: 60,
  campfireDurationMinutes: 480,
}

export interface SessionMeta {
  lastSavedAt: number;
  totalPlayTimeMs: number;
  sessionNumber: number;
  campaignName?: string;
}

// FILTERED STATE — sent to each player
export interface PlayerVisibleState {
  room: { id: string; name: string };
  myCharacter: Character | null;
  otherCharacters: PublicCharacterInfo[];
  combat: CombatState | null;
  light: LightState;
  activeTurnId: string | null;
  visibleMonsters: PublicMonsterInfo[];
  chatLog: ChatMessage[];
  recentRolls: DiceRollResult[];
  activeStore?: PublicStoreInfo;
}

export type HpStatus = 'healthy' | 'wounded' | 'critical' | 'dying' | 'dead';

export interface PublicCharacterInfo {
  id: string;
  name: string;
  ancestry: Ancestry;
  class: CharacterClass;
  level: number;
  alignment: Alignment;
  hpStatus: HpStatus;
  currentHp?: number; // only if GM enables sharing exact HP
  maxHp?: number;
  isDying: boolean;
  hasDeathTimer: boolean; // true = actively dying with timer ticking
  conditions: ActiveCondition[];
  isInCombat: boolean;
}

export interface PublicMonsterInfo {
  id: string;
  name: string;
  hpStatus: HpStatus;
  conditions: ActiveCondition[];
  rangeBand?: RangeCategory;
}

export interface PublicStoreInfo {
  id: string;
  name: string;
  description: string;
  items: StoreItem[];
}

export type ChatMessageType = 'chat' | 'roll' | 'system' | 'whisper' | 'action' | 'ai_response';

export interface ChatMessage {
  id: string;
  senderId: string; // peerId or 'gm' or 'system'
  senderName: string;
  type: ChatMessageType;
  content: string;
  timestamp: number;
  whisperTo?: string; // target peerId for whispers
  rollResult?: DiceRollResult;
  isPublic: boolean;
}

// HP Status helper
export function getHpStatus(current: number, max: number, isDying: boolean): HpStatus {
  if (isDying) return 'dying';
  if (current <= 0) return 'dead';
  if (current >= max * 0.75) return 'healthy';
  if (current >= max * 0.25) return 'wounded';
  return 'critical';
}
