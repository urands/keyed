import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import type { Finger, Geometry } from '../../engine/layout/geometry';
import { keyForChar, type Layout } from '../../engine/layout/layout';
import { reachFromHome, shiftFor } from '../../engine/layout/reach';
import type { StageKind } from '../../engine/progress/course';
import { Button } from '../components/Button';
import { Kbd } from '../components/Kbd';
import { FINGER_BG } from './fingerColors';
import { Hand } from './Hands';
import { Keyboard } from './Keyboard';
import { charLabel, codesWithShift, inlineLabel } from './keyCodes';
import { useKeyLabel } from './useKeyLabel';

/** Names of marks in translation keys ("newKey.notes.<layout>.<name>"). */
const MARK_NAMES: Record<string, string> = {
  '.': 'period',
  ',': 'comma',
  '!': 'exclamation',
  '?': 'question',
  ':': 'colon',
  ';': 'semicolon',
  '"': 'quote',
  "'": 'apostrophe',
  '-': 'hyphen',
  '(': 'parenLeft',
  ')': 'parenRight',
};

interface NewKeyCardProps {
  layout: Layout;
  geometry: Geometry;
  /** Keys being introduced. */
  keys: readonly string[];
  /** Keys already open, drawn in finger colors. */
  openKeys: Iterable<string>;
  /** Set when these keys start a new stage of the course. */
  stage?: StageKind | null;
  onStart: () => void;
}

/**
 * Shown before the first lesson with new keys (docs/screens.md, section 4):
 * where the key is, which finger presses it and where that finger moves from.
 * A key with Shift also says which Shift: always the one of the other hand.
 */
export function NewKeyCard({
  layout,
  geometry,
  keys,
  openKeys,
  stage = null,
  onStart,
}: NewKeyCardProps) {
  const { t } = useTranslation();
  const keyLabel = useKeyLabel(layout);
  // Notes on marks that are not obvious on this layout, such as "," on ЙЦУКЕН.
  const notes = t(`newKey.notes.${layout.id}`, { returnObjects: true }) as Partial<
    Record<string, string>
  >;
  const labels = keys.map((key) =>
    inlineLabel(layout, key, t('keyboard.space'), (mark) => t('keyboard.quoted', { key: mark })),
  );
  const newCodes = codesWithShift(layout, geometry, keys);
  // The space bar is in every lesson, so it is drawn as open too.
  const openCodes = codesWithShift(layout, geometry, [...openKeys, ...keys, ' ']);
  const title = t(keys.length === 1 ? 'newKey.titleOne' : 'newKey.titleMany', {
    keys: labels.join(', '),
  });
  // The hands light up every finger the new keys need, Shift fingers included.
  const fingers = new Set<Finger>();
  for (const code of newCodes) {
    const finger = geometry.fingers[code];
    if (finger) fingers.add(finger);
  }

  return (
    <section className="mx-auto flex max-w-5xl flex-col items-center gap-5 py-8 text-center">
      <div className="kd-card flex w-full flex-col items-center gap-5 px-8 py-7">
        {stage === null ? (
          <h1 className="text-3xl font-semibold">{title}</h1>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <p className="rounded-full bg-accent-2/15 px-3 py-1 text-sm font-medium text-accent-2">
              {t('newKey.stageBadge')}
            </p>
            <h1 className="text-3xl font-semibold">
              {t('newKey.stageTitle', { name: t(`stage.${stage}`) })}
            </h1>
            <p className="max-w-xl text-lg text-ink-muted">{t(`newKey.stage.${stage}`)}</p>
            <h2 className="text-xl font-medium">{title}</h2>
          </div>
        )}

        <ul className="flex flex-col gap-2">
          {keys.map((char) => {
            const stroke = keyForChar(layout, char);
            const reach = stroke ? reachFromHome(geometry, stroke.code) : null;
            if (!stroke || !reach) return null;
            const shift = stroke.shift ? shiftFor(geometry, stroke.code) : null;
            const finger = t(`practice.finger.${reach.finger}`);
            const direction = t(`newKey.direction.${reach.direction}`, {
              key: keyLabel(reach.home) || t('keyboard.space'),
            });
            const markName = MARK_NAMES[char];
            const note = markName === undefined ? undefined : notes[markName];
            return (
              <li key={char} className="flex flex-col items-center gap-1">
                <span className="flex items-center justify-center gap-3 text-lg">
                  <kbd
                    className={`min-w-10 rounded-lg px-2 py-1 font-mono text-xl font-semibold text-key-ink ${FINGER_BG[reach.finger]}`}
                  >
                    {charLabel(layout, char, t('keyboard.space'))}
                  </kbd>
                  <span>
                    {finger}, {direction}
                  </span>
                </span>
                {shift !== null && (
                  <span className="max-w-xl">
                    {t(
                      shift === 'ShiftLeft'
                        ? 'newKey.holdShift.ShiftLeft'
                        : 'newKey.holdShift.ShiftRight',
                      {
                        key: keyLabel(stroke.code),
                      },
                    )}
                  </span>
                )}
                {note !== undefined && <span className="max-w-xl text-ink-muted">{note}</span>}
              </li>
            );
          })}
        </ul>

        <div
          className="kd-keyboard flex items-end justify-center gap-[calc(var(--u)*0.4)]"
          style={{ '--kd-cols': 22.6 } as CSSProperties}
        >
          <Hand side="left" active={fingers} className="w-[calc(var(--u)*3.4)] shrink-0" />
          <Keyboard
            layout={layout}
            geometry={geometry}
            openCodes={openCodes}
            highlightCodes={newCodes}
          />
          <Hand side="right" active={fingers} className="w-[calc(var(--u)*3.4)] shrink-0" />
        </div>

        <p className="max-w-xl text-ink-muted">
          {keys.some((key) => keyForChar(layout, key)?.shift)
            ? t('newKey.shiftHint')
            : t('newKey.hint')}
        </p>
        <Button variant="primary" onClick={onStart} className="px-6 py-3 text-lg">
          {t('newKey.start')} <Kbd>{t('keyboard.enter')}</Kbd>
        </Button>
      </div>
    </section>
  );
}
