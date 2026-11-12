import { Flame, Gauge, Layers, Pause, Play, Target, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { percentFloor, speedValue, type SpeedUnit } from '../format';

function Metric({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Icon aria-hidden="true" size={26} strokeWidth={1.75} className="shrink-0 text-ink-muted" />
      <div className="min-w-0">
        <div className="text-sm text-ink-muted">{label}</div>
        {children}
      </div>
    </div>
  );
}

function Value({ value, unit }: { value: string; unit: string }) {
  return (
    <div className="text-2xl leading-tight font-semibold tabular-nums">
      {value} <span className="text-sm font-normal text-ink-muted">{unit}</span>
    </div>
  );
}

function Bar({ label, value, tone }: { label: string; value: number; tone: 'accent' | 'warm' }) {
  const percent = Math.round(value * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-2"
    >
      <div
        className={`h-full rounded-full transition-[width] duration-100 ${tone === 'accent' ? 'bg-accent' : 'bg-fixed'}`}
        style={{ width: `${value * 100}%` }}
      />
    </div>
  );
}

interface GoalProgress {
  activeMs: number;
  goalMs: number;
  met: boolean;
}

interface MetricsBarProps {
  /** Today's typing time against the daily goal, this lesson included. */
  goal: GoalProgress;
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

/** The top of the practice screen: speed, accuracy, lesson progress, today's goal, pause. */
export function MetricsBar({
  goal,
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
  const goalMinutes = Math.round(goal.goalMs / 60_000);
  return (
    <div className="kd-card grid grid-cols-[repeat(4,minmax(0,1fr))_auto] items-center gap-x-6 gap-y-3 px-6 py-3 max-md:grid-cols-[repeat(2,minmax(0,1fr))_auto]">
      <Metric icon={Gauge} label={t('practice.speed')}>
        <Value
          value={cpm === null ? '—' : String(speedValue(cpm, unit))}
          unit={t(`units.${unit}`)}
        />
      </Metric>
      <Metric icon={Target} label={t('practice.accuracy')}>
        <Value value={accuracy === null ? '—' : String(percentFloor(accuracy))} unit="%" />
      </Metric>
      <Metric icon={Layers} label={t('practice.progress')}>
        <div className="flex items-center gap-2">
          <Bar label={t('practice.progress')} value={progress} tone="accent" />
          <span className="text-sm tabular-nums">{percent}%</span>
        </div>
      </Metric>
      <Metric icon={Flame} label={t('goal.label')}>
        <div className="text-sm tabular-nums">
          {goal.met ? '✓ ' : ''}
          {t('goal.ofMinutes', {
            done: Math.floor(goal.activeMs / 60_000),
            total: goalMinutes,
          })}
        </div>
        <Bar label={t('goal.label')} value={Math.min(1, goal.activeMs / goal.goalMs)} tone="warm" />
      </Metric>
      {paused ? (
        <button
          type="button"
          onClick={onResume}
          aria-label={t('practice.resume')}
          title={t('practice.resume')}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-on-accent shadow-glow"
        >
          <Play aria-hidden="true" size={22} />
        </button>
      ) : (
        <button
          type="button"
          disabled={!canPause}
          onClick={onPause}
          aria-label={t('practice.pause')}
          title={`${t('practice.pause')} (${t('keyboard.escape')})`}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface-2 text-ink disabled:opacity-50"
        >
          <Pause aria-hidden="true" size={22} />
        </button>
      )}
    </div>
  );
}
