/** Linear map from a data domain to a pixel range. */
export function linearScale(
  [d0, d1]: readonly [number, number],
  [r0, r1]: readonly [number, number],
): (value: number) => number {
  const span = d1 - d0 || 1;
  return (value) => r0 + ((value - d0) / span) * (r1 - r0);
}

/** About `count` round tick values covering [min, max]: steps of 1, 2 or 5 × 10ⁿ. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (max <= min) return [min];
  const raw = (max - min) / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 5, 10].find((m) => m * power >= raw) ?? 10) * power;
  const ticks: number[] = [];
  for (let value = Math.ceil(min / step) * step; value <= max + step * 1e-9; value += step) {
    ticks.push(Math.round(value * 1e9) / 1e9);
  }
  return ticks;
}

/** The smallest round number at or above `value`, on the same steps as `niceTicks`. */
export function niceCeil(value: number, count = 4): number {
  if (value <= 0) return 1;
  const ticks = niceTicks(0, value, count);
  const last = ticks.at(-1) ?? value;
  const step = ticks.length > 1 ? (ticks[1] ?? 0) - (ticks[0] ?? 0) : value;
  return last >= value ? last : last + step;
}
