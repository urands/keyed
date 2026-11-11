import type { LayoutLanguage } from '../engine/layout/layout';

export type SpeedUnit = 'wpm' | 'cpm';

/** Russian lessons show characters per minute, English ones words per minute. */
export function defaultSpeedUnit(language: LayoutLanguage): SpeedUnit {
  return language === 'ru' ? 'cpm' : 'wpm';
}

/** Speed in the chosen unit, rounded for display. */
export function speedValue(cpm: number, unit: SpeedUnit): number {
  return Math.round(unit === 'wpm' ? cpm / 5 : cpm);
}

/** Whole percent, rounded down: 100% only for a perfect result. */
export function percentFloor(ratio: number): number {
  return Math.floor(ratio * 100 + 1e-9);
}

/** Duration as m:ss. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
