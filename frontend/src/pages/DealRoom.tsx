import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { ProgressSteps } from '../components/ui/ProgressSteps';
import { DEAL_PROGRESS_STEPS, getDealProgress } from '../constants/ip';
import { apiFetch } from '../hooks/useApi';
import { Button } from '../components/ui/Button';
import { CardSkeleton } from '../components/ui/Skeleton';
import { cn } from '../utils/cn';
import { ArrowLeft, ArrowRight, FileText, Handshake, Layers, Lock, ScrollText, CheckCircle2 } from 'lucide-react';
import { NegotiationsManager, EscrowManager } from './Dashboards';
import { formatINR, inferAssetType } from '../constants/ip';

const TABS = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'documents', label: 'Documents', icon: ScrollText },
  { id: 'negotiation', label: 'Negotiation', icon: Handshake },
  { id: 'milestones', label: 'Milestones', icon: Layers },
  { id: 'escrow', label: 'Escrow', icon: Lock },
  { id: 'assignment', label: 'Assignment', icon: FileText },
] as const;

type TabId = (typeof TABS)[number]['id'];

function nextTabForProgress(index: number): TabId {
  if (index <= 1) return 'documents';
  if (index === 2) return 'overview';
  if (index === 3) return 'negotiation';
  if (index >= 4) return 'escrow';
  return 'overview';
}

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

  const progress = getDealProgress({
    ndaSigned: offer?.ndaSigned,
    accessStatus: offer?.accessStatus,
    meetingStatus: offer?.meetingStatus,
    offerStatus: offer?.status,
    txStatus: tx?.status,
  });

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
        description="One path from NDA to transfer — documents, negotiation, milestones, and escrow."
      />
      {offer && <p className="text-sm font-medium text-primary">IP type: {inferAssetType(offer)}</p>}

      <section className="overflow-hidden rounded-3xl border border-white/70 bg-white/90 p-5 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.4)] dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">Deal path</p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-white">{progress.nextLabel}</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{progress.nextHint}</p>
          </div>
          {!progress.complete && (
            <button
              type="button"
              onClick={() => setTab(nextTabForProgress(progress.currentIndex))}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-[#2f6fbf] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
        <ProgressSteps
          steps={DEAL_PROGRESS_STEPS.map((s) => ({ id: s.id, label: s.label }))}
          currentIndex={progress.currentIndex}
        />
      </section>

      <div className="overflow-x-auto -mx-1 px-1 pb-2">
        <div className="flex min-w-max gap-1 border-b border-zinc-200 dark:border-zinc-800">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors -mb-px',
                  tab === t.id
                    ? 'border-primary bg-primary/5 text-primary'
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
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Offer</p>
              <p className="mt-1 text-lg font-semibold capitalize text-zinc-900 dark:text-white">{offer?.status || '—'}</p>
              {offer?.price != null && <p className="mt-2 text-sm text-zinc-500">Value: {formatINR(offer.price)}</p>}
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Access</p>
              <p className="mt-1 text-lg font-semibold capitalize text-zinc-900 dark:text-white">
                {offer?.accessStatus || (offer?.ndaSigned ? 'NDA signed' : 'NDA pending')}
              </p>
              <p className="mt-2 text-sm text-zinc-500 capitalize">Meeting: {offer?.meetingStatus || 'not requested'}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Escrow</p>
              <p className="mt-1 text-lg font-semibold capitalize text-zinc-900 dark:text-white">
                {tx?.status?.replace(/_/g, ' ') || 'Not funded'}
              </p>
            </div>
          </div>
          {tx?.status === 'completed' && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 dark:border-emerald-900/30 dark:bg-emerald-950/10">
              <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-500" />
              <div>
                <p className="font-semibold text-emerald-800 dark:text-emerald-300">Deal completed</p>
                <p className="mt-0.5 text-sm text-emerald-700/80 dark:text-emerald-400/80">Download the assignment deed from the Escrow tab.</p>
              </div>
            </div>
          )}
          {offer?.patentId && (
            <Link to={`/marketplace/${offer.patentId}`} className="inline-flex text-sm font-semibold text-primary hover:underline">
              Open IP profile
            </Link>
          )}
        </div>
      )}

      {tab === 'documents' && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          NDA, agreements, and supporting files live on the IP profile until escrow closes.
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
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          {tx?.status === 'completed' ? (
            <p className="text-sm font-medium text-emerald-600">Transfer complete — download the assignment deed from Escrow.</p>
          ) : (
            <p className="text-sm text-zinc-500">Assignment deed is available after all milestones are released.</p>
          )}
        </div>
      )}
    </div>
  );
};
