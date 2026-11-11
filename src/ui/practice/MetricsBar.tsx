import { useTranslation } from 'react-i18next';

import { Button } from '../components/Button';
import { Kbd } from '../components/Kbd';
import { percentFloor, speedValue, type SpeedUnit } from '../format';

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <div className="text-sm text-ink-muted">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">
        {value} <span className="text-base font-normal text-ink-muted">{unit}</span>
      </div>
    </div>
  );
}

interface MetricsBarProps {
  /** Characters per minute; null before there is anything to measure. */
  cpm: number | null;
  unit: SpeedUnit;
  accuracy: number | null;
  /** Share of the lesson typed, 0–1. */
  progress: number;
  paused: boolean;
  canPause: boolean;
  onPause: () => void;
  onResume: () => void;
}

export function MetricsBar({
  cpm,
  unit,
  accuracy,
  progress,
  paused,
  canPause,
  onPause,
  onResume,
}: MetricsBarProps) {
  const { t } = useTranslation();
  const percent = Math.round(progress * 100);
  return (
    <div className="flex flex-wrap items-center gap-x-10 gap-y-4 rounded-lg border border-line bg-surface px-6 py-4">
      <Metric
        label={t('practice.speed')}
        value={cpm === null ? '—' : String(speedValue(cpm, unit))}
        unit={t(`units.${unit}`)}
      />
      <Metric
        label={t('practice.accuracy')}
        value={accuracy === null ? '—' : String(percentFloor(accuracy))}
        unit="%"
      />
      <div className="min-w-48 flex-1">
        <div className="mb-1.5 flex justify-between text-sm text-ink-muted">
          <span>{t('practice.progress')}</span>
          <span className="tabular-nums">{percent}%</span>
        </div>
        <div
          role="progressbar"
          aria-label={t('practice.progress')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-2 overflow-hidden rounded-full bg-line"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-100 motion-reduce:transition-none"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
      {paused ? (
        <Button variant="primary" onClick={onResume}>
          {t('practice.resume')}
        </Button>
      ) : (
        <Button disabled={!canPause} onClick={onPause}>
          {t('practice.pause')} <Kbd>{t('keyboard.escape')}</Kbd>
        </Button>
      )}
    </div>
  );
}
