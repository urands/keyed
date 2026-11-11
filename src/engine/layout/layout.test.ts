import { describe, expect, it } from 'vitest';

import { parseGeometry } from './geometry';
import { keyForChar, parseLayout } from './layout';

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
    expect(() => parseLayout({ id: 'en-us-qwerty', language: 'de', keys: {} })).toThrow(
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

describe('parseGeometry', () => {
  const valid = {
    id: 'ansi',
    rows: [[{ code: 'KeyA' }, { code: 'Enter', width: 2 }], [{ code: 'Space', gap: 1 }]],
    homing: ['KeyA'],
    fingers: { lPinky: ['KeyA'], rPinky: ['Enter'], thumb: ['Space'] },
  };

  it('fills in default width and gap and maps keys to fingers', () => {
    const geometry = parseGeometry(valid);
    expect(geometry.rows).toEqual([
      [
        { code: 'KeyA', width: 1, gap: 0 },
        { code: 'Enter', width: 2, gap: 0 },
      ],
      [{ code: 'Space', width: 1, gap: 1 }],
    ]);
    expect(geometry.fingers).toEqual({ KeyA: 'lPinky', Enter: 'rPinky', Space: 'thumb' });
  });

  it('requires a finger for every key', () => {
    expect(() =>
      parseGeometry({ ...valid, fingers: { lPinky: ['KeyA'], thumb: ['Space'] } }),
    ).toThrow(/Enter has no finger/);
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
