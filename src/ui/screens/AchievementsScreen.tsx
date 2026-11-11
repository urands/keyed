import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';

import { achievementMetrics, useMotivation } from '../../app/motivation';
import { layoutFactsFrom, usePractice } from '../../app/practice';
import { achievementDefs } from '../../content';
import { achievementProgress } from '../../engine/motivation/achievements';
import { formatMetric, useAchievementText } from '../motivation/achievementText';
import { useStreak } from '../motivation/hooks';

/** Achievements (docs/screens.md, section 8): what is earned, and how far the next level is. */
export function AchievementsScreen() {
  const { t, i18n } = useTranslation();
  const text = useAchievementText();
  const totals = useMotivation((s) => s.totals);
  const unlocked = useMotivation((s) => s.achievements);
  const practice = usePractice(
    useShallow((s) => ({
      cache: s.cache,
      layoutId: s.layoutId,
      keyStats: s.keyStats,
      opened: s.opened,
    })),
  );
  const streak = useStreak();
  const items = useMemo(
    () =>
      achievementProgress(
        achievementDefs,
        achievementMetrics(totals, streak.best, layoutFactsFrom(practice)),
        unlocked,
      ),
    [totals, streak.best, unlocked, practice],
  );
  const dateFormat = new Intl.DateTimeFormat(i18n.language, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-6 py-10">
      <h1 className="text-3xl font-semibold">{t('achievements.title')}</h1>
      <ul className="grid gap-4 sm:grid-cols-2">
        {items.map(({ def, level, unlockedAt, value, next }) => {
          const earned = level > 0;
          const { name, condition } = text(def.id, next === null ? level : level + 1);
          const ladder = def.levels.length > 1;
          const number = (n: number) => formatMetric(def.metric, n, i18n.language);
          // "0 of 1" says nothing for a yes-or-no achievement.
          const yesOrNo = !ladder && def.levels[0] === 1 && def.metric !== 'activeHours';
          return (
            <li
              key={def.id}
              data-achievement={def.id}
              data-level={level}
              className={`flex gap-4 rounded-lg border bg-surface p-5 ${earned ? 'border-ok' : 'border-line'}`}
            >
              <span
                aria-hidden="true"
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl ${earned ? 'bg-ok/15 text-ok' : 'bg-line/50 text-ink-muted'}`}
              >
                {earned ? '★' : '☆'}
              </span>
              <div className="flex flex-1 flex-col gap-1">
                <p className="font-semibold">{name}</p>
                <p className="text-sm text-ink-muted">{condition}</p>
                {ladder && (
                  <ol className="mt-1 flex flex-wrap gap-1" aria-label={t('achievements.levels')}>
                    {def.levels.map((threshold, i) => (
                      <li
                        key={threshold}
                        className={`rounded px-1.5 text-xs ${i < level ? 'bg-ok/15 text-ink' : 'border border-line text-ink-muted'}`}
                      >
                        {i < level && <span className="sr-only">{t('achievements.reached')} </span>}
                        {number(threshold)}
                      </li>
                    ))}
                  </ol>
                )}
                <p className="text-sm">
                  {next === null
                    ? t('achievements.unlockedOn', { date: dateFormat.format(unlockedAt ?? 0) })
                    : yesOrNo
                      ? t('achievements.notYet')
                      : t('achievements.progress', {
                          value: number(Math.min(value, next)),
                          next: number(next),
                        })}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
