import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';

import { keyViews, stageViews, weakestKeys, type KeyView } from '../../app/courseView';
import { useLayoutKit, usePractice } from '../../app/practice';
import { useSettings } from '../../app/settings';
import { buttonClass } from '../components/buttonClass';
import { percentFloor } from '../format';
import { charLabel } from '../practice/keyCodes';

/** Weakest keys offered for training in free practice. */
const FREE_TRAIN_KEYS = 8;

interface KeyChipProps {
  label: string;
  view: KeyView | undefined;
  training: boolean;
  onTrain: () => void;
}

/** A key of the course: closed, or a button that trains it, filled by confidence. */
function KeyChip({ label, view, training, onTrain }: KeyChipProps) {
  const { t } = useTranslation();
  if (!view?.open) {
    return (
      <li
        data-key-state="closed"
        className="flex h-9 min-w-9 items-center justify-center rounded-md border border-dashed border-line px-1 font-mono text-ink-muted"
      >
        <span className="sr-only">{t('course.closed', { key: label })}</span>
        <span aria-hidden="true">{label}</span>
      </li>
    );
  }
  const percent = percentFloor(view.confidence);
  const state = view.mastered
    ? t('course.mastered', { key: label })
    : t('course.open', { key: label, percent });
  return (
    <li data-key-state={view.mastered ? 'mastered' : 'open'}>
      <button
        type="button"
        onClick={onTrain}
        title={`${state}. ${t('courseScreen.train', { key: label })}`}
        aria-label={`${t('courseScreen.train', { key: label })}. ${state}`}
        className={`relative flex h-9 min-w-9 items-center justify-center overflow-hidden rounded-md border border-line bg-surface px-1 font-mono font-medium outline-accent hover:border-accent focus-visible:outline-2 ${training ? 'ring-2 ring-accent ring-offset-1 ring-offset-canvas' : ''}`}
      >
        <span
          aria-hidden="true"
          className={`absolute inset-x-0 bottom-0 ${view.mastered ? 'bg-ok/25' : 'bg-accent/20'}`}
          style={{ height: `${view.mastered ? 100 : percent}%` }}
        />
        <span aria-hidden="true" className="relative">
          {label}
        </span>
        {view.mastered && (
          <span
            aria-hidden="true"
            className="absolute top-0 right-0.5 text-[0.6rem] leading-none font-bold text-ok"
          >
            ✓
          </span>
        )}
      </button>
    </li>
  );
}

const STATUS_LOOK = {
  done: { icon: '✓', className: 'text-ok' },
  current: { icon: '●', className: 'text-accent' },
  locked: { icon: '○', className: 'text-ink-muted' },
} as const;

/**
 * Course screen (docs/screens.md, "Курс"; task 5.5): the stages in order, the
 * state of every key, and training of any open key.
 */
export function CourseScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const kit = useLayoutKit();
  const keyStats = usePractice((s) => s.keyStats);
  const course = usePractice((s) => s.course);
  const training = usePractice((s) => s.training);
  const train = usePractice((s) => s.train);
  const strict = useSettings((s) => s.strictMode);
  const views = useMemo(
    () => keyViews(kit, keyStats, course, strict),
    [kit, keyStats, course, strict],
  );
  const stages = stageViews(kit, course);
  const label = (key: string) => charLabel(kit.layout, key, t('keyboard.space'));

  const trainKey = (key: string) => {
    train(key);
    void navigate('/practice');
  };

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold">{t('courseScreen.title')}</h1>
          <p className="text-ink-muted">{t('courseScreen.intro')}</p>
        </div>
        <Link
          to="/practice"
          className={`${buttonClass('primary')} px-6 py-3`}
          onClick={() => {
            if (training !== null) train(null);
          }}
        >
          {t('courseScreen.continue')}
        </Link>
      </div>
      <p className="text-sm text-ink-muted">{t('courseScreen.trainHint')}</p>

      <ol className="flex flex-col gap-4">
        {stages.map(({ stage, status, keys }, index) => {
          const look = STATUS_LOOK[status];
          const mastered = keys.filter((key) => views.get(key)?.mastered).length;
          const free = stage.kind === 'free';
          const weakest = free && status === 'current' ? weakestKeys(views, FREE_TRAIN_KEYS) : [];
          return (
            <li
              key={stage.id}
              data-stage-status={status}
              aria-current={status === 'current' ? 'step' : undefined}
              className={`flex flex-col gap-3 rounded-lg bg-surface px-5 py-4 ${status === 'current' ? 'border-2 border-accent' : 'border border-line'}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold">
                  <span className="font-normal text-ink-muted">
                    {t('courseScreen.stageN', { n: index + 1 })}
                  </span>{' '}
                  {t(`stage.${stage.kind}`)}
                </h2>
                <span className={`text-sm font-medium ${look.className}`}>
                  <span aria-hidden="true">{look.icon} </span>
                  {t(`courseScreen.status.${status}`)}
                </span>
              </div>
              <p className="text-ink-muted">{t(`stageAbout.${stage.kind}`)}</p>
              {keys.length > 0 && (
                <>
                  <p className="text-sm">
                    {t('courseScreen.mastered', { mastered, total: keys.length })}
                  </p>
                  <ul aria-label={t('courseScreen.keys')} className="flex flex-wrap gap-1">
                    {keys.map((key) => (
                      <KeyChip
                        key={key}
                        label={label(key)}
                        view={views.get(key)}
                        training={training === key}
                        onTrain={() => {
                          trainKey(key);
                        }}
                      />
                    ))}
                  </ul>
                </>
              )}
              {weakest.length > 0 && (
                <>
                  <p className="text-sm">{t('courseScreen.weakest')}</p>
                  <ul aria-label={t('courseScreen.weakest')} className="flex flex-wrap gap-1">
                    {weakest.map((key) => (
                      <KeyChip
                        key={key}
                        label={label(key)}
                        view={views.get(key)}
                        training={training === key}
                        onTrain={() => {
                          trainKey(key);
                        }}
                      />
                    ))}
                  </ul>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
