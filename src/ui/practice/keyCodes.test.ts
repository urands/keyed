import { describe, expect, it } from 'vitest';

import { deQwertz, esQwerty, frAzerty, isoGeometry, enUsQwerty } from '../../content';
import { charLabel, codesWithShift, nextPress } from './keyCodes';

describe('nextPress', () => {
  it('starts a letter with an accent at its dead key, then the letter', () => {
    expect(nextPress(esQwerty, isoGeometry, 'é', false)).toEqual({ code: 'Quote', shift: null });
    expect(nextPress(esQwerty, isoGeometry, 'é', true)).toEqual({ code: 'KeyE', shift: null });
  });

  it('holds Shift on the other hand for the dead key and the letter', () => {
    expect(nextPress(esQwerty, isoGeometry, 'É', true)).toEqual({
      code: 'KeyE',
      shift: 'ShiftRight',
    });
    expect(nextPress(frAzerty, isoGeometry, 'ï', false)).toEqual({
      code: 'BracketLeft',
      shift: 'ShiftLeft',
    });
  });

  it('gives a plain key for a letter without a dead key', () => {
    expect(nextPress(enUsQwerty, isoGeometry, 'a', false)).toEqual({ code: 'KeyA', shift: null });
    expect(nextPress(enUsQwerty, isoGeometry, 'a', true)).toEqual({ code: 'KeyA', shift: null });
  });
});

describe('codesWithShift', () => {
  it('includes the dead key of a letter with an accent', () => {
    expect([...codesWithShift(esQwerty, isoGeometry, ['á'])].sort()).toEqual(['KeyA', 'Quote']);
  });
});

describe('charLabel', () => {
  it('shows a letter in upper case when its key types that capital', () => {
    expect(charLabel(enUsQwerty, 'a', 'Space')).toBe('A');
    expect(charLabel(deQwertz, 'ü', 'Space')).toBe('Ü');
    expect(charLabel(esQwerty, 'á', 'Space')).toBe('Á');
  });

  it('keeps a letter small when its key types something else with Shift', () => {
    expect(charLabel(frAzerty, 'é', 'Space')).toBe('é');
    expect(charLabel(deQwertz, 'ß', 'Space')).toBe('ß');
  });
});
