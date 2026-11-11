import { describe, expect, it } from 'vitest';

import { shouldRemind } from './reminders';

const on = { remindersEnabled: true, reminderTime: '19:00' };
const at = (hour: number, minute = 0) => new Date(2026, 10, 11, hour, minute);

describe('shouldRemind', () => {
  it('reminds once the time has come and the goal is not met', () => {
    expect(shouldRemind(at(18, 59), on, false, null)).toBe(false);
    expect(shouldRemind(at(19, 0), on, false, null)).toBe(true);
    expect(shouldRemind(at(22, 30), on, false, null)).toBe(true);
  });

  it('stays quiet when reminders are off or the goal is met', () => {
    expect(shouldRemind(at(20), { ...on, remindersEnabled: false }, false, null)).toBe(false);
    expect(shouldRemind(at(20), on, true, null)).toBe(false);
  });

  it('reminds only once a day', () => {
    expect(shouldRemind(at(20), on, false, '2026-11-11')).toBe(false);
    expect(shouldRemind(at(20), on, false, '2026-11-10')).toBe(true);
  });
});
