import { describe, expect, it } from 'vitest';

import { DEFAULT_PARAMS } from '../params';
import {
  applySamples,
  isKeyMastered,
  keyConfidence,
  type KeySample,
  type KeyStat,
} from './keyStats';

const params = { ...DEFAULT_PARAMS };
const targetTime = 60000 / params.targetCpm; // ≈ 343 ms

function samples(char: string, count: number, time: number | null, typos: string[] = []) {
  return Array.from({ length: count }, (): KeySample => ({ char, typos, time }));
}

describe('applySamples', () => {
  it('starts the averages from the first sample', () => {
    const stats = applySamples({}, samples('a', 1, 300), params);
    expect(stats.a).toEqual({ hits: 1, misses: 0, timeEma: 300, accEma: 1, bestConfidence: 0 });
  });

  it('smooths time and accuracy with α = 0.1', () => {
    let stats = applySamples({}, samples('a', 1, 300), params);
    stats = applySamples(stats, samples('a', 1, 400), params);
    expect(stats.a?.timeEma).toBeCloseTo(310);
    stats = applySamples(stats, samples('a', 1, null, ['s']), params);
    expect(stats.a?.accEma).toBeCloseTo(0.9);
    expect(stats.a?.misses).toBe(1);
    expect(stats.a?.timeEma).toBeCloseTo(310);
  });

  it('does not change the statistics it was given', () => {
    const before = applySamples({}, samples('a', 1, 300), params);
    const copy = structuredClone(before);
    applySamples(before, samples('a', 5, 200), params);
    expect(before).toEqual(copy);
  });

  it('keeps best confidence only once the key has enough hits', () => {
    const early = applySamples({}, samples('a', 5, 100), params);
    expect(keyConfidence(early.a, params)).toBe(1);
    expect(early.a?.bestConfidence).toBe(0);

    const later = applySamples(early, samples('a', 30, 100), params);
    expect(later.a?.bestConfidence).toBe(1);
  });
});

describe('keyConfidence', () => {
  const stat = (timeEma: number, accEma: number): KeyStat => ({
    hits: 50,
    misses: 0,
    timeEma,
    accEma,
    bestConfidence: 0,
  });

  it('is 0 without measurements', () => {
    expect(keyConfidence(undefined, params)).toBe(0);
  });

  it('is 1 at target speed and accuracy', () => {
    expect(keyConfidence(stat(targetTime, 0.95), params)).toBeCloseTo(1);
    expect(keyConfidence(stat(200, 1), params)).toBe(1);
  });

  it('multiplies the speed and accuracy scores', () => {
    expect(keyConfidence(stat(targetTime * 2, 0.95), params)).toBeCloseTo(0.5);
    expect(keyConfidence(stat(targetTime, 0.475), params)).toBeCloseTo(0.5);
    expect(keyConfidence(stat(targetTime * 2, 0.475), params)).toBeCloseTo(0.25);
  });
});

describe('isKeyMastered', () => {
  const fast = applySamples({}, samples('a', 40, 200), params).a;

  it('needs full confidence and 30 hits', () => {
    expect(isKeyMastered(fast, params)).toBe(true);
    expect(isKeyMastered(applySamples({}, samples('a', 29, 200), params).a, params)).toBe(false);
  });

  it('keeps a key mastered after it slows down, except in strict mode', () => {
    const slower = applySamples({ a: fast as KeyStat }, samples('a', 40, 600), params).a;
    expect(keyConfidence(slower, params)).toBeLessThan(1);
    expect(isKeyMastered(slower, params)).toBe(true);
    expect(isKeyMastered(slower, params, true)).toBe(false);
  });
});
