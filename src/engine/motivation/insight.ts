import { keyCpm, type LessonResult } from '../stats/lessonResult';

interface ConfusionInsight {
  kind: 'confusion';
  expected: string;
  typed: string;
  count: number;
}

interface SlowestInsight {
  kind: 'slowest';
  key: string;
  cpm: number;
}

/** The one main takeaway of a lesson (docs/screens.md, section 5). */
export type LessonInsight = ConfusionInsight | SlowestInsight;

/** A confusion is worth mentioning from this many times in one lesson. */
const MIN_CONFUSIONS = 2;
/** A key's speed is trusted from this many timed presses. */
const MIN_TIMED = 3;

/**
 * "Instead of Б you type Ю" when one confusion repeats; otherwise the slowest
 * letter of the lesson. Null when the lesson gives nothing reliable.
 */
export function lessonInsight(result: LessonResult): LessonInsight | null {
  let confusion: ConfusionInsight | null = null;
  for (const [expected, key] of Object.entries(result.keys)) {
    for (const [typed, count] of Object.entries(key.typos)) {
      if (count >= MIN_CONFUSIONS && count > (confusion?.count ?? 0)) {
        confusion = { kind: 'confusion', expected, typed, count };
      }
    }
  }
  if (confusion) return confusion;

  const timed = Object.entries(result.keys).flatMap(([key, stat]) => {
    const cpm = key === ' ' || stat.timeCount < MIN_TIMED ? null : keyCpm(stat);
    return cpm === null ? [] : [{ key, cpm }];
  });
  if (timed.length < 2) return null;
  const slowest = timed.reduce((a, b) => (b.cpm < a.cpm ? b : a));
  return { kind: 'slowest', key: slowest.key, cpm: slowest.cpm };
}
