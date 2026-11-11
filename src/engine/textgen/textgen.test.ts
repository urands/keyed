import { describe, expect, it } from 'vitest';

import { DEFAULT_PARAMS } from '../params';
import { createRandom } from '../random';
import { isBlocked } from './blocklist';
import { generatePseudoWord, parseLetterModel } from './letterModel';
import { buildLessonText, type LessonTextInput } from './lessonText';

// A tiny model: words "sad", "lad", "dad", "ask", "all", "salad".
const model = parseLetterModel({
  counts: {
    '^^': { s: 2, l: 1, d: 1, a: 2 },
    '^s': { a: 2 },
    '^l': { a: 1 },
    '^d': { a: 1 },
    '^a': { s: 1, l: 1 },
    sa: { d: 1, l: 1 },
    la: { d: 2 },
    da: { d: 1 },
    ad: { $: 3 },
    as: { k: 1 },
    sk: { $: 1 },
    al: { l: 1, a: 1 },
    ll: { $: 1 },
  },
});

const params = { ...DEFAULT_PARAMS };

function input(overrides: Partial<LessonTextInput>): LessonTextInput {
  return {
    words: ['all', 'sad', 'dad', 'ask', 'fall', 'salad', 'flask', 'lad', 'add', 'as'],
    model,
    blocklist: new Set(),
    letters: new Set('asdfjkl'),
    focus: 'k',
    random: createRandom(1),
    params,
    ...overrides,
  };
}

describe('isBlocked', () => {
  const blocklist = new Set(['ass', 'damn']);

  it('blocks whole words', () => {
    expect(isBlocked('ass', blocklist)).toBe(true);
    expect(isBlocked('class', blocklist)).toBe(false);
  });

  it('blocks words that start with a blocked entry of four or more letters', () => {
    expect(isBlocked('damned', blocklist)).toBe(true);
    expect(isBlocked('assume', blocklist)).toBe(false);
  });
});

describe('letter model', () => {
  it('rejects malformed data', () => {
    expect(() => parseLetterModel({})).toThrow();
    expect(() => parseLetterModel({ counts: { abc: { d: 1 } } })).toThrow(/context/);
    expect(() => parseLetterModel({ counts: { ab: { d: 0 } } })).toThrow(/count/);
  });

  it('generates words from open letters only, within the length limits', () => {
    const random = createRandom(3);
    const letters = new Set('sadlk');
    for (let i = 0; i < 200; i += 1) {
      const word = generatePseudoWord(model, { letters, minLength: 3, maxLength: 7, random });
      if (word === null) continue;
      expect(word).toMatch(/^[sadlk]{3,7}$/);
    }
  });

  it('returns null when the open letters cannot make a word', () => {
    const word = generatePseudoWord(model, {
      letters: new Set('fj'),
      minLength: 3,
      maxLength: 7,
      random: createRandom(1),
    });
    expect(word).toBeNull();
  });
});

describe('buildLessonText', () => {
  it('is reproducible with the same seed', () => {
    expect(buildLessonText(input({ random: createRandom(5) }))).toBe(
      buildLessonText(input({ random: createRandom(5) })),
    );
  });

  it('uses only open letters and reaches the lesson length', () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      const text = buildLessonText(input({ random: createRandom(seed) }));
      expect(text.length).toBeGreaterThanOrEqual(params.lessonLength);
      expect(text).toMatch(/^[asdfjkl]+( [asdfjkl]+)*$/);
    }
  });

  it('puts the focus key into at least half of the words', () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      const words = buildLessonText(input({ random: createRandom(seed) })).split(' ');
      const withFocus = words.filter((word) => word.includes('k')).length;
      expect(withFocus / words.length).toBeGreaterThanOrEqual(params.focusWordShare);
    }
  });

  it('never puts the same word twice in a row', () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      const words = buildLessonText(input({ random: createRandom(seed) })).split(' ');
      words.slice(1).forEach((word, i) => expect(word).not.toBe(words[i]));
    }
  });

  it('skips dictionary entries with three equal letters in a row', () => {
    const text = buildLessonText(input({ words: ['aaa', 'sss', 'all', 'sad', 'ask'] }));
    expect(text).not.toMatch(/(.)\1\1/u);
  });

  it('skips blocked words', () => {
    const text = buildLessonText(input({ blocklist: new Set(['sad', 'dad']) }));
    expect(text.split(' ')).not.toContain('sad');
    expect(text.split(' ')).not.toContain('dad');
  });

  it('builds letter combinations when no words are possible', () => {
    const text = buildLessonText(
      input({ words: ['the', 'and'], letters: new Set('fj'), focus: 'j' }),
    );
    expect(text).toMatch(/^[fj]{2,4}( [fj]{2,4})*$/);
    expect(text).not.toMatch(/(.)\1\1/u);
  });
});
