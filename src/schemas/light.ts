import type { RangeCategory } from './reference.ts';

export type LightSourceType = 'torch' | 'lantern' | 'light_spell' | 'campfire' | 'other';

export interface LightTimer {
  id: string;
  type: LightSourceType;
  carrierId: string; // character ID or 'environment'
  range: RangeCategory | 'double_near'; // 'near' for torch/spell, 'double_near' for lantern
  startedAt: number; // real-world ms timestamp
  durationMs: number; // 3,600,000 ms = 1 hour for standard sources
  pausedAt?: number; // timestamp when paused
  accumulatedPauseMs: number;
  isActive: boolean;
  isExpired: boolean;
  parentTimerId?: string; // "ride along" mechanic
  maxDurationMs?: number; // campfire: up to 8 hours
}

export interface LightState {
  timers: LightTimer[];
  isInDarkness: boolean; // computed: no active timers providing light
  isPaused: boolean;
  pausedAt?: number;
}

export interface GameTimeState {
  sessionStartedAt: number;
  totalPauseMs: number;
  // Elapsed = Date.now() - sessionStartedAt - totalPauseMs
}

// Light source constants
export const LIGHT_DURATIONS: Record<LightSourceType, number> = {
  torch: 3_600_000, // 1 hour
  lantern: 3_600_000, // 1 hour (per oil flask)
  light_spell: 3_600_000, // 1 hour
  campfire: 28_800_000, // 8 hours max
  other: 3_600_000,
};

export const LIGHT_RANGES: Record<LightSourceType, RangeCategory | 'double_near'> = {
  torch: 'near',
  lantern: 'double_near',
  light_spell: 'near',
  campfire: 'near',
  other: 'near',
};
