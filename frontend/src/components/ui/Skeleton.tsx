import { cn } from '../../utils/cn';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-shimmer rounded-lg bg-zinc-200/80 dark:bg-zinc-800', className)}
      aria-hidden
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-6 w-4/5" />
      <Skeleton className="h-16 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-20" />
      </div>
    </div>
  );
}
