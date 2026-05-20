import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, className, id, ...rest }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <i
              className={`ti ti-${leftIcon} absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none`}
              aria-hidden="true"
            />
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full rounded-lg border text-sm text-slate-900 bg-white',
              'placeholder:text-slate-400 outline-none transition-colors',
              'h-9 px-3',
              leftIcon && 'pl-9',
              error
                ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                : 'border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-100',
              className,
            )}
            {...rest}
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';