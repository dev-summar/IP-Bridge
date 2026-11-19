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
    <div className={cn('relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-zinc-50 dark:bg-zinc-950', className)}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_42%_at_50%_0%,rgba(57,139,232,0.16),transparent_64%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(24,40,60,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(24,40,60,0.04)_1px,transparent_1px)] bg-[size:42px_42px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]" />
      <div className={cn('relative mx-auto px-4 sm:px-6 py-10 sm:py-14', narrow ? 'max-w-3xl' : wide ? 'max-w-7xl' : 'max-w-6xl')}>
        {children}
      </div>
    </div>
  );
}
