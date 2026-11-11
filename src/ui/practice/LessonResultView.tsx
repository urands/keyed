import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { keyCpm, type LessonResult } from '../../engine/stats/lessonResult';
import { Button } from '../components/Button';
import { buttonClass } from '../components/buttonClass';
import { Kbd } from '../components/Kbd';
import { formatDuration, percentFloor, speedValue, type SpeedUnit } from '../format';

function BigMetric({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div>
      <div className="text-ink-muted">{label}</div>
      <div className="text-6xl font-semibold">
        {value} <span className="text-2xl font-normal text-ink-muted">{unit}</span>
      </div>
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
  onNext: () => void;
  onRepeat: () => void;
}

export function LessonResultView({
  result,
  unit,
  unlocked,
  onNext,
  onRepeat,
}: LessonResultViewProps) {
  const { t } = useTranslation();
  const unitLabel = t(`units.${unit}`);
  const keys = Object.entries(result.keys).sort(([a], [b]) => compareKeys(a, b));

  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center gap-8 py-12 text-center">
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
        <BigMetric
          label={t('result.speed')}
          value={speedValue(result.cpm, unit)}
          unit={unitLabel}
        />
        <BigMetric label={t('result.accuracy')} value={percentFloor(result.accuracy)} unit="%" />
      </div>

      <p className="text-ink-muted">
        {t('result.time')}: {formatDuration(result.durationMs)} · {t('result.errors')}:{' '}
        {result.errors}
      </p>

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
