import { parseGeometry } from '../engine/layout/geometry';
import { parseLayout } from '../engine/layout/layout';
import { parseCourse } from '../engine/progress/course';
import { parseLetterModel, type LetterModel } from '../engine/textgen/letterModel';
import { parseWordList } from '../engine/textgen/wordList';
import enUsQwertyCourseData from './courses/en-us-qwerty.json';
import enBlocklistData from './en/blocklist.json';
import enNgramsData from './en/ngrams.json';
import enWordsData from './en/words.json';
import ansiData from './geometry/ansi.json';
import enUsQwertyData from './layouts/en-us-qwerty.json';

// Data files are checked when the app starts, so a broken file fails loudly.
export const enUsQwerty = parseLayout(enUsQwertyData);
export const ansiGeometry = parseGeometry(ansiData);
export const enUsQwertyCourse = parseCourse(enUsQwertyCourseData);

/** What the lesson text generator needs for one language. */
export interface LanguageContent {
  /** Most frequent word first. */
  words: readonly string[];
  model: LetterModel;
  blocklist: ReadonlySet<string>;
}

export const englishContent: LanguageContent = {
  words: parseWordList(enWordsData),
  model: parseLetterModel(enNgramsData),
  blocklist: new Set(parseWordList(enBlocklistData)),
};
