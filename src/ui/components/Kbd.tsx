import type { ReactNode } from 'react';

/** A keyboard shortcut hint inside a button or text. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-current/30 px-1.5 font-sans text-xs opacity-80">
      {children}
    </kbd>
  );
}
