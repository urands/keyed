import { describe, expect, it } from 'vitest';

import { createLesson, pauseLesson, pressKey, resumeLesson, type LessonState } from './lesson';

/** Types `keys` one by one, `step` ms apart, starting at `start`. */
function typeKeys(state: LessonState, keys: string, start = 1000, step = 200): LessonState {
  let time = start;
  for (const key of keys) {
    state = pressKey(state, key, time);
    time += step;
  }
  return state;
}

describe('createLesson', () => {
  it('starts in the ready state at the first character', () => {
    const lesson = createLesson('ab');
    expect(lesson.status).toBe('ready');
    expect(lesson.position).toBe(0);
    expect(lesson.chars.map((c) => c.char)).toEqual(['a', 'b']);
  });

  it('rejects empty text', () => {
    expect(() => createLesson('')).toThrow();
  });
});

describe('typing', () => {
  it('starts the lesson with the first press', () => {
    const lesson = pressKey(createLesson('ab'), 'a', 1000);
    expect(lesson.status).toBe('running');
    expect(lesson.position).toBe(1);
  });

  it('starts the lesson even if the first press is wrong', () => {
    const lesson = pressKey(createLesson('ab'), 'x', 1000);
    expect(lesson.status).toBe('running');
    expect(lesson.position).toBe(0);
  });

  it('finishes after the last character and ignores later presses', () => {
    const lesson = typeKeys(createLesson('ab'), 'ab');
    expect(lesson.status).toBe('finished');
    expect(lesson.position).toBe(2);
    expect(pressKey(lesson, 'a', 5000)).toBe(lesson);
  });
});

describe('stop on error', () => {
  it('keeps the position on a wrong key until the right key is pressed', () => {
    let lesson = typeKeys(createLesson('ab'), 'x');
    expect(lesson.position).toBe(0);
    expect(lesson.errorNow).toBe(true);

    lesson = pressKey(lesson, 'a', 2000);
    expect(lesson.position).toBe(1);
    expect(lesson.errorNow).toBe(false);
  });

  it('counts several wrong presses on one character as one mistake', () => {
    const lesson = typeKeys(createLesson('ab'), 'xyxa');
    expect(lesson.mistakes).toBe(1);
    expect(lesson.chars[0]?.typos).toEqual(['x', 'y']);
  });

  it('counts mistakes on different characters separately', () => {
    const lesson = typeKeys(createLesson('ab'), 'xaxb');
    expect(lesson.mistakes).toBe(2);
  });
});

describe('timing', () => {
  it('measures each character from the previous correct press', () => {
    let lesson = createLesson('abc');
    lesson = pressKey(lesson, 'a', 1000);
    lesson = pressKey(lesson, 'b', 1200);
    lesson = pressKey(lesson, 'c', 1500);
    expect(lesson.chars.map((c) => c.time)).toEqual([null, 200, 300]);
    expect(lesson.activeMs).toBe(500);
  });

  it('does not time a character that had an error', () => {
    let lesson = createLesson('ab');
    lesson = pressKey(lesson, 'a', 1000);
    lesson = pressKey(lesson, 'x', 1100);
    lesson = pressKey(lesson, 'b', 1400);
    expect(lesson.chars[1]?.time).toBeNull();
    expect(lesson.activeMs).toBe(400);
  });
});

describe('pause', () => {
  it('only pauses a running lesson', () => {
    const ready = createLesson('ab');
    expect(pauseLesson(ready)).toBe(ready);

    const finished = typeKeys(createLesson('a'), 'a');
    expect(pauseLesson(finished)).toBe(finished);
  });

  it('resumes on any key without typing it', () => {
    let lesson = pauseLesson(typeKeys(createLesson('abc'), 'a'));
    expect(lesson.status).toBe('paused');

    lesson = pressKey(lesson, 'x', 3000);
    expect(lesson.status).toBe('running');
    expect(lesson.position).toBe(1);
    expect(lesson.mistakes).toBe(0);
  });

  it('does not count time across a pause', () => {
    let lesson = createLesson('abc');
    lesson = pressKey(lesson, 'a', 1000);
    lesson = resumeLesson(pauseLesson(lesson));
    lesson = pressKey(lesson, 'b', 60_000);
    lesson = pressKey(lesson, 'c', 60_250);
    expect(lesson.activeMs).toBe(250);
    expect(lesson.chars.map((c) => c.time)).toEqual([null, null, 250]);
  });

  it('treats a silence of 5 s or more as a pause', () => {
    let lesson = createLesson('abc');
    lesson = pressKey(lesson, 'a', 1000);
    lesson = pressKey(lesson, 'b', 6000);
    lesson = pressKey(lesson, 'c', 6300);
    expect(lesson.activeMs).toBe(300);
    expect(lesson.chars.map((c) => c.time)).toEqual([null, null, 300]);
  });

  it('counts a silence just under 5 s', () => {
    let lesson = createLesson('ab');
    lesson = pressKey(lesson, 'a', 1000);
    lesson = pressKey(lesson, 'b', 5999);
    expect(lesson.activeMs).toBe(4999);
    expect(lesson.chars[1]?.time).toBe(4999);
  });
});
