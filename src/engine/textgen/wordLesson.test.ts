import { describe, expect, it } from 'vitest';

import { createRandom } from '../random';
import { buildWordLesson } from './wordLesson';

const words = ['the', 'and', 'you', 'that', 'was', 'for', 'are', 'with'];

describe('buildWordLesson', () => {
  it('is reproducible with the same seed', () => {
    expect(buildWordLesson(words, createRandom(7), 120)).toBe(
      buildWordLesson(words, createRandom(7), 120),
    );
    expect(buildWordLesson(words, createRandom(7), 120)).not.toBe(
      buildWordLesson(words, createRandom(8), 120),
    );
  });

  it('reaches the target length with whole words and single spaces', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const text = buildWordLesson(words, createRandom(seed), 120);
      expect(text.length).toBeGreaterThanOrEqual(120);
      expect(text.length).toBeLessThan(120 + 5);
      expect(text).toMatch(/^[a-z]+( [a-z]+)*$/);
      for (const word of text.split(' ')) expect(words).toContain(word);
    }
  });

  it('never repeats a word twice in a row', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const picked = buildWordLesson(words, createRandom(seed), 200).split(' ');
      picked.slice(1).forEach((word, i) => expect(word).not.toBe(picked[i]));
    }
  });

  it('allows repeats when there is only one distinct word', () => {
    expect(buildWordLesson(['ab', 'ab'], createRandom(1), 7)).toBe('ab ab ab');
  });

  it('rejects an empty word list', () => {
    expect(() => buildWordLesson([], createRandom(1), 10)).toThrow();
  });
});

describe('createRandom', () => {
  it('returns numbers in [0, 1)', () => {
    const random = createRandom(42);
    for (let i = 0; i < 1000; i += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
