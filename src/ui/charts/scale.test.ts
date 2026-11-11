import { describe, expect, it } from 'vitest';

import { linearScale, niceCeil, niceTicks } from './scale';

describe('chart scales', () => {
  it('maps a domain to a range', () => {
    const y = linearScale([0, 100], [200, 0]);
    expect(y(0)).toBe(200);
    expect(y(50)).toBe(100);
    expect(y(100)).toBe(0);
  });

  it('makes round ticks', () => {
    expect(niceTicks(0, 60)).toEqual([0, 20, 40, 60]);
    expect(niceTicks(70, 100)).toEqual([70, 80, 90, 100]);
    expect(niceTicks(0, 1)).toEqual([0, 0.5, 1]);
    expect(niceTicks(0, 1, 5)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
  });

  it('rounds a maximum up so the axis ends on a tick', () => {
    expect(niceCeil(47)).toBe(60); // ticks 0, 20, 40, 60
    expect(niceCeil(40)).toBe(40);
    expect(niceCeil(0)).toBe(1);
  });
});
