import type { Geometry } from '../../engine/layout/geometry';
import { keyForChar, type KeyCode, type Layout } from '../../engine/layout/layout';
import { shiftFor } from '../../engine/layout/reach';

/** The presses that type a character: the dead key first, if it needs one. */
function pressesOf(layout: Layout, char: string): { code: KeyCode; shift: boolean }[] {
  const stroke = keyForChar(layout, char);
  if (!stroke) return [];
  return stroke.dead ? [stroke.dead, stroke] : [stroke];
}

/** Physical keys that type the given characters; characters the layout lacks are skipped. */
export function codesFor(layout: Layout, chars: Iterable<string>): Set<KeyCode> {
  const codes = new Set<KeyCode>();
  for (const char of chars) {
    for (const press of pressesOf(layout, char)) codes.add(press.code);
  }
  return codes;
}

/**
 * The key to press next for a character and the Shift to hold with it (on the
 * other hand; null without Shift). A letter with a dead key starts with the
 * dead key; once it is pressed (`deadPressed`), the letter comes next.
 */
export function nextPress(
  layout: Layout,
  geometry: Geometry,
  char: string,
  deadPressed: boolean,
): { code: KeyCode; shift: KeyCode | null } | null {
  const presses = pressesOf(layout, char);
  const press = deadPressed ? presses.at(-1) : presses[0];
  if (!press) return null;
  return { code: press.code, shift: press.shift ? shiftFor(geometry, press.code) : null };
}

/** Like `codesFor`, with the Shift keys these characters need. */
export function codesWithShift(
  layout: Layout,
  geometry: Geometry,
  chars: Iterable<string>,
): Set<KeyCode> {
  const codes = new Set<KeyCode>();
  for (const char of chars) {
    for (const press of pressesOf(layout, char)) {
      codes.add(press.code);
      const shift = press.shift ? shiftFor(geometry, press.code) : null;
      if (shift) codes.add(shift);
    }
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
 * as they are. A letter whose key has no capital of it stays small: "é" on
 * AZERTY types "2" with Shift, "ß" on QWERTZ types "?".
 */
export function charLabel(layout: Layout, char: string, spaceName: string): string {
  if (char === ' ') return spaceName;
  const upper = char.toLocaleUpperCase(layout.language);
  const lower = char.toLocaleLowerCase(layout.language);
  if (upper === lower) return char;
  if (char === upper) return `⇧${upper}`;
  const sameKey = keyForChar(layout, upper)?.code === keyForChar(layout, char)?.code;
  return sameKey ? upper : char;
}
