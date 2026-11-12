import { describe, expect, it } from 'vitest';

import { englishContent, russianContent } from '../../content';
import { DEFAULT_PARAMS } from '../params';
import type { StageKind } from '../progress/course';
import { createRandom } from '../random';
import { buildCourseText } from './courseText';

const params = { ...DEFAULT_PARAMS };
const lower = 'abcdefghijklmnopqrstuvwxyz';
const upper = lower.toUpperCase();

function text(
  kind: StageKind,
  open: string,
  focus: string | null,
  seed = 1,
  content = englishContent,
) {
  return buildCourseText({
    ...content,
    kind,
    open: new Set(open),
    focus,
    random: createRandom(seed),
    params,
    locale: content === russianContent ? 'ru' : 'en',
  });
}

function onlyOpen(value: string, open: string) {
  const allowed = new Set([...open, ' ']);
  return [...value].filter((char) => !allowed.has(char));
}

describe('buildCourseText', () => {
  it('leaves the letters stage to the word lesson', () => {
    expect(text('letters', 'fj', 'j')).toMatch(/^[fj]+( [fj]+)*$/);
  });

  describe('capitals', () => {
    const open = `${lower}FJDK`;

    it('uses only open characters and reaches the lesson length', () => {
      for (let seed = 1; seed <= 20; seed += 1) {
        const value = text('capitals', open, 'K', seed);
        expect(onlyOpen(value, open), value).toEqual([]);
        expect(value.length).toBeGreaterThanOrEqual(params.lessonLength);
      }
    });

    it('starts at least half of the words with the focus capital', () => {
      for (let seed = 1; seed <= 20; seed += 1) {
        const words = text('capitals', open, 'K', seed).split(' ');
        const focus = words.filter((word) => word.startsWith('K')).length;
        expect(focus / words.length).toBeGreaterThanOrEqual(params.focusWordShare);
      }
    });

    it('puts capitals only at the start of a word', () => {
      expect(text('capitals', open, 'D')).not.toMatch(/\p{Ll}\p{Lu}/u);
    });

    it('finds words for Russian capitals too', () => {
      const ru = 'абвгдежзийклмнопрстуфхцчшщъыьэюя';
      const value = text('capitals', `${ru}АОВЛЩ`, 'Щ', 3, russianContent);
      expect(value.split(' ').filter((w) => w.startsWith('Щ')).length).toBeGreaterThan(5);
    });
  });

  describe('punctuation', () => {
    const open = `${lower}${upper}.,'-"`;

    it('uses only open characters', () => {
      for (const focus of ['.', ',', "'", '-', '"']) {
        const value = text('punctuation', open, focus);
        expect(onlyOpen(value, open), `${focus}: ${value}`).toEqual([]);
      }
    });

    it('puts marks where they belong', () => {
      expect(text('punctuation', open, ',')).toMatch(/\p{L}, /u);
      expect(text('punctuation', open, '-')).toMatch(/\p{L}-\p{L}/u);
      expect(text('punctuation', open, '"')).toMatch(/"\p{L}+"/u);
      expect(text('punctuation', open, "'")).toMatch(/\p{L}'\p{L}/u);
    });

    it('starts a sentence with a capital after a full stop', () => {
      const value = text('punctuation', open, '.');
      expect(value).toMatch(/^\p{Lu}/u);
      expect(value).not.toMatch(/\. \p{Ll}/u);
    });

    it('wraps Russian words in parentheses', () => {
      const ru = 'абвгдежзийклмнопрстуфхцчшщъыьэюя';
      const value = text('punctuation', `${ru}${ru.toUpperCase()}.()`, '(', 2, russianContent);
      expect(value).toMatch(/\(\p{Ll}+\)/u);
    });
  });

  describe('digits', () => {
    const open = `${lower}${upper}.,47`;

    it('makes numbers from open digits with the focus digit', () => {
      const value = text('digits', open, '7');
      expect(onlyOpen(value, open)).toEqual([]);
      const numbers = value.match(/\d+/g) ?? [];
      expect(numbers.filter((n) => n.includes('7')).length).toBeGreaterThan(5);
    });

    it('never starts a number with zero', () => {
      for (let seed = 1; seed <= 20; seed += 1) {
        expect(text('digits', `${lower}03`, '0', seed)).not.toMatch(/(^| )0\d/);
      }
    });
  });

  describe('free practice', () => {
    const open = `${lower}${upper}.,!?-'"0123456789`;

    it('writes sentences that start with a capital and end with a mark', () => {
      const value = text('free', open, 'z', 4);
      expect(onlyOpen(value, open)).toEqual([]);
      expect(value).toMatch(/^\p{Lu}/u);
      expect(value).toMatch(/[.!?] \p{Lu}/u);
      expect(value).not.toMatch(/[,;:][.!?]/u);
    });

    it('still practises the weakest key', () => {
      const words = text('free', open, 'z', 5).split(' ');
      expect(words.filter((word) => word.includes('z')).length).toBeGreaterThanOrEqual(5);
    });
  });
});
