import { isOneOf, isRecord, isSingleChar } from '../validate';

/** Physical key, as in `KeyboardEvent.code`: "KeyA", "Semicolon", "Space". */
export type KeyCode = string;

export const LAYOUT_IDS = [
  'en-us-qwerty',
  'ru-jcuken',
  'de-qwertz',
  'fr-azerty',
  'es-qwerty',
] as const;
export type LayoutId = (typeof LAYOUT_IDS)[number];

export const LAYOUT_LANGUAGES = ['en', 'ru', 'de', 'fr', 'es'] as const;
export type LayoutLanguage = (typeof LAYOUT_LANGUAGES)[number];

export interface KeyChars {
  base: string;
  shift: string;
}

/**
 * Which character each physical key types. Where the keys are and which finger
 * presses them is described separately, in `Geometry`.
 */
export interface Layout {
  id: LayoutId;
  language: LayoutLanguage;
  keys: Readonly<Record<KeyCode, KeyChars>>;
  /**
   * Dead keys: an accent types nothing by itself and changes the next letter.
   * Accent → letter → result: "´" → "e" → "é". The accent is a character on
   * one of the keys.
   */
  dead: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

/** The key press that types a character. */
export interface KeyStroke {
  code: KeyCode;
  shift: boolean;
  /** The dead key pressed first, for a letter with an accent: "´" for "é". */
  dead?: { code: KeyCode; shift: boolean };
}

export function parseLayout(data: unknown): Layout {
  if (!isRecord(data)) throw new Error('Layout: expected an object');
  const { id, language, keys, dead = {} } = data;
  if (!isOneOf(LAYOUT_IDS, id)) throw new Error(`Layout: unknown id "${String(id)}"`);
  if (!isOneOf(LAYOUT_LANGUAGES, language)) {
    throw new Error(`Layout ${id}: unknown language "${String(language)}"`);
  }
  if (!isRecord(keys)) throw new Error(`Layout ${id}: "keys" must be an object`);

  const parsed: Record<KeyCode, KeyChars> = {};
  for (const [code, chars] of Object.entries(keys)) {
    if (!isRecord(chars) || !isSingleChar(chars.base) || !isSingleChar(chars.shift)) {
      throw new Error(`Layout ${id}: key ${code} needs one "base" and one "shift" character`);
    }
    parsed[code] = { base: chars.base, shift: chars.shift };
  }

  if (!isRecord(dead)) throw new Error(`Layout ${id}: "dead" must be an object`);
  const onKeys = new Set(Object.values(parsed).flatMap(({ base, shift }) => [base, shift]));
  const deadKeys: Record<string, Record<string, string>> = {};
  for (const [accent, table] of Object.entries(dead)) {
    if (!onKeys.has(accent)) throw new Error(`Layout ${id}: dead key "${accent}" is on no key`);
    if (!isRecord(table)) throw new Error(`Layout ${id}: dead key "${accent}" needs a table`);
    const results: Record<string, string> = {};
    for (const [letter, result] of Object.entries(table)) {
      if (!isSingleChar(letter) || !onKeys.has(letter) || !isSingleChar(result)) {
        throw new Error(`Layout ${id}: dead key "${accent}" has a bad entry "${letter}"`);
      }
      results[letter] = result;
    }
    deadKeys[accent] = results;
  }
  return { id, language, keys: parsed, dead: deadKeys };
}

/** True when the character is a dead key's accent on this layout. */
export function isDeadKey(layout: Layout, char: string): boolean {
  return Object.hasOwn(layout.dead, char);
}

const strokeCache = new WeakMap<Layout, Map<string, KeyStroke>>();

/**
 * Finds the key that types `char`; a character on two keys resolves to the
 * first one. A character that no key types by itself may come from a dead key
 * and a letter: then `dead` is the dead key to press first.
 */
export function keyForChar(layout: Layout, char: string): KeyStroke | null {
  let strokes = strokeCache.get(layout);
  if (!strokes) {
    strokes = new Map();
    for (const [code, { base, shift }] of Object.entries(layout.keys)) {
      if (!strokes.has(base)) strokes.set(base, { code, shift: false });
      if (!strokes.has(shift)) strokes.set(shift, { code, shift: true });
    }
    const direct = new Map(strokes);
    for (const [accent, table] of Object.entries(layout.dead)) {
      const dead = direct.get(accent);
      for (const [letter, result] of Object.entries(table)) {
        const stroke = direct.get(letter);
        if (dead && stroke && !strokes.has(result)) strokes.set(result, { ...stroke, dead });
      }
    }
    strokeCache.set(layout, strokes);
  }
  return strokes.get(char) ?? null;
}

/**
 * The time allowance of each character on this layout: 1 for a key press,
 * `allowance` for a press with Shift. A letter with a dead key is two presses,
 * so "é" typed as "´" and "e" gets 2.
 */
export function shiftAllowance(layout: Layout, allowance: number): (char: string) => number {
  const press = (stroke: { shift: boolean }) => (stroke.shift ? allowance : 1);
  return (char) => {
    const stroke = keyForChar(layout, char);
    if (!stroke) return 1;
    return press(stroke) + (stroke.dead ? press(stroke.dead) : 0);
  };
}
