import type { Finger, Geometry } from './geometry';
import type { KeyCode } from './layout';

export type Direction =
  'home' | 'up' | 'down' | 'left' | 'right' | 'upLeft' | 'upRight' | 'downLeft' | 'downRight';

/** How a finger gets to a key from its home position. */
export interface Reach {
  finger: Finger;
  /** The finger's key in the home position. */
  home: KeyCode;
  direction: Direction;
}

/** Sideways shifts smaller than this, in key widths, count as straight up or down. */
const SIDEWAYS_THRESHOLD = 0.6;

function keyCenters(geometry: Geometry): Map<KeyCode, { row: number; x: number }> {
  const centers = new Map<KeyCode, { row: number; x: number }>();
  geometry.rows.forEach((keys, row) => {
    let x = 0;
    for (const key of keys) {
      x += key.gap;
      centers.set(key.code, { row, x: x + key.width / 2 });
      x += key.width;
    }
  });
  return centers;
}

/** For the new key card: which finger presses the key and which way it moves. */
export function reachFromHome(geometry: Geometry, code: KeyCode): Reach | null {
  const finger = geometry.fingers[code];
  if (!finger) return null;
  const home = geometry.home[finger];
  const centers = keyCenters(geometry);
  const target = centers.get(code);
  const start = centers.get(home);
  if (!target || !start) return null;

  const vertical = target.row < start.row ? 'up' : target.row > start.row ? 'down' : '';
  const dx = target.x - start.x;
  const sideways = Math.abs(dx) < SIDEWAYS_THRESHOLD ? '' : dx < 0 ? 'left' : 'right';
  const direction: Direction =
    vertical === '' && sideways === ''
      ? 'home'
      : vertical === ''
        ? (sideways as Direction)
        : sideways === ''
          ? vertical
          : (`${vertical}${sideways === 'left' ? 'Left' : 'Right'}` as Direction);
  return { finger, home, direction };
}
