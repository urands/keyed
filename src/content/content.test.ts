import { describe, expect, it } from 'vitest';

import type { Finger } from '../engine/layout/geometry';
import { keyForChar, type Layout } from '../engine/layout/layout';
import { stageKeys, startSetKeys, withOptionalKeys, type Course } from '../engine/progress/course';
import { isBlocked } from '../engine/textgen/blocklist';
import {
  ansiGeometry,
  deQwertz,
  deQwertzCourse,
  englishContent,
  enUsQwerty,
  enUsQwertyCourse,
  esQwerty,
  esQwertyCourse,
  frAzerty,
  frAzertyCourse,
  frenchContent,
  germanContent,
  isoGeometry,
  ruJcuken,
  ruJcukenCourse,
  russianContent,
  spanishContent,
  type LanguageContent,
} from './index';

// ISO has every ANSI key and one more, which the European layouts describe.
const geometryCodes = new Set(isoGeometry.rows.flat().map((key) => key.code));

interface LanguageCase {
  name: string;
  layout: Layout;
  course: Course;
  content: LanguageContent;
  /** Letters the course teaches; "ё" is a separate setting (task 5.6). */
  letters: string;
  /** Letters whose capitals the course does not teach. */
  noCapitals: string;
  /** The finger table from docs/learning-method.md for this layout. */
  zones: Record<Finger, string>;
  startKeys: string;
  /** Keys of the introductory lessons. */
  startSet: string;
  order: string;
  wordPattern: RegExp;
}

const CASES: LanguageCase[] = [
  {
    name: 'English QWERTY',
    layout: enUsQwerty,
    course: enUsQwertyCourse,
    content: englishContent,
    letters: 'abcdefghijklmnopqrstuvwxyz',
    noCapitals: '',
    zones: {
      lPinky: '`1qaz',
      lRing: '2wsx',
      lMiddle: '3edc',
      lIndex: '45rtfgvb',
      thumb: ' ',
      rIndex: '67yuhjnm',
      rMiddle: '8ik,',
      rRing: '9ol.',
      rPinky: "0-=p[]\\;'/",
    },
    startKeys: 'fj',
    startSet: 'fjdksla',
    order: 'dk sl a e i t n o r h u c m g w y p b v x q z',
    wordPattern: /^[a-z]{2,10}$/,
  },
  {
    name: 'Russian ЙЦУКЕН',
    layout: ruJcuken,
    course: ruJcukenCourse,
    content: russianContent,
    letters: 'абвгдежзийклмнопрстуфхцчшщъыьэюя',
    noCapitals: 'ъыь',
    zones: {
      lPinky: 'ё1йфя',
      lRing: '2цыч',
      lMiddle: '3увс',
      lIndex: '45кеапми',
      thumb: ' ',
      rIndex: '67нгроть',
      rMiddle: '8шлб',
      rRing: '9щдю',
      rPinky: '0-=зхъ\\жэ.',
    },
    startKeys: 'ао',
    startSet: 'аовлыд',
    order: 'вл ыд р п е и н т с к м у я ь г з б ч й ж х ш ю э ц щ ф ъ',
    wordPattern: /^[а-я]{2,10}$/,
  },
  {
    name: 'German QWERTZ',
    layout: deQwertz,
    course: deQwertzCourse,
    content: germanContent,
    letters: 'abcdefghijklmnopqrstuvwxyzäöüß',
    noCapitals: 'ß',
    zones: {
      lPinky: '^1qay',
      lRing: '2wsx',
      lMiddle: '3edc',
      lIndex: '45rtfgvb',
      thumb: ' ',
      rIndex: '67zuhjnm',
      rMiddle: '8ik,',
      rRing: '9ol.',
      rPinky: '0ß´pü+#öä-',
    },
    startKeys: 'fj',
    startSet: 'fjdksla',
    order: 'dk sl a e n i r t h u c g m o b w z p ü v ä ö ß y x q',
    wordPattern: /^[a-zäöüß]{2,10}$/,
  },
  {
    name: 'French AZERTY',
    layout: frAzerty,
    course: frAzertyCourse,
    content: frenchContent,
    letters: 'abcdefghijklmnopqrstuvwxyzàâçéèêîïôùû',
    // On AZERTY the accented capitals are not on the keys; words start with "E".
    noCapitals: 'àâçéèêîïôùû',
    zones: {
      lPinky: '²&aqw',
      lRing: 'ézsx',
      lMiddle: '"edc',
      lIndex: "'(rtfgvb",
      thumb: ' ',
      rIndex: '-èyuhjn,',
      rMiddle: '_ik;',
      rRing: 'çol:',
      rPinky: 'à)=p^$*mù!',
    },
    startKeys: 'fj',
    startSet: 'fjdksle',
    order: 'dk sl e a i n r t u o c p m é v q b g h è ç à x y ê z w ù â ô î û ï',
    wordPattern: /^[a-zàâçéèêîïôùû]{2,10}$/,
  },
  {
    name: 'Spanish QWERTY',
    layout: esQwerty,
    course: esQwertyCourse,
    content: spanishContent,
    letters: 'abcdefghijklmnopqrstuvwxyzñáéíóú',
    noCapitals: 'ñ',
    zones: {
      lPinky: 'º1qaz',
      lRing: '2wsx',
      lMiddle: '3edc',
      lIndex: '45rtfgvb',
      thumb: ' ',
      rIndex: '67yuhjnm',
      rMiddle: '8ik,',
      rRing: '9ol.',
      rPinky: "0'¡p`+çñ´-",
    },
    startKeys: 'fj',
    startSet: 'fjdksla',
    order: 'dk sl a e o r n i c t u m p ó b g í v á y q é h z ñ ú x w',
    wordPattern: /^[a-zñáéíóú]{2,10}$/,
  },
];

