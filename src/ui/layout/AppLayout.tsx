import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useNavigate } from 'react-router';

import { usePractice } from '../../app/practice';
import { useStorageStatus } from '../../app/storage';
import { LayoutSwitch } from '../components/LayoutSwitch';

function navClass({ isActive }: { isActive: boolean }): string {
  return `rounded-md px-3 py-1.5 text-sm outline-accent focus-visible:outline-2 ${
    isActive ? 'bg-accent/15 text-ink' : 'text-ink-muted hover:text-ink'
  }`;
}

export function AppLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Navigation fades while the user types, so it does not distract.
  const typing = usePractice((state) => state.lesson.status === 'running');
  const storageFailed = useStorageStatus((state) => state.failed);

  // Ctrl+, opens the settings (docs/screens.md, "Горячие клавиши").
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === ',') {
        event.preventDefault();
        void navigate('/settings');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [navigate]);

  return (
    <div className="flex min-h-dvh flex-col">
      {storageFailed && (
        <p role="alert" className="bg-error-bg px-6 py-2 text-center text-sm text-error">
          {t('app.storageError')}
        </p>
      )}
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
            <NavLink to="/stats" className={navClass}>
              {t('nav.stats')}
            </NavLink>
            <NavLink to="/settings" className={navClass}>
              {t('nav.settings')}
            </NavLink>
          </nav>
        </div>
        <LayoutSwitch short name="header-layout" />
      </header>
      <main className="flex-1 px-6">
        <Outlet />
      </main>
    </div>
  );
}
