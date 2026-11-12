import { useTranslation } from 'react-i18next';

import type { Geometry } from '../../engine/layout/geometry';
import type { KeyCode, Layout } from '../../engine/layout/layout';
import { FINGER_BG } from './fingerColors';
import { useKeyLabel } from './useKeyLabel';

interface NextKeyHintProps {
  layout: Layout;
  geometry: Geometry;
  code: KeyCode | null;
  /** The Shift to hold with the key, on the other hand. */
  shift?: KeyCode | null;
}

const KEY =
  'min-w-9 rounded-lg px-2 py-0.5 text-center font-mono text-lg font-semibold text-key-ink';

/** The key to press now and the finger that presses it, with Shift when it is needed. */
export function NextKeyHint({ layout, geometry, code, shift = null }: NextKeyHintProps) {
  const { t } = useTranslation();
  const label = useKeyLabel(layout);
  const finger = code === null ? undefined : geometry.fingers[code];
  const shiftFinger = shift === null ? undefined : geometry.fingers[shift];

  if (code === null || !finger) return <p className="h-11" />;
  return (
    <p className="flex h-11 items-center justify-center">
      <span className="flex items-center gap-2.5 rounded-full border border-line bg-surface-2 py-1 pr-4 pl-1 text-ink-muted">
        <span className="sr-only">{t('practice.nextKey')}:</span>
        {shift !== null && shiftFinger && (
          <>
            <kbd className={`${KEY} ${FINGER_BG[shiftFinger]}`}>
              {t(`keyboard.${shift === 'ShiftLeft' ? 'shiftLeft' : 'shiftRight'}`)}
            </kbd>
            <span>{t(`practice.finger.${shiftFinger}`)}</span>
            <span aria-hidden="true">+</span>
          </>
        )}
        <kbd className={`${KEY} ${FINGER_BG[finger]}`}>
          {code === 'Space' ? t('keyboard.space') : label(code)}
        </kbd>
        <span className="text-ink">{t(`practice.finger.${finger}`)}</span>
      </span>
    </p>
  );
}
