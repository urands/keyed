/**
 * Builds lesson dictionaries and letter models from the frequency lists in
 * tools/sources (docs/architecture.md, "Сборка словарей").
 *
 * Usage: pnpm content:build
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isBlocked } from '../src/engine/textgen/blocklist.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCES = join(ROOT, 'tools', 'sources');

const MIN_LENGTH = 2;
const MAX_LENGTH = 10;
const WORD_COUNT = 10_000;
/**
 * Two-letter tokens further down the list are mostly abbreviations and noise
 * ("lt", "dr"), so they are taken only from the top of the source list.
 */
const TWO_LETTER_MAX_RANK = 600;

const SOURCE_NOTE =
  'FrequencyWords by Hermit Dave (OpenSubtitles 2018), https://github.com/hermitdave/FrequencyWords. ' +
  'Filtered and shortened for KeyEd: letters of the alphabet only, 2–10 letters, ё replaced with е, ' +
  'unwanted words removed, first 10,000 by frequency.';
const SOURCE_LICENSE = 'CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/';
const BLOCKLIST_NOTE =
  'List of Dirty, Naughty, Obscene, and Otherwise Bad Words (CC BY 4.0), ' +
  'https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words, ' +
  'with additions by KeyEd.';

interface LanguageConfig {
  language: 'en' | 'ru';
  alphabet: string;
  /** Letters replaced before filtering. */
  replace: Record<string, string>;
}

const LANGUAGES: LanguageConfig[] = [
  { language: 'en', alphabet: 'abcdefghijklmnopqrstuvwxyz', replace: {} },
  { language: 'ru', alphabet: 'абвгдежзийклмнопрстуфхцчшщъыьэюя', replace: { ё: 'е' } },
];

function readLines(path: string): string[] {
  return readFileSync(path, 'utf8')
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

function normalize(word: string, config: LanguageConfig): string {
  let result = word.toLocaleLowerCase(config.language);
  for (const [from, to] of Object.entries(config.replace)) result = result.replaceAll(from, to);
  return result;
}

function readBlocklist(config: LanguageConfig, isWord: (word: string) => boolean): string[] {
  const lines = [
    ...readLines(join(SOURCES, 'ldnoobw', `${config.language}.txt`)),
    ...readLines(join(SOURCES, 'blocklist-extra', `${config.language}.txt`)),
  ];
  // Phrases cannot appear in a lesson word, so only single words are kept.
  const words = lines.map((line) => normalize(line, config)).filter(isWord);
  return [...new Set(words)].sort();
}

/** Counts which letter follows each pair of letters; "^" marks the word start, "$" the end. */
function buildLetterModel(words: string[]): Record<string, Record<string, number>> {
  const counts: Record<string, Record<string, number>> = {};
  for (const word of words) {
    const chars = ['^', '^', ...word, '$'];
    for (let i = 2; i < chars.length; i += 1) {
      const context = `${chars[i - 2]}${chars[i - 1]}`;
      const next = chars[i] as string;
      const row = (counts[context] ??= {});
      row[next] = (row[next] ?? 0) + 1;
    }
  }
  return Object.fromEntries(
    Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([context, row]) => [
        context,
        Object.fromEntries(Object.entries(row).sort(([a], [b]) => a.localeCompare(b))),
      ]),
  );
}

function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data)}\n`);
}

function build(config: LanguageConfig): void {
  const letters = new RegExp(`^[${config.alphabet}]{${MIN_LENGTH},${MAX_LENGTH}}$`, 'u');
  const isWord = (word: string) => letters.test(word);
  const blocklistWords = readBlocklist(config, isWord);
  const blocklist = new Set(blocklistWords);
  // Not offensive, just not words worth typing: interjections, abbreviations.
  const excluded = new Set(
    readLines(join(SOURCES, 'exclude', `${config.language}.txt`)).map((w) => normalize(w, config)),
  );

  const words: string[] = [];
  const seen = new Set<string>();
  let blocked = 0;
  const lines = readLines(join(SOURCES, 'frequencywords-2018', `${config.language}_50k.txt`));
  for (const [rank, line] of lines.entries()) {
    const word = normalize(line.split(' ')[0] ?? '', config);
    if (!isWord(word) || seen.has(word) || excluded.has(word)) continue;
    if (word.length === 2 && rank >= TWO_LETTER_MAX_RANK) continue;
    seen.add(word);
    if (isBlocked(word, blocklist)) {
      blocked += 1;
      continue;
    }
    words.push(word);
    if (words.length === WORD_COUNT) break;
  }

  const out = join(ROOT, 'src', 'content', config.language);
  writeJson(join(out, 'words.json'), {
    source: SOURCE_NOTE,
    license: SOURCE_LICENSE,
    words,
  });
  writeJson(join(out, 'ngrams.json'), {
    source: SOURCE_NOTE,
    license: SOURCE_LICENSE,
    counts: buildLetterModel(words),
  });
  writeJson(join(out, 'blocklist.json'), {
    source: BLOCKLIST_NOTE,
    license: 'CC BY 4.0, https://creativecommons.org/licenses/by/4.0/',
    words: blocklistWords,
  });

  console.log(
    `${config.language}: ${words.length} words, ${blocked} blocked, ${blocklistWords.length} blocklist entries`,
  );
}

for (const config of LANGUAGES) build(config);
