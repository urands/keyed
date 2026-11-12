import { describe, expect, it } from 'vitest';

import type { Finger } from '../engine/layout/geometry';
import { keyForChar, type Layout } from '../engine/layout/layout';
import { stageKeys, startSetKeys, withOptionalKeys, type Course } from '../engine/progress/course';
import { isBlocked } from '../engine/textgen/blocklist';
import {
  ansiGeometry,
  englishContent,
  enUsQwerty,
  enUsQwertyCourse,
  ruJcuken,
  ruJcukenCourse,
  russianContent,
  type LanguageContent,
} from './index';

const geometryCodes = new Set(ansiGeometry.rows.flat().map((key) => key.code));

interface LanguageCase {
  name: string;
  layout: Layout;
  course: Course;
  content: LanguageContent;
  /** Letters the course teaches; "ё" is a separate setting (task 5.6). */
  letters: string;
  /** Letters whose capitals the course does not teach. */
  noCapitals: string;
  /** The finger table from docs/learning-method.md for this layout. */
  zones: Record<Finger, string>;
  startKeys: string;
  /** Keys of the introductory lessons. */
  startSet: string;
  order: string;
  wordPattern: RegExp;
}

const CASES: LanguageCase[] = [
  {
    name: 'English QWERTY',
    layout: enUsQwerty,
    course: enUsQwertyCourse,
    content: englishContent,
    letters: 'abcdefghijklmnopqrstuvwxyz',
    noCapitals: '',
    zones: {
      lPinky: '`1qaz',
      lRing: '2wsx',
      lMiddle: '3edc',
      lIndex: '45rtfgvb',
      thumb: ' ',
      rIndex: '67yuhjnm',
      rMiddle: '8ik,',
      rRing: '9ol.',
      rPinky: "0-=p[]\\;'/",
    },
    startKeys: 'fj',
    startSet: 'fjdksla',
    order: 'dk sl a e i t n o r h u c m g w y p b v x q z',
    wordPattern: /^[a-z]{2,10}$/,
  },
  {
    name: 'Russian ЙЦУКЕН',
    layout: ruJcuken,
    course: ruJcukenCourse,
    content: russianContent,
    letters: 'абвгдежзийклмнопрстуфхцчшщъыьэюя',
    noCapitals: 'ъыь',
    zones: {
      lPinky: 'ё1йфя',
      lRing: '2цыч',
      lMiddle: '3увс',
      lIndex: '45кеапми',
      thumb: ' ',
      rIndex: '67нгроть',
      rMiddle: '8шлб',
      rRing: '9щдю',
      rPinky: '0-=зхъ\\жэ.',
    },
    startKeys: 'ао',
    startSet: 'аовлыд',
    order: 'вл ыд р п е и н т с к м у я ь г з б ч й ж х ш ю э ц щ ф ъ',
    wordPattern: /^[а-я]{2,10}$/,
  },
];

