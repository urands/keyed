import { describe, expect, it } from 'vitest';

import { ansiGeometry, enUsQwerty, ruJcuken } from '../../content';
import { keyForChar, shiftAllowance } from './layout';
import { reachFromHome, shiftFor } from './reach';

function reach(char: string) {
  const stroke = keyForChar(enUsQwerty, char);
  return stroke ? reachFromHome(ansiGeometry, stroke.code) : null;
}

describe('reachFromHome on ANSI', () => {
  it('keeps home row keys at home', () => {
    for (const char of 'asdfjkl;') expect(reach(char)?.direction, char).toBe('home');
    expect(reach(' ')).toEqual({ finger: 'thumb', home: 'Space', direction: 'home' });
  });

  it('describes reaches from the home key of the finger', () => {
    expect(reach('e')).toEqual({ finger: 'lMiddle', home: 'KeyD', direction: 'up' });
    expect(reach('t')).toEqual({ finger: 'lIndex', home: 'KeyF', direction: 'upRight' });
    expect(reach('g')).toEqual({ finger: 'lIndex', home: 'KeyF', direction: 'right' });
    expect(reach('b')).toEqual({ finger: 'lIndex', home: 'KeyF', direction: 'downRight' });
    expect(reach('h')).toEqual({ finger: 'rIndex', home: 'KeyJ', direction: 'left' });
    expect(reach('y')).toEqual({ finger: 'rIndex', home: 'KeyJ', direction: 'upLeft' });
    expect(reach('n')).toEqual({ finger: 'rIndex', home: 'KeyJ', direction: 'down' });
    expect(reach('c')).toEqual({ finger: 'lMiddle', home: 'KeyD', direction: 'down' });
    expect(reach('p')).toEqual({ finger: 'rPinky', home: 'Semicolon', direction: 'up' });
  });

  it('returns null for keys outside the geometry', () => {
    expect(reachFromHome(ansiGeometry, 'F13')).toBeNull();
  });
});

describe('shiftFor', () => {
  it('takes Shift with the other hand', () => {
    expect(shiftFor(ansiGeometry, 'KeyF')).toBe('ShiftRight');
    expect(shiftFor(ansiGeometry, 'KeyA')).toBe('ShiftRight');
    expect(shiftFor(ansiGeometry, 'Digit5')).toBe('ShiftRight');
    expect(shiftFor(ansiGeometry, 'KeyJ')).toBe('ShiftLeft');
    expect(shiftFor(ansiGeometry, 'Digit6')).toBe('ShiftLeft');
    expect(shiftFor(ansiGeometry, 'Slash')).toBe('ShiftLeft');
  });

  it('has no Shift for the space bar', () => {
    expect(shiftFor(ansiGeometry, 'Space')).toBeNull();
  });
});

describe('shiftAllowance', () => {
  const allowance = shiftAllowance(ruJcuken, 1.25);

  it('gives more time to characters typed with Shift on the layout', () => {
    expect(allowance('Ж')).toBe(1.25);
    // On ЙЦУКЕН the comma is Shift + the full stop key, "?" is Shift + 7.
    expect(allowance(',')).toBe(1.25);
    expect(allowance('?')).toBe(1.25);
    expect(allowance('.')).toBe(1);
    expect(allowance('ж')).toBe(1);
    expect(allowance('7')).toBe(1);
  });
});
