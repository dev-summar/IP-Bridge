import React from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center font-sans font-semibold rounded-md premium-transition focus:outline-none focus:ring-2 focus:ring-lvx-blue focus:ring-offset-2 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 disabled:hover:scale-100",
          {
            // Variants
            "bg-lvx-blue text-white hover:bg-lvx-blue-hover border border-transparent shadow-premium-sm": variant === 'primary',
            "bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50": variant === 'secondary',
            "bg-transparent text-zinc-700 border border-zinc-200 hover:bg-zinc-50": variant === 'outline',
            "bg-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900": variant === 'ghost',
            "bg-red-600 text-white hover:bg-red-700 border border-transparent": variant === 'danger',
            
            // Sizes
            "px-3.5 py-2 text-sm": size === 'sm',
            "px-5 py-2.5 text-base": size === 'md',
            "px-6 py-3 text-base font-semibold": size === 'lg',
          },
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
