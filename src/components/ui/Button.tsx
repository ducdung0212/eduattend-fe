import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: string;
  rightIcon?: string;
}

const VARIANTS: Record<Variant, string> = {
  primary:   'bg-slate-900 text-white hover:bg-slate-700 border-transparent',
  secondary: 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
  danger:    'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
  ghost:     'bg-transparent text-slate-600 border-transparent hover:bg-slate-100',
};

const SIZES: Record<Size, string> = {
  sm: 'h-7 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', loading, leftIcon, rightIcon, className, children, disabled, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium border rounded-lg transition-colors',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading && <i className="ti ti-loader-2 animate-spin text-base" aria-hidden="true" />}
      {!loading && leftIcon && <i className={`ti ti-${leftIcon} text-base`} aria-hidden="true" />}
      {children}
      {rightIcon && <i className={`ti ti-${rightIcon} text-base`} aria-hidden="true" />}
    </button>
  ),
);

Button.displayName = 'Button';