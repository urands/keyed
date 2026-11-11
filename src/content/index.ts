import { parseGeometry } from '../engine/layout/geometry';
import { parseLayout } from '../engine/layout/layout';
import commonWords from './en/common-words.json';
import ansiData from './geometry/ansi.json';
import enUsQwertyData from './layouts/en-us-qwerty.json';

// Data files are checked when the app starts, so a broken file fails loudly.
export const enUsQwerty = parseLayout(enUsQwertyData);
export const ansiGeometry = parseGeometry(ansiData);

/** Temporary text source for phase 1; see the note in the file. */
export const commonEnglishWords: readonly string[] = commonWords.words;
