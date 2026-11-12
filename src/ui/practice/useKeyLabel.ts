import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import type { KeyCode, Layout } from '../../engine/layout/layout';

const NAMED_KEYS = {
  Backspace: 'keyboard.backspace',
  Tab: 'keyboard.tab',
  CapsLock: 'keyboard.capsLock',
  Enter: 'keyboard.enter',
  ShiftLeft: 'keyboard.shift',
  ShiftRight: 'keyboard.shift',
} as const;

function isNamedKey(code: KeyCode): code is keyof typeof NAMED_KEYS {
  return Object.hasOwn(NAMED_KEYS, code);
}

/**
 * The character a key types with Shift, when it is not just the capital of the
 * key's letter: "!" on 1, "," on the ЙЦУКЕН full stop key. Empty otherwise.
 */
export function shiftLabel(layout: Layout, code: KeyCode): string {
  const chars = layout.keys[code];
  if (!chars || code === 'Space') return '';
  return chars.shift === chars.base.toLocaleUpperCase(layout.language) ? '' : chars.shift;
}

/**
 * Returns a function that gives the label of a key: its character in upper case,
 * or a name for keys such as Shift. The space bar has no label.
 */
export function useKeyLabel(layout: Layout): (code: KeyCode) => string {
  const { t } = useTranslation();
  return useCallback(
    (code: KeyCode) => {
      if (isNamedKey(code)) return t(NAMED_KEYS[code]);
      const chars = layout.keys[code];
      if (!chars || code === 'Space') return '';
      return chars.base.toLocaleUpperCase(layout.language);
    },
    [layout, t],
  );
}
