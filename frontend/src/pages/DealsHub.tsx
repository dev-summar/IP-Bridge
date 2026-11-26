import React from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { apiFetch } from '../hooks/useApi';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ArrowRight, Handshake } from 'lucide-react';
import { formatINR, inferAssetType, getDealProgress, DEAL_PROGRESS_STEPS } from '../constants/ip';
import { Badge } from '../components/ui/Badge';
import { cn } from '../utils/cn';

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

  const sameId = (a: unknown, b: unknown) => String(a ?? '') === String(b ?? '');
  const items = offers
    .filter((o) => {
      const tx = transactions.find((t) => sameId(t.offerId, o._id));
      const closed = tx?.status === 'completed' || o.status === 'completed';
      if (completedOnly) return closed;
      // Active list: open negotiation / escrow only — hide fully closed deals
      if (closed) return false;
      return o.status === 'accepted' || o.status === 'pending' || o.status === 'countered' || !!tx;
    })
    .map((o) => {
      const tx = transactions.find((t) => sameId(t.offerId, o._id));
      return {
        ...o,
        tx,
        status: tx?.status === 'completed' ? 'completed' : o.status,
      };
    });

  return (
    <div>
      <PageHeader
        title={completedOnly ? 'Completed Deals' : 'Active Deals'}
        description={completedOnly ? 'Successfully closed IP transactions.' : 'Follow each deal from NDA to transfer.'}
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
          {items.map((deal) => {
            const progress = getDealProgress({
              ndaSigned: deal.ndaSigned,
              accessStatus: deal.accessStatus,
              meetingStatus: deal.meetingStatus,
              offerStatus: deal.status,
              txStatus: deal.tx?.status,
            });
            const stepCount = DEAL_PROGRESS_STEPS.length;
            const filled = Math.min(stepCount, progress.currentIndex);
            return (
              <Link
                key={deal._id}
                to={`/dashboard/deals/${deal._id}`}
                className="group block rounded-3xl border border-white/80 bg-white/90 p-5 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_48px_-24px_rgba(15,23,42,0.5)] dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{deal.patentTitle}</h3>
                  <Badge variant={deal.status === 'accepted' ? 'success' : 'warning'} className="shrink-0 text-xs">
                    {deal.status}
                  </Badge>
                </div>
                <p className="mt-3 text-lg font-bold text-zinc-950 dark:text-white">{formatINR(deal.price)}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="indigo" className="text-xs">{inferAssetType(deal)}</Badge>
                  <span className="text-xs font-medium text-primary">{progress.nextLabel}</span>
                </div>
                <div className="mt-4 flex items-center gap-1.5" aria-hidden>
                  {DEAL_PROGRESS_STEPS.map((step, index) => (
                    <span
                      key={step.id}
                      className={cn(
                        'h-1.5 flex-1 rounded-full',
                        index < filled ? 'bg-emerald-500' : index === filled && !progress.complete ? 'bg-primary' : 'bg-zinc-200 dark:bg-zinc-700',
                      )}
                    />
                  ))}
                </div>
                <p className="mt-3 flex items-center gap-1 text-xs font-semibold text-zinc-500 group-hover:text-primary">
                  Open deal room
                  <ArrowRight className="h-3.5 w-3.5" />
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
