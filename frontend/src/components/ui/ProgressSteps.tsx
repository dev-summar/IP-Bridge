import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

interface Step {
  id: string;
  label: string;
}

interface ProgressStepsProps {
  steps: Step[];
  /** Index of the active step. Steps before this are complete. */
  currentIndex: number;
  className?: string;
  /** `progress` = live deal state. `timeline` = informational (How it works). */
  variant?: 'progress' | 'timeline';
}

export function ProgressSteps({
  steps,
  currentIndex,
  className,
  variant = 'progress',
}: ProgressStepsProps) {
  const isTimeline = variant === 'timeline';

  return (
    <div className={cn('w-full overflow-x-auto scrollbar-none', className)}>
      <ol
        className="flex items-start justify-between min-w-[36rem] sm:min-w-0 w-full px-1"
        aria-label="Deal progress"
      >
        {steps.map((step, idx) => {
          const done = !isTimeline && idx < currentIndex;
          const active = !isTimeline && idx === currentIndex;
          const connectorDone = !isTimeline && idx < currentIndex;

          return (
            <li
              key={step.id}
              className={cn(
                'flex items-start flex-1',
                idx < steps.length - 1 ? 'min-w-0' : 'shrink-0'
              )}
            >
              <div className="flex flex-col items-center w-full max-w-[7.5rem] sm:max-w-none mx-auto px-0.5">
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold border-2 premium-transition',
                    isTimeline && 'border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300',
                    done && 'bg-emerald-500 border-emerald-500 text-white',
                    active && !done && 'border-primary bg-primary text-white shadow-sm',
                    !isTimeline && !done && !active && 'border-zinc-200 dark:border-zinc-700 text-zinc-400 bg-white dark:bg-zinc-900'
                  )}
                >
                  {done ? <Check className="h-4 w-4" strokeWidth={2.5} /> : idx + 1}
                </span>
                <span
                  className={cn(
                    'mt-2.5 text-[11px] sm:text-xs font-medium text-center leading-snug w-full',
                    isTimeline && 'text-zinc-600 dark:text-zinc-400',
                    active && !isTimeline && 'text-zinc-900 dark:text-zinc-100',
                    done && !isTimeline && 'text-emerald-700 dark:text-emerald-400',
                    !done && !active && !isTimeline && 'text-zinc-500 dark:text-zinc-500'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {idx < steps.length - 1 && (
                <div
                  className="flex-1 flex items-center min-w-[0.75rem] sm:min-w-[1rem] pt-[1.125rem]"
                  aria-hidden
                >
                  <div
                    className={cn(
                      'h-0.5 w-full rounded-full',
                      isTimeline && 'bg-zinc-200 dark:bg-zinc-700',
                      connectorDone && 'bg-emerald-500',
                      !isTimeline && !connectorDone && 'bg-zinc-200 dark:bg-zinc-700'
                    )}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
