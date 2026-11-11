import { describe, expect, it } from 'vitest';

import en from './en.json';
import { detectLanguage } from './index';
import ru from './ru.json';

function keyPaths(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

/** Keys without plural suffixes: Russian has more plural forms than English. */
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
  it('have the same keys in Russian and English', () => {
    expect(baseKeys(ru)).toEqual(baseKeys(en));
  });

  it('have every plural form each language needs', () => {
    for (const forms of Object.values(pluralForms(en))) {
      expect(forms.sort()).toEqual(['one', 'other']);
    }
    for (const forms of Object.values(pluralForms(ru))) {
      expect(forms.sort()).toEqual(['few', 'many', 'one', 'other']);
    }
    expect(Object.keys(pluralForms(ru)).sort()).toEqual(Object.keys(pluralForms(en)).sort());
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
    for (const resource of [en, ru]) {
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

  it('falls back to English for everything else', () => {
    expect(detectLanguage('en-US')).toBe('en');
    expect(detectLanguage('de-DE')).toBe('en');
    expect(detectLanguage('')).toBe('en');
  });
});
