import type { Finger } from '../../engine/layout/geometry';

// Full class names, so that Tailwind finds them in the source.
export const FINGER_BG: Record<Finger, string> = {
  lPinky: 'bg-finger-l-pinky',
  lRing: 'bg-finger-l-ring',
  lMiddle: 'bg-finger-l-middle',
  lIndex: 'bg-finger-l-index',
  thumb: 'bg-finger-thumb',
  rIndex: 'bg-finger-r-index',
  rMiddle: 'bg-finger-r-middle',
  rRing: 'bg-finger-r-ring',
  rPinky: 'bg-finger-r-pinky',
};
