import { parseGeometry } from '../engine/layout/geometry';
import { parseLayout } from '../engine/layout/layout';
import { parseCourse } from '../engine/progress/course';
import { parseLetterModel, type LetterModel } from '../engine/textgen/letterModel';
import { parseWordList } from '../engine/textgen/wordList';
import enUsQwertyCourseData from './courses/en-us-qwerty.json';
import ruJcukenCourseData from './courses/ru-jcuken.json';
import enBlocklistData from './en/blocklist.json';
import enNgramsData from './en/ngrams.json';
import enWordsData from './en/words.json';
import ansiData from './geometry/ansi.json';
import enUsQwertyData from './layouts/en-us-qwerty.json';
import ruJcukenData from './layouts/ru-jcuken.json';
import ruBlocklistData from './ru/blocklist.json';
import ruNgramsData from './ru/ngrams.json';
import ruWordsData from './ru/words.json';

// Data files are checked when the app starts, so a broken file fails loudly.
export const enUsQwerty = parseLayout(enUsQwertyData);
export const ruJcuken = parseLayout(ruJcukenData);
export const ansiGeometry = parseGeometry(ansiData);
export const enUsQwertyCourse = parseCourse(enUsQwertyCourseData);
export const ruJcukenCourse = parseCourse(ruJcukenCourseData);

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

export const russianContent: LanguageContent = {
  words: parseWordList(ruWordsData),
  model: parseLetterModel(ruNgramsData),
  blocklist: new Set(parseWordList(ruBlocklistData)),
};
