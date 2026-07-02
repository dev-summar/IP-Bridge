import React from 'react';
import { cn } from '../../utils/cn';

interface PublicPageShellProps {
  children: React.ReactNode;
  className?: string;
  narrow?: boolean;
  wide?: boolean;
}

export function PublicPageShell({ children, className, narrow, wide }: PublicPageShellProps) {
  return (
    <div className={cn('bg-zinc-50 dark:bg-zinc-950 min-h-[calc(100dvh-4rem)]', className)}>
      <div className={cn('mx-auto px-4 sm:px-6 py-10 sm:py-14', narrow ? 'max-w-3xl' : wide ? 'max-w-7xl' : 'max-w-6xl')}>
        {children}
      </div>
    </div>
  );
}
