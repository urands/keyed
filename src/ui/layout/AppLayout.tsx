import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router';

import { usePractice } from '../../app/practice';
import { useSettings } from '../../app/settings';
import { LANGUAGES } from '../../i18n';
import { SegmentedControl } from '../components/SegmentedControl';
import { THEME_PREFERENCES } from '../theme/theme';

function navClass({ isActive }: { isActive: boolean }): string {
  return `rounded-md px-3 py-1.5 text-sm outline-accent focus-visible:outline-2 ${
    isActive ? 'bg-accent/15 text-ink' : 'text-ink-muted hover:text-ink'
  }`;
}

export function AppLayout() {
  const { t } = useTranslation();
  const language = useSettings((state) => state.language);
  const setLanguage = useSettings((state) => state.setLanguage);
  const theme = useSettings((state) => state.theme);
  const setTheme = useSettings((state) => state.setTheme);
  // Navigation fades while the user types, so it does not distract.
  const typing = usePractice((state) => state.lesson.status === 'running');

  return (
    <div className="flex min-h-dvh flex-col">
      <header
        className={`flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-6 py-3 transition-opacity motion-reduce:transition-none ${typing ? 'opacity-30' : ''}`}
      >
        <div className="flex items-center gap-6">
          <span className="font-mono text-lg font-semibold">{t('app.name')}</span>
          <nav aria-label={t('nav.label')} className="flex gap-1">
            <NavLink to="/" end className={navClass}>
              {t('nav.home')}
            </NavLink>
            <NavLink to="/practice" className={navClass}>
              {t('nav.practice')}
            </NavLink>
          </nav>
        </div>
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
