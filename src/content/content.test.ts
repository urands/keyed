import { describe, expect, it } from 'vitest';

import type { Finger } from '../engine/layout/geometry';
import { keyForChar } from '../engine/layout/layout';
import { ansiGeometry, commonEnglishWords, enUsQwerty } from './index';

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

  it('has every letter of the alphabet', () => {
    for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
      expect(keyForChar(enUsQwerty, letter)).not.toBeNull();
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

describe('common English words', () => {
  it('has 200 different words', () => {
    expect(commonEnglishWords).toHaveLength(200);
    expect(new Set(commonEnglishWords).size).toBe(200);
  });

  it('has only lowercase words of 2–8 letters', () => {
    for (const word of commonEnglishWords) expect(word).toMatch(/^[a-z]{2,8}$/);
  });
});
