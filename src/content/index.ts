import { parseGeometry } from '../engine/layout/geometry';
import { parseAchievements } from '../engine/motivation/achievements';
import { parseLayout } from '../engine/layout/layout';
import { parseCourse } from '../engine/progress/course';
import { parseLetterModel, type LetterModel } from '../engine/textgen/letterModel';
import { parseWordList } from '../engine/textgen/wordList';
import achievementsData from './achievements.json';
import enUsQwertyCourseData from './courses/en-us-qwerty.json';
import ruJcukenCourseData from './courses/ru-jcuken.json';
import enBlocklistData from './en/blocklist.json';
import enContractionsData from './en/contractions.json';
import enHyphenatedData from './en/hyphenated.json';
import enNgramsData from './en/ngrams.json';
import enWordsData from './en/words.json';
import ansiData from './geometry/ansi.json';
import enUsQwertyData from './layouts/en-us-qwerty.json';
import ruJcukenData from './layouts/ru-jcuken.json';
import ruBlocklistData from './ru/blocklist.json';
import ruHyphenatedData from './ru/hyphenated.json';
import ruNgramsYoData from './ru/ngrams-yo.json';
import ruNgramsData from './ru/ngrams.json';
import ruWordsYoData from './ru/words-yo.json';
import ruWordsData from './ru/words.json';

// Data files are checked when the app starts, so a broken file fails loudly.
export const enUsQwerty = parseLayout(enUsQwertyData);
export const ruJcuken = parseLayout(ruJcukenData);
export const ansiGeometry = parseGeometry(ansiData);
export const enUsQwertyCourse = parseCourse(enUsQwertyCourseData);
export const ruJcukenCourse = parseCourse(ruJcukenCourseData);
export const achievementDefs = parseAchievements(achievementsData);

/** What the lesson text generator needs for one language. */
export interface LanguageContent {
  /** Most frequent word first. */
  words: readonly string[];
  model: LetterModel;
  blocklist: ReadonlySet<string>;
  /** Words with an apostrophe, for practising "'". */
  contractions?: readonly string[];
  /** Words with a hyphen, for practising "-". */
  hyphenated?: readonly string[];
}

export const englishContent: LanguageContent = {
  words: parseWordList(enWordsData),
  model: parseLetterModel(enNgramsData),
  blocklist: new Set(parseWordList(enBlocklistData)),
  contractions: parseWordList(enContractionsData),
  hyphenated: parseWordList(enHyphenatedData),
};

const russianBlocklist = new Set(parseWordList(ruBlocklistData));
const russianHyphenated = parseWordList(ruHyphenatedData);

/** Russian with "ё" replaced by "е", as in most real texts (the default). */
export const russianContent: LanguageContent = {
  words: parseWordList(ruWordsData),
  model: parseLetterModel(ruNgramsData),
  blocklist: russianBlocklist,
  hyphenated: russianHyphenated,
};

/** Russian that keeps "ё", for the "Буква ё" setting. */
export const russianYoContent: LanguageContent = {
  words: parseWordList(ruWordsYoData),
  model: parseLetterModel(ruNgramsYoData),
  blocklist: russianBlocklist,
  hyphenated: russianHyphenated,
};
