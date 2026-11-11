import i18n from '../i18n';
import { applyTheme, resolveTheme } from '../ui/theme/theme';
import { useSettings } from './settings';

/**
 * Applies the stored language and theme to i18next and the document, and keeps
 * them in sync with later changes of the settings or of the system theme.
 * Returns a function that stops the sync.
 */
export function startSettingsSync(): () => void {
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

  const apply = () => {
    const { language, theme } = useSettings.getState();
    applyTheme(resolveTheme(theme, systemDark.matches));
    document.documentElement.lang = language;
    if (i18n.language !== language) void i18n.changeLanguage(language);
  };

  apply();
  const unsubscribe = useSettings.subscribe(apply);
  systemDark.addEventListener('change', apply);

  return () => {
    unsubscribe();
    systemDark.removeEventListener('change', apply);
  };
}
