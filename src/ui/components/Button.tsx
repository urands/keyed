import type { ComponentProps } from 'react';

import { buttonClass, type ButtonVariant } from './buttonClass';

type ButtonProps = ComponentProps<'button'> & { variant?: ButtonVariant };

export function Button({ variant, className = '', type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={`${buttonClass(variant)} ${className}`} {...props} />;
}
