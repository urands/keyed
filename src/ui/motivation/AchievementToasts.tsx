import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { useMotivation } from '../../app/motivation';
import { useAchievementText } from './achievementText';

const SHOW_MS = 7000;

/** Plaques for newly earned achievements (docs/screens.md, section 10). */
export function AchievementToasts() {
  const { t } = useTranslation();
  const toasts = useMotivation((s) => s.toasts);
  const dismiss = useMotivation((s) => s.dismissToast);
  const text = useAchievementText();
  const first = toasts[0];

  // One at a time, each for a few seconds.
  useEffect(() => {
    if (!first) return;
    const timer = window.setTimeout(() => {
      dismiss(first.id);
    }, SHOW_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [first, dismiss]);

  if (!first) return null;
  const { name, condition } = text(first.id, first.level);
  return (
    <div
      role="status"
      className="fixed right-6 bottom-6 z-50 flex max-w-sm items-start gap-3 rounded-2xl border-2 border-ok bg-surface px-5 py-4 shadow-card"
    >
      <span aria-hidden="true" className="text-2xl text-ok">
        ★
      </span>
      <div className="flex-1">
        <p className="text-sm text-ink-muted">{t('achievements.toast')}</p>
        <p className="font-semibold">{name}</p>
        <p className="text-sm text-ink-muted">{condition}</p>
        <Link to="/achievements" className="text-sm text-accent underline underline-offset-2">
          {t('achievements.all')}
        </Link>
      </div>
      <button
        type="button"
        aria-label={t('achievements.close')}
        onClick={() => {
          dismiss(first.id);
        }}
        className="rounded px-1 text-ink-muted outline-accent hover:text-ink focus-visible:outline-2"
      >
        ×
      </button>
    </div>
  );
}
