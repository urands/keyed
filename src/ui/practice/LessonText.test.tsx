import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createLesson, pressKey } from '../../engine/session/lesson';
import { LessonText } from './LessonText';

function states(container: HTMLElement): (string | null)[] {
  return [...container.querySelectorAll('[data-state]')].map((el) => el.getAttribute('data-state'));
}

describe('LessonText', () => {
  it('shows each character state', () => {
    let lesson = createLesson('ab cd');
    lesson = pressKey(lesson, 'a', 0);
    lesson = pressKey(lesson, 'x', 100);
    lesson = pressKey(lesson, 'b', 200);
    lesson = pressKey(lesson, 'x', 300);

    const { container } = render(<LessonText lesson={lesson} />);
    expect(states(container)).toEqual(['correct', 'corrected', 'error', 'pending', 'pending']);
  });

  it('marks a mistyped space so the error is visible', () => {
    let lesson = createLesson('a b');
    lesson = pressKey(lesson, 'a', 0);
    lesson = pressKey(lesson, 'x', 100);

    const { container } = render(<LessonText lesson={lesson} />);
    expect(container.querySelector('[data-state="error"]')).toHaveTextContent('·');
  });

  it('shows the current character before typing starts', () => {
    const { container } = render(<LessonText lesson={createLesson('ab')} />);
    expect(states(container)).toEqual(['current', 'pending']);
  });

  it('keeps all the text, with spaces, in reading order', () => {
    const { container } = render(<LessonText lesson={createLesson('one two')} />);
    expect(container.firstElementChild).toHaveTextContent('one two', {
      normalizeWhitespace: false,
    });
  });
});
