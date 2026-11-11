import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import type { LessonOutcome } from '../../app/motivation';
import { lessonInsight } from '../../engine/motivation/insight';
import type { StreakState } from '../../engine/motivation/streak';
import { keyCpm, type LessonResult } from '../../engine/stats/lessonResult';
import { Button } from '../components/Button';
import { buttonClass } from '../components/buttonClass';
import { Kbd } from '../components/Kbd';
import { formatDuration, percentFloor, speedValue, type SpeedUnit } from '../format';
import { useAchievementText } from '../motivation/achievementText';
import { GoalRing } from '../motivation/GoalRing';
import type { DailyProgress } from '../motivation/hooks';
import { Delta } from '../motivation/WeekSummary';

function BigMetric({
  label,
  value,
  unit,
  children,
}: {
  label: string;
  value: number;
  unit: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-ink-muted">{label}</div>
      <div className="text-6xl font-semibold">
        {value} <span className="text-2xl font-normal text-ink-muted">{unit}</span>
      </div>
      {children}
    </div>
  );
}

/** Letters in alphabetical order, the space bar last. */
function compareKeys(a: string, b: string): number {
  if (a === ' ' || b === ' ') return Number(a === ' ') - Number(b === ' ');
  return a.localeCompare(b);
}

interface LessonResultViewProps {
  result: LessonResult;
  unit: SpeedUnit;
  /** Keys this lesson opened, already shown as labels. */
  unlocked: readonly string[];
  /** Records and achievements of this lesson. */
  outcome: LessonOutcome | null;
  daily: DailyProgress;
  streak: StreakState;
  /** How a character is shown: upper-case letter, the space bar by name. */
  label: (char: string) => string;
  onNext: () => void;
  onRepeat: () => void;
}

/** Lesson result (docs/screens.md, section 5). */
export function LessonResultView({
  result,
  unit,
  unlocked,
  outcome,
  daily,
  streak,
  label,
  onNext,
  onRepeat,
}: LessonResultViewProps) {
  const { t } = useTranslation();
  const achievementText = useAchievementText();
  const unitLabel = t(`units.${unit}`);
  const keys = Object.entries(result.keys).sort(([a], [b]) => compareKeys(a, b));
  const insight = lessonInsight(result);
  const speed = speedValue(result.cpm, unit);
  const average =
    outcome?.previousAverageCpm == null ? null : speedValue(outcome.previousAverageCpm, unit);

  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center gap-7 py-10 text-center">
      <h1 className="text-3xl font-semibold">{t('result.title')}</h1>

      {unlocked.length > 0 && (
        <div
          role="status"
          className="flex flex-col items-center gap-3 rounded-lg border-2 border-ok bg-ok/10 px-8 py-5"
        >
          <p className="text-xl font-semibold">
            <span aria-hidden="true">★ </span>
            {t(unlocked.length === 1 ? 'result.unlockedOne' : 'result.unlockedMany')}
          </p>
          <p className="flex gap-2">
            {unlocked.map((key) => (
              <kbd
                key={key}
                className="min-w-12 rounded-md border border-line bg-surface px-3 py-1 font-mono text-3xl"
              >
                {key}
              </kbd>
            ))}
          </p>
          <p className="text-ink-muted">{t('result.unlockedHint')}</p>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-16">
        <BigMetric label={t('result.speed')} value={speed} unit={unitLabel}>
          {outcome?.record ? (
            <p className="mt-1 font-semibold text-ok">
              <span aria-hidden="true">🏆 </span>
              {t('result.record')}
            </p>
          ) : average !== null ? (
            <p className="mt-1 text-sm text-ink-muted">
              {t('result.vsAverage', { average })}
              <Delta value={speed - average} />
            </p>
          ) : null}
        </BigMetric>
        <BigMetric label={t('result.accuracy')} value={percentFloor(result.accuracy)} unit="%" />
      </div>

      <p className="text-ink-muted">
        {t('result.time')}: {formatDuration(result.durationMs)} · {t('result.errors')}:{' '}
        {result.errors}
      </p>

      {insight && (
        <p className="rounded-lg border border-line bg-surface px-5 py-3 text-lg">
          <span aria-hidden="true">💡 </span>
          {insight.kind === 'confusion'
            ? t('result.insight.confusion', {
                expected: label(insight.expected),
                typed: label(insight.typed),
                count: insight.count,
              })
            : t('result.insight.slowest', {
                key: label(insight.key),
                speed: speedValue(insight.cpm, unit),
                unit: unitLabel,
              })}
        </p>
      )}

      <div className="flex items-center gap-4 text-left">
        <GoalRing progress={daily} size={64} />
        <div>
          <p className="font-medium">
            {daily.met
              ? t('goal.done')
              : t('goal.left', {
                  count: Math.max(1, Math.ceil((daily.goalMs - daily.activeMs) / 60_000)),
                })}
          </p>
          <p className="text-sm text-ink-muted">
            {streak.current > 0 ? t('streak.days', { count: streak.current }) : t('streak.none')}
          </p>
        </div>
      </div>

      {outcome && outcome.unlocks.length > 0 && (
        <div className="w-full rounded-lg border-2 border-ok bg-surface px-6 py-4 text-left">
          <h2 className="mb-2 font-semibold">
            <span aria-hidden="true">★ </span>
            {t('result.achievements')}
          </h2>
          <ul className="flex flex-col gap-1">
            {outcome.unlocks.map(({ id, level }) => {
              const { name, condition } = achievementText(id, level);
              return (
                <li key={id}>
                  <span className="font-medium">{name}</span>
                  <span className="text-ink-muted"> — {condition}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="w-full">
        <h2 className="mb-3 text-lg font-medium">{t('result.keys')}</h2>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-2">
          {keys.map(([char, key]) => {
            const cpm = keyCpm(key);
            return (
              <li key={char} className="rounded-md border border-line bg-surface px-2 py-2">
                <span className="block font-mono text-xl">
                  {char === ' ' ? t('keyboard.space') : char}
                </span>
                <span className="block text-sm text-ink-muted tabular-nums">
                  {cpm === null ? '—' : `${speedValue(cpm, unit)} ${unitLabel}`}
                </span>
                {key.misses > 0 && (
                  <span className="block text-sm text-error">
                    <span aria-hidden="true">✗ </span>
                    <span className="sr-only">{t('result.errors')}: </span>
                    {key.misses}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="primary" onClick={onNext}>
          {t('result.next')} <Kbd>{t('keyboard.enter')}</Kbd>
        </Button>
        <Button onClick={onRepeat}>{t('result.repeat')}</Button>
        <Link to="/" className={buttonClass('secondary')}>
          {t('result.home')}
        </Link>
      </div>
    </section>
  );
}