describe.each(CASES)('$name', (c) => {
  describe('layout', () => {
    it('only uses keys that exist in the ANSI geometry', () => {
      for (const code of Object.keys(c.layout.keys)) expect(geometryCodes).toContain(code);
    });

    it('types every character with exactly one key', () => {
      const chars = Object.values(c.layout.keys)
        .flatMap(({ base, shift }) => (base === shift ? [base] : [base, shift]))
        .sort();
      expect(new Set(chars).size).toBe(chars.length);
    });

    it('assigns fingers as in the methodology table', () => {
      for (const [finger, chars] of Object.entries(c.zones)) {
        for (const char of chars) {
          const stroke = keyForChar(c.layout, char);
          expect(stroke, `key for "${char}"`).not.toBeNull();
          expect(ansiGeometry.fingers[stroke?.code ?? ''], `finger for "${char}"`).toBe(finger);
        }
      }
    });
  });

  describe('course', () => {
    // The default course: optional keys such as "ё" are switched off.
    const course = withOptionalKeys(c.course, new Set());
    const letters = course.stages.find((stage) => stage.id === 'letters');

    it('has the stages of the methodology in order', () => {
      expect(c.course.stages.map((stage) => stage.kind)).toEqual([
        'letters',
        'capitals',
        'punctuation',
        'digits',
        'free',
      ]);
    });

    it('teaches the capital of every letter that has one in the capitals stage', () => {
      const capitals = course.stages.find((stage) => stage.kind === 'capitals');
      expect(capitals).toBeDefined();
      if (!capitals) return;
      const keys = new Set(stageKeys(capitals));
      for (const key of keys) expect(key).toMatch(/^\p{Lu}$/u);
      for (const letter of c.letters) {
        const capital = letter.toLocaleUpperCase(c.layout.language);
        // Words never start with "ъ", "ь" and "ы": their capitals are not taught.
        if (!c.noCapitals.includes(letter)) expect(keys, capital).toContain(capital);
      }
    });

    it('teaches every digit in the digits stage', () => {
      const digits = course.stages.find((stage) => stage.kind === 'digits');
      expect(digits && stageKeys(digits).sort().join('')).toBe('0123456789');
    });

    it('teaches every letter once in the letters stage', () => {
      expect(letters).toBeDefined();
      if (!letters) return;
      expect(stageKeys(letters).sort().join('')).toBe([...c.letters].sort().join(''));
    });

    it('follows the order from the methodology', () => {
      if (!letters) return;
      expect(letters.start.join('')).toBe(c.startKeys);
      expect(letters.order.map((group) => group.join('')).join(' ')).toBe(c.order);
    });

    it('has the starting set of the methodology', () => {
      if (!letters) return;
      expect(startSetKeys(letters).join('')).toBe(c.startSet);
    });

    it('makes only "ё" optional', () => {
      const optional = c.course.stages.flatMap((stage) => stage.optional);
      expect(optional).toEqual(c.layout.id === 'ru-jcuken' ? ['ё'] : []);
      const withYo = withOptionalKeys(c.course, new Set(optional));
      expect(withYo).toEqual(c.course);
    });

    it('uses only keys of the layout', () => {
      expect(c.course.layoutId).toBe(c.layout.id);
      for (const stage of c.course.stages) {
        for (const key of stageKeys(stage)) expect(keyForChar(c.layout, key)).not.toBeNull();
      }
    });
  });

  describe('dictionary', () => {
    const { words, blocklist } = c.content;

    it('has 10,000 different lowercase words of 2–10 letters', () => {
      expect(words).toHaveLength(10_000);
      expect(new Set(words).size).toBe(words.length);
      for (const word of words) expect(word).toMatch(c.wordPattern);
    });

    it('has no blocked words', () => {
      expect(words.filter((word) => isBlocked(word, blocklist))).toEqual([]);
    });

    it('has words for every letter of the course', () => {
      for (const letter of c.letters) {
        expect(
          words.some((word) => word.includes(letter)),
          letter,
        ).toBe(true);
      }
    });
  });
});

describe('ANSI geometry', () => {
  it('marks F and J (А and О) as homing keys', () => {
    expect(ansiGeometry.homing).toEqual(['KeyF', 'KeyJ']);
    expect(keyForChar(ruJcuken, 'а')?.code).toBe('KeyF');
    expect(keyForChar(ruJcuken, 'о')?.code).toBe('KeyJ');
  });

  it('has rows of equal width', () => {
    const widths = ansiGeometry.rows
      .slice(0, 4)
      .map((row) => row.reduce((sum, key) => sum + key.gap + key.width, 0));
    expect(new Set(widths)).toEqual(new Set([15]));
  });
});

describe('Russian dictionary', () => {
  it('has no "ё": it is replaced with "е"', () => {
    expect(russianContent.words.filter((word) => word.includes('ё'))).toEqual([]);
  });

  it('starts with the most frequent words', () => {
    expect(russianContent.words.slice(0, 10)).toEqual(expect.arrayContaining(['не', 'что']));
  });
});
