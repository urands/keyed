import { isArray, isOneOf, isRecord } from '../validate';
import type { KeyCode } from './layout';

export const FINGERS = [
  'lPinky',
  'lRing',
  'lMiddle',
  'lIndex',
  'thumb',
  'rIndex',
  'rMiddle',
  'rRing',
  'rPinky',
] as const;
export type Finger = (typeof FINGERS)[number];

export const GEOMETRY_IDS = ['ansi', 'iso'] as const;
export type GeometryId = (typeof GEOMETRY_IDS)[number];

export interface GeometryKey {
  code: KeyCode;
  /** Width in key units; a letter key is 1. */
  width: number;
  /** Empty space before the key, in key units. */
  gap: number;
}

/** Where each physical key is and which finger presses it. Shared by all layouts. */
export interface Geometry {
  id: GeometryId;
  rows: readonly (readonly GeometryKey[])[];
  fingers: Readonly<Record<KeyCode, Finger>>;
  /** Where each finger rests in the home position. */
  home: Readonly<Record<Finger, KeyCode>>;
  /** Keys with a tactile bump for the index fingers. */
  homing: readonly KeyCode[];
}

/**
 * Reads geometry data. In the data file fingers are listed as `{ "finger": [codes] }`,
 * like the finger table in docs/learning-method.md.
 */
export function parseGeometry(data: unknown): Geometry {
  if (!isRecord(data)) throw new Error('Geometry: expected an object');
  const { id } = data;
  if (!isOneOf(GEOMETRY_IDS, id)) throw new Error(`Geometry: unknown id "${String(id)}"`);
  if (!isArray(data.rows)) throw new Error(`Geometry ${id}: "rows" must be an array`);

  const codes = new Set<KeyCode>();
  const rows = data.rows.map((row, r) => {
    if (!isArray(row)) throw new Error(`Geometry ${id}: row ${r} must be an array`);
    return row.map((key): GeometryKey => {
      if (!isRecord(key) || typeof key.code !== 'string') {
        throw new Error(`Geometry ${id}: row ${r} has a key without a code`);
      }
      const { code, width = 1, gap = 0 } = key;
      if (typeof width !== 'number' || width <= 0 || typeof gap !== 'number' || gap < 0) {
        throw new Error(`Geometry ${id}: key ${code} has a bad width or gap`);
      }
      if (codes.has(code)) throw new Error(`Geometry ${id}: key ${code} appears twice`);
      codes.add(code);
      return { code, width, gap };
    });
  });

  if (!isRecord(data.fingers)) throw new Error(`Geometry ${id}: "fingers" must be an object`);
  const fingers: Record<KeyCode, Finger> = {};
  for (const [finger, list] of Object.entries(data.fingers)) {
    if (!isOneOf(FINGERS, finger) || !isArray(list)) {
      throw new Error(`Geometry ${id}: bad finger entry "${finger}"`);
    }
    for (const code of list) {
      if (typeof code !== 'string' || !codes.has(code)) {
        throw new Error(`Geometry ${id}: finger ${finger} lists unknown key "${String(code)}"`);
      }
      if (Object.hasOwn(fingers, code)) {
        throw new Error(`Geometry ${id}: key ${code} has two fingers`);
      }
      fingers[code] = finger;
    }
  }
  for (const code of codes) {
    if (!Object.hasOwn(fingers, code)) throw new Error(`Geometry ${id}: key ${code} has no finger`);
  }

  if (!isRecord(data.home)) throw new Error(`Geometry ${id}: "home" must be an object`);
  const home = {} as Record<Finger, KeyCode>;
  for (const finger of FINGERS) {
    const code = data.home[finger];
    if (typeof code !== 'string' || fingers[code] !== finger) {
      throw new Error(`Geometry ${id}: home key of ${finger} must be one of its keys`);
    }
    home[finger] = code;
  }

  if (!isArray(data.homing)) throw new Error(`Geometry ${id}: "homing" must be an array`);
  const homing: KeyCode[] = [];
  for (const code of data.homing) {
    if (typeof code !== 'string' || !codes.has(code)) {
      throw new Error(`Geometry ${id}: unknown homing key "${String(code)}"`);
    }
    homing.push(code);
  }

  return { id, rows, fingers, home, homing };
}
