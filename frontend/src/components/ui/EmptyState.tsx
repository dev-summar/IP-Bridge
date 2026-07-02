import React from 'react';

import { Button } from './Button';



interface EmptyStateProps {

  icon?: React.ReactNode;

  title: string;

  description: string;

  actionLabel?: string;

  onAction?: () => void;

}



export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {

  return (

    <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">

      {icon && <div className="mb-4 text-zinc-400">{icon}</div>}

      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>

      <p className="text-base text-zinc-500 dark:text-zinc-400 mt-2 max-w-md leading-relaxed">{description}</p>

      {actionLabel && onAction && (

        <Button onClick={onAction} className="mt-6 rounded-xl">

          {actionLabel}

        </Button>

      )}

    </div>

  );

}


