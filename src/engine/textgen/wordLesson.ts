import { pick, type Random } from '../random';

/**
 * Builds lesson text from random words: at least `targetLength` characters,
 * words separated by single spaces, never the same word twice in a row.
 * Temporary generator for phase 1; the adaptive one replaces it in phase 2.
 */
export function buildWordLesson(
  words: readonly string[],
  random: Random,
  targetLength: number,
): string {
  if (words.length === 0) throw new Error('No words to build a lesson from');
  const canAvoidRepeats = new Set(words).size > 1;

  const picked: string[] = [];
  let length = -1; // the first word has no space before it
  let previous: string | undefined;
  while (length < targetLength) {
    let word = pick(words, random);
    while (canAvoidRepeats && word === previous) word = pick(words, random);
    picked.push(word);
    length += word.length + 1;
    previous = word;
  }
  return picked.join(' ');
}
