import { describe, expect, it } from 'vitest';

import { parseLayout } from '../layout/layout';
import { toInput, type KeyEventLike } from './toInput';

const russian = parseLayout({
  id: 'ru-jcuken',
  language: 'ru',
  keys: {
    KeyF: { base: 'а', shift: 'А' },
    Space: { base: ' ', shift: ' ' },
  },
});

function keyEvent(overrides: Partial<KeyEventLike>): KeyEventLike {
  return {
    code: 'KeyF',
    key: 'f',
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    repeat: false,
    isComposing: false,
    timeStamp: 1234.5,
    ...overrides,
  };
}

describe('toInput in emulation mode', () => {
  it('takes the character from the physical key, whatever the system layout', () => {
    expect(toInput(keyEvent({ key: 'f' }), russian, 'emulate')).toEqual({
      char: 'а',
      code: 'KeyF',
      time: 1234.5,
    });
  });

  it('uses the shifted character when Shift is held', () => {
    expect(toInput(keyEvent({ shiftKey: true, key: 'F' }), russian, 'emulate')?.char).toBe('А');
  });

  it('ignores keys that are not in the layout', () => {
    expect(toInput(keyEvent({ code: 'ShiftLeft', key: 'Shift' }), russian, 'emulate')).toBeNull();
    expect(toInput(keyEvent({ code: 'KeyQ', key: 'q' }), russian, 'emulate')).toBeNull();
  });
});

describe('toInput in system layout mode', () => {
  it('takes the character from event.key', () => {
    expect(toInput(keyEvent({ key: 'f' }), russian, 'system')?.char).toBe('f');
  });

  it('ignores named keys', () => {
    expect(toInput(keyEvent({ code: 'Enter', key: 'Enter' }), russian, 'system')).toBeNull();
    expect(toInput(keyEvent({ code: 'Quote', key: 'Dead' }), russian, 'system')).toBeNull();
  });
});

describe('toInput ignores presses that are not typing', () => {
  it.each([
    ['auto-repeat', { repeat: true }],
    ['IME composition', { isComposing: true }],
    ['Ctrl', { ctrlKey: true }],
    ['Alt', { altKey: true }],
    ['Meta', { metaKey: true }],
  ])('%s', (_name, overrides) => {
    expect(toInput(keyEvent(overrides), russian, 'emulate')).toBeNull();
    expect(toInput(keyEvent(overrides), russian, 'system')).toBeNull();
  });
});
