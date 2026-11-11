import type { LessonState } from '../session/lesson';

/** Statistics of one key (character) within a lesson. */
export interface KeyResult {
  /** Positions typed correctly on the first try. */
  hits: number;
  /** Positions with at least one wrong press. */
  misses: number;
  /** Sum and number of timed presses, for the average time per press. */
  timeSum: number;
  timeCount: number;
  /** What was typed instead of this key, and how many times. */
  typos: Record<string, number>;
}

export interface LessonResult {
  /** Characters in the lesson text. */
  length: number;
  /** Typing time without pauses, ms. */
  durationMs: number;
  /** Characters with at least one wrong press. */
  errors: number;
  /** Share of characters typed correctly on the first try, 0–1. */
  accuracy: number;
  /** Characters per minute. */
  cpm: number;
  /** Words per minute: one word is five characters. */
  wpm: number;
  keys: Record<string, KeyResult>;
}

export function summarizeLesson(state: LessonState): LessonResult {
  const keys: Record<string, KeyResult> = {};
  for (const { char, typos, time } of state.chars) {
    const key = (keys[char] ??= { hits: 0, misses: 0, timeSum: 0, timeCount: 0, typos: {} });
    if (typos.length === 0) key.hits += 1;
    else key.misses += 1;
    if (time !== null) {
      key.timeSum += time;
      key.timeCount += 1;
    }
    for (const typo of typos) key.typos[typo] = (key.typos[typo] ?? 0) + 1;
  }

  const length = state.chars.length;
  const cpm = cpmOf(length, state.activeMs) ?? 0;
  return {
    length,
    durationMs: state.activeMs,
    errors: state.mistakes,
    accuracy: (length - state.mistakes) / length,
    cpm,
    wpm: cpm / 5,
    keys,
  };
}

export interface LiveMetrics {
  /** Characters typed so far. */
  typed: number;
  /** Null until there is typing time to divide by. */
  cpm: number | null;
  /** Null until the first character is typed. */
  accuracy: number | null;
}

/** Metrics of a lesson in progress, over the characters typed so far. */
export function liveMetrics(state: LessonState): LiveMetrics {
  const typed = state.position;
  const currentHasTypos = (state.chars[state.position]?.typos.length ?? 0) > 0;
  const typedMistakes = state.mistakes - (currentHasTypos ? 1 : 0);
  return {
    typed,
    cpm: cpmOf(typed, state.activeMs),
    accuracy: typed === 0 ? null : (typed - typedMistakes) / typed,
  };
}

/** Average speed of one key, characters per minute; null without timed presses. */
export function keyCpm(key: KeyResult): number | null {
  return key.timeCount === 0 || key.timeSum === 0 ? null : 60000 / (key.timeSum / key.timeCount);
}

function cpmOf(chars: number, ms: number): number | null {
  return ms > 0 ? (chars * 60000) / ms : null;
}
