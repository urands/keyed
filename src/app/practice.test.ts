import { beforeEach, describe, expect, it } from 'vitest';

import type { KeyStat } from '../engine/stats/keyStats';
import { practiceLayout, practiceStage, usePractice } from './practice';
import { getStorage } from './storage';

const mastered: KeyStat = { hits: 40, misses: 0, timeEma: 200, accEma: 1, bestConfidence: 1 };

/** Types `text` with a steady 200 ms between keys. */
function typeText(text: string) {
  let time = 1000;
  for (const char of text) {
    usePractice.getState().press({ char, code: 'KeyX', time });
    time += 200;
  }
}

describe('practice store', () => {
  beforeEach(() => {
    usePractice.getState().restore({ keyStats: {}, opened: {} });
  });

  it('introduces the start keys to a new learner', () => {
    expect(usePractice.getState().introduce).toEqual(practiceStage.start);
    expect(usePractice.getState().progress.open).toEqual(['f', 'j']);
  });

  it('builds the first lessons from the start keys only', () => {
    expect(usePractice.getState().lesson.text).toMatch(/^[fj]+( [fj]+)*$/);
  });

  it('does not introduce anything to a returning learner', () => {
    usePractice.getState().restore({ keyStats: { f: mastered }, opened: { letters: 2 } });
    const state = usePractice.getState();
    expect(state.introduce).toEqual([]);
    expect(state.progress.open).toEqual(['f', 'j', 'd', 'k', 's', 'l']);
  });

  it('updates key statistics and saves the lesson when it ends', async () => {
    usePractice.getState().startLesson('fj jf');
    typeText('fj jf');

    const state = usePractice.getState();
    expect(state.result?.length).toBe(5);
    expect(state.keyStats.f?.hits).toBe(2);
    expect(state.keyStats[' ']?.hits).toBe(1);

    const saved = await getStorage().loadProgress(practiceLayout.id);
    expect(saved.keyStats.f).toEqual(state.keyStats.f);
    const history = await getStorage().listLessons(practiceLayout.id, 1);
    expect(history[0]?.length).toBe(5);
  });

  it('opens the next keys when every open key is mastered, and introduces them', async () => {
    usePractice.getState().restore({ keyStats: { f: mastered, j: mastered }, opened: {} });
    usePractice.getState().startLesson('fj');
    typeText('fj');

    const state = usePractice.getState();
    expect(state.unlocked).toEqual(['d', 'k']);
    expect(state.introduce).toEqual(['d', 'k']);
    expect(state.progress.open).toEqual(['f', 'j', 'd', 'k']);
    expect((await getStorage().loadProgress(practiceLayout.id)).opened).toEqual({ letters: 1 });

    usePractice.getState().startLesson();
    expect(usePractice.getState().lesson.text).toMatch(/^[fjdk]+( [fjdk]+)*$/);
  });

  it('keeps the keys closed while an open key is not mastered', () => {
    usePractice.getState().restore({ keyStats: { f: mastered }, opened: {} });
    usePractice.getState().startLesson('fj');
    typeText('fj');
    expect(usePractice.getState().unlocked).toEqual([]);
    expect(usePractice.getState().opened).toBe(0);
  });
});
