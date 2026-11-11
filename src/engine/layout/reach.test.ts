import { describe, expect, it } from 'vitest';

import { ansiGeometry, enUsQwerty } from '../../content';
import { keyForChar } from './layout';
import { reachFromHome } from './reach';

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
