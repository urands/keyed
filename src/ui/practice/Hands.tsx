import type { Finger } from '../../engine/layout/geometry';

type Digit = 'pinky' | 'ring' | 'middle' | 'index' | 'thumb';

/** One capsule per finger of the left hand, seen from above; the right hand is its mirror. */
const FINGER_SHAPES: Record<Digit, { x: number; top: number; bottom: number; angle: number }> = {
  pinky: { x: 21, top: 33, bottom: 78, angle: -8 },
  ring: { x: 36, top: 14, bottom: 74, angle: -3 },
  middle: { x: 51, top: 6, bottom: 72, angle: 0 },
  index: { x: 66, top: 16, bottom: 74, angle: 4 },
  thumb: { x: 0, top: -36, bottom: 0, angle: 0 },
};

const FINGER_WIDTH = 14;
const DIGITS: readonly Digit[] = ['pinky', 'ring', 'middle', 'index', 'thumb'];

function fingerOf(side: 'left' | 'right', digit: Digit): Finger {
  if (digit === 'thumb') return 'thumb';
  const name = `${digit[0]?.toUpperCase() ?? ''}${digit.slice(1)}`;
  return `${side === 'left' ? 'l' : 'r'}${name}` as Finger;
}

// Full class names, so that Tailwind finds them in the source.
const FINGER_FILL: Record<Finger, string> = {
  lPinky: 'fill-finger-l-pinky',
  lRing: 'fill-finger-l-ring',
  lMiddle: 'fill-finger-l-middle',
  lIndex: 'fill-finger-l-index',
  thumb: 'fill-finger-thumb',
  rIndex: 'fill-finger-r-index',
  rMiddle: 'fill-finger-r-middle',
  rRing: 'fill-finger-r-ring',
  rPinky: 'fill-finger-r-pinky',
};

const FINGER_VAR: Record<Finger, string> = {
  lPinky: '--kd-finger-l-pinky',
  lRing: '--kd-finger-l-ring',
  lMiddle: '--kd-finger-l-middle',
  lIndex: '--kd-finger-l-index',
  thumb: '--kd-finger-thumb',
  rIndex: '--kd-finger-r-index',
  rMiddle: '--kd-finger-r-middle',
  rRing: '--kd-finger-r-ring',
  rPinky: '--kd-finger-r-pinky',
};

function FingerShape({ digit, className }: { digit: Digit; className?: string }) {
  const { x, top, bottom, angle } = FINGER_SHAPES[digit];
  const rect = (
    <rect
      x={x - FINGER_WIDTH / 2}
      y={top}
      width={FINGER_WIDTH + (digit === 'thumb' ? 1 : 0)}
      height={bottom - top}
      rx={FINGER_WIDTH / 2}
      className={className}
    />
  );
  // The thumb grows from the lower right of the palm, pointing up and out.
  if (digit === 'thumb') return <g transform="translate(77 92) rotate(46)">{rect}</g>;
  return <g transform={`rotate(${angle} ${x} ${bottom})`}>{rect}</g>;
}

function Palm({ className }: { className?: string }) {
  return (
    <>
      <rect x="12" y="52" width="68" height="58" rx="26" className={className} />
      <rect x="24" y="96" width="46" height="30" rx="10" className={className} />
    </>
  );
}

interface HandProps {
  side: 'left' | 'right';
  /** Fingers to light up: the one for the next key and the one on Shift. */
  active: ReadonlySet<Finger>;
  className?: string;
}

/**
 * One hand of the hand hint (docs/screens.md, section 3): every finger tinted
 * with its zone color, the fingers in use lit up. A visual hint only; the text
 * under the keyboard says the same.
 */
export function Hand({ side, active, className = '' }: HandProps) {
  const mirror = side === 'right' ? 'translate(100 0) scale(-1 1)' : undefined;
  return (
    <svg
      viewBox="0 0 100 120"
      aria-hidden="true"
      data-hand={side}
      className={`overflow-visible ${className}`}
    >
      <g transform={mirror}>
        {/* The outline of the whole hand: every part drawn wide, then filled over. */}
        <g className="fill-line stroke-line" strokeWidth="3.5" strokeLinejoin="round">
          <Palm />
          {DIGITS.map((digit) => (
            <FingerShape key={digit} digit={digit} />
          ))}
        </g>
        <g className="fill-surface-2">
          <Palm />
          {DIGITS.map((digit) => (
            <FingerShape key={digit} digit={digit} />
          ))}
        </g>
        {DIGITS.map((digit) => {
          const finger = fingerOf(side, digit);
          const lit = active.has(finger);
          return (
            <g
              key={digit}
              data-finger={finger}
              data-active={lit || undefined}
              opacity={lit ? 1 : 0.35}
              strokeWidth={lit ? 2.5 : 0}
              style={
                lit ? { filter: `drop-shadow(0 0 5px var(${FINGER_VAR[finger]}))` } : undefined
              }
            >
              <FingerShape
                digit={digit}
                className={`${FINGER_FILL[finger]} ${lit ? 'stroke-accent' : ''}`}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
