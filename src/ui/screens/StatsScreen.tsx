import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { keyViews } from '../../app/courseView';
import { practiceGeometry } from '../../app/layouts';
import { useMotivation } from '../../app/motivation';
import { useLayoutKit, usePractice } from '../../app/practice';
import { useSettings } from '../../app/settings';
import { getStorage } from '../../app/storage';
import { keyForChar } from '../../engine/layout/layout';
import { mostProductiveDay } from '../../engine/motivation/history';
import { DEFAULT_PARAMS } from '../../engine/params';
import type { LessonSummary } from '../../storage/types';
import { KeyHeatmap, type HeatKey } from '../charts/KeyHeatmap';
import { LineChart } from '../charts/LineChart';
import { niceCeil } from '../charts/scale';
import { buttonClass } from '../components/buttonClass';
import { formatDuration, percentFloor, speedValue } from '../format';
import { ActivityCalendar } from '../motivation/ActivityCalendar';
import { useDailyProgress, useStreak, useToday } from '../motivation/hooks';
import { WeekSummary } from '../motivation/WeekSummary';
import { charLabel, codesFor } from '../practice/keyCodes';
import { useSpeedUnit } from '../useSpeedUnit';

/** Enough history for the charts; older lessons stay in the database. */
const HISTORY_LIMIT = 500;
const RECENT = 10;

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-5 py-4">
      <div className="text-sm text-ink-muted">{label}</div>
      <div className="text-3xl font-semibold">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6">
      <h2 className="text-lg font-medium">{title}</h2>
      {children}
    </section>
  );
}

function TableView({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-ink-muted hover:text-ink">{summary}</summary>
      <div className="mt-3 max-h-80 overflow-auto">{children}</div>
    </details>
  );
}

