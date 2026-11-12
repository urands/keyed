import { Check } from 'lucide-react';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { geometryFor, kitFor, PRACTICE_LAYOUTS } from '../../app/layouts';
import { requestNotifications } from '../../app/notify';
import { usePractice } from '../../app/practice';
import { DAILY_GOALS, useSettings, type DailyGoal } from '../../app/settings';
import { GEOMETRY_IDS, type Finger, type GeometryId } from '../../engine/layout/geometry';
import { keyForChar, type LayoutId } from '../../engine/layout/layout';
import { LANGUAGES, type Language } from '../../i18n';
import { Button } from '../components/Button';
import { Kbd } from '../components/Kbd';
import { LogoMark } from '../components/Logo';
import { Hand } from '../practice/Hands';
import { Keyboard } from '../practice/Keyboard';
import { isActivatable, isTextEntry } from '../practice/keyTargets';

const LEVELS = ['beginner', 'looking', 'blind'] as const;
type Level = (typeof LEVELS)[number];

/** The target speed for a learner who already types blind, characters per minute. */
const BLIND_TARGET_CPM = 250;

const STEPS = ['language', 'layout', 'keyboard', 'level', 'hands', 'goal', 'reminders'] as const;
type Step = (typeof STEPS)[number];

/** Keys that look different on ANSI and ISO keyboards. */
const KEYBOARD_DIFFERENCE: Record<GeometryId, ReadonlySet<string>> = {
  ansi: new Set(['Enter', 'ShiftLeft', 'Backslash']),
  iso: new Set(['Enter', 'ShiftLeft', 'IntlBackslash', 'Backslash']),
};

const HOME_ROW = new Set([
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyF',
  'KeyJ',
  'KeyK',
  'KeyL',
  'Semicolon',
  'Space',
]);
const NO_CODES: ReadonlySet<string> = new Set();

interface ChoiceProps<T extends string> {
  name: string;
  legend: string;
  value: T;
  options: readonly { value: T; label: string; hint?: string; picture?: ReactNode }[];
  onChange: (value: T) => void;
  columns?: number;
}

/** Big radio cards: arrow keys move between them, Enter goes on. */
function Choice<T extends string>({
  name,
  legend,
  value,
  options,
  onChange,
  columns = 1,
}: ChoiceProps<T>) {
  return (
    <fieldset
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      <legend className="sr-only">{legend}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className="flex cursor-pointer flex-col gap-2 rounded-2xl border-2 border-line bg-surface-2/50 px-5 py-4 text-left transition-colors hover:border-ink-muted has-checked:border-accent has-checked:bg-accent/10 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent"
        >
          <span className="flex items-center gap-3">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="h-4 w-4 accent-accent"
            />
            <span className="text-lg font-medium whitespace-nowrap">{option.label}</span>
          </span>
          {option.picture}
          {option.hint && <span className="text-sm text-ink-muted">{option.hint}</span>}
        </label>
      ))}
    </fieldset>
  );
}

/**
 * First-run wizard (docs/screens.md, section 1; task 6.1): language, layout,
 * keyboard type, level, hand position, daily goal and reminders. Every step
 * goes on with Enter.
 */
