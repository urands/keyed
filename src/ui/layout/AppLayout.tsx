import {
  ChartColumn,
  GraduationCap,
  House,
  Play,
  Settings,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useNavigate } from 'react-router';

import { usePractice } from '../../app/practice';
import { useSettings } from '../../app/settings';
import { useStorageStatus } from '../../app/storage';
import { LayoutSwitch } from '../components/LayoutSwitch';
import { Logo } from '../components/Logo';
import { AchievementToasts } from '../motivation/AchievementToasts';
import { UpdateDialog } from '../screens/UpdateDialog';
import { WelcomeWizard } from '../welcome/WelcomeWizard';

interface NavItem {
  to: string;
  label: 'home' | 'practice' | 'course' | 'stats' | 'achievements' | 'settings';
  icon: LucideIcon;
}

const NAV: readonly NavItem[] = [
  { to: '/', label: 'home', icon: House },
  { to: '/practice', label: 'practice', icon: Play },
  { to: '/course', label: 'course', icon: GraduationCap },
  { to: '/stats', label: 'stats', icon: ChartColumn },
  { to: '/achievements', label: 'achievements', icon: Trophy },
  { to: '/settings', label: 'settings', icon: Settings },
];

function navClass({ isActive }: { isActive: boolean }): string {
  return `flex w-16 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[0.6875rem] leading-tight transition-colors ${
    isActive
      ? 'bg-accent/15 font-medium text-ink [&_svg]:text-accent'
      : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
  }`;
}

/**
 * The window: a sidebar with the sections (docs/screens.md, "Навигация") and
 * the current screen. Before the first-run wizard is done, only the wizard.
 */
export function AppLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const onboarded = useSettings((s) => s.onboarded);
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

  if (!onboarded) return <WelcomeWizard />;

  return (
    <div className="kd-backdrop flex h-dvh">
      <aside
        className={`flex w-22 shrink-0 flex-col items-center gap-6 border-r border-line bg-surface/70 py-4 transition-opacity ${typing ? 'opacity-30' : ''}`}
      >
        <Logo />
        <nav aria-label={t('nav.label')}>
          <ul className="flex flex-col gap-1">
            {NAV.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink to={to} end={to === '/'} className={navClass}>
                  <Icon aria-hidden="true" size={22} strokeWidth={1.75} />
                  {t(`nav.${label}`)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto">
          <LayoutSwitch short vertical name="sidebar-layout" />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {storageFailed && (
          <p role="alert" className="bg-error-bg px-6 py-2 text-center text-sm text-error">
            {t('app.storageError')}
          </p>
        )}
        <main className="min-h-0 flex-1 overflow-y-auto px-8">
          <Outlet />
        </main>
      </div>
      <AchievementToasts />
      <UpdateDialog />
    </div>
  );
}
