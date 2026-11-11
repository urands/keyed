import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePractice } from '../../app/practice';
import { routes } from '../../app/routes';
import { useSettings } from '../../app/settings';
import type { LayoutId } from '../../engine/layout/layout';
import i18n from '../../i18n';

function renderPractice() {
  const router = createMemoryRouter(routes, { initialEntries: ['/practice'] });
  const view = render(<RouterProvider router={router} />);
  const states = () =>
    [...view.container.querySelectorAll('[data-state]')].map((el) => el.getAttribute('data-state'));
  return { ...view, router, states };
}

/** A lesson with the given text in the given layout, past the new key card. */
function prepare(text: string, layout: LayoutId = 'en-us-qwerty') {
  useSettings.setState({ layout });
  usePractice.getState().restore(layout, { keyStats: {}, opened: {} });
  usePractice.getState().dismissIntro();
  usePractice.getState().startLesson(text);
}

describe('practice screen', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    useSettings.setState({ inputMode: 'emulate', speedUnit: 'auto' });
    prepare('ab ba');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('types a Russian lesson by key position with any system layout', async () => {
    prepare('ао во', 'ru-jcuken');
    const user = userEvent.setup();
    renderPractice();

    // F, J, Space, D, J on the keyboard are а, о, space, в, о in ЙЦУКЕН.
    await user.keyboard('[KeyF][KeyJ][Space][KeyD][KeyJ]');

    expect(screen.getByRole('heading', { name: 'Lesson complete' })).toBeVisible();
    expect(screen.getByText('Speed').nextElementSibling).toHaveTextContent('cpm');
  });

  it('asks to switch the system layout instead of counting a mistake', async () => {
    useSettings.setState({ inputMode: 'system' });
    prepare('ао', 'ru-jcuken');
    const user = userEvent.setup();
    const { states } = renderPractice();

    await user.keyboard('f');
    expect(screen.getByText('Switch the system keyboard layout to Russian')).toBeVisible();
    expect(states()).toEqual(['current', 'pending']);

    await user.keyboard('а');
    expect(screen.queryByText(/Switch the system keyboard layout/)).not.toBeInTheDocument();
    expect(states()).toEqual(['correct', 'current']);
  });

  it('warns when Caps Lock is on', async () => {
    const user = userEvent.setup();
    renderPractice();

    await user.keyboard('{CapsLock}');
    expect(screen.getByText('Caps Lock is on')).toBeVisible();
    // The state is read from every key event, so the next press clears the warning.
    await user.keyboard('{CapsLock}a');
    expect(screen.queryByText('Caps Lock is on')).not.toBeInTheDocument();
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
