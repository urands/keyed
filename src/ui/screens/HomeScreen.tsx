import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { keyViews, weakestKeys } from '../../app/courseView';
import { useGeometry } from '../../app/layouts';
import { useLayoutKit, usePractice } from '../../app/practice';
import { useSettings } from '../../app/settings';
import { keyForChar, type KeyCode } from '../../engine/layout/layout';
import { buttonClass } from '../components/buttonClass';
import { LayoutSwitch } from '../components/LayoutSwitch';
import { FINGER_BG } from '../practice/fingerColors';
import { codesWithShift, inlineLabel } from '../practice/keyCodes';
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
  const kit = useLayoutKit();
  const { layout } = kit;
  const progress = usePractice((s) => s.progress);
  const course = usePractice((s) => s.course);
  const keyStats = usePractice((s) => s.keyStats);
  const strict = useSettings((s) => s.strictMode);
  const started = usePractice((s) => Object.keys(s.keyStats).length > 0);
  const daily = useDailyProgress();
  const streak = useStreak();
  const unit = useSpeedUnit();
  const geometry = useGeometry();
  const label = (key: string) =>
    inlineLabel(layout, key, t('keyboard.space'), (mark) => t('keyboard.quoted', { key: mark }));

  const views = useMemo(
    () => keyViews(kit, keyStats, course, strict),
    [kit, keyStats, course, strict],
  );
  const codes = useMemo(() => {
    // A key gets a check mark when every open character on it is mastered.
    const mastered = new Set<KeyCode>();
    const learning = new Set<KeyCode>();
    for (const [key, view] of views) {
      const code = keyForChar(layout, key)?.code;
      if (view.open && code !== undefined) (view.mastered ? mastered : learning).add(code);
    }
    for (const code of learning) mastered.delete(code);
    return {
      open: codesWithShift(layout, geometry, [...course.open, ' ']),
      mastered,
      next: codesWithShift(layout, geometry, progress.next ?? []),
    };
  }, [layout, geometry, views, course, progress]);

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
          <li>{t('home.how.start', { keys: kit.letters.start.map(label).join(t('home.and')) })}</li>
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
      <div className="kd-card flex w-full flex-wrap items-center justify-between gap-6 px-6 py-5">
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

      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-ink-muted">
          {t('home.stage', {
            n: course.stageIndex + 1,
            total: kit.course.stages.length,
            name: t(`stage.${course.stage.kind}`),
          })}{' '}
          ·{' '}
          <Link
            to="/course"
            className="underline decoration-line underline-offset-4 hover:text-ink"
          >
            {t('home.courseLink')}
          </Link>
        </p>
        <p className="text-lg">
          {course.stage.kind === 'free'
            ? t('home.free', { keys: weakestKeys(views, 3).map(label).join(', ') })
            : progress.complete
              ? t('home.complete')
              : progress.next === null
                ? t('home.allOpen', { keys: blockers })
                : blockers === ''
                  ? t('home.nextSoon', { key: nextKeys })
                  : t('home.next', { key: nextKeys, keys: blockers })}
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <h2 className="text-lg font-medium">{t('home.keyboard')}</h2>
        <Keyboard
          layout={layout}
          geometry={geometry}
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
