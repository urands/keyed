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
 * The characters on a key. The extra ISO key by the left Shift has its own
 * characters on European layouts ("<" and ">"); the English and Russian
 * layouts do not describe it, so it shows the backslash key. Lessons never use it.
 */
function charsOf(layout: Layout, code: KeyCode) {
  return layout.keys[code] ?? (code === 'IntlBackslash' ? layout.keys.Backslash : undefined);
}

/** The key's character in upper case when Shift types that capital, as it is otherwise. */
function mainLabel(layout: Layout, chars: { base: string; shift: string }): string {
  const upper = chars.base.toLocaleUpperCase(layout.language);
  return chars.shift === upper ? upper : chars.base;
}

/**
 * The character a key types with Shift, when it is not just the capital of the
 * key's letter: "!" on 1, "," on the ЙЦУКЕН full stop key. Empty otherwise.
 */
export function shiftLabel(layout: Layout, code: KeyCode): string {
  const chars = charsOf(layout, code);
  if (!chars || code === 'Space') return '';
  return chars.shift === chars.base.toLocaleUpperCase(layout.language) || chars.shift === chars.base
    ? ''
    : chars.shift;
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
      const chars = charsOf(layout, code);
      if (!chars || code === 'Space') return '';
      return mainLabel(layout, chars);
    },
    [layout, t],
  );
}