export function WelcomeWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const settings = useSettings();
  const [index, setIndex] = useState(0);
  const [layout, setLayout] = useState<LayoutId>(settings.layout);
  const [keyboard, setKeyboard] = useState<GeometryId>(settings.keyboardType);
  const [level, setLevel] = useState<Level>('beginner');
  const [goal, setGoal] = useState<DailyGoal>(settings.dailyGoal);
  const [remind, setRemind] = useState(false);
  const [time, setTime] = useState(settings.reminderTime);
  const [pressed, setPressed] = useState<ReadonlySet<string>>(new Set());
  const step: Step = STEPS[index] ?? 'language';
  const last = index === STEPS.length - 1;

  const kit = kitFor(layout, { yoLetter: settings.yoLetter });
  const geometry = geometryFor(keyboard);
  const homeKeys = kit.letters.start.map((key) => key.toLocaleUpperCase(kit.layout.language));
  const homeCodes = kit.letters.start.flatMap((key) => keyForChar(kit.layout, key)?.code ?? []);
  const handsReady = homeCodes.every((code) => pressed.has(code));

  const finish = async () => {
    const blind = level === 'blind';
    settings.update({
      keyboardType: keyboard,
      dailyGoal: goal,
      reminderTime: time,
      remindersEnabled: false,
      ...(blind ? { targetCpm: BLIND_TARGET_CPM, showHands: false } : {}),
    });
    const practice = usePractice.getState();
    await practice.switchLayout(layout);
    if (blind) usePractice.getState().openAllLetters();
    useSettings.getState().update({ onboarded: true });
    void navigate('/practice');
    // Permission is asked after the wizard: a refusal just leaves reminders off.
    if (remind && (await requestNotifications())) {
      useSettings.getState().update({ remindersEnabled: true });
    }
  };

  const next = () => {
    if (last) void finish();
    else setIndex((i) => i + 1);
  };

  // Enter goes on from any step; on the hands step the home keys are tracked.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !event.repeat) {
        if (isActivatable(event.target) || isTextEntry(event.target)) return;
        event.preventDefault();
        if (last) void finish();
        else setIndex((i) => i + 1);
        return;
      }
      if (step === 'hands' && !event.repeat) {
        setPressed((before) => new Set(before).add(event.code));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  });

  const body = (() => {
    switch (step) {
      case 'language':
        return (
          <Choice<Language>
            name="welcome-language"
            legend={t('settings.language.label')}
            value={settings.language}
            columns={2}
            options={LANGUAGES.map((value) => ({
              value,
              label: t(`settings.language.${value}`),
            }))}
            onChange={(value) => {
              settings.setLanguage(value);
            }}
          />
        );
      case 'layout':
        return (
          <Choice<LayoutId>
            name="welcome-layout"
            legend={t('layout.label')}
            value={layout}
            columns={2}
            options={PRACTICE_LAYOUTS.map((value) => ({
              value,
              label: t(`layout.name.${value}`),
            }))}
            onChange={setLayout}
          />
        );
      case 'keyboard':
        return (
          <>
            <Choice<GeometryId>
              name="welcome-keyboard"
              legend={t('settings.keyboardType.label')}
              value={keyboard}
              columns={2}
              options={GEOMETRY_IDS.map((value) => ({
                value,
                label: t(`settings.keyboardType.${value}`),
                hint: t(`welcome.keyboard.${value}Hint`),
                picture: (
                  <Keyboard
                    layout={kit.layout}
                    geometry={geometryFor(value)}
                    openCodes={NO_CODES}
                    highlightCodes={KEYBOARD_DIFFERENCE[value]}
                    keySize="1.15rem"
                  />
                ),
              }))}
              onChange={setKeyboard}
            />
            <p className="text-sm text-ink-muted">{t('welcome.keyboard.unsure')}</p>
          </>
        );
      case 'level':
        return (
          <Choice<Level>
            name="welcome-level"
            legend={t('welcome.level.title')}
            value={level}
            options={LEVELS.map((value) => ({
              value,
              label: t(`welcome.level.${value}`),
              hint: t(`welcome.level.${value}Hint`, { cpm: BLIND_TARGET_CPM }),
            }))}
            onChange={setLevel}
          />
        );
      case 'hands': {
        const indexFingers = new Set<Finger>(['lIndex', 'rIndex']);
        return (
          <div className="flex flex-col items-center gap-4">
            <div
              className="kd-keyboard flex items-end justify-center gap-[calc(var(--u)*0.4)]"
              style={{ '--u': '2rem' } as CSSProperties}
            >
              <Hand side="left" active={indexFingers} className="w-[calc(var(--u)*3.4)] shrink-0" />
              <Keyboard
                layout={kit.layout}
                geometry={geometry}
                openCodes={HOME_ROW}
                highlightCodes={new Set(homeCodes.filter((code) => !pressed.has(code)))}
                masteredCodes={new Set(homeCodes.filter((code) => pressed.has(code)))}
                keySize="2rem"
              />
              <Hand
                side="right"
                active={indexFingers}
                className="w-[calc(var(--u)*3.4)] shrink-0"
              />
            </div>
            <p>{t('welcome.hands.check', { left: homeKeys[0], right: homeKeys[1] })}</p>
            <p
              aria-live="polite"
              className={`flex h-7 items-center gap-2 font-medium ${handsReady ? 'text-ok' : 'text-ink-muted'}`}
            >
              {handsReady && <Check aria-hidden="true" size={20} />}
              {handsReady
                ? t('welcome.hands.done')
                : homeKeys
                    .map((key, i) => (pressed.has(homeCodes[i] ?? '') ? `${key} ✓` : `${key} …`))
                    .join('   ')}
            </p>
          </div>
        );
      }
      case 'goal':
        return (
          <Choice<string>
            name="welcome-goal"
            legend={t('settings.goal.label')}
            value={String(goal)}
            columns={5}
            options={DAILY_GOALS.map((value) => ({
              value: String(value),
              label: t('goal.minutes', { count: value }),
            }))}
            onChange={(value) => {
              setGoal(Number(value) as DailyGoal);
            }}
          />
        );
      case 'reminders':
        return (
          <div className="flex flex-col gap-4">
            <Choice<'on' | 'off'>
              name="welcome-reminders"
              legend={t('welcome.reminders.title')}
              value={remind ? 'on' : 'off'}
              columns={2}
              options={[
                { value: 'on', label: t('welcome.reminders.on') },
                { value: 'off', label: t('welcome.reminders.off') },
              ]}
              onChange={(value) => {
                setRemind(value === 'on');
              }}
            />
            <label className="flex items-center gap-3 self-start">
              {t('settings.reminders.time')}
              <input
                type="time"
                value={time}
                disabled={!remind}
                onChange={(event) => {
                  if (event.target.value) setTime(event.target.value);
                }}
                className="rounded-lg border border-line bg-surface-2 px-2 py-1 disabled:opacity-50"
              />
            </label>
          </div>
        );
    }
  })();

  return (
    <div className="kd-backdrop flex min-h-dvh items-center justify-center overflow-y-auto p-6">
      <section
        aria-labelledby="welcome-title"
        className="kd-card flex w-full max-w-3xl flex-col gap-6 px-10 py-8"
      >
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-lg font-semibold">
            <LogoMark className="h-8 w-8" />
            KeyEd
          </span>
          <span className="flex items-center gap-3 text-sm text-ink-muted">
            {t('welcome.step', { n: index + 1, total: STEPS.length })}
            <span className="flex gap-1.5" aria-hidden="true">
              {STEPS.map((name, i) => (
                <span
                  key={name}
                  className={`h-1.5 w-5 rounded-full ${i <= index ? 'bg-accent' : 'bg-surface-2'}`}
                />
              ))}
            </span>
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <h1 id="welcome-title" className="text-3xl font-semibold">
            {t(`welcome.${step}.title`)}
          </h1>
          <p className="text-lg text-ink-muted">
            {t(`welcome.${step}.text`, { left: homeKeys[0], right: homeKeys[1] })}
          </p>
        </div>

        {body}

        <div className="flex items-center justify-between gap-3 pt-2">
          {index > 0 ? (
            <Button
              variant="ghost"
              onClick={() => {
                setIndex((i) => i - 1);
              }}
            >
              {t('welcome.back')}
            </Button>
          ) : (
            <span />
          )}
          <Button variant="primary" onClick={next} className="px-6">
            {last ? t('welcome.finish') : t('welcome.next')} <Kbd>{t('keyboard.enter')}</Kbd>
          </Button>
        </div>
      </section>
    </div>
  );
}