describe.each(CASES)('$name', (c) => {
  describe('layout', () => {
    it('only uses keys that exist in the ISO geometry', () => {
      for (const code of Object.keys(c.layout.keys)) expect(geometryCodes).toContain(code);
    });

    it('types every character with exactly one key', () => {
      const chars = Object.values(c.layout.keys)
        .flatMap(({ base, shift }) => (base === shift ? [base] : [base, shift]))
        .sort();
      expect(new Set(chars).size).toBe(chars.length);
    });

    it('assigns fingers as in the methodology table', () => {
      for (const [finger, chars] of Object.entries(c.zones)) {
        for (const char of chars) {
          const stroke = keyForChar(c.layout, char);
          expect(stroke, `key for "${char}"`).not.toBeNull();
          expect(ansiGeometry.fingers[stroke?.code ?? ''], `finger for "${char}"`).toBe(finger);
        }
      }
    });
  });

  describe('course', () => {
    // The default course: optional keys such as "ё" are switched off.
    const course = withOptionalKeys(c.course, new Set());
    const letters = course.stages.find((stage) => stage.id === 'letters');

    it('has the stages of the methodology in order', () => {
      expect(c.course.stages.map((stage) => stage.kind)).toEqual([
        'letters',
        'capitals',
        'punctuation',
        'digits',
        'free',
      ]);
    });

    it('teaches the capital of every letter that has one in the capitals stage', () => {
      const capitals = course.stages.find((stage) => stage.kind === 'capitals');
      expect(capitals).toBeDefined();
      if (!capitals) return;
      const keys = new Set(stageKeys(capitals));
      for (const key of keys) expect(key).toMatch(/^\p{Lu}$/u);
      for (const letter of c.letters) {
        const capital = letter.toLocaleUpperCase(c.layout.language);
        // Words never start with "ъ", "ь" and "ы": their capitals are not taught.
        // The same goes for "ß", "ñ" and the French accented letters.
        if (!c.noCapitals.includes(letter)) expect(keys, capital).toContain(capital);
      }
    });

    it('teaches every digit in the digits stage', () => {
      const digits = course.stages.find((stage) => stage.kind === 'digits');
      expect(digits && stageKeys(digits).sort().join('')).toBe('0123456789');
    });

    it('teaches every letter once in the letters stage', () => {
      expect(letters).toBeDefined();
      if (!letters) return;
      expect(stageKeys(letters).sort().join('')).toBe([...c.letters].sort().join(''));
    });

    it('follows the order from the methodology', () => {
      if (!letters) return;
      expect(letters.start.join('')).toBe(c.startKeys);
      expect(letters.order.map((group) => group.join('')).join(' ')).toBe(c.order);
    });

    it('has the starting set of the methodology', () => {
      if (!letters) return;
      expect(startSetKeys(letters).join('')).toBe(c.startSet);
    });

    it('makes only "ё" optional', () => {
      const optional = c.course.stages.flatMap((stage) => stage.optional);
      expect(optional).toEqual(c.layout.id === 'ru-jcuken' ? ['ё'] : []);
      const withYo = withOptionalKeys(c.course, new Set(optional));
      expect(withYo).toEqual(c.course);
    });

    it('uses only keys of the layout', () => {
      expect(c.course.layoutId).toBe(c.layout.id);
      for (const stage of c.course.stages) {
        for (const key of stageKeys(stage)) expect(keyForChar(c.layout, key)).not.toBeNull();
      }
    });
  });

  describe('dictionary', () => {
    const { words, blocklist } = c.content;

    it('has 10,000 different lowercase words of 2–10 letters', () => {
      expect(words).toHaveLength(10_000);
      expect(new Set(words).size).toBe(words.length);
      for (const word of words) expect(word).toMatch(c.wordPattern);
    });

    it('has no blocked words', () => {
      expect(words.filter((word) => isBlocked(word, blocklist))).toEqual([]);
    });

    it('has words for every letter of the course', () => {
      for (const letter of c.letters) {
        expect(
          words.some((word) => word.includes(letter)),
          letter,
        ).toBe(true);
      }
    });
  });
});

