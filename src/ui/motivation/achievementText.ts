import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { achievementDefs } from '../../content';
import type { AchievementMetric } from '../../engine/motivation/achievements';

const ACHIEVEMENT_IDS = [
  'first-step',
  'home-row',
  'halfway',
  'alphabet',
  'speed',
  'flawless',
  'steady-hand',
  'streak',
  'practice-time',
  'volume',
  'two-layouts',
] as const;
type AchievementId = (typeof ACHIEVEMENT_IDS)[number];

function isKnown(id: string): id is AchievementId {
  return (ACHIEVEMENT_IDS as readonly string[]).includes(id);
}

/**
 * A metric value as people read it: shares as percent ("8%"), hours with one
 * decimal while small ("0.3"), everything else as whole numbers ("100,000").
 */
export function formatMetric(metric: AchievementMetric, value: number, language: string): string {
  if (metric === 'openedShare') {
    return `${new Intl.NumberFormat(language, { maximumFractionDigits: 0 }).format(Math.floor(value * 100))}%`;
  }
  const digits = metric === 'activeHours' && value < 10 ? 1 : 0;
  const shown = digits === 0 ? Math.floor(value) : Math.floor(value * 10) / 10;
  return new Intl.NumberFormat(language, { maximumFractionDigits: digits }).format(shown);
}

/** Name and condition of an achievement level, in the interface language. */
export function useAchievementText(): (
  id: string,
  level: number,
) => { name: string; condition: string } {
  const { t, i18n } = useTranslation();
  return useCallback(
    (id: string, level: number) => {
      const def = achievementDefs.find((d) => d.id === id);
      if (!def || !isKnown(id)) return { name: id, condition: '' };
      const threshold = def.levels[Math.max(0, Math.min(def.levels.length, level) - 1)] ?? 0;
      const value = formatMetric(def.metric, threshold, i18n.language);
      return {
        name: t(`achievements.list.${id}.name`),
        condition: t(`achievements.list.${id}.condition`, { value }),
      };
    },
    [t, i18n.language],
  );
}
