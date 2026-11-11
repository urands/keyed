import type { KeySample } from '../engine/stats/keyStats';

/** Compact JSON form of a sample: [char, time ms or null, wrong chars typed]. */
type StoredSample = [string, number | null, string];

export function encodeSamples(samples: readonly KeySample[]): string {
  return JSON.stringify(samples.map((s): StoredSample => [s.char, s.time, s.typos.join('')]));
}

export function decodeSamples(json: string): KeySample[] {
  const data: unknown = JSON.parse(json);
  if (!Array.isArray(data)) throw new Error('Lesson samples: expected an array');
  return data.map((entry: unknown): KeySample => {
    if (!Array.isArray(entry) || entry.length !== 3) throw new Error('Lesson samples: bad entry');
    const [char, time, typos] = entry as unknown[];
    if (typeof char !== 'string' || typeof typos !== 'string') {
      throw new Error('Lesson samples: bad entry');
    }
    if (time !== null && typeof time !== 'number') throw new Error('Lesson samples: bad time');
    return { char, time, typos: [...typos] };
  });
}
