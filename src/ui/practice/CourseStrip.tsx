import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { Layout } from '../../engine/layout/layout';
import type { StageProgress } from '../../engine/progress/progress';
import { percentFloor } from '../format';
import { charLabel } from './keyCodes';

interface CourseStripProps {
  layout: Layout;
  /** All keys of the stage in the order they open. */
  keys: readonly string[];
  progress: StageProgress;
}

const CHIP =
  'relative flex h-7 min-w-7 items-center justify-center gap-0.5 overflow-hidden rounded-lg px-1.5 font-mono text-sm font-semibold';

/**
 * Keys of the course stage (docs/screens.md, "Состояния клавиши в полосе курса"):
 * closed with a dashed border, open with confidence fill, mastered filled with a
 * check, and the focus key with a ring.
 */
export function CourseStrip({ layout, keys, progress }: CourseStripProps) {
  const { t } = useTranslation();
  const open = new Set(progress.open);

  return (
    <ol aria-label={t('course.strip')} className="flex flex-wrap justify-center gap-1">
      {keys.map((key) => {
        const label = charLabel(layout, key, t('keyboard.space'));
        if (!open.has(key)) {
          return (
            <li
              key={key}
              data-key-state="closed"
              className={`${CHIP} border border-dashed border-line font-medium text-ink-muted`}
            >
              <span className="sr-only">{t('course.closed', { key: label })}</span>
              <span aria-hidden="true">{label}</span>
            </li>
          );
        }
        const percent = percentFloor(progress.confidence[key] ?? 0);
        const mastered = progress.mastered.has(key);
        const focus = progress.focus === key;
        const description = mastered
          ? t('course.mastered', { key: label })
          : t('course.open', { key: label, percent });
        return (
          <li
            key={key}
            data-key-state={mastered ? 'mastered' : 'open'}
            data-focus={focus || undefined}
            title={focus ? `${description}. ${t('course.focus')}` : description}
            className={`${CHIP} ${mastered ? 'bg-accent text-on-accent' : 'border border-line bg-surface-2 text-ink'} ${focus ? 'shadow-glow ring-2 ring-accent-2 ring-offset-2 ring-offset-canvas' : ''}`}
          >
            <span className="sr-only">
              {description}
              {focus ? `. ${t('course.focus')}` : ''}
            </span>
            {/* Confidence fills the key from the bottom. */}
            {!mastered && (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 bg-accent/25"
                style={{ height: `${percent}%` }}
              />
            )}
            <span aria-hidden="true" className="relative">
              {label}
            </span>
            {mastered && <Check aria-hidden="true" size={12} strokeWidth={3} />}
          </li>
        );
      })}
    </ol>
  );
}
