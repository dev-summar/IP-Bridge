import React from 'react';



interface PageHeaderProps {

  title: string;

  description?: string;

  action?: React.ReactNode;

}



export function PageHeader({ title, description, action }: PageHeaderProps) {

  return (

    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">

      <div className="space-y-2 text-left">

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">

          {title}

        </h1>

        {description && (

          <p className="text-base text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed">{description}</p>

        )}

      </div>

      {action && <div className="shrink-0">{action}</div>}

    </div>

  );

}


