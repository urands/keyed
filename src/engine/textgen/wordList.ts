import { isArray, isRecord } from '../validate';

/** Reads a `{ words: [...] }` file: a dictionary or a blocklist. */
export function parseWordList(data: unknown): string[] {
  if (!isRecord(data) || !isArray(data.words)) throw new Error('Word list: expected { words: [] }');
  return data.words.map((word, i) => {
    if (typeof word !== 'string' || word === '') throw new Error(`Word list: bad entry ${i}`);
    return word;
  });
}
