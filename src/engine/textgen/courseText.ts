import type { StageKind } from '../progress/course';
import { pick, pickWeighted } from '../random';
import { isBlocked } from './blocklist';
import { generatePseudoWord } from './letterModel';
import { buildLessonText, type LessonTextInput } from './lessonText';

export interface CourseTextInput extends Omit<LessonTextInput, 'letters'> {
  kind: StageKind;
  /** Every open character: letters, capitals, marks, digits. */
  open: ReadonlySet<string>;
  /** Locale for upper-casing ("en", "ru"). */
  locale: string;
  /** Words with an apostrophe (English contractions) for practising "'". */
  contractions?: readonly string[];
  /** Words with a hyphen for practising "-". */
  hyphenated?: readonly string[];
}

/** Share of hyphen practice taken from real hyphenated words; the rest joins two words. */
const HYPHENATED_SHARE = 0.7;

/** Share of lesson words with the focus key in free practice: it trains everything. */
const FREE_FOCUS_SHARE = 0.3;
/** In free practice a weak digit or mark gets fewer words, so the text stays ordinary. */
const FREE_FOCUS_SHARE_SYMBOL = 0.15;
/** Chance that another word gets a capital, a mark or becomes a number, by stage. */
const DECORATION: Record<
  Exclude<StageKind, 'letters'>,
  { capital: number; mark: number; number: number }
> = {
  capitals: { capital: 0.25, mark: 0, number: 0 },
  punctuation: { capital: 0, mark: 0.25, number: 0 },
  digits: { capital: 0, mark: 0.1, number: 0.2 },
  free: { capital: 0, mark: 0.12, number: 0.08 },
};
const SENTENCE_END = new Set(['.', '!', '?']);
const AFTER_WORD = new Set(['.', ',', '!', '?', ';', ':']);
const WRAPS: Record<string, readonly [string, string]> = {
  '"': ['"', '"'],
  "'": ["'", "'"],
  '(': ['(', ')'],
  ')': ['(', ')'],
};
/** Free practice: sentence length in words. */
const SENTENCE_MIN = 4;
const SENTENCE_MAX = 9;

type CharClass = 'letter' | 'capital' | 'digit' | 'mark';

function classOf(char: string): CharClass {
  if (/\p{Lu}/u.test(char)) return 'capital';
  if (/\p{Ll}/u.test(char)) return 'letter';
  if (/\p{Nd}/u.test(char)) return 'digit';
  return 'mark';
}

interface Candidate {
  word: string;
  weight: number;
}

/**
 * Builds lesson text for any stage (docs/learning-method.md, "Как строится
 * урок", item 6). Letters use the adaptive word lesson; later stages put the
 * focus key into at least `focusWordShare` of the words and decorate the rest:
 * capitals, punctuation marks, numbers. Free practice writes sentences.
 */
