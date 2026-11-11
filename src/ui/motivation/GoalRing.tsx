import { useTranslation } from 'react-i18next';

import type { DailyProgress } from './hooks';

interface GoalRingProps {
  progress: DailyProgress;
  size?: number;
}

/** Daily goal as a ring: "6 of 10 min" in the middle (docs/screens.md, section 2). */
export function GoalRing({ progress, size = 112 }: GoalRingProps) {
  const { t } = useTranslation();
  const done = Math.floor(progress.activeMs / 60_000);
  const goal = Math.round(progress.goalMs / 60_000);
  const share = Math.min(1, progress.activeMs / progress.goalMs);
  const stroke = Math.max(6, size / 12);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      role="img"
      aria-label={t('goal.aria', { done, goal })}
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-line"
          strokeWidth={stroke}
        />
        {/* At zero the round cap would still draw a dot, so the arc is left out. */}
        {share > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className={progress.met ? 'stroke-ok' : 'stroke-accent'}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - share)}
          />
        )}
      </svg>
      <div
        aria-hidden="true"
        className="absolute inset-0 flex flex-col items-center justify-center leading-tight"
      >
        {progress.met ? (
          <>
            <span className="text-2xl font-bold text-ok">✓</span>
            <span className="text-xs text-ink-muted">{t('goal.short', { done, goal })}</span>
          </>
        ) : (
          <>
            <span className="text-xl font-semibold">
              {done}/{goal}
            </span>
            <span className="text-xs text-ink-muted">{t('goal.unit')}</span>
          </>
        )}
      </div>
    </div>
  );
}
