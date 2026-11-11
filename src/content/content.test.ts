import { describe, expect, it } from 'vitest';

import type { Finger } from '../engine/layout/geometry';
import { keyForChar } from '../engine/layout/layout';
import { stageKeys } from '../engine/progress/course';
import { isBlocked } from '../engine/textgen/blocklist';
import { ansiGeometry, englishContent, enUsQwerty, enUsQwertyCourse } from './index';

/** The finger table from docs/learning-method.md, English QWERTY column. */
const DOC_FINGER_ZONES: Record<Finger, string> = {
  lPinky: '`1qaz',
  lRing: '2wsx',
  lMiddle: '3edc',
  lIndex: '45rtfgvb',
  thumb: ' ',
  rIndex: '67yuhjnm',
  rMiddle: '8ik,',
  rRing: '9ol.',
  rPinky: "0-=p[]\\;'/",
};

const ENGLISH_LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const geometryCodes = new Set(ansiGeometry.rows.flat().map((key) => key.code));

describe('en-us-qwerty layout', () => {
  it('only uses keys that exist in the ANSI geometry', () => {
    for (const code of Object.keys(enUsQwerty.keys)) expect(geometryCodes).toContain(code);
  });

  it('types every character with exactly one key', () => {
    const chars = Object.values(enUsQwerty.keys)
      .flatMap(({ base, shift }) => (base === shift ? [base] : [base, shift]))
      .sort();
    expect(new Set(chars).size).toBe(chars.length);
  });

  it('assigns fingers as in the methodology table', () => {
    for (const [finger, chars] of Object.entries(DOC_FINGER_ZONES)) {
      for (const char of chars) {
        const stroke = keyForChar(enUsQwerty, char);
        expect(stroke, `key for "${char}"`).not.toBeNull();
        expect(ansiGeometry.fingers[stroke?.code ?? ''], `finger for "${char}"`).toBe(finger);
      }
    }
  });
});

describe('ANSI geometry', () => {
  it('marks F and J as homing keys', () => {
    expect(ansiGeometry.homing).toEqual(['KeyF', 'KeyJ']);
  });

  it('has rows of equal width', () => {
    const widths = ansiGeometry.rows
      .slice(0, 4)
      .map((row) => row.reduce((sum, key) => sum + key.gap + key.width, 0));
    expect(new Set(widths)).toEqual(new Set([15]));
  });
});

describe('English course', () => {
  const letters = enUsQwertyCourse.stages.find((stage) => stage.id === 'letters');

  it('has a letters stage that teaches every letter once', () => {
    expect(letters).toBeDefined();
    if (!letters) return;
    expect(stageKeys(letters).sort().join('')).toBe(ENGLISH_LETTERS);
  });

  it('follows the order from the methodology', () => {
    if (!letters) return;
    expect(letters.start).toEqual(['f', 'j']);
    expect(letters.order.map((group) => group.join('')).join(' ')).toBe(
      'dk sl a e i t n o r h u c m g w y p b v x q z',
    );
  });

  it('uses only keys of the layout', () => {
    for (const stage of enUsQwertyCourse.stages) {
      for (const key of stageKeys(stage)) expect(keyForChar(enUsQwerty, key)).not.toBeNull();
    }
  });
});

describe('English dictionary', () => {
  const { words, blocklist } = englishContent;

  it('has 10,000 different lowercase words of 2–10 letters', () => {
    expect(words).toHaveLength(10_000);
    expect(new Set(words).size).toBe(words.length);
    for (const word of words) expect(word).toMatch(/^[a-z]{2,10}$/);
  });

  it('starts with the most frequent words', () => {
    expect(words.slice(0, 10)).toEqual(expect.arrayContaining(['the', 'you', 'to', 'and']));
  });

  it('has no blocked words', () => {
    expect(words.filter((word) => isBlocked(word, blocklist))).toEqual([]);
  });

  it('has words for every letter of the course', () => {
    for (const letter of ENGLISH_LETTERS) {
      expect(
        words.some((word) => word.includes(letter)),
        letter,
      ).toBe(true);
    }
  });
});
