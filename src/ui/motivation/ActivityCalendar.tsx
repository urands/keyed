import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { addDays, weekday, type LocalDate } from '../../engine/motivation/dates';
import type { DayRecord } from '../../engine/motivation/daily';
import { HEAT_CLASS } from '../charts/heat';

const WEEKS = 26;

/**
 * Typing time against the goal: below a quarter, half, the goal itself, and
 * one and a half goals. Steps of the same validated blue ramp as the key map.
 */
function stepOf(activeMs: number, goalMs: number): number | null {
  if (activeMs <= 0) return null;
  const share = activeMs / goalMs;
  return share < 0.25 ? 0 : share < 0.5 ? 1 : share < 1 ? 2 : share < 1.5 ? 3 : 4;
}

interface ActivityCalendarProps {
  days: Readonly<Record<LocalDate, DayRecord>>;
  goalMs: number;
  today: LocalDate;
  /** Missed days that a freeze covered. */
  frozen: readonly LocalDate[];
}

/** Calendar of practice for the last half year (task 4.7), Monday to Sunday by column. */
export function ActivityCalendar({ days, goalMs, today, frozen }: ActivityCalendarProps) {
  const { t, i18n } = useTranslation();
  const [active, setActive] = useState<string | null>(null);
  const frozenSet = useMemo(() => new Set(frozen), [frozen]);
  const format = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'long', weekday: 'short' }),
    [i18n.language],
  );

  // Columns are weeks; the last column holds this week up to today.
  const start = addDays(today, -(weekday(today) + (WEEKS - 1) * 7));
  const weeks = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)),
  );

  const describe = (date: LocalDate) => {
    const day = days[date];
    const minutes = Math.round((day?.activeMs ?? 0) / 60_000);
    const parts = [format.format(new Date(`${date}T12:00:00`))];
    parts.push(day ? t('goal.minutes', { count: minutes }) : t('calendar.none'));
    if (day && (day.goalMet || day.activeMs >= goalMs)) parts.push(t('calendar.goalMet'));
    if (frozenSet.has(date)) parts.push(t('calendar.frozen'));
    return parts.join(' · ');
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-[3px] overflow-x-auto" role="group" aria-label={t('calendar.title')}>
        {weeks.map((week) => (
          <div key={week[0]} className="flex flex-col gap-[3px]">
            {week.map((date) => {
              if (date > today) return <span key={date} className="h-3.5 w-3.5" />;
              const day = days[date];
              const step = stepOf(day?.activeMs ?? 0, goalMs);
              const frozenDay = frozenSet.has(date);
              const look =
                step === null
                  ? `bg-surface border ${frozenDay ? 'border-accent border-dashed' : 'border-line'}`
                  : (HEAT_CLASS[step] ?? '');
              return (
                <span
                  key={date}
                  data-date={date}
                  data-step={step === null ? undefined : step + 1}
                  tabIndex={day || frozenDay ? 0 : undefined}
                  aria-label={day || frozenDay ? describe(date) : undefined}
                  onPointerEnter={() => {
                    setActive(date);
                  }}
                  onPointerLeave={() => {
                    setActive(null);
                  }}
                  onFocus={() => {
                    setActive(date);
                  }}
                  onBlur={() => {
                    setActive(null);
                  }}
                  className={`h-3.5 w-3.5 rounded-[3px] outline-accent hover:outline-2 focus-visible:outline-2 ${look}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <p role="status" className="h-5 text-sm">
        {active ? describe(active) : <span className="text-ink-muted">{t('calendar.hint')}</span>}
      </p>
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] border border-line bg-surface" />
          {t('calendar.none')}
        </li>
        {[0.25, 0.5, 1, 1.5].map((share, i) => (
          <li key={share} className="flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded-[3px] ${HEAT_CLASS[i] ?? ''}`} />
            {t('calendar.belowShare', { percent: share * 100 })}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span className={`h-3 w-3 rounded-[3px] ${HEAT_CLASS[4]}`} />
          {t('calendar.aboveShare', { percent: 150 })}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] border border-dashed border-accent bg-surface" />
          {t('calendar.frozen')}
        </li>
      </ul>
    </div>
  );
}
