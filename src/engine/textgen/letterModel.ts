import { pickWeighted, type Random } from '../random';
import { isRecord } from '../validate';

export const WORD_START = '^';
export const WORD_END = '$';

type Counts = ReadonlyMap<string, number>;

/**
 * Which letters follow a pair of letters in the language, and how often
 * (docs/learning-method.md, "Буквенная модель для псевдослов").
 */
export interface LetterModel {
  /** Context of two characters; "^^" is the start of a word. */
  readonly pairs: ReadonlyMap<string, Counts>;
  /** Context of one character, used when the pair allows no open letter. */
  readonly singles: ReadonlyMap<string, Counts>;
}

/** Reads `ngrams.json`: `{ counts: { "th": { "e": 120, "$": 4 } } }`. */
export function parseLetterModel(data: unknown): LetterModel {
  if (!isRecord(data) || !isRecord(data.counts)) {
    throw new Error('Letter model: expected { counts: { context: { letter: count } } }');
  }
  const pairs = new Map<string, Map<string, number>>();
  const singles = new Map<string, Map<string, number>>();
  for (const [context, row] of Object.entries(data.counts)) {
    if ([...context].length !== 2 || !isRecord(row)) {
      throw new Error(`Letter model: bad context "${context}"`);
    }
    const counts = new Map<string, number>();
    const single = singles.get(context.slice(-1)) ?? new Map<string, number>();
    for (const [next, count] of Object.entries(row)) {
      if (typeof count !== 'number' || count <= 0) {
        throw new Error(`Letter model: bad count for "${context}" → "${next}"`);
      }
      counts.set(next, count);
      single.set(next, (single.get(next) ?? 0) + count);
    }
    pairs.set(context, counts);
    singles.set(context.slice(-1), single);
  }
  return { pairs, singles };
}

export interface PseudoWordOptions {
  /** Letters the word may contain. */
  letters: ReadonlySet<string>;
  minLength: number;
  maxLength: number;
  random: Random;
  /** Letters the word starts with. */
  start?: string;
}

function allowedNext(
  counts: Counts | undefined,
  letters: ReadonlySet<string>,
  canEnd: boolean,
  mustEnd: boolean,
): [string, number][] {
  if (!counts) return [];
  return [...counts].filter(([next]) =>
    next === WORD_END ? canEnd : !mustEnd && letters.has(next),
  );
}

/**
 * Generates one word-like string from open letters only. Returns null when the
 * model cannot finish a word with these letters; the caller simply tries again.
 */
export function generatePseudoWord(model: LetterModel, options: PseudoWordOptions): string | null {
  const { letters, minLength, maxLength, random, start = '' } = options;
  let word = start;
  let context = `${WORD_START}${WORD_START}${start}`.slice(-2);
  while (word.length <= maxLength) {
    const canEnd = word.length >= minLength;
    const mustEnd = word.length === maxLength;
    let choices = allowedNext(model.pairs.get(context), letters, canEnd, mustEnd);
    if (choices.length === 0) {
      choices = allowedNext(model.singles.get(context.slice(-1)), letters, canEnd, mustEnd);
    }
    if (choices.length === 0) return null;
    const [next] = pickWeighted(choices, ([, count]) => count, random);
    if (next === WORD_END) return word;
    word += next;
    context = `${context.slice(-1)}${next}`;
  }
  return null;
}
