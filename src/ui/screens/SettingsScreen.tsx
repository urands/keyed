import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { INPUT_MODES, SPEED_UNIT_PREFERENCES, useSettings } from '../../app/settings';
import { LANGUAGES } from '../../i18n';
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
