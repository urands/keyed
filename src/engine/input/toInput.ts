import type { KeyCode, Layout } from '../layout/layout';

/** A key press that typed a character. */
export interface KeyInput {
  char: string;
  code: KeyCode;
  /** `KeyboardEvent.timeStamp`, ms. */
  time: number;
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

/** Turns a key press into a typed character; returns null for presses that type nothing. */
export function toInput(event: KeyEventLike, layout: Layout, mode: InputMode): KeyInput | null {
  // Auto-repeat and shortcuts never count as typing.
  if (event.repeat || event.isComposing || event.ctrlKey || event.altKey || event.metaKey) {
    return null;
  }
  const char =
    mode === 'emulate'
      ? layout.keys[event.code]?.[event.shiftKey ? 'shift' : 'base']
      : [...event.key].length === 1
        ? event.key
        : undefined;
  return char === undefined ? null : { char, code: event.code, time: event.timeStamp };
}
