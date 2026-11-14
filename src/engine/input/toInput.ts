import { isDeadKey, type KeyCode, type Layout } from '../layout/layout';

/** A key press that typed a character. */
export interface KeyInput {
  char: string;
  code: KeyCode;
  /** `KeyboardEvent.timeStamp`, ms. */
  time: number;
}

/** A dead key waiting for the next press: "´" on the Spanish layout. */
export interface DeadKey {
  accent: string;
  code: KeyCode;
}

/** What a key press did. */
export interface InputStep {
  /** The typed character; null when the press typed nothing. */
  input: KeyInput | null;
  /** The dead key waiting for the next press. */
  dead: DeadKey | null;
}

/**
 * - `emulate`: the character comes from the physical key and the lesson layout,
 *   so a Russian lesson works while the system layout is English.
 * - `system`: the character comes from the system layout (`event.key`).
 */
export type InputMode = 'emulate' | 'system';

/** The fields of `KeyboardEvent` the engine reads. */
export interface KeyEventLike {
  readonly code: string;
  readonly key: string;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
  readonly repeat: boolean;
  readonly isComposing: boolean;
  readonly timeStamp: number;
}

/**
 * Turns a key press into a typed character. `dead` is the dead key pressed
 * just before, if any: it changes this press, "´" then "e" types "é". A space
 * after a dead key types the accent itself. A key the accent does not change
 * types the accent too: the lesson takes one character per press, and the
 * system would type the accent first.
 */
export function toInput(
  event: KeyEventLike,
  layout: Layout,
  mode: InputMode,
  dead: DeadKey | null = null,
): InputStep {
  // Auto-repeat and shortcuts never count as typing. A waiting dead key stays.
  if (event.repeat || event.isComposing || event.ctrlKey || event.altKey || event.metaKey) {
    return { input: null, dead };
  }
  const typed = (char: string): InputStep => ({
    input: { char, code: event.code, time: event.timeStamp },
    dead: null,
  });
  const keyChar = layout.keys[event.code]?.[event.shiftKey ? 'shift' : 'base'];
  const accentOf = (char: string) =>
    event.code === 'Space' ? dead?.accent : layout.dead[dead?.accent ?? '']?.[char];

  if (mode === 'emulate') {
    // Shift, Caps Lock and other keys outside the layout type nothing.
    if (keyChar === undefined) return { input: null, dead };
    if (dead !== null) return typed(accentOf(keyChar) ?? dead.accent);
    if (isDeadKey(layout, keyChar)) {
      return { input: null, dead: { accent: keyChar, code: event.code } };
    }
    return typed(keyChar);
  }

  if (event.key === 'Dead') {
    // Remembered only where the lesson layout has this dead key.
    const accent = keyChar !== undefined && isDeadKey(layout, keyChar) ? keyChar : null;
    return { input: null, dead: accent === null ? null : { accent, code: event.code } };
  }
  if ([...event.key].length !== 1) return { input: null, dead };
  // Some systems send the letter with its accent, others the plain letter.
  if (dead !== null) return typed(accentOf(event.key) ?? event.key);
  return typed(event.key);
}
