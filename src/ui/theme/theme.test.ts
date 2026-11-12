/// <reference types="node" />
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { applyTheme, resolveTheme } from './theme';

// Vitest does not load CSS, so the file is read as text.
const tokensCss = readFileSync('src/ui/theme/tokens.css', 'utf8');

describe('resolveTheme', () => {
  it('follows the system when the preference is "system"', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });

  it('ignores the system when the preference is explicit', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});

describe('applyTheme', () => {
  it('sets data-theme on the root element', () => {
    const root = document.createElement('html');
    applyTheme('dark', root);
    expect(root.dataset.theme).toBe('dark');
    applyTheme('light', root);
    expect(root.dataset.theme).toBe('light');
  });
});

/** The hex colors of one theme block of tokens.css, by token name without "--kd-". */
function themeColors(theme: 'light' | 'dark'): Record<string, string> {
  const block = new RegExp(`\\[data-theme='${theme}'\\]\\s*\\{([^}]*)\\}`).exec(tokensCss)?.[1];
  if (block === undefined) throw new Error(`No ${theme} block in tokens.css`);
  return Object.fromEntries(
    [...block.matchAll(/--kd-([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((m): [string, string] => [
      m[1] ?? '',
      m[2] ?? '',
    ]),
  );
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

const FINGERS = [
  'l-pinky',
  'l-ring',
  'l-middle',
  'l-index',
  'thumb',
  'r-index',
  'r-middle',
  'r-ring',
  'r-pinky',
];

/** Text color, background, where it is used. WCAG AA for normal text is 4.5:1. */
const PAIRS: [string, string][] = [
  ['ink', 'canvas'],
  ['ink', 'surface'],
  ['ink', 'surface-2'],
  ['ink-muted', 'canvas'],
  ['ink-muted', 'surface'],
  ['ink-muted', 'surface-2'],
  ['on-accent', 'accent'],
  ['accent', 'surface'],
  ['accent-2', 'surface'],
  ['ok', 'surface'],
  ['error', 'surface'],
  ['error', 'error-bg'],
  ['fixed', 'surface'],
  ...FINGERS.map((finger): [string, string] => ['key-ink', `finger-${finger}`]),
];

describe.each(['light', 'dark'] as const)('%s theme', (theme) => {
  const colors = themeColors(theme);

  it.each(PAIRS)('%s on %s meets WCAG AA', (text, background) => {
    const fg = colors[text];
    const bg = colors[background];
    expect(fg, text).toBeDefined();
    expect(bg, background).toBeDefined();
    expect(contrast(fg ?? '', bg ?? '')).toBeGreaterThanOrEqual(4.5);
  });

  it('has the same tokens as the other theme', () => {
    const other = themeColors(theme === 'light' ? 'dark' : 'light');
    expect(Object.keys(colors).sort()).toEqual(Object.keys(other).sort());
  });
});
