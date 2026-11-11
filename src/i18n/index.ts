import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import ru from './ru.json';

export const LANGUAGES = ['ru', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Picks the interface language for a BCP 47 locale such as `navigator.language`. */
export function detectLanguage(locale: string): Language {
  return locale.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

// Resources are bundled, so init completes synchronously.
void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ru: { translation: ru },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
