import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { useMotivation } from '../../app/motivation';
import { usePractice } from '../../app/practice';
import { weekComparison } from '../../engine/motivation/history';
import { percentFloor, speedValue, type SpeedUnit } from '../format';
import { useToday } from './hooks';

/** A signed change with an arrow; colour is only a second cue. */
export function Delta({ value, suffix = '' }: { value: number | null; suffix?: string }) {
  if (value === null || value === 0) return null;
  const up = value > 0;
  return (
    <span className={`ml-1.5 text-sm font-medium ${up ? 'text-ok' : 'text-error'}`}>
      <span aria-hidden="true">{up ? '▲' : '▼'}</span>
      {`${up ? '+' : '−'}${Math.abs(value)}${suffix}`}
    </span>
  );
}

function Item({ label, value, delta }: { label: string; value: string; delta: ReactNode }) {
  return (
    <div>
      <div className="text-sm text-ink-muted">{label}</div>
      <div className="text-xl font-semibold">
        {value}
        {delta}
      </div>
    </div>
  );
}

/**
 * The last 7 days against the 7 before (task 4.4): speed and accuracy of the
 * current layout, typing time of all layouts.
 */
export function WeekSummary({ unit }: { unit: SpeedUnit }) {
  const { t } = useTranslation();
  const today = useToday();
  const layoutId = usePractice((s) => s.layoutId);
  const history = useMotivation((s) => s.history);
  const layoutWeek = weekComparison(
    history.filter((lesson) => lesson.layoutId === layoutId),
    today,
  );
  const allWeek = weekComparison(history, today);
  const { current, previous } = layoutWeek;

  if (allWeek.current.lessons === 0) {
    return <p className="text-sm text-ink-muted">{t('week.noData')}</p>;
  }

  const speed = (cpm: number | null) => (cpm === null ? null : speedValue(cpm, unit));
  const accuracy = (value: number | null) => (value === null ? null : percentFloor(value));
  const minutes = (ms: number) => Math.round(ms / 60_000);
  const diff = (a: number | null, b: number | null) => (a === null || b === null ? null : a - b);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-ink-muted">
        {t('week.title')} · {t('week.vsPrevious')}
      </p>
      <div className="flex flex-wrap gap-x-10 gap-y-3">
        <Item
          label={t('week.speed')}
          value={`${speed(current.cpm) ?? '—'} ${t(`units.${unit}`)}`}
          delta={<Delta value={diff(speed(current.cpm), speed(previous.cpm))} />}
        />
        <Item
          label={t('week.accuracy')}
          value={`${accuracy(current.accuracy) ?? '—'}%`}
          delta={
            <Delta
              value={diff(accuracy(current.accuracy), accuracy(previous.accuracy))}
              suffix="%"
            />
          }
        />
        <Item
          label={t('week.time')}
          value={t('goal.minutes', { count: minutes(allWeek.current.activeMs) })}
          delta={
            <Delta
              value={
                allWeek.previous.lessons === 0
                  ? null
                  : minutes(allWeek.current.activeMs) - minutes(allWeek.previous.activeMs)
              }
            />
          }
        />
      </div>
    </div>
  );
}
