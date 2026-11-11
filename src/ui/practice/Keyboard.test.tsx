import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { practiceGeometry } from '../../app/layouts';
import { enUsQwerty, ruJcuken } from '../../content';
import { codesFor } from './keyCodes';
import { Keyboard } from './Keyboard';

const letters = codesFor(enUsQwerty, 'abcdefghijklmnopqrstuvwxyz ');

function renderKeyboard(props: Partial<Parameters<typeof Keyboard>[0]> = {}) {
  const { container } = render(
    <Keyboard layout={enUsQwerty} geometry={practiceGeometry} openCodes={letters} {...props} />,
  );
  return (code: string) => container.querySelector(`[data-code="${code}"]`);
}

describe('Keyboard', () => {
  it('draws every key of the geometry with its label', () => {
    const key = renderKeyboard();
    expect(key('KeyQ')).toHaveTextContent('Q');
    expect(key('Semicolon')).toHaveTextContent(';');
    expect(key('ShiftLeft')).toHaveTextContent('Shift');
    expect(key('Space')).toHaveTextContent('');
  });

  it('shows the letters of the Russian layout on the same keys', () => {
    const key = renderKeyboard({ layout: ruJcuken });
    expect(key('KeyQ')).toHaveTextContent('Й');
    expect(key('KeyF')).toHaveTextContent('А');
    expect(key('Slash')).toHaveTextContent('.');
  });

  it('colors the keys in use and mutes the others', () => {
    const key = renderKeyboard();
    expect(key('KeyA')).toHaveAttribute('data-open');
    expect(key('Space')).toHaveAttribute('data-open');
    expect(key('Digit1')).not.toHaveAttribute('data-open');
    expect(key('Tab')).not.toHaveAttribute('data-open');
  });

  it('highlights the next key only', () => {
    const key = renderKeyboard({ nextCode: 'KeyF' });
    expect(key('KeyF')).toHaveAttribute('data-next');
    expect(key('KeyJ')).not.toHaveAttribute('data-next');
  });

  it('highlights several keys and marks mastered ones', () => {
    const key = renderKeyboard({
      highlightCodes: new Set(['KeyD', 'KeyK']),
      masteredCodes: new Set(['KeyF']),
    });
    expect(key('KeyD')).toHaveAttribute('data-next');
    expect(key('KeyK')).toHaveAttribute('data-next');
    expect(key('KeyF')).toHaveAttribute('data-mastered');
    expect(key('KeyJ')).not.toHaveAttribute('data-mastered');
  });

  it('flashes the last pressed key', () => {
    const key = renderKeyboard({ flash: { code: 'KeyD', correct: false, seq: 3 } });
    expect(key('KeyD')?.querySelector('.kd-flash-bad')).not.toBeNull();
    expect(key('KeyF')?.querySelector('.kd-flash')).toBeNull();
  });
});
