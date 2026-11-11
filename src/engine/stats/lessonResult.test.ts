import { describe, expect, it } from 'vitest';

import {
  createLesson,
  pauseLesson,
  pressKey,
  resumeLesson,
  type LessonState,
} from '../session/lesson';
import { keyCpm, liveMetrics, summarizeLesson } from './lessonResult';

function play(text: string, presses: [string, number][]): LessonState {
  return presses.reduce((state, [char, time]) => pressKey(state, char, time), createLesson(text));
}

describe('summarizeLesson', () => {
  // "ab a": a mistake on "b" ("x" typed instead), one second of typing in total.
  const lesson = play('ab a', [
    ['a', 0],
    ['x', 100],
    ['b', 300],
    [' ', 500],
    ['a', 1000],
  ]);
  const result = summarizeLesson(lesson);

  it('counts speed over the active time', () => {
    expect(result.length).toBe(4);
    expect(result.durationMs).toBe(1000);
    expect(result.cpm).toBe(240);
    expect(result.wpm).toBe(48);
  });

  it('counts accuracy as characters right on the first try', () => {
    expect(result.errors).toBe(1);
    expect(result.accuracy).toBe(0.75);
  });

  it('collects statistics per key', () => {
    expect(result.keys).toEqual({
      a: { hits: 2, misses: 0, timeSum: 500, timeCount: 1, typos: {} },
      b: { hits: 0, misses: 1, timeSum: 0, timeCount: 0, typos: { x: 1 } },
      ' ': { hits: 1, misses: 0, timeSum: 200, timeCount: 1, typos: {} },
    });
  });

  it('leaves pauses out of the duration', () => {
    let paused = play('abc', [['a', 0]]);
    paused = resumeLesson(pauseLesson(paused));
    paused = pressKey(paused, 'b', 30_000);
    paused = pressKey(paused, 'c', 30_500);
    expect(summarizeLesson(paused).durationMs).toBe(500);
  });
});

describe('keyCpm', () => {
  it('turns the average press time into characters per minute', () => {
    expect(keyCpm({ hits: 2, misses: 0, timeSum: 600, timeCount: 2, typos: {} })).toBe(200);
  });

  it('returns null without timed presses', () => {
    expect(keyCpm({ hits: 1, misses: 0, timeSum: 0, timeCount: 0, typos: {} })).toBeNull();
  });
});

describe('liveMetrics', () => {
  it('has no speed or accuracy before typing starts', () => {
    expect(liveMetrics(createLesson('ab'))).toEqual({ typed: 0, cpm: null, accuracy: null });
  });

  it('does not count a mistake on the current character until it is typed', () => {
    const lesson = play('abc', [
      ['a', 0],
      ['x', 250],
    ]);
    expect(liveMetrics(lesson)).toEqual({ typed: 1, cpm: 240, accuracy: 1 });

    const corrected = pressKey(lesson, 'b', 500);
    expect(liveMetrics(corrected)).toEqual({ typed: 2, cpm: 240, accuracy: 0.5 });
  });
});
