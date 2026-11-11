import { describe, expect, it } from 'vitest';

import { formatMetric } from './achievementText';

describe('formatMetric', () => {
  it('shows shares as percent', () => {
    expect(formatMetric('openedShare', 0.08, 'en')).toBe('8%');
    expect(formatMetric('openedShare', 0.5, 'en')).toBe('50%');
  });

  it('shows small hour counts with one decimal, rounded down', () => {
    expect(formatMetric('activeHours', 0.32, 'en')).toBe('0.3');
    expect(formatMetric('activeHours', 0.32, 'ru')).toBe('0,3');
    expect(formatMetric('activeHours', 1, 'en')).toBe('1');
    expect(formatMetric('activeHours', 12.7, 'en')).toBe('12');
  });

  it('shows counts as whole numbers with grouping', () => {
    expect(formatMetric('chars', 3483.6, 'en')).toBe('3,483');
    expect(formatMetric('chars', 100_000, 'en')).toBe('100,000');
    expect(formatMetric('bestCpm', 149.9, 'en')).toBe('149');
  });
});
