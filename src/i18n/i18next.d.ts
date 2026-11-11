import 'i18next';

import type en from './en.json';

// Makes `t()` keys type-checked against the English resource file.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof en };
  }
}
