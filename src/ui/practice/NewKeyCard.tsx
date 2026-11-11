import { useTranslation } from 'react-i18next';

import type { Geometry } from '../../engine/layout/geometry';
import type { Layout } from '../../engine/layout/layout';
import { reachFromHome } from '../../engine/layout/reach';
import { Button } from '../components/Button';
import { Kbd } from '../components/Kbd';
import { FINGER_BG } from './fingerColors';
import { Keyboard } from './Keyboard';
import { charLabel, codesFor } from './keyCodes';
import { useKeyLabel } from './useKeyLabel';

interface NewKeyCardProps {
  layout: Layout;
  geometry: Geometry;
  /** Keys being introduced. */
  keys: readonly string[];
  /** Keys already open, drawn in finger colors. */
  openKeys: readonly string[];
  onStart: () => void;
}

/**
 * Shown before the first lesson with new keys (docs/screens.md, section 4):
 * where the key is, which finger presses it and where that finger moves from.
 */
export function NewKeyCard({ layout, geometry, keys, openKeys, onStart }: NewKeyCardProps) {
  const { t } = useTranslation();
  const keyLabel = useKeyLabel(layout);
  const labels = keys.map((key) => charLabel(layout, key, t('keyboard.space')));
  const newCodes = codesFor(layout, keys);
  // The space bar is in every lesson, so it is drawn as open too.
  const openCodes = codesFor(layout, [...openKeys, ...keys, ' ']);

  return (
    <section className="mx-auto flex max-w-4xl flex-col items-center gap-6 py-10 text-center">
      <h1 className="text-3xl font-semibold">
        {t(keys.length === 1 ? 'newKey.titleOne' : 'newKey.titleMany', {
          keys: labels.join(', '),
        })}
      </h1>

      <ul className="flex flex-col gap-2">
        {[...newCodes].map((code) => {
          const reach = reachFromHome(geometry, code);
          if (!reach) return null;
          const finger = t(`practice.finger.${reach.finger}`);
          const direction = t(`newKey.direction.${reach.direction}`, {
            key: keyLabel(reach.home) || t('keyboard.space'),
          });
          return (
            <li key={code} className="flex items-center justify-center gap-3 text-lg">
              <kbd
                className={`min-w-10 rounded-md px-2 py-1 font-mono text-xl text-ink ${FINGER_BG[reach.finger]}`}
              >
                {keyLabel(code) || t('keyboard.space')}
              </kbd>
              <span>
                {finger}, {direction}
              </span>
            </li>
          );
        })}
      </ul>

      <Keyboard
        layout={layout}
        geometry={geometry}
        openCodes={openCodes}
        highlightCodes={newCodes}
      />

      <p className="max-w-xl text-ink-muted">{t('newKey.hint')}</p>
      <Button variant="primary" onClick={onStart} className="px-6 py-3 text-lg">
        {t('newKey.start')} <Kbd>Enter</Kbd>
      </Button>
    </section>
  );
}
