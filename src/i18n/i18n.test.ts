import { describe, expect, it } from 'vitest';

import de from './de.json';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import { detectLanguage, LANGUAGES } from './index';
import ru from './ru.json';

const RESOURCES = { ru, en, de, fr, es };

function keyPaths(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

/** Keys without plural suffixes: languages have different plural forms. */
function baseKeys(resource: unknown): string[] {
  return [...new Set(keyPaths(resource).map((path) => path.replace(PLURAL_SUFFIX, '')))].sort();
}

/** Plural keys of a resource, grouped by base key: { "streak.days": ["one", "other"] }. */
function pluralForms(resource: unknown): Record<string, string[]> {
  const forms: Record<string, string[]> = {};
  for (const path of keyPaths(resource)) {
    const match = PLURAL_SUFFIX.exec(path);
    if (match?.[1]) (forms[path.replace(PLURAL_SUFFIX, '')] ??= []).push(match[1]);
  }
  return forms;
}

describe('translations', () => {
  it.each(LANGUAGES)('have the same keys in %s and English', (language) => {
    expect(baseKeys(RESOURCES[language])).toEqual(baseKeys(en));
  });

  it.each(LANGUAGES)('have every plural form %s needs', (language) => {
    // i18next picks the form with Intl.PluralRules: one, few, many, other.
    const needed = [...new Intl.PluralRules(language).resolvedOptions().pluralCategories].sort();
    const forms = pluralForms(RESOURCES[language]);
    for (const [key, found] of Object.entries(forms)) expect(found.sort(), key).toEqual(needed);
    expect(Object.keys(forms).sort()).toEqual(Object.keys(pluralForms(en)).sort());
  });

  it.each(LANGUAGES)('keep the placeholders of English in %s', (language) => {
    const placeholders = (value: unknown) =>
      [...String(value).matchAll(/\{\{\w+\}\}/gu)].map((match) => match[0]).sort();
    const valueAt = (resource: unknown, path: string) =>
      path
        .split('.')
        .reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], resource);
    const resource = RESOURCES[language];
    for (const path of keyPaths(en)) {
      const base = path.replace(PLURAL_SUFFIX, '');
      const own = keyPaths(resource).filter((p) => p.replace(PLURAL_SUFFIX, '') === base);
      for (const ownPath of own) {
        // A singular form may say "one" instead of {{count}}.
        const expected = placeholders(valueAt(en, path)).filter(
          (p) => !(p === '{{count}}' && PLURAL_SUFFIX.test(path)),
        );
        for (const placeholder of expected) {
          expect(String(valueAt(resource, ownPath)), ownPath).toContain(placeholder);
        }
      }
    }
  });

  it('name every language in its own language, the same in every file', () => {
    for (const resource of Object.values(RESOURCES)) {
      expect(resource.settings.language).toMatchObject({
        ru: 'Русский',
        en: 'English',
        de: 'Deutsch',
        fr: 'Français',
        es: 'Español',
      });
    }
  });

  it('pick the right Russian plural form', async () => {
    const i18n = (await import('./index')).default;
    const t = i18n.getFixedT('ru');
    expect(t('streak.days', { count: 1 })).toBe('Серия: 1 день');
    expect(t('streak.days', { count: 3 })).toBe('Серия: 3 дня');
    expect(t('streak.days', { count: 5 })).toBe('Серия: 5 дней');
    expect(t('streak.days', { count: 21 })).toBe('Серия: 21 день');
  });

  it('contain no empty strings', () => {
    for (const resource of Object.values(RESOURCES)) {
      const empty = keyPaths(resource).filter((path) => {
        const value = path
          .split('.')
          .reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], resource);
        return typeof value !== 'string' || value.trim() === '';
      });
      expect(empty).toEqual([]);
    }
  });
});

describe('detectLanguage', () => {
  it('chooses Russian for Russian locales', () => {
    expect(detectLanguage('ru')).toBe('ru');
    expect(detectLanguage('ru-RU')).toBe('ru');
    expect(detectLanguage('RU-by')).toBe('ru');
  });

  it('chooses German, French and Spanish for their locales', () => {
    expect(detectLanguage('de-DE')).toBe('de');
    expect(detectLanguage('de-AT')).toBe('de');
    expect(detectLanguage('fr-CA')).toBe('fr');
    expect(detectLanguage('es-MX')).toBe('es');
    expect(detectLanguage('es_ES')).toBe('es');
  });

  it('falls back to English for everything else', () => {
    expect(detectLanguage('en-US')).toBe('en');
    expect(detectLanguage('it-IT')).toBe('en');
    expect(detectLanguage('')).toBe('en');
  });
});
