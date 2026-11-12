import { memo, type CSSProperties } from 'react';

import type { Finger, Geometry } from '../../engine/layout/geometry';
import type { KeyCode, Layout } from '../../engine/layout/layout';
import { FINGER_BG } from './fingerColors';
import { shiftLabel, useKeyLabel } from './useKeyLabel';

export interface KeyFlash {
  code: KeyCode;
  correct: boolean;
  seq: number;
}

interface KeyProps {
  code: KeyCode;
  label: string;
  /** The character with Shift, drawn above the main one; empty when it is the capital. */
  shifted: string;
  width: number;
  gap: number;
  /** The width of the lower part of a key two rows high (ISO Enter). */
  tall: number | undefined;
  finger: Finger;
  open: boolean;
  /** Drawn with a ring: the key to press now, or a key being introduced. */
  highlighted: boolean;
  mastered: boolean;
  homing: boolean;
  /** Changes with every press of this key; 0 when this key was not the last pressed. */
  flashSeq: number;
  flashCorrect: boolean;
}

// Memoized: a key press re-renders only the keys whose state changed.
const Key = memo(function Key({
  code,
  label,
  shifted,
  width,
  gap,
  tall,
  finger,
  open,
  highlighted,
  mastered,
  homing,
  flashSeq,
  flashCorrect,
}: KeyProps) {
  const look = open
    ? `${FINGER_BG[finger]} border-transparent text-key-ink`
    : 'border-line/70 bg-surface-2 text-ink-muted';
  return (
    <div
      className="h-(--u) p-[3px]"
      style={{
        width: `calc(var(--u) * ${width})`,
        marginLeft: gap > 0 ? `calc(var(--u) * ${gap})` : undefined,
      }}
    >
      <div
        data-code={code}
        data-open={open || undefined}
        data-next={highlighted || undefined}
        data-mastered={mastered || undefined}
        data-tall={tall === undefined ? undefined : true}
        className={`relative flex h-full items-center justify-center rounded-lg border select-none ${look} ${label.length > 1 ? 'text-[0.8em]' : 'text-[1.15em] font-semibold'} ${highlighted ? 'z-10 font-bold shadow-glow ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''} ${tall === undefined ? '' : 'rounded-br-none'}`}
      >
        {tall !== undefined && (
          // The lower part reaches into the empty end of the next row.
          <span
            className={`absolute top-full -right-px rounded-b-lg border border-t-0 ${look}`}
            style={{ width: `calc(var(--u) * ${tall} - 6px)`, height: 'calc(var(--u) + 1px)' }}
          />
        )}
        {shifted === '' ? (
          label
        ) : (
          <span className="flex flex-col items-center leading-none">
            <span className="text-[0.7em] opacity-70">{shifted}</span>
            <span>{label}</span>
          </span>
        )}
        {homing && (
          <span className="absolute bottom-[14%] h-[3px] w-1/4 rounded-full bg-current opacity-50" />
        )}
        {mastered && (
          <span className="absolute top-0.5 right-1 text-[0.6rem] leading-none font-bold">✓</span>
        )}
        {flashSeq > 0 && (
          // A new element per press restarts the CSS animation.
          <span
            key={flashSeq}
            className={`kd-flash ${flashCorrect ? 'kd-flash-ok' : 'kd-flash-bad'}`}
          />
        )}
      </div>
    </div>
  );
});

const NONE: ReadonlySet<KeyCode> = new Set();

interface KeyboardProps {
  layout: Layout;
  geometry: Geometry;
  /** Keys in use, colored by finger; the others are drawn muted. */
  openCodes: ReadonlySet<KeyCode>;
  /** The key to press now, and the Shift to hold with it. */
  nextCode?: KeyCode | null;
  nextShift?: KeyCode | null;
  /** More keys to draw like the next key, such as keys being introduced. */
  highlightCodes?: ReadonlySet<KeyCode>;
  /** Keys that get a check mark. */
  masteredCodes?: ReadonlySet<KeyCode>;
  flash?: KeyFlash | null;
  /** A fixed key size (CSS length) instead of one that follows the window. */
  keySize?: string;
}

/** Virtual keyboard with finger zones. A visual hint only, hidden from screen readers. */
export function Keyboard({
  layout,
  geometry,
  openCodes,
  nextCode = null,
  nextShift = null,
  highlightCodes = NONE,
  masteredCodes = NONE,
  flash = null,
  keySize,
}: KeyboardProps) {
  const label = useKeyLabel(layout);
  return (
    <div
      aria-hidden="true"
      className="kd-keyboard mx-auto flex w-max flex-col text-[calc(var(--u)*0.36)]"
      style={keySize === undefined ? undefined : ({ '--u': keySize } as CSSProperties)}
    >
      {geometry.rows.map((row, r) => (
        <div key={r} className="flex">
          {row.map(({ code, width, gap, tall }) => (
            <Key
              key={code}
              code={code}
              label={label(code)}
              shifted={shiftLabel(layout, code)}
              width={width}
              gap={gap}
              tall={tall}
              finger={geometry.fingers[code] ?? 'thumb'}
              open={openCodes.has(code)}
              highlighted={code === nextCode || code === nextShift || highlightCodes.has(code)}
              mastered={masteredCodes.has(code)}
              homing={geometry.homing.includes(code)}
              flashSeq={flash?.code === code ? flash.seq : 0}
              flashCorrect={flash?.code === code && flash.correct}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
