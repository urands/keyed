import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { practiceGeometry } from '../../app/layouts';
import { useLayoutKit, usePractice } from '../../app/practice';
import { buttonClass } from '../components/buttonClass';
import { LayoutSwitch } from '../components/LayoutSwitch';
import { FINGER_BG } from '../practice/fingerColors';
import { charLabel, codesFor } from '../practice/keyCodes';
import { GoalRing } from '../motivation/GoalRing';
import { useDailyProgress, useStreak } from '../motivation/hooks';
import { StreakInfo } from '../motivation/StreakInfo';
import { WeekSummary } from '../motivation/WeekSummary';
import { Keyboard } from '../practice/Keyboard';
import { useSpeedUnit } from '../useSpeedUnit';

function LegendItem({ swatch, label }: { swatch: ReactNode; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {swatch}
      <span>{label}</span>
    </li>
  );
}

/** Home screen (docs/screens.md, section 2). */
export function HomeScreen() {
  const { t } = useTranslation();
  const { layout, stage } = useLayoutKit();
  const progress = usePractice((s) => s.progress);
  const started = usePractice((s) => Object.keys(s.keyStats).length > 0);
  const daily = useDailyProgress();
  const streak = useStreak();
  const unit = useSpeedUnit();
  const label = (key: string) => charLabel(layout, key, t('keyboard.space'));

  const codes = useMemo(
    () => ({
      open: codesFor(layout, [...progress.open, ' ']),
      mastered: codesFor(layout, progress.mastered),
      next: codesFor(layout, progress.next ?? []),
    }),
    [layout, progress],
  );

  if (!started) {
    return (
      <section className="mx-auto flex max-w-xl flex-col items-center gap-6 py-16 text-center">
        <h1 className="text-3xl font-semibold">{t('home.title')}</h1>
        <p className="text-lg text-ink-muted">{t('home.intro')}</p>
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm text-ink-muted">{t('home.chooseLayout')}</span>
          <LayoutSwitch name="home-layout" />
        </div>
        <ol className="flex list-decimal flex-col gap-2 pl-6 text-left">
          <li>{t('home.how.start', { keys: stage.start.map(label).join(t('home.and')) })}</li>
          <li>{t('home.how.unlock')}</li>
          <li>{t('home.how.focus')}</li>
        </ol>
        <Link to="/practice" className={`${buttonClass('primary')} px-6 py-3 text-lg`}>
          {t('home.start')}
        </Link>
      </section>
    );
  }

  const nextKeys = (progress.next ?? []).map(label).join(', ');
  const blockers = progress.blockers.map(label).join(', ');

  return (
    <section className="mx-auto flex max-w-4xl flex-col items-center gap-8 py-10">
      <h1 className="sr-only">{t('nav.home')}</h1>
      <div className="flex w-full flex-wrap items-center justify-between gap-6 rounded-lg border border-line bg-surface px-6 py-5">
        <div className="flex items-center gap-5">
          <GoalRing progress={daily} />
          <StreakInfo streak={streak} />
        </div>
        <Link to="/practice" className={`${buttonClass('primary')} px-10 py-4 text-xl`}>
          {t('home.continue')}
        </Link>
      </div>
      <div className="w-full px-1">
        <WeekSummary unit={unit} />
      </div>

      <p className="text-center text-lg">
        {progress.complete
          ? t('home.complete')
          : progress.next === null
            ? t('home.allOpen', { keys: blockers })
            : blockers === ''
              ? t('home.nextSoon', { key: nextKeys })
              : t('home.next', { key: nextKeys, keys: blockers })}
      </p>

      <div className="flex flex-col items-center gap-4">
        <h2 className="text-lg font-medium">{t('home.keyboard')}</h2>
        <Keyboard
          layout={layout}
          geometry={practiceGeometry}
          openCodes={codes.open}
          masteredCodes={codes.mastered}
          highlightCodes={codes.next}
        />
        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-ink-muted">
          <LegendItem
            swatch={<span className={`h-4 w-4 rounded ${FINGER_BG.lIndex}`} />}
            label={t('home.legend.open')}
          />
          <LegendItem
            swatch={<span className="text-sm font-bold text-ok">✓</span>}
            label={t('home.legend.mastered')}
          />
          <LegendItem
            swatch={<span className="h-4 w-4 rounded border border-line ring-2 ring-accent" />}
            label={t('home.legend.next')}
          />
          <LegendItem
            swatch={<span className="h-4 w-4 rounded border border-line bg-surface" />}
            label={t('home.legend.closed')}
          />
        </ul>
      </div>
    </section>
  );
}
