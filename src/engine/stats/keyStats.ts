import type { LearningParams } from '../params';

/** Long-term statistics of one key (docs/learning-method.md, "Статистика клавиш и уверенность"). */
export interface KeyStat {
  /** Correct presses on the first try. */
  hits: number;
  /** Positions with at least one wrong press. */
  misses: number;
  /** Smoothed press time, ms; null before the first timed press. */
  timeEma: number | null;
  /** Smoothed accuracy, 0–1; null before the first press. */
  accEma: number | null;
  /** Best confidence reached once the key had enough hits. */
  bestConfidence: number;
}

/** One typed position of a lesson, in typing order. */
export interface KeySample {
  char: string;
  /** Wrong characters typed at this position. */
  typos: readonly string[];
  /** Press time, ms; null when not measured. */
  time: number | null;
}

type ConfidenceParams = Pick<LearningParams, 'targetCpm' | 'accuracyThreshold'>;
type MasteryParams = ConfidenceParams & Pick<LearningParams, 'minHitsToMaster'>;
type UpdateParams = MasteryParams & Pick<LearningParams, 'timeAlpha' | 'accuracyAlpha'>;

export const EMPTY_KEY_STAT: Readonly<KeyStat> = {
  hits: 0,
  misses: 0,
  timeEma: null,
  accEma: null,
  bestConfidence: 0,
};

/** `ema + α × (sample − ema)`; the first sample sets the starting value. */
function ema(current: number | null, sample: number, alpha: number): number {
  return current === null ? sample : current + alpha * (sample - current);
}

/**
 * How many times the target time a key may take: more than 1 for keys typed
 * with Shift, whose time includes the Shift press (docs/learning-method.md,
 * "Статистика клавиш и уверенность").
 */
export type TimeAllowance = (key: string) => number;

export const NO_ALLOWANCE: TimeAllowance = () => 1;

/**
 * How close a key is to the target speed and accuracy, 0–1:
 * min(1, target time × allowance / time) × min(1, accuracy / threshold).
 */
export function keyConfidence(
  stat: KeyStat | undefined,
  params: ConfidenceParams,
  allowance = 1,
): number {
  if (!stat || stat.timeEma === null || stat.accEma === null) return 0;
  const targetTime = (60000 / params.targetCpm) * allowance;
  const speedScore = Math.min(1, targetTime / stat.timeEma);
  const accuracyScore = Math.min(1, stat.accEma / params.accuracyThreshold);
  return speedScore * accuracyScore;
}

/**
 * A key is mastered at full confidence with enough hits. Outside strict mode a
 * key mastered once stays mastered, even if its confidence drops later.
 */
export function isKeyMastered(
  stat: KeyStat | undefined,
  params: MasteryParams,
  strict = false,
  allowance = 1,
): boolean {
  if (!stat || stat.hits < params.minHitsToMaster) return false;
  const confidence = strict ? keyConfidence(stat, params, allowance) : stat.bestConfidence;
  return confidence >= 1;
}

/** Adds a lesson's samples to the key statistics, in typing order. Returns new statistics. */
export function applySamples(
  stats: Readonly<Record<string, KeyStat>>,
  samples: readonly KeySample[],
  params: UpdateParams,
  allowance: TimeAllowance = NO_ALLOWANCE,
): Record<string, KeyStat> {
  const next: Record<string, KeyStat> = { ...stats };
  for (const { char, typos, time } of samples) {
    const stat = { ...(next[char] ?? EMPTY_KEY_STAT) };
    if (typos.length > 0) {
      stat.misses += 1;
      stat.accEma = ema(stat.accEma, 0, params.accuracyAlpha);
    } else {
      stat.hits += 1;
      stat.accEma = ema(stat.accEma, 1, params.accuracyAlpha);
      if (time !== null) stat.timeEma = ema(stat.timeEma, time, params.timeAlpha);
    }
    // Early lucky presses must not count: best confidence is kept only with enough hits.
    if (stat.hits >= params.minHitsToMaster) {
      stat.bestConfidence = Math.max(
        stat.bestConfidence,
        keyConfidence(stat, params, allowance(char)),
      );
    }
    next[char] = stat;
  }
  return next;
}
