import type { DangerLevel } from './reference.ts';
import type { StoreType } from './stores.ts';

export interface AIConfig {
  apiKey: string; // stored only in GM's localStorage, NEVER shared
  model: string; // 'gpt-4o', 'gpt-4o-mini', etc.
  temperature: number; // 0.0 - 2.0, default 0.8
  maxTokens: number; // default 1000
  customSystemPrompt?: string;
}

export type AIPurpose =
  | 'encounter_description'
  | 'npc_dialogue'
  | 'adventure_hook'
  | 'ruling_help'
  | 'treasure_description'
  | 'store_generation'
  | 'room_description'
  | 'trap_description'
  | 'general';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface AIConversation {
  id: string;
  title: string;
  createdAt: number;
  messages: AIMessage[];
  purpose: AIPurpose;
  gameContext?: AIGameContext;
}

export interface AIGameContext {
  partyLevel: number;
  partySize: number;
  partyAncestries: string[];
  partyClasses: string[];
  inCombat: boolean;
  currentLocation?: string;
  currentDangerLevel?: DangerLevel;
  isInDarkness: boolean;
  recentEvents?: string[];
}

export interface AIGenerationRequest {
  purpose: AIPurpose;
  prompt: string;
  context?: AIGameContext;
  responseFormat?: 'text' | 'json';
  storeType?: StoreType;
  monsters?: string[];
}

export interface AIGenerationResult {
  id: string;
  request: AIGenerationRequest;
  rawResponse: string;
  parsedData?: unknown;
  timestamp: number;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
}
