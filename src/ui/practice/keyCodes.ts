import { keyForChar, type KeyCode, type Layout } from '../../engine/layout/layout';

/** Physical keys that type the given characters; characters the layout lacks are skipped. */
export function codesFor(layout: Layout, chars: Iterable<string>): Set<KeyCode> {
  const codes = new Set<KeyCode>();
  for (const char of chars) {
    const stroke = keyForChar(layout, char);
    if (stroke) codes.add(stroke.code);
  }
  return codes;
}

/** A character as the user sees it on the key: upper-case letters, the space bar by name. */
export function charLabel(layout: Layout, char: string, spaceName: string): string {
  return char === ' ' ? spaceName : char.toLocaleUpperCase(layout.language);
}
