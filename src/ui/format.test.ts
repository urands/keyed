import { describe, expect, it } from 'vitest';

import { defaultSpeedUnit, formatDuration, percentFloor, speedValue } from './format';

describe('format', () => {
  it('chooses the speed unit by layout language', () => {
    expect(defaultSpeedUnit('en')).toBe('wpm');
    expect(defaultSpeedUnit('ru')).toBe('cpm');
  });

  it('converts and rounds speed', () => {
    expect(speedValue(212, 'cpm')).toBe(212);
    expect(speedValue(212, 'wpm')).toBe(42);
  });

  it('rounds percent down, despite floating point noise', () => {
    expect(percentFloor(0.29)).toBe(29);
    expect(percentFloor(0.999)).toBe(99);
    expect(percentFloor(1)).toBe(100);
  });

  it('formats durations as m:ss', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(83_400)).toBe('1:23');
    expect(formatDuration(600_000)).toBe('10:00');
  });
});
