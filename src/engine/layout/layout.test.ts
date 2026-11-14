import { describe, expect, it } from 'vitest';

import { parseGeometry } from './geometry';
import { isDeadKey, keyForChar, parseLayout, shiftAllowance } from './layout';

const layout = parseLayout({
  id: 'en-us-qwerty',
  language: 'en',
  keys: {
    KeyA: { base: 'a', shift: 'A' },
    Digit1: { base: '1', shift: '!' },
    Space: { base: ' ', shift: ' ' },
  },
});

describe('parseLayout', () => {
  it('rejects unknown ids and languages', () => {
    expect(() => parseLayout({ id: 'dvorak', language: 'en', keys: {} })).toThrow(/unknown id/);
    expect(() => parseLayout({ id: 'en-us-qwerty', language: 'xx', keys: {} })).toThrow(
      /unknown language/,
    );
  });

  it('requires exactly one character per key and shift state', () => {
    const bad = (chars: unknown) =>
      parseLayout({ id: 'en-us-qwerty', language: 'en', keys: { KeyA: chars } });
    expect(() => bad({ base: 'ab', shift: 'A' })).toThrow(/KeyA/);
    expect(() => bad({ base: 'a' })).toThrow(/KeyA/);
    expect(() => bad('a')).toThrow(/KeyA/);
  });
});

describe('keyForChar', () => {
  it('finds the key and the shift state for a character', () => {
    expect(keyForChar(layout, 'a')).toEqual({ code: 'KeyA', shift: false });
    expect(keyForChar(layout, 'A')).toEqual({ code: 'KeyA', shift: true });
    expect(keyForChar(layout, '!')).toEqual({ code: 'Digit1', shift: true });
  });

  it('types a space without shift', () => {
    expect(keyForChar(layout, ' ')).toEqual({ code: 'Space', shift: false });
  });

  it('returns null for characters the layout cannot type', () => {
    expect(keyForChar(layout, 'я')).toBeNull();
  });
});

const spanishData = {
  id: 'es-qwerty',
  language: 'es',
  keys: {
    KeyE: { base: 'e', shift: 'E' },
    Quote: { base: '´', shift: '¨' },
    Semicolon: { base: 'ñ', shift: 'Ñ' },
  },
  dead: { '´': { e: 'é', E: 'É' }, '¨': { e: 'ë' } },
};
const spanish = parseLayout(spanishData);

describe('dead keys', () => {
  it('marks the accents of dead keys', () => {
    expect(isDeadKey(spanish, '´')).toBe(true);
    expect(isDeadKey(spanish, 'ñ')).toBe(false);
    expect(isDeadKey(layout, '´')).toBe(false);
  });

  it('types a letter with an accent as the dead key and then the letter', () => {
    expect(keyForChar(spanish, 'é')).toEqual({
      code: 'KeyE',
      shift: false,
      dead: { code: 'Quote', shift: false },
    });
    expect(keyForChar(spanish, 'É')).toEqual({
      code: 'KeyE',
      shift: true,
      dead: { code: 'Quote', shift: false },
    });
    expect(keyForChar(spanish, 'ë')?.dead).toEqual({ code: 'Quote', shift: true });
  });

  it('prefers a key that types the character by itself', () => {
    expect(keyForChar(spanish, 'ñ')).toEqual({ code: 'Semicolon', shift: false });
  });

  it('counts the dead key as one more press in the time allowance', () => {
    const allowance = shiftAllowance(spanish, 1.25);
    expect(allowance('e')).toBe(1);
    expect(allowance('E')).toBe(1.25);
    expect(allowance('é')).toBe(2);
    expect(allowance('É')).toBe(2.25);
    expect(allowance('ë')).toBe(2.25);
  });

  it('rejects dead keys that are on no key or change characters the layout lacks', () => {
    const bad = (dead: unknown) => parseLayout({ ...spanishData, dead });
    expect(() => bad({ '`': { e: 'è' } })).toThrow(/on no key/);
    expect(() => bad({ '´': { a: 'á' } })).toThrow(/bad entry "a"/);
    expect(() => bad({ '´': { e: 'éé' } })).toThrow(/bad entry "e"/);
  });
});

describe('parseGeometry', () => {
  const valid = {
    id: 'ansi',
    rows: [
      ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyJ', 'KeyK', 'KeyL'].map((code) => ({ code })),
      [{ code: 'Enter', width: 2 }],
      [{ code: 'Space', gap: 1 }],
    ],
    homing: ['KeyF'],
    fingers: {
      lPinky: ['KeyA'],
      lRing: ['KeyS'],
      lMiddle: ['KeyD'],
      lIndex: ['KeyF'],
      thumb: ['Space'],
      rIndex: ['KeyJ'],
      rMiddle: ['KeyK'],
      rRing: ['KeyL'],
      rPinky: ['Enter'],
    },
    home: {
      lPinky: 'KeyA',
      lRing: 'KeyS',
      lMiddle: 'KeyD',
      lIndex: 'KeyF',
      thumb: 'Space',
      rIndex: 'KeyJ',
      rMiddle: 'KeyK',
      rRing: 'KeyL',
      rPinky: 'Enter',
    },
  };

  it('fills in default width and gap and maps keys to fingers', () => {
    const geometry = parseGeometry(valid);
    expect(geometry.rows[0]?.[0]).toEqual({ code: 'KeyA', width: 1, gap: 0 });
    expect(geometry.rows[1]).toEqual([{ code: 'Enter', width: 2, gap: 0 }]);
    expect(geometry.rows[2]).toEqual([{ code: 'Space', width: 1, gap: 1 }]);
    expect(geometry.fingers).toMatchObject({ KeyA: 'lPinky', Enter: 'rPinky', Space: 'thumb' });
    expect(geometry.home.lIndex).toBe('KeyF');
  });

  it('requires a finger for every key', () => {
    const fingers = { ...valid.fingers, rPinky: [] };
    expect(() => parseGeometry({ ...valid, fingers })).toThrow(/Enter has no finger/);
  });

  it('requires a home key of the right finger for every finger', () => {
    expect(() => parseGeometry({ ...valid, home: { ...valid.home, lIndex: 'KeyJ' } })).toThrow(
      /lIndex/,
    );
    expect(() => parseGeometry({ ...valid, home: { ...valid.home, thumb: undefined } })).toThrow(
      /thumb/,
    );
  });

  it('rejects a key assigned to two fingers or to an unknown finger', () => {
    expect(() =>
      parseGeometry({ ...valid, fingers: { ...valid.fingers, lRing: ['KeyA'] } }),
    ).toThrow(/two fingers/);
    expect(() =>
      parseGeometry({ ...valid, fingers: { ...valid.fingers, nose: ['KeyA'] } }),
    ).toThrow(/nose/);
  });

  it('rejects unknown keys in fingers and homing', () => {
    expect(() =>
      parseGeometry({ ...valid, fingers: { ...valid.fingers, lRing: ['KeyZ'] } }),
    ).toThrow(/KeyZ/);
    expect(() => parseGeometry({ ...valid, homing: ['KeyZ'] })).toThrow(/KeyZ/);
  });

  it('rejects duplicate keys and bad widths', () => {
    expect(() => parseGeometry({ ...valid, rows: [[{ code: 'KeyA' }, { code: 'KeyA' }]] })).toThrow(
      /twice/,
    );
    expect(() => parseGeometry({ ...valid, rows: [[{ code: 'KeyA', width: 0 }]] })).toThrow(
      /width/,
    );
  });
});
