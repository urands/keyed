import { describe, expect, it } from 'vitest';

import { parseLayout } from '../layout/layout';
import { toInput, type DeadKey, type InputMode, type KeyEventLike } from './toInput';

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
    expect(toInput(keyEvent({ key: 'f' }), russian, 'emulate').input).toEqual({
      char: 'а',
      code: 'KeyF',
      time: 1234.5,
    });
  });

  it('uses the shifted character when Shift is held', () => {
    expect(toInput(keyEvent({ shiftKey: true, key: 'F' }), russian, 'emulate').input?.char).toBe(
      'А',
    );
  });

  it('ignores keys that are not in the layout', () => {
    expect(
      toInput(keyEvent({ code: 'ShiftLeft', key: 'Shift' }), russian, 'emulate').input,
    ).toBeNull();
    expect(toInput(keyEvent({ code: 'KeyQ', key: 'q' }), russian, 'emulate').input).toBeNull();
  });
});

describe('toInput in system layout mode', () => {
  it('takes the character from event.key', () => {
    expect(toInput(keyEvent({ key: 'f' }), russian, 'system').input?.char).toBe('f');
  });

  it('ignores named keys', () => {
    expect(toInput(keyEvent({ code: 'Enter', key: 'Enter' }), russian, 'system').input).toBeNull();
    expect(toInput(keyEvent({ code: 'Quote', key: 'Dead' }), russian, 'system').input).toBeNull();
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
    expect(toInput(keyEvent(overrides), russian, 'emulate').input).toBeNull();
    expect(toInput(keyEvent(overrides), russian, 'system').input).toBeNull();
  });
});

const spanish = parseLayout({
  id: 'es-qwerty',
  language: 'es',
  keys: {
    KeyE: { base: 'e', shift: 'E' },
    KeyS: { base: 's', shift: 'S' },
    Quote: { base: '´', shift: '¨' },
    Space: { base: ' ', shift: ' ' },
  },
  dead: {
    '´': { e: 'é', E: 'É' },
    '¨': { e: 'ë' },
  },
});

/** Presses keys one after another and returns the typed characters. */
function typeKeys(mode: InputMode, presses: Partial<KeyEventLike>[]): string {
  let dead: DeadKey | null = null;
  let typed = '';
  for (const press of presses) {
    const step = toInput(keyEvent(press), spanish, mode, dead);
    dead = step.dead;
    typed += step.input?.char ?? '';
  }
  return typed;
}

const acute = { code: 'Quote', key: '´' };
const e = { code: 'KeyE', key: 'e' };

describe('toInput with dead keys in emulation mode', () => {
  it('types nothing on a dead key and waits for the next press', () => {
    expect(toInput(keyEvent(acute), spanish, 'emulate')).toEqual({
      input: null,
      dead: { accent: '´', code: 'Quote' },
    });
  });

  it('puts the accent on the next letter', () => {
    expect(typeKeys('emulate', [acute, e])).toBe('é');
    expect(typeKeys('emulate', [acute, { code: 'KeyE', shiftKey: true }])).toBe('É');
    expect(typeKeys('emulate', [{ code: 'Quote', shiftKey: true }, e])).toBe('ë');
  });

  it('keeps the dead key while Shift is pressed', () => {
    expect(
      typeKeys('emulate', [acute, { code: 'ShiftLeft', key: 'Shift' }, { ...e, shiftKey: true }]),
    ).toBe('É');
  });

  it('types the accent itself before a space or a letter it does not change', () => {
    expect(typeKeys('emulate', [acute, { code: 'Space', key: ' ' }])).toBe('´');
    expect(typeKeys('emulate', [acute, { code: 'KeyS', key: 's' }])).toBe('´');
    expect(typeKeys('emulate', [acute, acute])).toBe('´');
  });

  it('types a plain letter without a dead key', () => {
    expect(typeKeys('emulate', [e])).toBe('e');
  });
});

describe('toInput with dead keys in system layout mode', () => {
  const deadAcute = { code: 'Quote', key: 'Dead' };

  it('puts the accent on a plain letter', () => {
    expect(typeKeys('system', [deadAcute, e])).toBe('é');
  });

  it('takes a letter the system has already composed', () => {
    expect(typeKeys('system', [deadAcute, { code: 'KeyE', key: 'é' }])).toBe('é');
  });

  it('types the accent before a space', () => {
    expect(typeKeys('system', [deadAcute, { code: 'Space', key: ' ' }])).toBe('´');
  });

  it('ignores a dead key the lesson layout does not have there', () => {
    expect(toInput(keyEvent({ code: 'KeyE', key: 'Dead' }), spanish, 'system').dead).toBeNull();
  });
});
