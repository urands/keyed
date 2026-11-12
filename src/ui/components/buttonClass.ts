export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent shadow-glow hover:brightness-110',
  secondary: 'border border-line bg-surface-2 text-ink hover:border-ink-muted',
  ghost: 'text-ink-muted hover:bg-surface-2 hover:text-ink',
  danger: 'border border-error bg-surface text-error hover:bg-error-bg',
};

/** Button look, shared by buttons and links that look like buttons. */
export function buttonClass(variant: ButtonVariant = 'secondary'): string {
  return `${BASE} ${VARIANTS[variant]}`;
}
