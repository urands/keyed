import type { Geometry } from '../../engine/layout/geometry';
import { keyForChar, type KeyCode, type Layout } from '../../engine/layout/layout';
import { shiftFor } from '../../engine/layout/reach';

/** Physical keys that type the given characters; characters the layout lacks are skipped. */
export function codesFor(layout: Layout, chars: Iterable<string>): Set<KeyCode> {
  const codes = new Set<KeyCode>();
  for (const char of chars) {
    const stroke = keyForChar(layout, char);
    if (stroke) codes.add(stroke.code);
  }
  return codes;
}

/** The Shift to hold for a character: on the other hand; null without Shift. */
export function shiftCodeFor(layout: Layout, geometry: Geometry, char: string): KeyCode | null {
  const stroke = keyForChar(layout, char);
  return stroke?.shift ? shiftFor(geometry, stroke.code) : null;
}

/** Like `codesFor`, with the Shift keys these characters need. */
export function codesWithShift(
  layout: Layout,
  geometry: Geometry,
  chars: Iterable<string>,
): Set<KeyCode> {
  const codes = new Set<KeyCode>();
  for (const char of chars) {
    const stroke = keyForChar(layout, char);
    if (!stroke) continue;
    codes.add(stroke.code);
    const shift = stroke.shift ? shiftFor(geometry, stroke.code) : null;
    if (shift) codes.add(shift);
  }
  return codes;
}

/**
 * A character inside a sentence: like `charLabel`, with marks put in quotes by
 * `quote`, so "," reads as «,» and not as part of the sentence.
 */
export function inlineLabel(
  layout: Layout,
  char: string,
  spaceName: string,
  quote: (key: string) => string,
): string {
  return /^[\p{L}\p{Nd} ]$/u.test(char) ? charLabel(layout, char, spaceName) : quote(char);
}

/**
 * A character as the user sees it: a letter as on its key (upper case), a
 * capital with the Shift sign ("⇧F"), the space bar by name, other characters
 * as they are.
 */
export function charLabel(layout: Layout, char: string, spaceName: string): string {
  if (char === ' ') return spaceName;
  const upper = char.toLocaleUpperCase(layout.language);
  const lower = char.toLocaleLowerCase(layout.language);
  if (upper === lower) return char;
  return char === upper ? `⇧${upper}` : upper;
}
