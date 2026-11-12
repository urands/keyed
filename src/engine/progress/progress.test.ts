import { describe, expect, it } from 'vitest';

import { DEFAULT_PARAMS } from '../params';
import type { KeyStat } from '../stats/keyStats';
import { parseCourse, stageKeys, withOptionalKeys } from './course';
import { advanceStage, evaluateStage } from './progress';

const params = { ...DEFAULT_PARAMS };
const course = parseCourse({
  layoutId: 'en-us-qwerty',
  stages: [{ id: 'letters', start: ['f', 'j'], order: ['dk', 'a', 'e'] }],
});
const stage = course.stages[0]!;

const mastered: KeyStat = { hits: 40, misses: 0, timeEma: 200, accEma: 1, bestConfidence: 1 };
const learning: KeyStat = { hits: 10, misses: 2, timeEma: 500, accEma: 0.8, bestConfidence: 0 };

describe('parseCourse', () => {
  it('splits order strings into groups of keys', () => {
    expect(stage.order).toEqual([['d', 'k'], ['a'], ['e']]);
    expect(stageKeys(stage)).toEqual(['f', 'j', 'd', 'k', 'a', 'e']);
  });

  it('rejects repeated keys and unknown layouts', () => {
    expect(() =>
      parseCourse({ layoutId: 'en-us-qwerty', stages: [{ id: 's', start: ['f'], order: ['ff'] }] }),
    ).toThrow(/repeats/);
    expect(() => parseCourse({ layoutId: 'dvorak', stages: [] })).toThrow(/layout/);
  });

  it('rejects a key repeated in another stage, and repeated stage ids', () => {
    expect(() =>
      parseCourse({
        layoutId: 'en-us-qwerty',
        stages: [
          { id: 'a', start: ['f'], order: [] },
          { id: 'b', start: ['f'], order: [] },
        ],
      }),
    ).toThrow(/repeats/);
    expect(() =>
      parseCourse({
        layoutId: 'en-us-qwerty',
        stages: [
          { id: 'a', start: ['f'], order: [] },
          { id: 'a', start: ['j'], order: [] },
        ],
      }),
    ).toThrow(/ids repeat/);
  });

  it('reads stage kinds; only free practice may have no start keys', () => {
    const parsed = parseCourse({
      layoutId: 'en-us-qwerty',
      stages: [
        { id: 'letters', start: ['f'], order: [] },
        { id: 'free', kind: 'free', start: [], order: [] },
      ],
    });
    expect(parsed.stages.map((s) => s.kind)).toEqual(['letters', 'free']);
    expect(() =>
      parseCourse({ layoutId: 'en-us-qwerty', stages: [{ id: 'x', start: [], order: [] }] }),
    ).toThrow(/must not be empty/);
    expect(() =>
      parseCourse({
        layoutId: 'en-us-qwerty',
        stages: [{ id: 'x', kind: 'symbols', start: ['f'], order: [] }],
      }),
    ).toThrow(/unknown kind/);
  });
});

describe('withOptionalKeys', () => {
  const withYo = parseCourse({
    layoutId: 'ru-jcuken',
    stages: [{ id: 'letters', start: ['а'], order: ['о', 'ё', 'еж'], optional: ['ё'] }],
  });

  it('drops optional keys that are off, with groups left empty', () => {
    const plain = withOptionalKeys(withYo, new Set());
    expect(plain.stages[0]?.order).toEqual([['о'], ['е', 'ж']]);
  });

  it('keeps optional keys that are on', () => {
    expect(withOptionalKeys(withYo, new Set(['ё']))).toEqual(withYo);
  });
});

describe('evaluateStage', () => {
  it('opens the start keys first', () => {
    const progress = evaluateStage(stage, 0, {}, params);
    expect(progress.open).toEqual(['f', 'j']);
    expect(progress.closed).toEqual(['d', 'k', 'a', 'e']);
    expect(progress.next).toEqual(['d', 'k']);
    expect(progress.blockers).toEqual(['f', 'j']);
  });

  it('makes the weakest open key the focus', () => {
    const progress = evaluateStage(
      stage,
      1,
      { f: mastered, j: learning, d: mastered, k: mastered },
      params,
    );
    expect(progress.focus).toBe('j');
  });

  it('makes a fast key without enough hits the focus, not a mastered one', () => {
    // "a" is as fast as a mastered key, but has too few hits to be mastered.
    const fastButNew: KeyStat = { ...mastered, hits: 5, bestConfidence: 0 };
    const progress = evaluateStage(
      stage,
      2,
      { f: mastered, j: mastered, d: mastered, k: mastered, a: fastButNew },
      params,
    );
    expect(progress.blockers).toEqual(['a']);
    expect(progress.focus).toBe('a');
  });

  it('gives keys with Shift more time', () => {
    const capitals = parseCourse({
      layoutId: 'en-us-qwerty',
      stages: [{ id: 'capitals', kind: 'capitals', start: ['F'], order: [] }],
    }).stages[0]!;
    // 400 ms is slower than the target of 343 ms, within 343 × 1.25.
    const stats = { F: { ...mastered, timeEma: 400 } };
    expect(evaluateStage(capitals, 0, stats, params, true).complete).toBe(false);
    const allowance = (key: string) => (key === 'F' ? params.shiftAllowance : 1);
    expect(evaluateStage(capitals, 0, stats, params, true, allowance).complete).toBe(true);
  });

  it('prefers the key opened last when confidences are equal', () => {
    expect(
      evaluateStage(stage, 2, { f: mastered, j: mastered, d: mastered, k: mastered }, params).focus,
    ).toBe('a');
  });

  it('is complete when every key is open and mastered', () => {
    const all = Object.fromEntries(stageKeys(stage).map((key) => [key, mastered]));
    const progress = evaluateStage(stage, 3, all, params);
    expect(progress.next).toBeNull();
    expect(progress.complete).toBe(true);
  });
});

describe('advanceStage', () => {
  it('opens the next group when all open keys are mastered', () => {
    expect(advanceStage(stage, 0, { f: mastered, j: mastered }, params)).toBe(1);
  });

  it('waits while any open key is not mastered', () => {
    expect(advanceStage(stage, 0, { f: mastered, j: learning }, params)).toBe(0);
  });

  it('opens one group at a time and stops at the end', () => {
    const all = Object.fromEntries(stageKeys(stage).map((key) => [key, mastered]));
    expect(advanceStage(stage, 1, all, params)).toBe(2);
    expect(advanceStage(stage, 3, all, params)).toBe(3);
  });

  it('respects strict mode', () => {
    const slowedDown: KeyStat = { ...mastered, timeEma: 900 };
    expect(advanceStage(stage, 0, { f: mastered, j: slowedDown }, params)).toBe(1);
    expect(advanceStage(stage, 0, { f: mastered, j: slowedDown }, params, true)).toBe(0);
  });
});
