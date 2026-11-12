import i18n from '../i18n';
import { applyTheme, resolveTheme } from '../ui/theme/theme';
import { settingsValues, useSettings, type SettingsValues } from './settings';
import { getStorage, saveInBackground } from './storage';

function changed(a: SettingsValues, b: SettingsValues): boolean {
  const before = settingsValues(b);
  return Object.entries(settingsValues(a)).some(
    ([key, value]) => before[key as keyof SettingsValues] !== value,
  );
}

/**
 * Applies the language and theme to i18next and the document, keeps them in
 * sync with the settings and the system theme, and saves every change.
 * Returns a function that stops the sync.
 */
export function startSettingsSync(): () => void {
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  const systemCalm = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Saves run one after another: the SQL plugin may run two writes of the same
  // key in any order, and an older value must never win over a newer one.
  let saving: Promise<void> = Promise.resolve();

  const apply = () => {
    const { language, theme, reduceMotion } = useSettings.getState();
    const root = document.documentElement;
    applyTheme(resolveTheme(theme, systemDark.matches));
    // "Less motion" from the settings or the system (index.css, task 6.6).
    if (reduceMotion || systemCalm.matches) root.dataset.motion = 'reduce';
    else delete root.dataset.motion;
    root.lang = language;
    if (i18n.language !== language) void i18n.changeLanguage(language);
  };

  apply();
  const unsubscribe = useSettings.subscribe((state, previous) => {
    apply();
    if (!changed(state, previous)) return;
    // Every setting is saved, so a value that only followed a default (the
    // layout follows the language) stays as the user saw it.
    const values = { ...settingsValues(state) };
    saving = saving.catch(() => undefined).then(() => getStorage().saveSettings(values));
    saveInBackground(saving);
  });
  systemDark.addEventListener('change', apply);
  systemCalm.addEventListener('change', apply);

  return () => {
    unsubscribe();
    systemDark.removeEventListener('change', apply);
    systemCalm.removeEventListener('change', apply);
  };
}