/** Statistics screen (docs/screens.md, section 7; task 2.15). */
export function StatsScreen() {
  const { t, i18n } = useTranslation();
  const kit = useLayoutKit();
  const { layout } = kit;
  const unit = useSpeedUnit();
  const keyStats = usePractice((s) => s.keyStats);
  const course = usePractice((s) => s.course);
  const strict = useSettings((s) => s.strictMode);
  const views = useMemo(
    () => keyViews(kit, keyStats, course, strict),
    [kit, keyStats, course, strict],
  );
  const days = useMotivation((s) => s.days);
  const layoutRecords = useMotivation((s) => s.totals.byLayout[layout.id]);
  const today = useToday();
  const daily = useDailyProgress();
  const streak = useStreak();
  const bestDay = useMemo(() => mostProductiveDay(Object.values(days)), [days]);
  const [lessons, setLessons] = useState<LessonSummary[] | null>(null);

  useEffect(() => {
    let active = true;
    getStorage()
      .listLessons(layout.id, HISTORY_LIMIT)
      .then((loaded) => {
        if (active) setLessons(loaded);
      })
      .catch((error: unknown) => {
        console.error('Could not load lesson history.', error);
        if (active) setLessons([]);
      });
    return () => {
      active = false;
    };
  }, [layout.id]);

  const dateFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [i18n.language],
  );

  const dayFormat = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' }),
    [i18n.language],
  );
  const unitLabel = t(`units.${unit}`);
  const label = (key: string) => charLabel(layout, key, t('keyboard.space'));

  // Open keys of the whole course in course order; the heatmap shows the first
  // open character of each physical key (the letter before its capital).
  const openKeys = [...views].filter(([, view]) => view.open).map(([key]) => key);
  const heatCodes = new Set<string>();
  const heatKeys = openKeys.flatMap((key): HeatKey[] => {
    const code = keyForChar(layout, key)?.code;
    const view = views.get(key);
    if (code === undefined || !view || heatCodes.has(code)) return [];
    heatCodes.add(code);
    const stat = keyStats[key];
    const percent = percentFloor(view.confidence);
    return [
      {
        code,
        confidence: view.confidence,
        mastered: view.mastered,
        detail: t('stats.keyDetail', {
          key: label(key),
          percent,
          hits: stat?.hits ?? 0,
          misses: stat?.misses ?? 0,
        }),
      },
    ];
  });

  if (lessons === null) return null;

  if (lessons.length === 0) {
    return (
      <section className="mx-auto flex max-w-xl flex-col items-center gap-6 py-20 text-center">
        <h1 className="text-3xl font-semibold">{t('stats.title')}</h1>
        <p className="text-lg text-ink-muted">{t('stats.empty')}</p>
        <Link to="/practice" className={buttonClass('primary')}>
          {t('home.start')}
        </Link>
      </section>
    );
  }

  const speeds = lessons.map((lesson) => speedValue(lesson.cpm, unit));
  const totalMs = lessons.reduce((sum, lesson) => sum + lesson.durationMs, 0);
  const hoursAndMinutes = (ms: number) => {
    const minutes = Math.round(ms / 60_000);
    return minutes < 60
      ? t('goal.minutes', { count: minutes })
      : t('stats.hoursMinutes', { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
  };
  const accuracies = lessons.map((lesson) => percentFloor(lesson.accuracy));
  const recent = lessons.slice(-RECENT);
  const target = speedValue(DEFAULT_PARAMS.targetCpm, unit);
  const lowestAccuracy = Math.min(...accuracies);
  const accuracyFloor = Math.max(0, Math.floor((lowestAccuracy - 5) / 10) * 10);
  const describe = (index: number) =>
    t('stats.lessonPoint', {
      n: index + 1,
      date: dateFormat.format(lessons[index]?.startedAt ?? 0),
    });

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-6 py-10">
      <div>
        <h1 className="text-3xl font-semibold">{t('stats.title')}</h1>
        <p className="text-ink-muted">{t(`layout.name.${layout.id}`)}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label={t('stats.lessons')} value={String(lessons.length)} />
        <StatTile label={t('stats.totalTime')} value={hoursAndMinutes(totalMs)} />
        <StatTile
          label={t('stats.recentSpeed', { count: recent.length })}
          value={`${speedValue(average(recent.map((l) => l.cpm)), unit)} ${unitLabel}`}
        />
        <StatTile
          label={t('stats.recentAccuracy', { count: recent.length })}
          value={`${percentFloor(average(recent.map((l) => l.accuracy)))}%`}
        />
      </div>

      <Panel title={t('records.title')}>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 md:grid-cols-4">
          <div>
            <dt className="text-sm text-ink-muted">{t('records.bestSpeed')}</dt>
            <dd className="text-xl font-semibold">
              {speedValue(layoutRecords?.bestCpm ?? 0, unit)} {unitLabel}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-ink-muted">{t('records.bestAccuracy')}</dt>
            <dd className="text-xl font-semibold">
              {percentFloor(layoutRecords?.bestAccuracy ?? 0)}%
            </dd>
          </div>
          <div>
            <dt className="text-sm text-ink-muted">{t('records.bestStreak')}</dt>
            <dd className="text-xl font-semibold">{t('streak.count', { count: streak.best })}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-muted">{t('records.bestDay')}</dt>
            <dd className="text-xl font-semibold">
              {bestDay
                ? `${t('goal.minutes', { count: Math.round(bestDay.activeMs / 60_000) })} · ${dayFormat.format(new Date(`${bestDay.date}T12:00:00`))}`
                : '—'}
            </dd>
          </div>
        </dl>
        <WeekSummary unit={unit} />
      </Panel>

      <Panel title={t('calendar.title')}>
        <ActivityCalendar days={days} goalMs={daily.goalMs} today={today} frozen={streak.frozen} />
      </Panel>

      <Panel title={t('stats.speed', { unit: unitLabel })}>
        <LineChart
          label={t('stats.speed', { unit: unitLabel })}
          points={speeds.map((value, i) => ({ x: i + 1, y: value }))}
          yDomain={[0, niceCeil(Math.max(...speeds, target))]}
          formatY={(value) => String(Math.round(value))}
          describe={describe}
          reference={{ value: target, label: t('stats.target') }}
        />
      </Panel>

      <Panel title={t('stats.accuracy')}>
        <LineChart
          label={t('stats.accuracy')}
          points={accuracies.map((value, i) => ({ x: i + 1, y: value }))}
          yDomain={[accuracyFloor, 100]}
          formatY={(value) => `${Math.round(value)}%`}
          describe={describe}
        />
        <TableView summary={t('stats.lessonTable')}>
          <table className="w-full text-left tabular-nums">
            <thead className="text-ink-muted">
              <tr>
                <th className="py-1 pr-4 font-normal">#</th>
                <th className="py-1 pr-4 font-normal">{t('stats.date')}</th>
                <th className="py-1 pr-4 font-normal">{t('result.speed')}</th>
                <th className="py-1 pr-4 font-normal">{t('result.accuracy')}</th>
                <th className="py-1 pr-4 font-normal">{t('result.errors')}</th>
                <th className="py-1 font-normal">{t('result.time')}</th>
              </tr>
            </thead>
            <tbody>
              {lessons
                .map((lesson, i) => ({ lesson, n: i + 1 }))
                .reverse()
                .map(({ lesson, n }) => (
                  <tr key={lesson.id} className="border-t border-line">
                    <td className="py-1 pr-4">{n}</td>
                    <td className="py-1 pr-4">{dateFormat.format(lesson.startedAt)}</td>
                    <td className="py-1 pr-4">
                      {speedValue(lesson.cpm, unit)} {unitLabel}
                    </td>
                    <td className="py-1 pr-4">{percentFloor(lesson.accuracy)}%</td>
                    <td className="py-1 pr-4">{lesson.errors}</td>
                    <td className="py-1">{formatDuration(lesson.durationMs)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </TableView>
      </Panel>

      <Panel title={t('stats.keys')}>
        <KeyHeatmap
          layout={layout}
          geometry={practiceGeometry}
          keys={heatKeys}
          closedCodes={codesFor(
            layout,
            [...views.keys()].filter((key) => !heatCodes.has(keyForChar(layout, key)?.code ?? '')),
          )}
        />
        <TableView summary={t('stats.keyTable')}>
          <table className="w-full text-left tabular-nums">
            <thead className="text-ink-muted">
              <tr>
                <th className="py-1 pr-4 font-normal">{t('stats.key')}</th>
                <th className="py-1 pr-4 font-normal">{t('stats.confidence')}</th>
                <th className="py-1 pr-4 font-normal">{t('result.speed')}</th>
                <th className="py-1 pr-4 font-normal">{t('stats.correct')}</th>
                <th className="py-1 font-normal">{t('result.errors')}</th>
              </tr>
            </thead>
            <tbody>
              {openKeys.map((key) => {
                const stat = keyStats[key];
                const view = views.get(key);
                return (
                  <tr key={key} className="border-t border-line">
                    <td className="py-1 pr-4 font-mono">{label(key)}</td>
                    <td className="py-1 pr-4">
                      {percentFloor(view?.confidence ?? 0)}%
                      {view?.mastered ? ` ✓ ${t('stats.mastered')}` : ''}
                    </td>
                    <td className="py-1 pr-4">
                      {stat?.timeEma
                        ? `${speedValue(60000 / stat.timeEma, unit)} ${unitLabel}`
                        : '—'}
                    </td>
                    <td className="py-1 pr-4">{stat?.hits ?? 0}</td>
                    <td className="py-1">{stat?.misses ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableView>
      </Panel>
    </section>
  );
}
