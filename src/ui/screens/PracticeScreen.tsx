import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';

import { kitFor, practiceGeometry } from '../../app/layouts';
import { useLayoutKit, usePractice } from '../../app/practice';
import { useSettings } from '../../app/settings';
import { toInput } from '../../engine/input/toInput';
import { keyForChar } from '../../engine/layout/layout';
import { DEFAULT_PARAMS } from '../../engine/params';
import { stageKeys } from '../../engine/progress/course';
import { buttonClass } from '../components/buttonClass';
import { liveMetrics } from '../../engine/stats/lessonResult';
import { CourseStrip } from '../practice/CourseStrip';
import { charLabel, codesWithShift, inlineLabel, shiftCodeFor } from '../practice/keyCodes';
import { isActivatable, isTextEntry } from '../practice/keyTargets';
import { Keyboard } from '../practice/Keyboard';
import { LessonResultView } from '../practice/LessonResultView';
import { LessonText } from '../practice/LessonText';
import { MetricsBar } from '../practice/MetricsBar';
import { NewKeyCard } from '../practice/NewKeyCard';
import { NextKeyHint } from '../practice/NextKeyHint';
import { useDailyProgress, useStreak } from '../motivation/hooks';
import { playErrorSound, playKeySound } from '../sound';
import { useSpeedUnit } from '../useSpeedUnit';

/** In free practice the course strip shows this many of the weakest keys. */
const FREE_STRIP_KEYS = 12;

/** Keys that do not end a pause, so Tab still moves focus and Shift alone does nothing. */
const NOT_RESUMING = new Set(['Shift', 'Control', 'Alt', 'AltGraph', 'Meta', 'CapsLock', 'Tab']);

/**
 * Practice screen (docs/screens.md, section 3), with the new key card before a
 * lesson (section 4) and the lesson result after it (section 5).
 */
