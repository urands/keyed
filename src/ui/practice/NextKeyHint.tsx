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

/** The key to press now and the finger that presses it, with Shift when it is needed. */
export function NextKeyHint({ layout, geometry, code, shift = null }: NextKeyHintProps) {
  const { t } = useTranslation();
  const label = useKeyLabel(layout);
  const finger = code === null ? undefined : geometry.fingers[code];
  const shiftFinger = shift === null ? undefined : geometry.fingers[shift];

  if (code === null || !finger) return <p className="h-10" />;
  return (
    <p className="flex h-10 items-center justify-center gap-3 text-ink-muted">
      <span className="sr-only">{t('practice.nextKey')}:</span>
      {shift !== null && shiftFinger && (
        <>
          <kbd
            className={`rounded-md px-2 py-1 text-center font-mono text-lg text-ink ${FINGER_BG[shiftFinger]}`}
          >
            {t(`keyboard.${shift === 'ShiftLeft' ? 'shiftLeft' : 'shiftRight'}`)}
          </kbd>
          <span>{t(`practice.finger.${shiftFinger}`)}</span>
          <span aria-hidden="true">+</span>
        </>
      )}
      <kbd
        className={`min-w-10 rounded-md px-2 py-1 text-center font-mono text-lg text-ink ${FINGER_BG[finger]}`}
      >
        {code === 'Space' ? t('keyboard.space') : label(code)}
      </kbd>
      <span>{t(`practice.finger.${finger}`)}</span>
    </p>
  );
}
