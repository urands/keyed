import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { requestNotifications } from '../../app/notify';
import {
  DAILY_GOALS,
  INPUT_MODES,
  SPEED_UNIT_PREFERENCES,
  useSettings,
  type DailyGoal,
} from '../../app/settings';
import { LANGUAGES } from '../../i18n';
import { playErrorSound, playKeySound } from '../sound';
import { LayoutSwitch } from '../components/LayoutSwitch';
import { SegmentedControl } from '../components/SegmentedControl';
import { THEME_PREFERENCES } from '../theme/theme';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-6">
      <h2 className="text-lg font-medium">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2.5">
      <div>
        <div>{label}</div>
        {hint && <p className="max-w-xl text-sm text-ink-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

/**
 * Settings (docs/screens.md, section 9). Phase 3 has the settings that exist
 * so far; the full screen comes with task 6.2.
 */
export function SettingsScreen() {
  const { t } = useTranslation();
  const settings = useSettings();
  const [denied, setDenied] = useState(false);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 py-10">
      <h1 className="text-3xl font-semibold">{t('settings.title')}</h1>

      <Section title={t('settings.section.learning')}>
        <Row label={t('layout.label')} hint={t('settings.layoutHint')}>
          <LayoutSwitch name="settings-layout" />
        </Row>
        <Row label={t('settings.strict.label')} hint={t('settings.strict.hint')}>
          <input
            type="checkbox"
            aria-label={t('settings.strict.label')}
            checked={settings.strictMode}
            onChange={(event) => {
              settings.update({ strictMode: event.target.checked });
            }}
            className="h-5 w-5 accent-accent"
          />
        </Row>
        <Row label={t('settings.yo.label')} hint={t('settings.yo.hint')}>
          <input
            type="checkbox"
            aria-label={t('settings.yo.label')}
            checked={settings.yoLetter}
            onChange={(event) => {
              settings.update({ yoLetter: event.target.checked });
            }}
            className="h-5 w-5 accent-accent"
          />
        </Row>
      </Section>

      <Section title={t('settings.section.motivation')}>
        <Row label={t('settings.goal.label')} hint={t('settings.goal.hint')}>
          <SegmentedControl
            name="daily-goal"
            legend={t('settings.goal.label')}
            value={String(settings.dailyGoal)}
            options={DAILY_GOALS.map((value) => ({
              value: String(value),
              label: t('goal.minutes', { count: value }),
            }))}
            onChange={(value) => {
              settings.update({ dailyGoal: Number(value) as DailyGoal });
            }}
          />
        </Row>
        <Row label={t('settings.reminders.label')} hint={t('settings.reminders.hint')}>
          <div className="flex flex-wrap items-center gap-4">
            <input
              type="checkbox"
              aria-label={t('settings.reminders.label')}
              checked={settings.remindersEnabled}
              onChange={(event) => {
                const enabled = event.target.checked;
                settings.update({ remindersEnabled: enabled });
                setDenied(false);
                if (enabled) {
                  void requestNotifications().then((granted) => {
                    if (!granted) {
                      settings.update({ remindersEnabled: false });
                      setDenied(true);
                    }
                  });
                }
              }}
              className="h-5 w-5 accent-accent"
            />
            <label className="flex items-center gap-2 text-sm">
              {t('settings.reminders.time')}
              <input
                type="time"
                value={settings.reminderTime}
                disabled={!settings.remindersEnabled}
                onChange={(event) => {
                  if (event.target.value) settings.update({ reminderTime: event.target.value });
                }}
                className="rounded-md border border-line bg-canvas px-2 py-1 disabled:opacity-50"
              />
            </label>
          </div>
          {denied && (
            <p role="alert" className="text-sm text-error">
              {t('settings.reminders.denied')}
            </p>
          )}
        </Row>
      </Section>

      <Section title={t('settings.section.practice')}>
        <Row label={t('settings.speedUnit.label')} hint={t('settings.speedUnit.hint')}>
          <SegmentedControl
            name="speed-unit"
            legend={t('settings.speedUnit.label')}
            value={settings.speedUnit}
            options={SPEED_UNIT_PREFERENCES.map((value) => ({
              value,
              label: t(`settings.speedUnit.${value}`),
            }))}
            onChange={(speedUnit) => {
              settings.update({ speedUnit });
            }}
          />
        </Row>
      </Section>

      <Section title={t('settings.section.keyboard')}>
        <Row
          label={t('settings.inputMode.label')}
          hint={t(`settings.inputMode.${settings.inputMode}Hint`)}
        >
          <SegmentedControl
            name="input-mode"
            legend={t('settings.inputMode.label')}
            value={settings.inputMode}
            options={INPUT_MODES.map((value) => ({
              value,
              label: t(`settings.inputMode.${value}`),
            }))}
            onChange={(inputMode) => {
              settings.update({ inputMode });
            }}
          />
        </Row>
      </Section>

      <Section title={t('settings.section.sound')}>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.soundKeys}
            onChange={(event) => {
              settings.update({ soundKeys: event.target.checked });
              if (event.target.checked) playKeySound(settings.soundVolume);
            }}
            className="h-5 w-5 accent-accent"
          />
          {t('settings.sound.keys')}
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.soundErrors}
            onChange={(event) => {
              settings.update({ soundErrors: event.target.checked });
              if (event.target.checked) playErrorSound(settings.soundVolume);
            }}
            className="h-5 w-5 accent-accent"
          />
          {t('settings.sound.errors')}
        </label>
        <label className="flex flex-wrap items-center gap-3">
          {t('settings.sound.volume')}
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={settings.soundVolume}
            disabled={!settings.soundKeys && !settings.soundErrors}
            onChange={(event) => {
              settings.update({ soundVolume: Number(event.target.value) });
            }}
            onPointerUp={() => {
              playKeySound(settings.soundVolume);
            }}
            className="w-48 accent-accent disabled:opacity-50"
          />
          <span className="text-sm text-ink-muted tabular-nums">{settings.soundVolume}%</span>
        </label>
      </Section>

      <Section title={t('settings.section.appearance')}>
        <Row label={t('settings.theme.label')}>
          <SegmentedControl
            name="theme"
            legend={t('settings.theme.label')}
            value={settings.theme}
            options={THEME_PREFERENCES.map((value) => ({
              value,
              label: t(`settings.theme.${value}`),
            }))}
            onChange={settings.setTheme}
          />
        </Row>
        <Row label={t('settings.language.label')}>
          <SegmentedControl
            name="language"
            legend={t('settings.language.label')}
            value={settings.language}
            options={LANGUAGES.map((value) => ({
              value,
              label: t(`settings.language.${value}`),
            }))}
            onChange={settings.setLanguage}
          />
        </Row>
      </Section>
    </div>
  );
}