describe.each([
  ['ANSI', ansiGeometry],
  ['ISO', isoGeometry],
])('%s geometry', (_name, geometry) => {
  it('marks F and J (А and О) as homing keys', () => {
    expect(geometry.homing).toEqual(['KeyF', 'KeyJ']);
    expect(keyForChar(ruJcuken, 'а')?.code).toBe('KeyF');
    expect(keyForChar(ruJcuken, 'о')?.code).toBe('KeyJ');
  });

  it('has rows of equal width, counting the lower part of a tall key', () => {
    const widths = geometry.rows.slice(0, 4).map((row, r) => {
      const above = geometry.rows[r - 1] ?? [];
      const lower = above.reduce((sum, key) => sum + (key.tall ?? 0), 0);
      return row.reduce((sum, key) => sum + key.gap + key.width, 0) + lower;
    });
    expect(new Set(widths)).toEqual(new Set([15]));
  });

  it('gives every key of both layouts the same finger as ANSI', () => {
    for (const [code, finger] of Object.entries(ansiGeometry.fingers)) {
      expect(geometry.fingers[code], code).toBe(finger);
    }
  });
});

describe('ISO geometry', () => {
  it('has a tall Enter, a short left Shift and an extra key for the left pinky', () => {
    const enter = isoGeometry.rows[1]?.find((key) => key.code === 'Enter');
    expect(enter).toMatchObject({ width: 1.5, tall: 1.25 });
    expect(isoGeometry.rows[3]?.[0]).toMatchObject({ code: 'ShiftLeft', width: 1.25 });
    expect(isoGeometry.fingers.IntlBackslash).toBe('lPinky');
  });
});

describe('Russian dictionary', () => {
  it('has no "ё": it is replaced with "е"', () => {
    expect(russianContent.words.filter((word) => word.includes('ё'))).toEqual([]);
  });

  it('starts with the most frequent words', () => {
    expect(russianContent.words.slice(0, 10)).toEqual(expect.arrayContaining(['не', 'что']));
  });
});

describe('dead keys', () => {
  it.each([
    ['German', deQwertz, '^´`'],
    ['French', frAzerty, '^¨'],
    ['Spanish', esQwerty, '´¨`^'],
  ])(
    '%s: the accents are dead keys and change letters into one character',
    (_name, layout, accents) => {
      expect(Object.keys(layout.dead).sort()).toEqual([...accents].sort());
      for (const table of Object.values(layout.dead)) {
        for (const [letter, result] of Object.entries(table)) {
          expect(result).toBe(result.normalize('NFC'));
          expect(result.normalize('NFD').startsWith(letter), `${letter} → ${result}`).toBe(true);
        }
      }
    },
  );

  it('types every Spanish accent with the dead key and the letter', () => {
    for (const char of 'áéíóú') {
      const stroke = keyForChar(esQwerty, char);
      expect(stroke?.dead, char).toBeDefined();
      expect(stroke?.code).toBe(keyForChar(esQwerty, char.normalize('NFD').charAt(0))?.code);
    }
  });

  it('types the French letters on AZERTY by themselves or with ^ and ¨', () => {
    for (const char of 'éèçàù') expect(keyForChar(frAzerty, char)?.dead, char).toBeUndefined();
    for (const char of 'âêîôû') {
      expect(keyForChar(frAzerty, char)?.dead, char).toEqual({ code: 'BracketLeft', shift: false });
    }
    expect(keyForChar(frAzerty, 'ï')?.dead).toEqual({ code: 'BracketLeft', shift: true });
  });
});

describe('European dictionaries', () => {
  it('start with the most frequent words', () => {
    expect(germanContent.words.slice(0, 10)).toEqual(expect.arrayContaining(['ich', 'das']));
    expect(frenchContent.words.slice(0, 10)).toEqual(expect.arrayContaining(['de', 'est']));
    expect(spanishContent.words.slice(0, 10)).toEqual(expect.arrayContaining(['que', 'no']));
  });

  it('write French "œ" as "oe", as it is typed on AZERTY', () => {
    expect(frenchContent.words).toContain('coeur');
    expect(frenchContent.words.filter((word) => /[œæ]/u.test(word))).toEqual([]);
  });

  it('have hyphen and apostrophe words made of the layout characters', () => {
    const cases = [
      [deQwertz, germanContent],
      [frAzerty, frenchContent],
      [esQwerty, spanishContent],
    ] as const;
    for (const [layout, content] of cases) {
      for (const word of [...(content.hyphenated ?? []), ...(content.contractions ?? [])]) {
        for (const char of word)
          expect(keyForChar(layout, char), `${word}: ${char}`).not.toBeNull();
      }
    }
  });
});
