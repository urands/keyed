import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePractice } from '../../app/practice';
import { routes } from '../../app/routes';
import i18n from '../../i18n';

function renderPractice() {
  const router = createMemoryRouter(routes, { initialEntries: ['/practice'] });
  const view = render(<RouterProvider router={router} />);
  const states = () =>
    [...view.container.querySelectorAll('[data-state]')].map((el) => el.getAttribute('data-state'));
  return { ...view, router, states };
}

describe('practice screen', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    usePractice.getState().startLesson('ab ba');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits for the first key, then shows the result when the text is typed', async () => {
    const user = userEvent.setup();
    renderPractice();
    expect(screen.getByText(/Start typing/)).toBeVisible();

    await user.keyboard('ab ba');

    expect(screen.getByRole('heading', { name: 'Lesson complete' })).toBeVisible();
    expect(screen.getByText('Accuracy').nextElementSibling).toHaveTextContent('100 %');
  });

  it('keeps the cursor on a wrong key until the right one is pressed', async () => {
    const user = userEvent.setup();
    const { states } = renderPractice();

    await user.keyboard('x');
    expect(states().slice(0, 2)).toEqual(['error', 'pending']);

    await user.keyboard('a');
    expect(states().slice(0, 2)).toEqual(['corrected', 'current']);
  });

  it('counts the mistake in the result', async () => {
    const user = userEvent.setup();
    renderPractice();

    await user.keyboard('xab ba');

    expect(screen.getByText('Accuracy').nextElementSibling).toHaveTextContent('80 %');
    expect(screen.getByText(/Errors: 1/)).toBeVisible();
  });

  it('pauses on Esc and resumes with any key without typing it', async () => {
    const user = userEvent.setup();
    const { states } = renderPractice();

    await user.keyboard('a{Escape}');
    expect(screen.getByText('Paused')).toBeVisible();

    await user.keyboard('q');
    expect(screen.queryByText('Paused')).not.toBeInTheDocument();
    expect(states().slice(0, 2)).toEqual(['correct', 'current']);
  });

  it('pauses by itself after 5 seconds without typing', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    renderPractice();

    await user.keyboard('a');
    expect(screen.queryByText('Paused')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText('Paused')).toBeVisible();
  });

  it('pauses when the window loses focus', async () => {
    const user = userEvent.setup();
    renderPractice();

    await user.keyboard('a');
    act(() => {
      window.dispatchEvent(new FocusEvent('blur'));
    });
    expect(screen.getByText('Paused')).toBeVisible();
  });

  it('leaves the lesson with Esc on a pause', async () => {
    const user = userEvent.setup();
    const { router } = renderPractice();

    await user.keyboard('a{Escape}{Escape}');

    expect(router.state.location.pathname).toBe('/');
    expect(usePractice.getState().lesson.status).toBe('ready');
  });

  it('restarts the text with Ctrl+Backspace', async () => {
    const user = userEvent.setup();
    const { states } = renderPractice();

    await user.keyboard('ab');
    await user.keyboard('{Control>}{Backspace}{/Control}');

    expect(states()).toEqual(['current', 'pending', 'pending', 'pending', 'pending']);
    expect(usePractice.getState().lesson.text).toBe('ab ba');
  });

  it('starts the next lesson with Enter on the result', async () => {
    const user = userEvent.setup();
    renderPractice();

    await user.keyboard('ab ba');
    await user.keyboard('{Enter}');

    expect(screen.queryByRole('heading', { name: 'Lesson complete' })).not.toBeInTheDocument();
    expect(usePractice.getState().lesson.status).toBe('ready');
    expect(usePractice.getState().lesson.text).not.toBe('ab ba');
  });

  it('repeats the same text from the result', async () => {
    const user = userEvent.setup();
    renderPractice();

    await user.keyboard('ab ba');
    await user.click(screen.getByRole('button', { name: 'Repeat' }));

    expect(usePractice.getState().lesson.text).toBe('ab ba');
    expect(usePractice.getState().lesson.status).toBe('ready');
  });
});
