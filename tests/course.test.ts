import { describe, expect, it } from 'vitest';

import { englishContent, enUsQwertyCourse } from '../src/content';
import { DEFAULT_PARAMS } from '../src/engine/params';
import { advanceStage, evaluateStage } from '../src/engine/progress/progress';
import { createRandom } from '../src/engine/random';
import { applySamples, type KeyStat } from '../src/engine/stats/keyStats';
import { buildLessonText } from '../src/engine/textgen/lessonText';
import { createTypist, STEADY_LEARNER } from './syntheticTypist';

const params = { ...DEFAULT_PARAMS };
const MAX_LESSONS = 800;

/** Runs the English letters stage with a synthetic learner until it is complete. */
function runCourse(seed: number) {
  const stage = enUsQwertyCourse.stages[0]!;
  const random = createRandom(seed);
  const typist = createTypist(STEADY_LEARNER, random);
  let stats: Record<string, KeyStat> = {};
  let opened = 0;
  const openedAt: number[] = [];
  const texts: { text: string; open: readonly string[]; focus: string | null }[] = [];

  for (let lesson = 1; lesson <= MAX_LESSONS; lesson += 1) {
    const progress = evaluateStage(stage, opened, stats, params);
    if (progress.complete) return { lessons: lesson - 1, openedAt, texts, complete: true };

    const text = buildLessonText({
      ...englishContent,
      letters: new Set(progress.open),
      focus: progress.focus,
      random,
      params,
    });
    texts.push({ text, open: progress.open, focus: progress.focus });

    const typed = typist.type(text);
    stats = applySamples(stats, typed.chars, params);
    const next = advanceStage(stage, opened, stats, params);
    if (next > opened) openedAt.push(lesson);
    opened = next;
  }
  return { lessons: MAX_LESSONS, openedAt, texts, complete: false };
}

describe('the English course with a synthetic learner', () => {
  const run = runCourse(2026);

  it('opens every letter and masters it without getting stuck', () => {
    expect(run.complete).toBe(true);
    expect(run.openedAt).toHaveLength(enUsQwertyCourse.stages[0]!.order.length);
  });

  it('never needs more than 40 lessons for one new key', () => {
    const gaps = run.openedAt.map((lesson, i) => lesson - (run.openedAt[i - 1] ?? 0));
    expect(Math.max(...gaps)).toBeLessThanOrEqual(40);
  });

  it('builds every lesson from open letters only', () => {
    for (const { text, open } of run.texts) {
      const allowed = new Set([...open, ' ']);
      expect(
        [...text].every((char) => allowed.has(char)),
        text,
      ).toBe(true);
    }
  });

  it('puts the focus key into at least half of the words', () => {
    for (const { text, focus } of run.texts) {
      const words = text.split(' ');
      const withFocus = words.filter((word) => focus !== null && word.includes(focus)).length;
      expect(withFocus / words.length, text).toBeGreaterThanOrEqual(params.focusWordShare);
    }
  });

  it('starts with letter drills and moves to words once "a" opens', () => {
    expect(run.texts[0]?.text).toMatch(/^[fj]+( [fj]+)*$/);
    const firstWithA = run.texts.find(({ open }) => open.includes('a'));
    expect(firstWithA?.text.split(' ')).toEqual(
      expect.arrayContaining([expect.stringMatching(/a/)]),
    );
  });
});
