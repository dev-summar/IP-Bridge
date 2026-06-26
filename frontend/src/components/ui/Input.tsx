import React from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="type-label block text-zinc-500 mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          className={cn(
            "w-full px-3.5 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-premium-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-lvx-blue/20 focus:border-lvx-blue dark:focus:ring-lvx-blue/25 dark:focus:border-lvx-blue premium-transition disabled:bg-zinc-50 dark:disabled:bg-zinc-950 disabled:text-zinc-400 dark:disabled:text-zinc-600",
            error && "border-red-500 focus:ring-red-500/15 focus:border-red-500",
            className
          )}
          {...props}
        />
        {error && (
          <span className="block mt-1 text-xs text-red-600 font-medium">{error}</span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
