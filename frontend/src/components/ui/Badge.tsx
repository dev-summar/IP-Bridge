import React from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'indigo' | 'outline';
}

export const Badge = ({ className, variant = 'neutral', ...props }: BadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-sans font-semibold tracking-body",
        {
          "bg-zinc-100 text-zinc-800 border border-transparent": variant === 'neutral',
          "bg-emerald-50 text-emerald-800 border border-emerald-200/50": variant === 'success',
          "bg-amber-50 text-amber-800 border border-amber-200/50": variant === 'warning',
          "bg-red-50 text-red-800 border border-red-200/50": variant === 'danger',
          "bg-lvx-blue/10 text-lvx-blue border border-lvx-blue/20": variant === 'indigo',
          "bg-transparent text-zinc-600 border border-zinc-200": variant === 'outline',
        },
        className
      )}
      {...props}
    />
  );
};
