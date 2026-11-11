export type ButtonVariant = 'primary' | 'secondary';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 font-medium outline-accent focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:opacity-90',
  secondary: 'border border-line bg-surface text-ink hover:border-ink-muted',
};

/** Button look, shared by buttons and links that look like buttons. */
export function buttonClass(variant: ButtonVariant = 'secondary'): string {
  return `${BASE} ${VARIANTS[variant]}`;
}
