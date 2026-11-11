import { DEFAULT_PARAMS } from '../params';

/**
 * ready ──first press──▶ running ──last character──▶ finished
 *                         │   ▲
 *        idle, blur, Esc  ▼   │  any key
 *                         paused
 */
export type LessonStatus = 'ready' | 'running' | 'paused' | 'finished';

export interface CharRecord {
  readonly char: string;
  /** Wrong characters typed at this position, each listed once, in order. */
  readonly typos: readonly string[];
  /**
   * Ms from the previous correct press to the correct press of this character.
   * Null for the first character, after a pause, and when there was an error.
   */
  readonly time: number | null;
}

export interface LessonState {
  readonly text: string;
  readonly chars: readonly CharRecord[];
  readonly status: LessonStatus;
  /** Index of the character to type next; equals `chars.length` when finished. */
  readonly position: number;
  /** The last press at `position` was wrong. */
  readonly errorNow: boolean;
  /** Positions with at least one wrong press. */
  readonly mistakes: number;
  /** Time between presses, without pauses, ms. */
  readonly activeMs: number;
  /** Time of the last press; null before the first press and after a pause. */
  readonly lastPressAt: number | null;
  /** Time of the last correct press; null before the first one and after a pause. */
  readonly lastCorrectAt: number | null;
}

export function createLesson(text: string): LessonState {
  const chars = Array.from(text, (char): CharRecord => ({ char, typos: [], time: null }));
  if (chars.length === 0) throw new Error('Lesson text is empty');
  return {
    text,
    chars,
    status: 'ready',
    position: 0,
    errorNow: false,
    mistakes: 0,
    activeMs: 0,
    lastPressAt: null,
    lastCorrectAt: null,
  };
}

/**
 * Applies a typed character at time `time` (ms). Stop-on-error mode: a wrong
 * character leaves the position where it is, and several wrong presses on one
 * position count as one mistake.
 */
export function pressKey(
  state: LessonState,
  char: string,
  time: number,
  idleMs: number = DEFAULT_PARAMS.idleMs,
): LessonState {
  if (state.status === 'finished') return state;
  // Any key ends a pause; that key itself is not typed.
  if (state.status === 'paused') return resumeLesson(state);

  const current = state.chars[state.position];
  if (!current) return state;

  // A long silence counts as a pause even if the idle timer did not fire in time.
  const gap = state.lastPressAt === null ? null : Math.max(0, time - state.lastPressAt);
  const countedGap = gap !== null && gap < idleMs ? gap : null;
  const activeMs = state.activeMs + (countedGap ?? 0);
  const lastCorrectAt = countedGap === null ? null : state.lastCorrectAt;

  if (char !== current.char) {
    const typos = current.typos.includes(char) ? current.typos : [...current.typos, char];
    return {
      ...state,
      status: 'running',
      chars: replaceAt(state.chars, state.position, { ...current, typos }),
      errorNow: true,
      mistakes: current.typos.length === 0 ? state.mistakes + 1 : state.mistakes,
      activeMs,
      lastPressAt: time,
      lastCorrectAt,
    };
  }

  const measured =
    current.typos.length === 0 && lastCorrectAt !== null ? time - lastCorrectAt : null;
  const position = state.position + 1;
  return {
    ...state,
    status: position === state.chars.length ? 'finished' : 'running',
    chars: replaceAt(state.chars, state.position, { ...current, time: measured }),
    position,
    errorNow: false,
    activeMs,
    lastPressAt: time,
    lastCorrectAt: time,
  };
}

/** Pauses a running lesson. The time until the next press is not counted. */
export function pauseLesson(state: LessonState): LessonState {
  if (state.status !== 'running') return state;
  return { ...state, status: 'paused', lastPressAt: null, lastCorrectAt: null };
}

export function resumeLesson(state: LessonState): LessonState {
  if (state.status !== 'paused') return state;
  return { ...state, status: 'running' };
}

function replaceAt<T>(items: readonly T[], index: number, item: T): readonly T[] {
  const copy = items.slice();
  copy[index] = item;
  return copy;
}
