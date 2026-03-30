export function formatDuration(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function getRemainingMs(startedAt: number, durationMs: number, accumulatedPauseMs: number): number {
  const elapsed = Date.now() - startedAt - accumulatedPauseMs;
  return Math.max(0, durationMs - elapsed);
}

export function isExpired(startedAt: number, durationMs: number, accumulatedPauseMs: number): boolean {
  return getRemainingMs(startedAt, durationMs, accumulatedPauseMs) <= 0;
}
