import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex="0"]';

interface DialogProps {
  title: string;
  children?: ReactNode;
  /** Buttons at the bottom; the first one gets the focus. */
  actions: ReactNode;
  /** Esc closes the dialog. */
  onClose: () => void;
}

/**
 * A modal dialog (docs/screens.md, "Системные элементы"): keeps the focus
 * inside, closes on Esc, returns the focus where it was.
 */
export function Dialog({ title, children, actions, onClose }: DialogProps) {
  const box = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    box.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();

    // Capture phase: screens below (practice) must not see these keys.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') {
        event.stopPropagation();
        return;
      }
      const items = [...(box.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
      const first = items[0];
      const last = items.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      previous?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/70 p-6 backdrop-blur-sm">
      <div
        ref={box}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="kd-card flex w-full max-w-lg flex-col gap-4 p-6"
      >
        <h2 id={titleId} className="text-xl font-semibold">
          {title}
        </h2>
        {children}
        <div className="mt-2 flex flex-wrap justify-end gap-3">{actions}</div>
      </div>
    </div>,
    document.body,
  );
}
