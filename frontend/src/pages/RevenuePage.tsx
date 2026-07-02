import { PageHeader } from '../components/ui/PageHeader';
import { EscrowManager } from './Dashboards';
import { formatINR } from '../constants/ip';
import React from 'react';
import { apiFetch } from '../hooks/useApi';
import { CardSkeleton } from '../components/ui/Skeleton';

export const RevenuePage = () => {
  const [total, setTotal] = React.useState(0);
  const [count, setCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    apiFetch('/api/transactions')
      .then((txs: any[]) => {
        const completed = txs.filter((t) => t.status === 'completed');
        setCount(completed.length);
        setTotal(completed.reduce((s, t) => s + (t.netPayout || 0), 0));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Revenue" description="Earnings from completed IP transactions." />
      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 bg-white dark:bg-zinc-900">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Completed deals</p>
            <p className="text-3xl font-bold mt-2 text-zinc-900 dark:text-white">{count}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 bg-white dark:bg-zinc-900">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Net payout (est.)</p>
            <p className="text-3xl font-bold mt-2 text-zinc-900 dark:text-white">{formatINR(total)}</p>
          </div>
        </div>
      )}
      <EscrowManager embedded />
    </div>
  );
};
