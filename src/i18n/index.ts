import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import de from './de.json';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import ru from './ru.json';

export const LANGUAGES = ['ru', 'en', 'de', 'fr', 'es'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Picks the interface language for a BCP 47 locale such as `navigator.language`. */
export function detectLanguage(locale: string): Language {
  const code = locale.toLowerCase().split(/[-_]/u)[0];
  return LANGUAGES.find((language) => language === code) ?? 'en';
}

// Resources are bundled, so init completes synchronously.
void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ru: { translation: ru },
    de: { translation: de },
    fr: { translation: fr },
    es: { translation: es },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
