import { useTranslation } from 'react-i18next';

import type { StreakState } from '../../engine/motivation/streak';

/** Streak of days and freezes (docs/product.md, "Серия дней"). The app never scolds. */
export function StreakInfo({ streak }: { streak: StreakState }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-1">
      <p className="text-lg font-medium">
        {streak.current > 0
          ? t('streak.days', { count: streak.current })
          : streak.broken
            ? t('streak.broken', { count: streak.best })
            : t('streak.none')}
      </p>
      <p className="text-sm text-ink-muted" title={t('streak.freezesHint')}>
        <span aria-hidden="true">❄ </span>
        {t('streak.freezes', { count: streak.freezes })}
        {streak.best > streak.current && !streak.broken
          ? ` · ${t('streak.best', { count: streak.best })}`
          : ''}
      </p>
    </div>
  );
}
