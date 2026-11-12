import type { LearningParams } from '../params';
import { pick, pickWeighted, type Random } from '../random';
import { isBlocked } from './blocklist';
import { generatePseudoWord, type LetterModel } from './letterModel';

export interface LessonTextInput {
  /** Dictionary, most frequent word first. */
  words: readonly string[];
  model: LetterModel;
  blocklist: ReadonlySet<string>;
  /** Open letters: the text uses only these. */
  letters: ReadonlySet<string>;
  /** The key that needs practice most; null when there is none. */
  focus: string | null;
  random: Random;
  params: Pick<
    LearningParams,
    | 'lessonLength'
    | 'focusWordShare'
    | 'minFocusWords'
    | 'wordMinLength'
    | 'wordMaxLength'
    | 'pseudoMinLength'
    | 'pseudoMaxLength'
  >;
}

interface Candidate {
  word: string;
  weight: number;
}

/** Tries per missing pseudo-word before giving up. */
const PSEUDO_ATTEMPTS = 40;
/** Letter combinations made for the first lessons, when no words are possible. */
const COMBINATION_COUNT = 24;
/** With fewer different words than this, letter combinations are added for variety. */
const MIN_VARIETY = 8;

function hasTripleLetter(word: string): boolean {
  return /(.)\1\1/u.test(word);
}

/**
 * Builds lesson text (docs/learning-method.md, "Как строится урок"): dictionary
 * words made of open letters, pseudo-words when words with the focus key are
 * scarce, and at least `focusWordShare` of the words containing the focus key.
 */
export function buildLessonText(input: LessonTextInput): string {
  const { words, letters, focus, random, params } = input;
  const containsFocus = (word: string) => focus !== null && word.includes(focus);

  // Frequent words come up more often, but the weight is flattened so a lesson
  // is not made of the same ten words.
  const pool: Candidate[] = [];
  const known = new Set<string>();
  for (const [rank, word] of words.entries()) {
    if (word.length < params.wordMinLength || word.length > params.wordMaxLength) continue;
    if (![...word].every((char) => letters.has(char))) continue;
    if (hasTripleLetter(word)) continue;
    if (isBlocked(word, input.blocklist)) continue;
    pool.push({ word, weight: 1 / Math.sqrt(rank + 1) });
    known.add(word);
  }
  const rareWeight = pool.at(-1)?.weight ?? 1 / Math.sqrt(words.length + 1);

  const addPseudoWords = (needed: number, mustHaveFocus: boolean) => {
    let added = 0;
    for (let attempt = 0; added < needed && attempt < needed * PSEUDO_ATTEMPTS; attempt += 1) {
      const word = generatePseudoWord(input.model, {
        letters,
        minLength: params.pseudoMinLength,
        maxLength: params.pseudoMaxLength,
        random,
      });
      if (word === null || known.has(word) || hasTripleLetter(word)) continue;
      if (mustHaveFocus && !containsFocus(word)) continue;
      if (isBlocked(word, input.blocklist)) continue;
      pool.push({ word, weight: rareWeight });
      known.add(word);
      added += 1;
    }
  };

  if (focus !== null) {
    const focusWords = pool.filter((c) => containsFocus(c.word)).length;
    if (focusWords < params.minFocusWords) addPseudoWords(params.minFocusWords - focusWords, true);
  }
  if (pool.length < params.minFocusWords) addPseudoWords(params.minFocusWords - pool.length, false);
  // The first keys may form only a couple of words ("оао"), or none at all.
  if (pool.length < MIN_VARIETY) {
    const weight = pool.length > 0 ? rareWeight : 1;
    for (const { word } of letterCombinations(letters, focus, random)) {
      if (!known.has(word) && !isBlocked(word, input.blocklist)) {
        pool.push({ word, weight });
        known.add(word);
      }
    }
  }
  // Pseudo-words may never reach the focus key ("j" before any vowel is open):
  // letter combinations always do.
  if (focus !== null && !pool.some((c) => containsFocus(c.word))) {
    for (const { word } of letterCombinations(letters, focus, random)) {
      if (containsFocus(word) && !known.has(word) && !isBlocked(word, input.blocklist)) {
        pool.push({ word, weight: rareWeight });
        known.add(word);
      }
    }
  }

  const focusPool = pool.filter((c) => containsFocus(c.word));
  const picked: string[] = [];
  let focusCount = 0;
  let length = -1; // the first word has no space before it
  while (length < params.lessonLength) {
    // Take a focus word whenever another word without it would drop the share too low.
    const needFocus =
      focusPool.length > 0 && focusCount < params.focusWordShare * (picked.length + 1);
    const source = needFocus ? focusPool : pool;
    let candidate = pickWeighted(source, (c) => c.weight, random);
    for (let retry = 0; candidate.word === picked.at(-1) && retry < 10; retry += 1) {
      candidate = pickWeighted(source, (c) => c.weight, random);
    }
    picked.push(candidate.word);
    if (containsFocus(candidate.word)) focusCount += 1;
    length += candidate.word.length + 1;
  }
  return picked.join(' ');
}

/**
 * Short letter combinations for the first lessons, when the open letters have no
 * vowels yet: "fj jf fjf dk kd fdjk". Every other letter is the focus key.
 */
function letterCombinations(
  letters: ReadonlySet<string>,
  focus: string | null,
  random: Random,
): Candidate[] {
  const alphabet = [...letters].filter((char) => char !== ' ');
  if (alphabet.length === 0) throw new Error('No open letters to build a lesson from');
  const combinations = new Set<string>();
  for (let attempt = 0; combinations.size < COMBINATION_COUNT && attempt < 500; attempt += 1) {
    const length = 2 + Math.floor(random() * 3);
    let word = '';
    while (word.length < length) {
      word += focus !== null && random() < 0.4 ? focus : pick(alphabet, random);
    }
    if (!hasTripleLetter(word)) combinations.add(word);
  }
  return [...combinations].map((word) => ({ word, weight: 1 }));
}
