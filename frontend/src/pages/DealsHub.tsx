import React from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { apiFetch } from '../hooks/useApi';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Handshake } from 'lucide-react';
import { formatINR } from '../constants/ip';
import { Badge } from '../components/ui/Badge';

interface DealsHubProps {
  completedOnly?: boolean;
}

export const DealsHub = ({ completedOnly = false }: DealsHubProps) => {
  const [offers, setOffers] = React.useState<any[]>([]);
  const [transactions, setTransactions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([apiFetch('/api/offers'), apiFetch('/api/transactions')])
      .then(([o, t]) => {
        setOffers(o);
        setTransactions(t);
      })
      .finally(() => setLoading(false));
  }, []);

  const items = offers
    .filter((o) => {
      const tx = transactions.find((t) => t.offerId === o._id);
      if (completedOnly) return tx?.status === 'completed' || o.status === 'completed';
      return o.status === 'accepted' || o.status === 'pending' || tx;
    })
    .map((o) => ({
      ...o,
      tx: transactions.find((t) => t.offerId === o._id),
    }));

  return (
    <div>
      <PageHeader
        title={completedOnly ? 'Completed Deals' : 'Active Deals'}
        description={completedOnly ? 'Successfully closed IP transactions.' : 'Offers, negotiations, and escrow in progress.'}
      />
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">{[1, 2].map((i) => <CardSkeleton key={i} />)}</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Handshake className="h-10 w-10" />}
          title={completedOnly ? 'No completed deals yet' : 'No active deals'}
          description="Submit an offer on an unlocked IP asset to start a deal."
          actionLabel="Discover IP"
          onAction={() => { window.location.href = '/discover'; }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((deal) => (
            <Link
              key={deal._id}
              to={`/dashboard/deals/${deal._id}`}
              className="block p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:shadow-md hover:border-primary/20 transition-all text-left"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-2">{deal.patentTitle}</h3>
                <Badge variant={deal.status === 'accepted' ? 'success' : 'warning'} className="shrink-0 text-[10px]">
                  {deal.status}
                </Badge>
              </div>
              <p className="text-lg font-bold mt-3">{formatINR(deal.price)}</p>
              {deal.tx && (
                <p className="text-xs text-zinc-500 mt-2 capitalize">Escrow: {deal.tx.status.replace('_', ' ')}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
