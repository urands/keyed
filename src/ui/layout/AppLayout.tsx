import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';

import { useSettings } from '../../app/settings';
import { LANGUAGES } from '../../i18n';
import { SegmentedControl } from '../components/SegmentedControl';
import { THEME_PREFERENCES } from '../theme/theme';

export function AppLayout() {
  const { t } = useTranslation();
  const language = useSettings((state) => state.language);
  const setLanguage = useSettings((state) => state.setLanguage);
  const theme = useSettings((state) => state.theme);
  const setTheme = useSettings((state) => state.setTheme);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-6 py-3">
        <span className="font-mono text-lg font-semibold">{t('app.name')}</span>
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            name="language"
            legend={t('settings.language.label')}
            value={language}
            options={LANGUAGES.map((value) => ({
              value,
              label: t(`settings.language.${value}`),
            }))}
            onChange={setLanguage}
          />
          <SegmentedControl
            name="theme"
            legend={t('settings.theme.label')}
            value={theme}
            options={THEME_PREFERENCES.map((value) => ({
              value,
              label: t(`settings.theme.${value}`),
            }))}
            onChange={setTheme}
          />
        </div>
      </header>
      <main className="flex-1 px-6">
        <Outlet />
      </main>
    </div>
  );
}
