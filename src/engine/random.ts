/** Returns numbers in [0, 1). The engine never calls `Math.random`, so tests can fix the seed. */
export type Random = () => number;

/** Seeded generator (mulberry32): the same seed gives the same sequence. */
export function createRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(items: readonly T[], random: Random): T {
  const item = items[Math.floor(random() * items.length)];
  if (item === undefined) throw new Error('Cannot pick from an empty list');
  return item;
}

/** Picks an item with probability proportional to its weight. */
export function pickWeighted<T>(
  items: readonly T[],
  weight: (item: T) => number,
  random: Random,
): T {
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  if (items.length === 0 || total <= 0) throw new Error('Cannot pick from an empty list');
  let threshold = random() * total;
  for (const item of items) {
    threshold -= weight(item);
    if (threshold < 0) return item;
  }
  return items[items.length - 1] as T;
}
