import { describe, expect, it } from 'vitest';

import { DEFAULT_PARAMS } from '../params';
import type { KeyStat } from '../stats/keyStats';
import { parseCourse } from './course';
import { courseState } from './courseState';

const params = { ...DEFAULT_PARAMS };
const course = parseCourse({
  layoutId: 'en-us-qwerty',
  stages: [
    { id: 'letters', start: ['f', 'j'], order: ['a'] },
    { id: 'capitals', kind: 'capitals', start: ['F'], order: ['J'] },
    { id: 'free', kind: 'free', start: [], order: [] },
  ],
});

const mastered: KeyStat = { hits: 40, misses: 0, timeEma: 200, accEma: 1, bestConfidence: 1 };
const slow: KeyStat = { hits: 40, misses: 0, timeEma: 900, accEma: 1, bestConfidence: 1 };
const all = (keys: string, stat = mastered) =>
  Object.fromEntries([...keys].map((key) => [key, stat]));

describe('courseState', () => {
  it('starts with the first stage', () => {
    const state = courseState(course, {}, {}, params);
    expect(state.stage.id).toBe('letters');
    expect(state.stageIndex).toBe(0);
    expect(state.completed).toEqual([]);
    expect([...state.open]).toEqual(['f', 'j']);
  });

  it('moves to the next stage once every key of a stage is open and mastered', () => {
    const state = courseState(course, { letters: 1 }, all('fja'), params);
    expect(state.stage.id).toBe('capitals');
    expect(state.completed).toEqual(['letters']);
    expect([...state.open]).toEqual(['f', 'j', 'a', 'F']);
    expect(state.progress.focus).toBe('F');
  });

  it('stays in a stage while its last group is not open', () => {
    expect(courseState(course, { letters: 0 }, all('fja'), params).stage.id).toBe('letters');
  });

  it('ends in free practice with every key of the course, the weakest as the focus', () => {
    const stats = { ...all('fjaFJ'), a: { ...mastered, timeEma: 500 } };
    const state = courseState(course, { letters: 1, capitals: 1 }, stats, params);
    expect(state.stage.kind).toBe('free');
    expect(state.completed).toEqual(['letters', 'capitals']);
    expect(state.progress.open).toEqual(['f', 'j', 'a', 'F', 'J']);
    expect(state.progress.focus).toBe('a');
    expect(state.progress.complete).toBe(true);
  });

  it('keeps a completed stage completed when keys slow down, outside strict mode', () => {
    const stats = all('fjaFJ', slow);
    expect(courseState(course, { letters: 1, capitals: 1 }, stats, params).stage.kind).toBe('free');
    // Strict mode asks for the current confidence, but a stage passed stays passed.
    const strict = courseState(course, { letters: 1, capitals: 1 }, stats, params, true);
    expect(strict.stage.kind).toBe('free');
    expect(strict.progress.mastered.size).toBe(0);
  });
});
