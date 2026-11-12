/**
 * The KeyEd mark: a keycap with a K and the bump of a home key. The same
 * drawing, on a navy tile, is the app icon (src-tauri/app-icon.svg).
 */
export function LogoMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <rect x="9" y="12" width="46" height="44" rx="13" className="fill-accent/35" />
      <rect
        x="9"
        y="7"
        width="46"
        height="44"
        rx="13"
        className="fill-surface-2 stroke-accent"
        strokeWidth="3.5"
      />
      <g className="stroke-accent" strokeWidth="5.5" strokeLinecap="round" fill="none">
        <path d="M24 17v24" />
        <path d="M40 17 27.5 29 40 41" strokeLinejoin="round" />
      </g>
      <path d="M28 46.5h8" className="stroke-accent-2" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex flex-col items-center gap-1">
      <LogoMark />
      <span className="text-sm font-semibold tracking-tight">KeyEd</span>
    </span>
  );
}
