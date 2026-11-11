import { isOneOf, isRecord, isSingleChar } from '../validate';

/** Physical key, as in `KeyboardEvent.code`: "KeyA", "Semicolon", "Space". */
export type KeyCode = string;

export const LAYOUT_IDS = ['en-us-qwerty', 'ru-jcuken'] as const;
export type LayoutId = (typeof LAYOUT_IDS)[number];

export const LAYOUT_LANGUAGES = ['en', 'ru'] as const;
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
}

/** The key press that types a character. */
export interface KeyStroke {
  code: KeyCode;
  shift: boolean;
}

export function parseLayout(data: unknown): Layout {
  if (!isRecord(data)) throw new Error('Layout: expected an object');
  const { id, language, keys } = data;
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
  return { id, language, keys: parsed };
}

const strokeCache = new WeakMap<Layout, Map<string, KeyStroke>>();

/** Finds the key that types `char`; a character on two keys resolves to the first one. */
export function keyForChar(layout: Layout, char: string): KeyStroke | null {
  let strokes = strokeCache.get(layout);
  if (!strokes) {
    strokes = new Map();
    for (const [code, { base, shift }] of Object.entries(layout.keys)) {
      if (!strokes.has(base)) strokes.set(base, { code, shift: false });
      if (!strokes.has(shift)) strokes.set(shift, { code, shift: true });
    }
    strokeCache.set(layout, strokes);
  }
  return strokes.get(char) ?? null;
}