export function PracticeScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const kit = useLayoutKit();
  const unit = useSpeedUnit();
  const lesson = usePractice((s) => s.lesson);
  const result = usePractice((s) => s.result);
  const feedback = usePractice((s) => s.feedback);
  const progress = usePractice((s) => s.progress);
  const course = usePractice((s) => s.course);
  const training = usePractice((s) => s.training);
  const stageDone = usePractice((s) => s.stageDone);
  const train = usePractice((s) => s.train);
  const unlocked = usePractice((s) => s.unlocked);
  const introduce = usePractice((s) => s.introduce);
  const wrongLayout = usePractice((s) => s.wrongLayout);
  const outcome = usePractice((s) => s.outcome);
  const startLesson = usePractice((s) => s.startLesson);
  const repeatLesson = usePractice((s) => s.repeatLesson);
  const pause = usePractice((s) => s.pause);
  const resume = usePractice((s) => s.resume);
  const dismissIntro = usePractice((s) => s.dismissIntro);
  const [capsLock, setCapsLock] = useState(false);
  const { status, lastPressAt } = lesson;
  // The lesson in progress counts toward today's goal; a finished one is already in the day.
  const daily = useDailyProgress(status === 'finished' ? 0 : lesson.activeMs);
  const streak = useStreak();
  const showIntro = introduce.length > 0 && status !== 'finished';
  // Free practice has every key: the strip shows the weakest ones.
  const courseKeys = useMemo(
    () =>
      course.stage.kind === 'free'
        ? [...progress.open]
            .sort((a, b) => (progress.confidence[a] ?? 0) - (progress.confidence[b] ?? 0))
            .slice(0, FREE_STRIP_KEYS)
        : stageKeys(course.stage),
    [course, progress],
  );
  const openCodes = useMemo(
    () => codesWithShift(kit.layout, practiceGeometry, [...course.open, ' ']),
    [kit, course],
  );
  const stageCount = kit.course.stages.length;
  const stageName = t(`stage.${course.stage.kind}`);
  // The start keys of a new stage come with an explanation of the stage.
  const introStage =
    course.stageIndex > 0 &&
    course.stage.kind !== 'free' &&
    introduce.length === course.stage.start.length &&
    introduce.every((key) => course.stage.start.includes(key))
      ? course.stage.kind
      : null;

  useEffect(() => {
    const trackCapsLock = (event: KeyboardEvent) => {
      // Not every synthetic event has getModifierState.
      if (typeof event.getModifierState === 'function') {
        setCapsLock(event.getModifierState('CapsLock'));
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      trackCapsLock(event);
      if (isTextEntry(event.target)) return;
      const store = usePractice.getState();
      const current = store.lesson.status;
      const enter = event.key === 'Enter' && !event.repeat && !isActivatable(event.target);

      if (store.introduce.length > 0 && current !== 'finished') {
        if (enter) {
          event.preventDefault();
          store.dismissIntro();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          void navigate('/');
        }
        return;
      }

      if (current === 'finished') {
        if (enter) {
          event.preventDefault();
          store.startLesson();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          void navigate('/');
        }
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        if (current === 'running') {
          store.pause();
        } else if (current === 'paused') {
          // Esc on a pause leaves the lesson; the next visit starts a new one.
          store.startLesson();
          void navigate('/');
        }
        return;
      }

      if (event.key === 'Backspace' && event.ctrlKey) {
        event.preventDefault();
        store.repeatLesson();
        return;
      }

      if (current === 'paused') {
        if (!event.repeat && !NOT_RESUMING.has(event.key)) {
          event.preventDefault();
          store.resume();
        }
        return;
      }

      const { layout } = kitFor(store.layoutId, { yoLetter: useSettings.getState().yoLetter });
      const input = toInput(event, layout, useSettings.getState().inputMode);
      if (!input) return;
      event.preventDefault();
      store.press(input);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', trackCapsLock);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', trackCapsLock);
    };
  }, [navigate]);

  // Key and error sounds, if the user turned them on (task 4.10).
  useEffect(() => {
    if (!feedback) return;
    const { soundKeys, soundErrors, soundVolume } = useSettings.getState();
    if (feedback.correct && soundKeys) playKeySound(soundVolume);
    if (!feedback.correct && soundErrors) playErrorSound(soundVolume);
  }, [feedback]);

  // Pause when the window loses focus, and when the user leaves this screen.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) pause();
    };
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('blur', pause);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      pause();
    };
  }, [pause]);

  // Pause after a silence. Restarts with every press (lastPressAt changes).
  useEffect(() => {
    if (status !== 'running') return;
    const timer = window.setTimeout(pause, DEFAULT_PARAMS.idleMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [status, lastPressAt, pause]);

  if (status === 'finished' && result) {
    return (
      <LessonResultView
        result={result}
        unit={unit}
        unlocked={unlocked.map((key) => charLabel(kit.layout, key, t('keyboard.space')))}
        stageDone={
          stageDone === null
            ? null
            : {
                done: t(
                  `stage.${kit.course.stages.find((s) => s.id === stageDone)?.kind ?? 'letters'}`,
                ),
                next: stageName,
              }
        }
        outcome={outcome}
        daily={daily}
        streak={streak}
        label={(char) =>
          inlineLabel(kit.layout, char, t('keyboard.space'), (mark) =>
            t('keyboard.quoted', { key: mark }),
          )
        }
        onNext={() => {
          startLesson();
        }}
        onRepeat={repeatLesson}
      />
    );
  }

  if (showIntro) {
    return (
      <NewKeyCard
        layout={kit.layout}
        geometry={practiceGeometry}
        keys={introduce}
        openKeys={course.open}
        stage={introStage}
        onStart={dismissIntro}
      />
    );
  }

  const nextChar = lesson.chars[lesson.position]?.char;
  const nextCode = nextChar === undefined ? null : (keyForChar(kit.layout, nextChar)?.code ?? null);
  const nextShift =
    nextChar === undefined ? null : shiftCodeFor(kit.layout, practiceGeometry, nextChar);
  const label = (key: string) =>
    inlineLabel(kit.layout, key, t('keyboard.space'), (mark) =>
      t('keyboard.quoted', { key: mark }),
    );
  const live = liveMetrics(lesson);
  const paused = status === 'paused';
  const warnings = [
    wrongLayout ? t(`practice.wrongLayout.${kit.layout.id}`) : null,
    capsLock ? t('practice.capsLock') : null,
  ].filter((warning): warning is string => warning !== null);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 py-5">
      <MetricsBar
        goal={daily}
        cpm={live.cpm}
        unit={unit}
        accuracy={live.accuracy}
        progress={lesson.position / lesson.chars.length}
        paused={paused}
        canPause={status === 'running'}
        onPause={pause}
        onResume={resume}
      />

      <CourseStrip layout={kit.layout} keys={courseKeys} progress={progress} />

      <div className="relative rounded-lg border border-line bg-surface px-8 pt-7 pb-2">
        <h1 className="sr-only">{t('nav.practice')}</h1>
        <div className="absolute inset-x-3 top-1.5 flex items-center justify-between gap-3 text-xs text-ink-muted">
          <Link to="/course" className="rounded hover:text-ink">
            {t('practice.stage', { n: course.stageIndex + 1, total: stageCount, name: stageName })}
          </Link>
          {training !== null && (
            <span className="flex items-center gap-2">
              <span className="font-medium text-ink">
                {t('training.label', { key: label(training) })}
              </span>
              <button
                type="button"
                className={`${buttonClass('secondary')} px-2 py-0.5 text-xs`}
                onClick={() => {
                  train(null);
                }}
              >
                {t('training.stop')}
              </button>
            </span>
          )}
        </div>
        <LessonText lesson={lesson} dimmed={paused} />
        <p className="mt-1 flex h-6 gap-4 text-sm" aria-live="polite">
          {warnings.length > 0 ? (
            warnings.map((warning) => (
              <span key={warning} className="font-medium text-fixed">
                <span aria-hidden="true">⚠ </span>
                {warning}
              </span>
            ))
          ) : (
            <span className="text-ink-muted">
              {status === 'ready' ? t('practice.readyHint') : ''}
            </span>
          )}
        </p>
        {paused && (
          <div
            role="status"
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-surface/75 text-center"
          >
            <p className="text-2xl font-semibold">{t('practice.pausedTitle')}</p>
            <p className="text-ink-muted">{t('practice.pausedHint')}</p>
          </div>
        )}
      </div>

      <Keyboard
        layout={kit.layout}
        geometry={practiceGeometry}
        openCodes={openCodes}
        nextCode={nextCode}
        nextShift={nextShift}
        flash={feedback}
      />
      <NextKeyHint
        layout={kit.layout}
        geometry={practiceGeometry}
        code={nextCode}
        shift={nextShift}
      />
    </div>
  );
}
