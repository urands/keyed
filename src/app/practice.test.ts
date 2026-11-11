import { beforeEach, describe, expect, it } from 'vitest';

import type { KeyStat } from '../engine/stats/keyStats';
import { kitFor } from './layouts';
import { usePractice } from './practice';
import { useSettings } from './settings';
import { getStorage, openStorage } from './storage';

const mastered: KeyStat = { hits: 40, misses: 0, timeEma: 200, accEma: 1, bestConfidence: 1 };
const slowedDown: KeyStat = { ...mastered, timeEma: 900 };
const EN = 'en-us-qwerty';
const RU = 'ru-jcuken';

/** Types `text` with a steady 200 ms between keys. */
function typeText(text: string) {
  let time = 1000;
  for (const char of text) {
    usePractice.getState().press({ char, code: 'KeyX', time });
    time += 200;
  }
}

beforeEach(async () => {
  localStorage.clear();
  await openStorage(); // fresh storage for each test
  useSettings.setState({ layout: EN, strictMode: false });
  usePractice.setState({ cache: {} });
  usePractice.getState().restore(EN, { keyStats: {}, opened: {} });
});

describe('practice store', () => {
  it('introduces the start keys to a new learner', () => {
    expect(usePractice.getState().introduce).toEqual(['f', 'j']);
    expect(usePractice.getState().progress.open).toEqual(['f', 'j']);
  });

  it('builds the first lessons from the start keys only', () => {
    expect(usePractice.getState().lesson.text).toMatch(/^[fj]+( [fj]+)*$/);
  });

  it('does not introduce anything to a returning learner', () => {
    usePractice.getState().restore(EN, { keyStats: { f: mastered }, opened: { letters: 2 } });
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

    const saved = await getStorage().loadProgress(EN);
    expect(saved.keyStats.f).toEqual(state.keyStats.f);
    expect((await getStorage().listLessons(EN, 1))[0]?.length).toBe(5);
  });

  it('opens the next keys when every open key is mastered, and introduces them', async () => {
    usePractice.getState().restore(EN, { keyStats: { f: mastered, j: mastered }, opened: {} });
    usePractice.getState().startLesson('fj');
    typeText('fj');

    const state = usePractice.getState();
    expect(state.unlocked).toEqual(['d', 'k']);
    expect(state.introduce).toEqual(['d', 'k']);
    expect(state.progress.open).toEqual(['f', 'j', 'd', 'k']);
    expect((await getStorage().loadProgress(EN)).opened).toEqual({ letters: 1 });

    usePractice.getState().startLesson();
    expect(usePractice.getState().lesson.text).toMatch(/^[fjdk]+( [fjdk]+)*$/);
  });

  it('keeps the keys closed while an open key is not mastered', () => {
    usePractice.getState().restore(EN, { keyStats: { f: mastered }, opened: {} });
    usePractice.getState().startLesson('fj');
    typeText('fj');
    expect(usePractice.getState().unlocked).toEqual([]);
    expect(usePractice.getState().opened).toBe(0);
  });

  it('re-evaluates progress when strict mode changes', () => {
    usePractice.getState().restore(EN, { keyStats: { f: mastered, j: slowedDown }, opened: {} });
    expect(usePractice.getState().progress.mastered.has('j')).toBe(true);

    useSettings.getState().update({ strictMode: true });
    expect(usePractice.getState().progress.mastered.has('j')).toBe(false);
  });
});

describe('layouts', () => {
  it('keeps the progress of each layout separate', async () => {
    usePractice.getState().startLesson('fj');
    typeText('fj');

    await usePractice.getState().switchLayout(RU);
    let state = usePractice.getState();
    expect(state.layoutId).toBe(RU);
    expect(useSettings.getState().layout).toBe(RU);
    expect(state.keyStats).toEqual({});
    expect(state.introduce).toEqual(kitFor(RU).stage.start);
    expect(state.lesson.text).toMatch(/^[ао]+( [ао]+)*$/);

    usePractice.getState().startLesson('ао');
    typeText('ао');
    expect(usePractice.getState().keyStats.а?.hits).toBe(1);

    await usePractice.getState().switchLayout(EN);
    state = usePractice.getState();
    expect(state.keyStats.f?.hits).toBe(1);
    expect(state.keyStats.а).toBeUndefined();

    expect((await getStorage().loadProgress(RU)).keyStats.а?.hits).toBe(1);
    expect((await getStorage().loadProgress(EN)).keyStats.а).toBeUndefined();
  });

  it('loads a layout from storage the first time it is used', async () => {
    await getStorage().saveLesson(
      {
        layoutId: RU,
        stage: 'letters',
        startedAt: 0,
        durationMs: 1000,
        length: 1,
        errors: 0,
        cpm: 60,
        accuracy: 1,
        samples: [{ char: 'а', typos: [], time: null }],
      },
      { а: mastered },
      2,
    );
    await usePractice.getState().switchLayout(RU);
    expect(usePractice.getState().progress.open).toEqual(['а', 'о', 'в', 'л', 'ы', 'д']);
  });
});

describe('wrong system layout', () => {
  it('shows a hint instead of a mistake for a character from another layout', () => {
    usePractice.getState().restore(RU, { keyStats: {}, opened: {} });
    usePractice.getState().startLesson('ао');

    usePractice.getState().press({ char: 'f', code: 'KeyF', time: 1000 });
    let state = usePractice.getState();
    expect(state.wrongLayout).toBe(true);
    expect(state.lesson.mistakes).toBe(0);
    expect(state.lesson.status).toBe('ready');

    usePractice.getState().press({ char: 'а', code: 'KeyF', time: 1200 });
    state = usePractice.getState();
    expect(state.wrongLayout).toBe(false);
    expect(state.lesson.position).toBe(1);
  });
});
