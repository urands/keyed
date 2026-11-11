const NON_TEXT_INPUTS = new Set([
  'button',
  'checkbox',
  'color',
  'radio',
  'range',
  'reset',
  'submit',
]);

/** True when a key press goes into a text field, so the lesson must not take it. */
export function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  return target instanceof HTMLInputElement && !NON_TEXT_INPUTS.has(target.type);
}

/** True when Enter on the target activates it (a button or a link). */
export function isActivatable(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('button, a[href]') !== null;
}
