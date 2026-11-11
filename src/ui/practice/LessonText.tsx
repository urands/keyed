import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';

import type { LessonState } from '../../engine/session/lesson';
import { charView, type CharView } from './charView';

// Mistakes differ from correct text by more than color: underline style and background.
const VIEW_CLASS: Record<CharView, string> = {
  pending: '',
  current: 'rounded-sm bg-accent/15',
  correct: 'text-ok',
  corrected: 'text-fixed underline decoration-dotted decoration-2 underline-offset-[0.25em]',
  error:
    'rounded-sm bg-error-bg text-error underline decoration-wavy decoration-2 underline-offset-[0.25em]',
};

interface CharProps {
  index: number;
  char: string;
  view: CharView;
  register: (index: number, element: HTMLSpanElement | null) => void;
}

// Memoized: a key press re-renders only the characters whose state changed.
const Char = memo(function Char({ index, char, view, register }: CharProps) {
  // A space has no glyph, so a mistyped space gets a visible mark.
  const shown = char === ' ' && (view === 'corrected' || view === 'error') ? '·' : char;
  return (
    <span
      ref={(element) => {
        register(index, element);
      }}
      data-state={view}
      className={VIEW_CLASS[view]}
    >
      {shown}
    </span>
  );
});

interface Word {
  start: number;
  chars: string[];
}

/** Splits text into words with their trailing spaces, so lines break only after a space. */
function splitWords(text: string): Word[] {
  const words: Word[] = [];
  let start = 0;
  for (const match of text.matchAll(/\S+\s*|\s+/gu)) {
    const chars = [...match[0]];
    words.push({ start, chars });
    start += chars.length;
  }
  return words;
}

interface LessonTextProps {
  lesson: LessonState;
  dimmed?: boolean;
}

export function LessonText({ lesson, dimmed = false }: LessonTextProps) {
  const { text, position, status } = lesson;
  const words = useMemo(() => splitWords(text), [text]);

  const box = useRef<HTMLDivElement>(null);
  const cursor = useRef<HTMLSpanElement>(null);
  const spans = useRef<(HTMLSpanElement | null)[]>([]);
  const cursorIndex = useRef(-1);

  const register = useCallback((index: number, element: HTMLSpanElement | null) => {
    spans.current[index] = element;
  }, []);

  // The cursor moves with a transform, without re-rendering the text.
  const placeCursor = useCallback(() => {
    const element = cursor.current;
    if (!element) return;
    const target = spans.current[cursorIndex.current];
    if (!target) {
      element.style.visibility = 'hidden';
      return;
    }
    element.style.visibility = 'visible';
    element.style.height = `${target.offsetHeight}px`;
    element.style.transform = `translate(${target.offsetLeft}px, ${target.offsetTop}px)`;
  }, []);

  useLayoutEffect(() => {
    cursorIndex.current = status === 'finished' ? -1 : position;
    placeCursor();
  }, [position, status, placeCursor]);

  // Lines can re-wrap when the font loads or the window is resized.
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    let active = true;
    void document.fonts?.ready.then(() => {
      if (active) placeCursor();
    });
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(placeCursor) : null;
    observer?.observe(element);
    return () => {
      active = false;
      observer?.disconnect();
    };
  }, [text, placeCursor]);

  return (
    <div
      ref={box}
      className={`relative font-mono text-[2rem] leading-[1.7] transition-opacity motion-reduce:transition-none ${dimmed ? 'opacity-25' : ''}`}
    >
      {words.map((word) => (
        <span key={word.start} className="inline-block whitespace-pre">
          {word.chars.map((char, offset) => {
            const index = word.start + offset;
            return (
              <Char
                key={index}
                index={index}
                char={char}
                view={charView(lesson, index)}
                register={register}
              />
            );
          })}
        </span>
      ))}
      <span
        ref={cursor}
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 w-[3px] rounded-full bg-accent transition-transform duration-75 ease-out motion-reduce:transition-none"
      />
    </div>
  );
}
