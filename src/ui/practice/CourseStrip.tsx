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

/**
 * Keys of the course stage (docs/screens.md, "Состояния клавиши в полосе курса"):
 * closed, open with confidence fill, mastered, and the focus key.
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
              className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-line font-mono text-sm text-ink-muted"
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
            className={`relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-md border border-line bg-surface font-mono text-sm font-medium ${focus ? 'ring-2 ring-accent ring-offset-1 ring-offset-canvas' : ''}`}
          >
            <span className="sr-only">
              {description}
              {focus ? `. ${t('course.focus')}` : ''}
            </span>
            {/* Confidence fills the key from the bottom. */}
            <span
              aria-hidden="true"
              className={`absolute inset-x-0 bottom-0 ${mastered ? 'bg-ok/25' : 'bg-accent/20'}`}
              style={{ height: `${mastered ? 100 : percent}%` }}
            />
            <span aria-hidden="true" className="relative">
              {label}
            </span>
            {mastered && (
              <span
                aria-hidden="true"
                className="absolute top-0 right-0.5 text-[0.6rem] leading-none font-bold text-ok"
              >
                ✓
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
