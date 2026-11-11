import { describe, expect, it } from 'vitest';

import {
  englishContent,
  enUsQwertyCourse,
  ruJcukenCourse,
  russianContent,
  type LanguageContent,
} from '../src/content';
import { DEFAULT_PARAMS } from '../src/engine/params';
import type { Course } from '../src/engine/progress/course';
import { advanceStage, evaluateStage } from '../src/engine/progress/progress';
import { createRandom } from '../src/engine/random';
import { applySamples, type KeyStat } from '../src/engine/stats/keyStats';
import { buildLessonText } from '../src/engine/textgen/lessonText';
import { createTypist, STEADY_LEARNER } from './syntheticTypist';

const params = { ...DEFAULT_PARAMS };
const MAX_LESSONS = 800;

/** Runs the letters stage with a synthetic learner until it is complete. */
function runCourse(course: Course, content: LanguageContent, seed: number) {
  const stage = course.stages[0]!;
  const random = createRandom(seed);
  const typist = createTypist(STEADY_LEARNER, random);
  let stats: Record<string, KeyStat> = {};
  let opened = 0;
  const openedAt: number[] = [];
  const texts: { text: string; open: readonly string[]; focus: string | null }[] = [];

  for (let lesson = 1; lesson <= MAX_LESSONS; lesson += 1) {
    const progress = evaluateStage(stage, opened, stats, params);
    if (progress.complete) return { lessons: lesson - 1, openedAt, texts, complete: true, stage };

    const text = buildLessonText({
      ...content,
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
  return { lessons: MAX_LESSONS, openedAt, texts, complete: false, stage };
}

describe.each([
  {
    name: 'English',
    course: enUsQwertyCourse,
    content: englishContent,
    first: /^[fj]+( [fj]+)*$/,
    wordsOnceOpen: 'a',
  },
  {
    name: 'Russian',
    course: ruJcukenCourse,
    content: russianContent,
    // Both start keys are vowels, so real words come from the first lesson.
    first: /^[ао]+( [ао]+)*$/,
    wordsOnceOpen: 'л',
  },
])('the $name course with a synthetic learner', ({ course, content, first, wordsOnceOpen }) => {
  const run = runCourse(course, content, 2026);

  it('opens every letter and masters it without getting stuck', () => {
    expect(run.complete).toBe(true);
    expect(run.openedAt).toHaveLength(run.stage.order.length);
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

  it('never puts three equal letters in a row', () => {
    for (const { text } of run.texts) expect(text).not.toMatch(/(.)\1\1/u);
  });

  it('mixes the open keys in the first lessons instead of repeating one word pattern', () => {
    const words = new Set(run.texts[0]?.text.split(' '));
    expect(words.size).toBeGreaterThanOrEqual(8);
  });

  it('puts the focus key into at least half of the words', () => {
    for (const { text, focus } of run.texts) {
      const words = text.split(' ');
      const withFocus = words.filter((word) => focus !== null && word.includes(focus)).length;
      expect(withFocus / words.length, text).toBeGreaterThanOrEqual(params.focusWordShare);
    }
  });

  it('starts with the start keys and soon moves to words', () => {
    expect(run.texts[0]?.text).toMatch(first);
    const withWords = run.texts.find(({ open }) => open.includes(wordsOnceOpen));
    const known = new Set(content.words);
    expect(withWords?.text.split(' ').some((word) => known.has(word))).toBe(true);
  });
});
