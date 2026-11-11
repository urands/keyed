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

describe('translations', () => {
  it('have the same keys in Russian and English', () => {
    expect(keyPaths(ru).sort()).toEqual(keyPaths(en).sort());
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
