// No imports: tools/build-content.ts runs this file directly in Node.

/** Blocked entries this long or longer also block words that start with them. */
const PREFIX_MIN_LENGTH = 4;

/**
 * True when a word must not appear in a lesson: it is in the blocklist, or it
 * starts with a blocked entry of 4+ letters ("fucking" for "fuck"). Short
 * entries match only whole words, so "ass" does not block "class".
 */
export function isBlocked(word: string, blocklist: ReadonlySet<string>): boolean {
  if (blocklist.has(word)) return true;
  for (let end = PREFIX_MIN_LENGTH; end < word.length; end += 1) {
    if (blocklist.has(word.slice(0, end))) return true;
  }
  return false;
}
