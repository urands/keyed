import { Check, CircleCheck, CircleDot, Lock } from 'lucide-react';
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
        className="flex h-9 min-w-10 items-center justify-center gap-1 rounded-lg bg-surface-2/60 px-2 font-mono text-ink-muted"
      >
        <span className="sr-only">{t('course.closed', { key: label })}</span>
        <span aria-hidden="true">{label}</span>
        <Lock aria-hidden="true" size={11} strokeWidth={2.25} className="opacity-70" />
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
        className={`relative flex h-9 min-w-10 items-center justify-center gap-1 overflow-hidden rounded-lg px-2 font-mono font-semibold transition-colors ${view.mastered ? 'bg-accent text-on-accent hover:brightness-110' : 'border border-line bg-surface-2 hover:border-accent'} ${training ? 'shadow-glow ring-2 ring-accent-2 ring-offset-2 ring-offset-surface' : ''}`}
      >
        {!view.mastered && (
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 bg-accent/25"
            style={{ height: `${percent}%` }}
          />
        )}
        <span aria-hidden="true" className="relative">
          {label}
        </span>
        {view.mastered && <Check aria-hidden="true" size={14} strokeWidth={3} />}
      </button>
    </li>
  );
}

const STATUS_LOOK = {
  done: { icon: CircleCheck, className: 'text-ok' },
  current: { icon: CircleDot, className: 'text-accent' },
  locked: { icon: Lock, className: 'text-ink-muted' },
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
              className={`kd-card flex flex-col gap-3 px-6 py-5 ${status === 'current' ? 'ring-2 ring-accent' : ''} ${status === 'locked' ? 'opacity-80' : ''}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold">
                  <span className="font-normal text-ink-muted">
                    {t('courseScreen.stageN', { n: index + 1 })}
                  </span>{' '}
                  {t(`stage.${stage.kind}`)}
                </h2>
                <span className={`flex items-center gap-1.5 text-sm font-medium ${look.className}`}>
                  <look.icon aria-hidden="true" size={16} strokeWidth={2.25} />
                  {t(`courseScreen.status.${status}`)}
                </span>
              </div>
              <p className="text-ink-muted">{t(`stageAbout.${stage.kind}`)}</p>
              {keys.length > 0 && (
                <>
                  <p className="text-sm">
                    {t('courseScreen.mastered', { mastered, total: keys.length })}
                  </p>
                  <ul aria-label={t('courseScreen.keys')} className="flex flex-wrap gap-1.5">
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
                  <ul aria-label={t('courseScreen.weakest')} className="flex flex-wrap gap-1.5">
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