export function buildCourseText(input: CourseTextInput): string {
  const { kind, open, focus, random, params, locale } = input;
  const letters = new Set([...open].filter((char) => classOf(char) === 'letter'));
  if (kind === 'letters') return buildLessonText({ ...input, letters });

  const upperFirst = (word: string) => word.charAt(0).toLocaleUpperCase(locale) + word.slice(1);
  const canCapitalize = (word: string) => open.has(word.charAt(0).toLocaleUpperCase(locale));
  /** Capitalizes the first letter, also after an opening quote or parenthesis. */
  const startSentence = (token: string) =>
    token.replace(/^(\P{L}*)(\p{Ll})/u, (whole, lead: string, letter: string) => {
      const capital = letter.toLocaleUpperCase(locale);
      return open.has(capital) ? `${lead}${capital}` : whole;
    });
  const marks = [...open].filter((char) => classOf(char) === 'mark');
  const digits = [...open].filter((char) => classOf(char) === 'digit');
  const decoration = DECORATION[kind];

  // Dictionary words made of open letters; frequent ones come up more often.
  const pool: Candidate[] = [];
  for (const [rank, word] of input.words.entries()) {
    if (word.length < params.wordMinLength || word.length > params.wordMaxLength) continue;
    if (/(.)\1\1/u.test(word) || ![...word].every((char) => letters.has(char))) continue;
    if (isBlocked(word, input.blocklist)) continue;
    pool.push({ word, weight: 1 / Math.sqrt(rank + 1) });
  }
  if (pool.length === 0)
    throw new Error('No words for a lesson: the letters stage is not finished');
  let previous = '';
  // Filtered pools are kept for the whole lesson: the focus filter repeats.
  const filtered = new Map<string, Candidate[]>();
  const pickWord = (filter?: { id: string; test: (word: string) => boolean }): string | null => {
    let source = pool;
    if (filter) {
      source = filtered.get(filter.id) ?? pool.filter((c) => filter.test(c.word));
      filtered.set(filter.id, source);
    }
    if (source.length === 0) return null;
    let word = pickWeighted(source, (c) => c.weight, random).word;
    for (let retry = 0; word === previous && source.length > 1 && retry < 10; retry += 1) {
      word = pickWeighted(source, (c) => c.weight, random).word;
    }
    previous = word;
    return word;
  };
  const anyWord = () => pickWord() ?? 'a';

  const number = (required?: string): string => {
    const length = 1 + Math.floor(random() * 3) + (random() < 0.3 ? 1 : 0);
    const chars = Array.from({ length }, () => pick(digits, random));
    if (required !== undefined) chars[Math.floor(random() * length)] = required;
    // No leading zero unless the number is just "0".
    if (chars.length > 1 && chars[0] === '0') {
      const swap = chars.findIndex((c) => c !== '0');
      if (swap > 0) [chars[0], chars[swap]] = [chars[swap] as string, '0'];
      else chars[0] = digits.find((d) => d !== '0') ?? '0';
    }
    return chars.join('');
  };

  const usable = (list: readonly string[] = []) =>
    list.filter((word) => [...word].every((char) => open.has(char)));
  const contractions = usable(input.contractions);
  const hyphenated = usable(input.hyphenated);

  /** Puts a mark on a word: after it, around it, or joining it to another word. */
  const withMark = (word: string, mark: string): string => {
    if (AFTER_WORD.has(mark)) return `${word}${mark}`;
    if (mark === '-') {
      if (hyphenated.length > 0 && random() < HYPHENATED_SHARE) return pick(hyphenated, random);
      return `${word}-${anyWord()}`;
    }
    if (mark === "'" && contractions.length > 0) return pick(contractions, random);
    const wrap = WRAPS[mark];
    if (wrap && open.has(wrap[0]) && open.has(wrap[1])) return `${wrap[0]}${word}${wrap[1]}`;
    return `${word}${mark}`;
  };

  /** A word that contains (or is) the focus key. */
  const focusToken = (key: string): string => {
    switch (classOf(key)) {
      case 'letter':
        return pickWord({ id: `has:${key}`, test: (word) => word.includes(key) }) ?? key.repeat(2);
      case 'capital': {
        const lower = key.toLocaleLowerCase(locale);
        const word =
          pickWord({ id: `starts:${lower}`, test: (w) => w.startsWith(lower) }) ??
          generatePseudoWord(input.model, {
            letters,
            minLength: params.pseudoMinLength,
            maxLength: params.pseudoMaxLength,
            random,
            start: lower,
          }) ??
          `${lower}${anyWord()}`;
        return upperFirst(word);
      }
      case 'digit':
        return number(key);
      case 'mark':
        return withMark(anyWord(), key);
    }
  };

  const tokens: string[] = [];
  let length = -1; // the first token has no space before it
  let focusCount = 0;
  let capitalizeNext = kind !== 'capitals'; // sentences start with a capital once capitals are learned
  let sentenceLength = 0;
  let sentenceTarget = SENTENCE_MIN + Math.floor(random() * (SENTENCE_MAX - SENTENCE_MIN + 1));
  const symbolFocus = focus !== null && ['digit', 'mark'].includes(classOf(focus));
  const share =
    kind !== 'free'
      ? params.focusWordShare
      : symbolFocus
        ? FREE_FOCUS_SHARE_SYMBOL
        : FREE_FOCUS_SHARE;

  while (length < params.lessonLength) {
    let token: string;
    if (focus !== null && focusCount < share * (tokens.length + 1)) {
      token = focusToken(focus);
      focusCount += 1;
    } else if (decoration.number > 0 && digits.length > 0 && random() < decoration.number) {
      token = number();
    } else {
      token = anyWord();
      if (decoration.capital > 0 && canCapitalize(token) && random() < decoration.capital) {
        token = upperFirst(token);
      }
      if (decoration.mark > 0 && marks.length > 0 && random() < decoration.mark) {
        token = withMark(token, pick(marks, random));
      }
    }

    // Sentence rules once capitals are open: a capital after ".", "!" and "?".
    if (capitalizeNext) {
      if (/^\p{Nd}/u.test(token)) {
        // A sentence does not start with a number: a word goes first.
        const lead = startSentence(anyWord());
        tokens.push(lead);
        length += lead.length + 1;
        sentenceLength += 1;
      } else {
        token = startSentence(token);
      }
    }
    capitalizeNext = false;
    sentenceLength += 1;
    if (kind === 'free' && sentenceLength >= sentenceTarget && !/[.!?]$/u.test(token)) {
      const ends = [...SENTENCE_END].filter((mark) => open.has(mark));
      if (ends.length > 0) {
        const end = random() < 0.75 ? (ends[0] ?? '.') : pick(ends, random);
        // "word," + "." would read as "word,."; the sentence end replaces the comma.
        token = /[,;:]$/u.test(token) ? `${token.slice(0, -1)}${end}` : `${token}${end}`;
      }
    }
    if (SENTENCE_END.has(token.at(-1) ?? '') || SENTENCE_END.has(token.at(-2) ?? '')) {
      capitalizeNext = kind !== 'capitals';
      sentenceLength = 0;
      sentenceTarget = SENTENCE_MIN + Math.floor(random() * (SENTENCE_MAX - SENTENCE_MIN + 1));
    }

    tokens.push(token);
    length += token.length + 1;
  }
  return tokens.join(' ');
}
