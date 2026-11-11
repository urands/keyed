import i18n from '../i18n';
import { applyTheme, resolveTheme } from '../ui/theme/theme';
import { settingsValues, useSettings } from './settings';
import { getStorage, saveInBackground } from './storage';

/**
 * Applies the language and theme to i18next and the document, keeps them in
 * sync with the settings and the system theme, and saves every change.
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
  const unsubscribe = useSettings.subscribe((state, previous) => {
    apply();
    if (state.language !== previous.language || state.theme !== previous.theme) {
      saveInBackground(getStorage().saveSettings({ ...settingsValues(state) }));
    }
  });
  systemDark.addEventListener('change', apply);

  return () => {
    unsubscribe();
    systemDark.removeEventListener('change', apply);
  };
}
