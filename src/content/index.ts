import { parseGeometry } from '../engine/layout/geometry';
import { parseAchievements } from '../engine/motivation/achievements';
import { parseLayout } from '../engine/layout/layout';
import { parseCourse } from '../engine/progress/course';
import { parseLetterModel, type LetterModel } from '../engine/textgen/letterModel';
import { parseWordList } from '../engine/textgen/wordList';
import achievementsData from './achievements.json';
import deQwertzCourseData from './courses/de-qwertz.json';
import enUsQwertyCourseData from './courses/en-us-qwerty.json';
import esQwertyCourseData from './courses/es-qwerty.json';
import frAzertyCourseData from './courses/fr-azerty.json';
import ruJcukenCourseData from './courses/ru-jcuken.json';
import deBlocklistData from './de/blocklist.json';
import deHyphenatedData from './de/hyphenated.json';
import deNgramsData from './de/ngrams.json';
import deWordsData from './de/words.json';
import enBlocklistData from './en/blocklist.json';
import enContractionsData from './en/contractions.json';
import enHyphenatedData from './en/hyphenated.json';
import enNgramsData from './en/ngrams.json';
import enWordsData from './en/words.json';
import esBlocklistData from './es/blocklist.json';
import esHyphenatedData from './es/hyphenated.json';
import esNgramsData from './es/ngrams.json';
import esWordsData from './es/words.json';
import frBlocklistData from './fr/blocklist.json';
import frContractionsData from './fr/contractions.json';
import frHyphenatedData from './fr/hyphenated.json';
import frNgramsData from './fr/ngrams.json';
import frWordsData from './fr/words.json';
import ansiData from './geometry/ansi.json';
import isoData from './geometry/iso.json';
import deQwertzData from './layouts/de-qwertz.json';
import enUsQwertyData from './layouts/en-us-qwerty.json';
import esQwertyData from './layouts/es-qwerty.json';
import frAzertyData from './layouts/fr-azerty.json';
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
export const deQwertz = parseLayout(deQwertzData);
export const frAzerty = parseLayout(frAzertyData);
export const esQwerty = parseLayout(esQwertyData);
export const ansiGeometry = parseGeometry(ansiData);
export const isoGeometry = parseGeometry(isoData);
export const enUsQwertyCourse = parseCourse(enUsQwertyCourseData);
export const ruJcukenCourse = parseCourse(ruJcukenCourseData);
export const deQwertzCourse = parseCourse(deQwertzCourseData);
export const frAzertyCourse = parseCourse(frAzertyCourseData);
export const esQwertyCourse = parseCourse(esQwertyCourseData);
export const achievementDefs = parseAchievements(achievementsData);

/** What the lesson text generator needs for one language. */
export interface LanguageContent {
  /** Most frequent word first. */
  words: readonly string[];
  model: LetterModel;
  blocklist: ReadonlySet<string>;
  /** Words with an apostrophe (English contractions, French elisions), for practising "'". */
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

export const germanContent: LanguageContent = {
  words: parseWordList(deWordsData),
  model: parseLetterModel(deNgramsData),
  blocklist: new Set(parseWordList(deBlocklistData)),
  hyphenated: parseWordList(deHyphenatedData),
};

export const frenchContent: LanguageContent = {
  words: parseWordList(frWordsData),
  model: parseLetterModel(frNgramsData),
  blocklist: new Set(parseWordList(frBlocklistData)),
  contractions: parseWordList(frContractionsData),
  hyphenated: parseWordList(frHyphenatedData),
};

export const spanishContent: LanguageContent = {
  words: parseWordList(esWordsData),
  model: parseLetterModel(esNgramsData),
  blocklist: new Set(parseWordList(esBlocklistData)),
  hyphenated: parseWordList(esHyphenatedData),
};
