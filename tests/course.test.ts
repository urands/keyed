import { describe, expect, it } from 'vitest';

import {
  englishContent,
  enUsQwerty,
  enUsQwertyCourse,
  ruJcuken,
  ruJcukenCourse,
  russianContent,
  russianYoContent,
  type LanguageContent,
} from '../src/content';
import { shiftAllowance, type Layout } from '../src/engine/layout/layout';
import { DEFAULT_PARAMS } from '../src/engine/params';
import { withOptionalKeys, type Course, type StageKind } from '../src/engine/progress/course';
import { courseState } from '../src/engine/progress/courseState';
import { advanceStage } from '../src/engine/progress/progress';
import { createRandom } from '../src/engine/random';
import { applySamples, type KeyStat } from '../src/engine/stats/keyStats';
import { buildCourseText } from '../src/engine/textgen/courseText';
import { createTypist, STEADY_LEARNER } from './syntheticTypist';

const params = { ...DEFAULT_PARAMS };
const MAX_LESSONS = 2000;
/** Free practice never ends; the run stops after this many of its lessons. */
const FREE_LESSONS = 20;

interface LessonRecord {
  stage: string;
  kind: StageKind;
  text: string;
  open: ReadonlySet<string>;
  focus: string | null;
}

/**
 * Takes a synthetic learner through the whole course, stage after stage, the
 * way the app does: the course state picks the stage, open keys and focus.
 */
function runCourse(course: Course, layout: Layout, content: LanguageContent, seed: number) {
  const locale = layout.language;
  const allowance = shiftAllowance(layout, params.shiftAllowance);
  const random = createRandom(seed);
  const typist = createTypist(STEADY_LEARNER, random);
  let stats: Record<string, KeyStat> = {};
  const opened: Record<string, number> = {};
  /** Lesson numbers at which a group of keys opened, by stage. */
  const openedAt: Record<string, number[]> = {};
  const lessons: Record<string, number> = {};
  const texts: LessonRecord[] = [];

  for (let lesson = 1; lesson <= MAX_LESSONS; lesson += 1) {
    const state = courseState(course, opened, stats, params, false, allowance);
    const { stage, progress } = state;
    if (stage.kind === 'free' && (lessons[stage.id] ?? 0) >= FREE_LESSONS) {
      return { complete: true, lessons, openedAt, texts };
    }
    const text = buildCourseText({
      ...content,
      kind: stage.kind,
      open: state.open,
      focus: progress.focus,
      random,
      params,
      locale,
    });
    texts.push({
      stage: stage.id,
      kind: stage.kind,
      text,
      open: state.open,
      focus: progress.focus,
    });

    const typed = typist.type(text);
    stats = applySamples(stats, typed.chars, params, allowance);
    const before = opened[stage.id] ?? 0;
    const next = advanceStage(stage, before, stats, params, false, allowance);
    if (next > before) (openedAt[stage.id] ??= []).push(lesson);
    opened[stage.id] = next;
    lessons[stage.id] = (lessons[stage.id] ?? 0) + 1;
  }
  return { complete: false, lessons, openedAt, texts };
}

describe.each([
  {
    name: 'English',
    course: enUsQwertyCourse,
    layout: enUsQwerty,
    content: englishContent,
    first: /^[fj]+( [fj]+)*$/,
    wordsOnceOpen: 'a',
  },
  {
    name: 'Russian',
    course: withOptionalKeys(ruJcukenCourse, new Set()),
    layout: ruJcuken,
    content: russianContent,
    // Both start keys are vowels, so real words come from the first lesson.
    first: /^[ао]+( [ао]+)*$/,
    wordsOnceOpen: 'л',
  },
  {
    name: 'Russian with "ё"',
    course: ruJcukenCourse,
    layout: ruJcuken,
    content: russianYoContent,
    first: /^[ао]+( [ао]+)*$/,
    wordsOnceOpen: 'л',
  },
])(
  'the $name course with a synthetic learner',
  ({ course, layout, content, first, wordsOnceOpen }) => {
    const run = runCourse(course, layout, content, 2026);
    const of = (kind: StageKind) => run.texts.filter((record) => record.kind === kind);

    it('goes through every stage to free practice without getting stuck', () => {
      expect(run.complete, JSON.stringify(run.lessons)).toBe(true);
      for (const stage of course.stages) {
        if (stage.kind === 'free') continue;
        expect(run.openedAt[stage.id] ?? [], stage.id).toHaveLength(stage.order.length);
      }
    });

    it('never needs more than 40 lessons for one new key', () => {
      for (const lessons of Object.values(run.openedAt)) {
        const gaps = lessons.map((lesson, i) => lesson - (lessons[i - 1] ?? lesson));
        expect(Math.max(0, ...gaps)).toBeLessThanOrEqual(40);
      }
    });

    it('builds every lesson from open characters only', () => {
      for (const { text, open } of run.texts) {
        const allowed = new Set([...open, ' ']);
        expect(
          [...text].filter((char) => !allowed.has(char)),
          text,
        ).toEqual([]);
      }
    });

    it('never puts three equal letters in a row', () => {
      for (const { text } of run.texts) expect(text).not.toMatch(/(\p{L})\1\1/u);
    });

    it('mixes the open keys in the first lessons instead of repeating one word pattern', () => {
      const words = new Set(run.texts[0]?.text.split(' '));
      expect(words.size).toBeGreaterThanOrEqual(8);
    });

    it('puts the focus key into at least half of the words while a stage is learned', () => {
      for (const { text, focus, kind } of run.texts) {
        if (kind === 'free' || focus === null) continue;
        const words = text.split(' ');
        const withFocus = words.filter((word) => word.includes(focus)).length;
        expect(withFocus / words.length, text).toBeGreaterThanOrEqual(params.focusWordShare);
      }
    });

    it('starts with the start keys and soon moves to words', () => {
      expect(run.texts[0]?.text).toMatch(first);
      const withWords = run.texts.find(({ open }) => open.has(wordsOnceOpen));
      const known = new Set(content.words);
      expect(withWords?.text.split(' ').some((word) => known.has(word))).toBe(true);
    });

    it('presses Shift only for capitals at the start of a word', () => {
      for (const { text } of of('capitals')) expect(text).not.toMatch(/\p{L}\p{Lu}/u);
    });

    it('ends free practice with ordinary sentences', () => {
      const free = of('free');
      expect(free).toHaveLength(FREE_LESSONS);
      for (const { text } of free) {
        // A sentence starts with a capital, maybe after an opening quote or parenthesis.
        expect(text).toMatch(/^["'(]?\p{Lu}/u);
        expect(text).toMatch(/[.!?]["')]? ["'(]?\p{Lu}/u);
        // Never a small letter or a number after the end of a sentence.
        expect(text).not.toMatch(/[.!?]["')]? ["'(]?[\p{Ll}\p{Nd}]/u);
      }
      // Free practice mixes in numbers and other marks.
      const share = (pattern: RegExp) =>
        free.filter(({ text }) => pattern.test(text)).length / FREE_LESSONS;
      // Numbers are rarer in ordinary text than marks.
      expect(share(/\p{Nd}/u)).toBeGreaterThanOrEqual(0.3);
      expect(share(/[,"'()\-:;]/u)).toBeGreaterThanOrEqual(0.5);
    });
  },
);
