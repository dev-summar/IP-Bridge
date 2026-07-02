import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { ProgressSteps } from '../components/ui/ProgressSteps';
import { DEAL_PROGRESS_STEPS } from '../constants/ip';
import { apiFetch } from '../hooks/useApi';
import { Button } from '../components/ui/Button';
import { CardSkeleton } from '../components/ui/Skeleton';
import { cn } from '../utils/cn';
import { ArrowLeft, FileText, Handshake, Layers, Lock, ScrollText, CheckCircle2 } from 'lucide-react';
import { NegotiationsManager, EscrowManager } from './Dashboards';
import { formatINR } from '../constants/ip';

const TABS = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'documents', label: 'Documents', icon: ScrollText },
  { id: 'negotiation', label: 'Negotiation', icon: Handshake },
  { id: 'milestones', label: 'Milestones', icon: Layers },
  { id: 'escrow', label: 'Escrow', icon: Lock },
  { id: 'assignment', label: 'Assignment', icon: FileText },
] as const;

type TabId = (typeof TABS)[number]['id'];

export const DealRoom = () => {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = React.useState<TabId>('overview');
  const [offer, setOffer] = React.useState<any>(null);
  const [tx, setTx] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([apiFetch('/api/offers'), apiFetch('/api/transactions')])
      .then(([offers, txs]: [any[], any[]]) => {
        setOffer(offers.find((o) => o._id === id) || null);
        setTx(txs.find((t) => t.offerId === id || t._id === id) || null);
      })
      .catch(() => {
        setOffer(null);
        setTx(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const progressIndex = tx?.status === 'completed' ? 6 : tx?.status === 'escrow_funded' ? 4 : offer?.status === 'accepted' ? 3 : 1;

  if (loading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/dashboard/deals" className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to deals
      </Link>

      <PageHeader
        title={offer?.patentTitle || 'Deal Room'}
        description="Central workspace for documents, negotiation, milestones, and escrow."
      />

      <div className="overflow-x-auto pb-2 -mx-1 px-1">
        <div className="flex gap-1 min-w-max border-b border-zinc-200 dark:border-zinc-800">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors rounded-t-lg',
                  tab === t.id
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === 'overview' && (
        <div className="space-y-8">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <ProgressSteps
              steps={DEAL_PROGRESS_STEPS.map((s) => ({ id: s.id, label: s.label }))}
              currentIndex={progressIndex}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 bg-white dark:bg-zinc-900">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Offer status</p>
              <p className="text-lg font-semibold mt-1 capitalize text-zinc-900 dark:text-white">{offer?.status || '—'}</p>
              {offer?.price != null && (
                <p className="text-sm text-zinc-500 mt-2">Value: {formatINR(offer.price)}</p>
              )}
            </div>
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 bg-white dark:bg-zinc-900">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Escrow</p>
              <p className="text-lg font-semibold mt-1 capitalize text-zinc-900 dark:text-white">
                {tx?.status?.replace(/_/g, ' ') || 'Not funded'}
              </p>
            </div>
          </div>
          {tx?.status === 'completed' && (
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/10 p-6 flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-800 dark:text-emerald-300">Deal completed</p>
                <p className="text-sm text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">Download the assignment deed from the Escrow tab.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'documents' && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-sm text-zinc-500">
          NDA, agreements, and supporting files are managed in the negotiation and IP profile flows.
          <div className="mt-4">
            {offer?.patentId && (
              <Link to={`/marketplace/${offer.patentId}`}>
                <Button variant="outline" size="sm" className="rounded-lg">View IP profile & NDA</Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {tab === 'negotiation' && <NegotiationsManager embedded />}
      {tab === 'milestones' && <EscrowManager embedded />}
      {tab === 'escrow' && <EscrowManager embedded />}
      {tab === 'assignment' && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center">
          {tx?.status === 'completed' ? (
            <p className="text-sm text-emerald-600 font-medium">Transfer complete — download the assignment deed from Escrow.</p>
          ) : (
            <p className="text-sm text-zinc-500">Assignment deed is available after all milestones are released.</p>
          )}
        </div>
      )}
    </div>
  );
};
