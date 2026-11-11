import { memo } from 'react';

import type { Finger, Geometry } from '../../engine/layout/geometry';
import type { KeyCode, Layout } from '../../engine/layout/layout';
import { FINGER_BG } from './fingerColors';
import { useKeyLabel } from './useKeyLabel';

export interface KeyFlash {
  code: KeyCode;
  correct: boolean;
  seq: number;
}

interface KeyProps {
  code: KeyCode;
  label: string;
  width: number;
  gap: number;
  finger: Finger;
  open: boolean;
  next: boolean;
  homing: boolean;
  /** Changes with every press of this key; 0 when this key was not the last pressed. */
  flashSeq: number;
  flashCorrect: boolean;
}

// Memoized: a key press re-renders only the keys whose state changed.
const Key = memo(function Key({
  code,
  label,
  width,
  gap,
  finger,
  open,
  next,
  homing,
  flashSeq,
  flashCorrect,
}: KeyProps) {
  const look = open
    ? `${FINGER_BG[finger]} border-transparent text-ink`
    : 'border-line bg-surface text-ink-muted';
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
        data-next={next || undefined}
        className={`relative flex h-full items-center justify-center rounded-md border select-none ${look} ${label.length > 1 ? 'text-sm' : 'text-lg font-medium'} ${next ? 'z-10 font-bold ring-3 ring-accent ring-offset-2 ring-offset-canvas' : ''}`}
      >
        {label}
        {homing && (
          <span className="absolute bottom-[14%] h-[3px] w-1/4 rounded-full bg-current opacity-50" />
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

interface KeyboardProps {
  layout: Layout;
  geometry: Geometry;
  /** Keys in use; the others are drawn muted. */
  openCodes: ReadonlySet<KeyCode>;
  /** The key to press now. */
  nextCode: KeyCode | null;
  flash: KeyFlash | null;
}

/** Virtual keyboard with finger zones. A visual hint only, hidden from screen readers. */
export function Keyboard({ layout, geometry, openCodes, nextCode, flash }: KeyboardProps) {
  const label = useKeyLabel(layout);
  return (
    <div aria-hidden="true" className="kd-keyboard mx-auto flex w-max flex-col">
      {geometry.rows.map((row, r) => (
        <div key={r} className="flex">
          {row.map(({ code, width, gap }) => (
            <Key
              key={code}
              code={code}
              label={label(code)}
              width={width}
              gap={gap}
              finger={geometry.fingers[code] ?? 'thumb'}
              open={openCodes.has(code)}
              next={code === nextCode}
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
