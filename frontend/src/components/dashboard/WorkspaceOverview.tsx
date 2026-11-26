import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Compass,
  FileCheck2,
  FolderKanban,
  Handshake,
  Inbox,
  Layers3,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '../../context/authStore';
import { apiFetch } from '../../hooks/useApi';
import { inferAssetType } from '../../constants/ip';
import { getCommercialPotentialLabel } from '../../utils/patentAnalysis';
import { cn } from '../../utils/cn';

type Role = 'owner' | 'buyer' | 'admin';
type Metric = { source: string; label: string; path: string; icon: LucideIcon; tint: string };

const surface =
  'min-w-0 rounded-2xl border border-white/80 bg-white/90 shadow-[0_10px_40px_-24px_rgba(15,23,42,0.35)] backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/90 dark:shadow-none';
const primaryBtn =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#1e3a8a] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25 transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2';

const roleConfig: Record<
  Role,
  { name: string; description: string; action: string; href: string; icon: LucideIcon; hero: string; metrics: Metric[] }
> = {
  owner: {
    name: 'Inventor',
    description: 'Manage your IP, respond to buyer interest, and move your ideas forward.',
    action: 'List new IP',
    href: '/dashboard/assets?new=1',
    icon: Plus,
    hero: 'from-[#0b1f3a] via-[#12345a] to-[#1d4f8c]',
    metrics: [
      { source: 'Portfolio Size', label: 'IP assets', path: '/dashboard/assets', icon: FolderKanban, tint: 'from-sky-50 to-blue-50 text-sky-700 dark:from-sky-950/40 dark:to-blue-950/20 dark:text-sky-300' },
      { source: 'Published Listings', label: 'Published listings', path: '/dashboard/assets', icon: CheckCircle2, tint: 'from-emerald-50 to-teal-50 text-emerald-700 dark:from-emerald-950/40 dark:to-teal-950/20 dark:text-emerald-300' },
      { source: 'Under AI/Admin Review', label: 'Under review', path: '/dashboard/assets', icon: Clock3, tint: 'from-amber-50 to-orange-50 text-amber-700 dark:from-amber-950/40 dark:to-orange-950/20 dark:text-amber-300' },
      { source: 'Active Deals', label: 'Active deals', path: '/dashboard/negotiations', icon: Handshake, tint: 'from-cyan-50 to-sky-50 text-cyan-700 dark:from-cyan-950/40 dark:to-sky-950/20 dark:text-cyan-300' },
    ],
  },
  buyer: {
    name: 'Buyer',
    description: 'Find the right IP, follow your requests, and keep your deals moving.',
    action: 'Discover IP',
    href: '/discover',
    icon: Compass,
    hero: 'from-[#082f49] via-[#0e4a6e] to-[#1d6fa5]',
    metrics: [
      { source: 'Saved Patents', label: 'Saved opportunities', path: '/dashboard/saved', icon: Bookmark, tint: 'from-rose-50 to-orange-50 text-rose-700 dark:from-rose-950/40 dark:to-orange-950/20 dark:text-rose-300' },
      { source: 'Unlock Requests', label: 'IP requests', path: '/dashboard/requests', icon: Inbox, tint: 'from-sky-50 to-blue-50 text-sky-700 dark:from-sky-950/40 dark:to-blue-950/20 dark:text-sky-300' },
      { source: 'Active Offers', label: 'Active offers', path: '/dashboard/deals', icon: Handshake, tint: 'from-cyan-50 to-teal-50 text-cyan-700 dark:from-cyan-950/40 dark:to-teal-950/20 dark:text-cyan-300' },
      { source: 'Completed', label: 'Completed deals', path: '/dashboard/deals/completed', icon: CheckCircle2, tint: 'from-emerald-50 to-lime-50 text-emerald-700 dark:from-emerald-950/40 dark:to-lime-950/20 dark:text-emerald-300' },
    ],
  },
  admin: {
    name: 'Admin',
    description: 'Review submissions, oversee the marketplace, and follow platform activity.',
    action: 'Review listings',
    href: '/dashboard/listings',
    icon: FileCheck2,
    hero: 'from-[#0b1c2e] via-[#12324f] to-[#1a5f7a]',
    metrics: [
      { source: 'Total Platform Users', label: 'Platform users', path: '/dashboard/users', icon: Users, tint: 'from-sky-50 to-cyan-50 text-sky-700 dark:from-sky-950/40 dark:to-cyan-950/20 dark:text-sky-300' },
      { source: 'Total Patents Filed', label: 'IP submissions', path: '/dashboard/listings', icon: Layers3, tint: 'from-blue-50 to-cyan-50 text-primary dark:from-blue-950/40 dark:to-cyan-950/20 dark:text-blue-400' },
      { source: 'Pending Reviews', label: 'Awaiting review', path: '/dashboard/listings', icon: Clock3, tint: 'from-amber-50 to-yellow-50 text-amber-800 dark:from-amber-950/40 dark:to-yellow-950/20 dark:text-amber-300' },
      { source: 'Approved & Listed', label: 'Published listings', path: '/dashboard/listings', icon: CheckCircle2, tint: 'from-emerald-50 to-teal-50 text-emerald-700 dark:from-emerald-950/40 dark:to-teal-950/20 dark:text-emerald-300' },
    ],
  },
};

const money = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value)
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
    : 'Not available';
const dateLabel = (value: string) =>
  Number.isNaN(new Date(value).getTime())
    ? 'Date unavailable'
    : new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

function Status({ value, listing = false }: { value: string; listing?: boolean }) {
  const labels: Record<string, string> = {
    approved: listing ? 'Published' : 'Approved',
    pending: listing ? 'Under review' : 'Pending',
    changes_requested: 'Changes requested',
    rejected: 'Declined',
    new: 'Interest sent',
    contacted: 'Contacted',
    accepted: 'Accepted',
    countered: 'Counter offer',
    completed: 'Completed',
    declined: 'Declined',
  };
  const color = ['approved', 'accepted', 'completed'].includes(value)
    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900/50'
    : ['rejected', 'declined'].includes(value)
      ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/80 dark:bg-rose-950/30 dark:text-rose-300 dark:ring-rose-900/50'
      : ['pending', 'changes_requested', 'countered'].includes(value)
        ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/80 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900/50'
        : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/80 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700';
  return (
    <span className={cn('inline-flex max-w-full shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold leading-snug', color)}>
      {labels[value] || value?.replace(/_/g, ' ') || 'Not available'}
    </span>
  );
}

function Panel({
  title,
  description,
  href,
  linkLabel = 'View all',
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section className={surface}>
      <div className="flex items-start justify-between gap-3 border-b border-slate-100/90 px-5 py-4 dark:border-zinc-800 sm:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
            )}
            <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h2>
          </div>
          {description && <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-zinc-400">{description}</p>}
        </div>
        {href && (
          <Link to={href} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10 dark:text-blue-400">
            {linkLabel}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Empty({
  icon: Icon,
  title,
  description,
  href,
  label,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="px-5 py-10 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-sky-100 text-primary dark:from-primary/20 dark:to-zinc-800">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-slate-700 dark:text-zinc-200">{title}</h3>
      <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-500 dark:text-zinc-400">{description}</p>
      {href && (
        <Link to={href} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline dark:text-blue-400">
          {label}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function Activity({ series, buyer }: { series: any[]; buyer: boolean }) {
  const field = buyer ? 'inquiries' : 'submissions';
  const max = Math.max(1, ...series.map((row) => Number(row[field]) || 0));
  return (
    <Panel
      title={buyer ? 'Your discovery activity' : 'Submission activity'}
      description={buyer ? 'IP requests sent over the last six months' : 'IP listings submitted over the last six months'}
      icon={Sparkles}
    >
      {series.length ? (
        <div className="grid h-[190px] grid-cols-6 gap-3 px-5 pb-5 pt-6 sm:px-6" role="list" aria-label="Monthly activity">
          {series.map((row, index) => (
            <div key={`${row.month}-${index}`} role="listitem" aria-label={`${row.month}: ${Number(row[field]) || 0}`} className="flex min-w-0 flex-col items-center justify-end gap-2">
              <span className="text-xs font-semibold tabular-nums text-slate-600 dark:text-zinc-300">{Number(row[field]) || 0}</span>
              <div className="flex h-24 w-full max-w-9 items-end rounded-xl bg-slate-100/80 dark:bg-zinc-800">
                <motion.div
                  title={`${row.month}: ${Number(row[field]) || 0}`}
                  className="w-full rounded-xl bg-gradient-to-t from-primary to-[#1e3a8a]"
                  initial={{ height: 0 }}
                  animate={{ height: `${((Number(row[field]) || 0) / max) * 100}%` }}
                  transition={{ duration: 0.55, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">{String(row.month).split(' ')[0]}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-6 py-10 text-sm text-slate-500 dark:text-zinc-400">Activity will appear as your workspace is used.</p>
      )}
    </Panel>
  );
}

function BenchmarkSummary({ data }: { data: any }) {
  const rows = [
    { label: 'Rank within your institution', value: data.individual?.orgPeerRank != null ? `#${data.individual.orgPeerRank} of ${data.individual.orgPeerCount}` : 'Not ranked' },
    { label: 'Your institution’s platform rank', value: data.institution?.rank != null ? `#${data.institution.rank} of ${data.institution.totalInstitutions}` : 'Not ranked' },
    { label: 'Commercial score vs institution peers', value: data.institution?.vsOrgCommercialDelta != null ? `${data.institution.vsOrgCommercialDelta > 0 ? '+' : ''}${data.institution.vsOrgCommercialDelta} points` : 'Not available' },
  ];
  return (
    <dl className="grid gap-5 border-t border-slate-100 pt-5 dark:border-zinc-800 sm:grid-cols-3">
      {rows.map((row) => (
        <div key={row.label} className="rounded-xl bg-slate-50/80 p-3 dark:bg-zinc-800/50">
          <dt className="text-xs text-slate-500 dark:text-zinc-400">{row.label}</dt>
          <dd className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export const WorkspaceOverview = () => {
  const { user } = useAuthStore();
  const role = (user?.role || 'buyer') as Role;
  const config = roleConfig[role];
  const [data, setData] = React.useState<any>(null);
  const [extra, setExtra] = React.useState<any>(null);
  const [error, setError] = React.useState('');
  const [extraError, setExtraError] = React.useState(false);
  const [busy, setBusy] = React.useState(true);
  const controller = React.useRef<AbortController>();
  const load = React.useCallback(async () => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError('');
    const extraUrl =
      role === 'owner'
        ? '/api/interactions/access-requests'
        : role === 'admin'
          ? '/api/patents/reviews?status=pending'
          : '/api/patents/featured?limit=3';
    try {
      // Paint metric cards as soon as analytics lands; load supplemental panels in parallel.
      const overviewPromise = apiFetch('/api/analytics/dashboard', { signal: request.signal });
      const supplementalPromise = apiFetch(extraUrl, { signal: request.signal }).then(
        (value) => ({ ok: true as const, value }),
        () => ({ ok: false as const, value: null })
      );
      const overview = await overviewPromise;
      if (request.signal.aborted) return;
      setData(overview);
      setBusy(false);
      const supplemental = await supplementalPromise;
      if (request.signal.aborted) return;
      setExtra(supplemental.ok ? supplemental.value : null);
      setExtraError(!supplemental.ok);
    } catch (err: any) {
      if (!request.signal.aborted) {
        setError(err.message || 'Your dashboard could not be loaded.');
        setBusy(false);
      }
    }
  }, [role]);
  React.useEffect(() => {
    load();
    return () => controller.current?.abort();
  }, [load]);

  const stat = (label: string) => data?.stats?.find((item: any) => item.label === label);
  const count = (label: string) => Number(stat(label)?.value) || 0;
  const pendingAccess = Array.isArray(extra) && role === 'owner' ? extra.filter((item) => item.status === 'pending') : [];
  const portfolio = data?.portfolioPatents || [];
  const recommendations = Array.isArray(extra) ? extra : extra?.patents || [];
  const buyerInterest = Array.isArray(extra) && role === 'owner' && extra.length ? extra : data?.recentLeads || [];

  let focus = {
    title: 'Find IP that fits your next project',
    description: 'Explore published opportunities, save promising technologies, and connect with inventors.',
    label: 'Explore the marketplace',
    path: '/discover',
    urgent: false,
  };
  if (role === 'owner') {
    focus =
      count('Changes Requested') > 0
        ? {
            title: `${count('Changes Requested')} IP ${count('Changes Requested') === 1 ? 'asset needs' : 'assets need'} your attention`,
            description: 'The review team has shared feedback. Update your listings and resubmit them for review.',
            label: 'Review feedback',
            path: '/dashboard/assets',
            urgent: true,
          }
        : pendingAccess.length > 0
          ? {
              title: `${pendingAccess.length} buyer ${pendingAccess.length === 1 ? 'request is' : 'requests are'} waiting`,
              description: 'Review who wants to explore your technology and decide who can access the full details.',
              label: 'Review access requests',
              path: '/dashboard/access-requests',
              urgent: true,
            }
          : {
              title: 'Give your next idea a place to grow',
              description: 'List granted IP, keep your portfolio up to date, and help the right buyers discover your research.',
              label: 'Manage your IP assets',
              path: '/dashboard/assets',
              urgent: false,
            };
  }
  if (role === 'buyer' && count('Active Offers') > 0) {
    focus = {
      title: 'Keep your active deals moving',
      description: 'Review offers, continue discussions, and track the next step in each IP transaction.',
      label: 'Open active deals',
      path: '/dashboard/deals',
      urgent: true,
    };
  }
  if (role === 'admin') {
    focus = {
      title: count('Pending Reviews') > 0 ? `${count('Pending Reviews')} ${count('Pending Reviews') === 1 ? 'submission' : 'submissions'} ready for review` : 'Keep the marketplace moving',
      description: 'Check official grant documents, send useful feedback, and publish eligible IP listings.',
      label: 'Open review queue',
      path: '/dashboard/listings',
      urgent: count('Pending Reviews') > 0,
    };
  }
  const PrimaryIcon = config.icon;

  return (
    <div className="space-y-6">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/70 p-5 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.45)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70 sm:p-7"
      >
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {config.name} overview
            </p>
            <h1 className="type-page-title break-words text-slate-900 sm:text-2xl dark:text-white">
              Welcome back, {user?.name?.split(' (')[0] || 'there'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-zinc-400">{config.description}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={load}
              disabled={busy}
              aria-label="Refresh dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-500 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <RefreshCw className={cn('h-4 w-4', busy && 'animate-spin')} />
            </button>
            <Link className={primaryBtn} to={config.href}>
              <PrimaryIcon className="h-4 w-4" />
              {config.action}
            </Link>
          </div>
        </div>
      </motion.header>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          <span>{error}</span>
          <button type="button" onClick={load} className="font-semibold underline">Try again</button>
        </div>
      )}

      {!data && busy ? (
        <div role="status" aria-label="Loading dashboard" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {config.metrics.map((metric) => (
            <div key={metric.source} className={cn(surface, 'h-[145px] animate-pulse p-5')}>
              <div className="h-3 w-20 rounded bg-slate-100 dark:bg-zinc-800" />
              <div className="mt-6 h-8 w-16 rounded bg-slate-100 dark:bg-zinc-800" />
            </div>
          ))}
        </div>
      ) : (
        data && (
          <>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Key metrics">
              {config.metrics.map((metric, index) => {
                const value = stat(metric.source);
                const Icon = metric.icon;
                return (
                  <motion.div key={metric.source} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, duration: 0.35 }}>
                    <Link
                      to={metric.path}
                      className={cn(
                        'group block overflow-hidden rounded-2xl border border-white/80 bg-gradient-to-br p-4 shadow-[0_12px_30px_-20px_rgba(15,23,42,0.4)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-22px_rgba(15,23,42,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-zinc-800 sm:p-5',
                        metric.tint,
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold leading-relaxed opacity-80">{metric.label}</p>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/70 shadow-sm dark:bg-zinc-900/60">
                          <Icon className="h-4 w-4" />
                        </span>
                      </div>
                      <p className="mt-4 text-3xl font-bold leading-none tracking-tight tabular-nums text-slate-900 dark:text-white">{value?.value ?? '—'}</p>
                      <p className="mt-3 text-xs font-medium leading-relaxed opacity-75">{value?.change || 'No data available'}</p>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <section className={cn('relative overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-white shadow-[0_24px_60px_-28px_rgba(8,47,73,0.65)] sm:p-7', config.hero)} aria-label="Recommended next step">
                <div className="pointer-events-none absolute -right-8 top-0 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-sky-300/20 blur-2xl" />
                <div className="relative flex h-full flex-col justify-between">
                  <div>
                    <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-100">
                      <span className={cn('h-1.5 w-1.5 rounded-full', focus.urgent ? 'bg-amber-300' : 'bg-emerald-300')} />
                      {focus.urgent ? 'Needs attention' : 'Your next step'}
                    </p>
                    <h2 className="mt-4 max-w-lg text-xl font-bold leading-tight tracking-tight">{focus.title}</h2>
                    <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-200/90">{focus.description}</p>
                  </div>
                  <Link to={focus.path} className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-semibold text-slate-900 hover:bg-sky-50">
                    {focus.label}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </section>
              <Activity series={data.activitySeries || []} buyer={role === 'buyer'} />
            </div>

            {extraError && (
              <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                {role === 'buyer' ? 'Marketplace suggestions' : role === 'owner' ? 'Access requests' : 'The review queue'} could not be refreshed.{' '}
                <button type="button" onClick={load} className="font-semibold underline">Retry</button>
              </div>
            )}

            {role === 'owner' && (
              <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                <Panel title="Your IP portfolio" description="Your assets and their review status" href="/dashboard/assets" linkLabel="Manage IP" icon={FolderKanban}>
                  {portfolio.length ? (
                    <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                      {portfolio.slice(0, 5).map((ip: any) => (
                        <Link key={ip.id} to={`/marketplace/${ip.id}`} className="group flex items-start justify-between gap-4 px-5 py-4 hover:bg-sky-50/60 dark:hover:bg-zinc-800/50 sm:px-6">
                          <div className="min-w-0">
                            <h3 className="line-clamp-2 text-sm font-medium leading-relaxed text-slate-800 group-hover:text-primary dark:text-zinc-200">{ip.title}</h3>
                            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                              {inferAssetType(ip)}
                              {typeof ip.commercialPotentialScore === 'number' ? ` · AI score ${ip.commercialPotentialScore}/100` : ' · Not assessed'}
                            </p>
                          </div>
                          <Status value={ip.status} listing />
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <Empty icon={FolderKanban} title="Your portfolio starts here" description="Add your first granted IP asset and its official approval document." href="/dashboard/assets?new=1" label="List new IP" />
                  )}
                </Panel>
                <Panel title="Buyer interest" description="Recent requests and enquiries about your IP" href="/dashboard/access-requests" icon={Inbox}>
                  {pendingAccess.length > 0 && (
                    <div className="border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-3 text-xs font-semibold text-amber-900 dark:border-amber-900/40 dark:from-amber-950/30 dark:to-orange-950/20 dark:text-amber-200 sm:px-6">
                      {pendingAccess.length} unlock {pendingAccess.length === 1 ? 'request' : 'requests'} waiting for your decision
                    </div>
                  )}
                  {buyerInterest.length ? (
                    <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                      {buyerInterest.slice(0, 4).map((item: any) => (
                        <Link
                          key={item._id || item.id}
                          to="/dashboard/access-requests"
                          className="block px-5 py-4 hover:bg-amber-50/50 dark:hover:bg-zinc-800/50 sm:px-6"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="min-w-0 break-words text-sm font-medium text-slate-800 dark:text-zinc-200">{item.buyerName || 'Buyer'}</h3>
                            <Status value={item.status} />
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-zinc-400">{item.patentTitle}</p>
                          <p className="mt-2 text-xs text-slate-400 dark:text-zinc-500">
                            {item.buyerOrganization || item.buyerOrg || 'Independent'} · {dateLabel(item.createdAt)}
                          </p>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <Empty icon={Inbox} title={extraError ? 'Buyer interest is unavailable' : 'No buyer requests yet'} description={extraError ? 'Open access requests or refresh to check your latest enquiries.' : 'Interest in your published listings will appear here.'} />
                  )}
                </Panel>
              </div>
            )}

            {role === 'buyer' && (
              <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                <div className="min-w-0 space-y-5">
                  <Panel title="Your active conversations" description="Offers and transactions you have started" href="/dashboard/deals" icon={Handshake}>
                    {data.recentDeals?.length ? (
                      <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                        {data.recentDeals.slice(0, 4).map((deal: any) => (
                          <Link key={deal.id} to={`/dashboard/deals/${deal.id}`} className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-sky-50/60 dark:hover:bg-zinc-800/50 sm:px-6">
                            <div className="min-w-0">
                              <h3 className="line-clamp-2 text-sm font-medium text-slate-800 dark:text-zinc-200">{deal.patentTitle}</h3>
                              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                                {money(deal.price)} · {dateLabel(deal.createdAt)}
                              </p>
                            </div>
                            <Status value={deal.status} />
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <Empty icon={Handshake} title="Your next deal begins with discovery" description="Explore IP and connect with an inventor to start a conversation." href="/discover" label="Discover IP" />
                    )}
                  </Panel>
                  <Panel title="Explore IP opportunities" description="Published listings from the marketplace" href="/discover" linkLabel="Discover IP" icon={Compass}>
                    {recommendations.length ? (
                      <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                        {recommendations.slice(0, 3).map((ip: any) => (
                          <Link key={ip._id} to={`/marketplace/${ip._id}`} className="group flex items-start gap-3 px-5 py-4 hover:bg-sky-50/60 dark:hover:bg-zinc-800/50 sm:px-6">
                            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-sky-100 text-primary dark:from-primary/25 dark:to-zinc-800">
                              <Layers3 className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <h3 className="line-clamp-2 text-sm font-medium text-slate-800 group-hover:text-primary dark:text-zinc-200">{ip.title}</h3>
                              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{inferAssetType(ip)}</p>
                              <p className="mt-1 text-xs font-medium text-primary dark:text-blue-400">
                                {typeof ip.analysis?.commercialPotentialScore === 'number'
                                  ? getCommercialPotentialLabel(ip.analysis.commercialPotentialScore)
                                  : 'Not assessed'}
                              </p>
                            </div>
                            <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <Empty icon={Compass} title={extraError ? 'Suggestions are unavailable' : 'New opportunities will appear here'} description="Browse the marketplace to explore available IP." href="/discover" label="Open marketplace" />
                    )}
                  </Panel>
                </div>
                <div className="min-w-0 space-y-5">
                  <Panel title="Your IP requests" description="Follow the interest you have shared" href="/dashboard/requests" icon={Inbox}>
                    {data.recentRequests?.length ? (
                      <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                        {data.recentRequests.slice(0, 4).map((request: any) => (
                          <div key={request.id} className="px-5 py-4 sm:px-6">
                            <h3 className="line-clamp-2 text-sm font-medium text-slate-800 dark:text-zinc-200">{request.patentTitle}</h3>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="text-xs text-slate-400 dark:text-zinc-500">{dateLabel(request.createdAt)}</span>
                              <Status value={request.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty icon={Inbox} title="No requests sent yet" description="Request access to an IP profile to see it here." />
                    )}
                  </Panel>
                  <Panel title="Meeting requests" href="/dashboard/meetings" icon={CalendarDays}>
                    {data.activeSchedules?.length ? (
                      <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                        {data.activeSchedules.slice(0, 3).map((meeting: any) => (
                          <div key={meeting.id} className="px-5 py-4 sm:px-6">
                            <p className="line-clamp-2 text-sm font-medium text-slate-800 dark:text-zinc-200">{meeting.patentTitle}</p>
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs text-slate-500 dark:text-zinc-400">
                                {dateLabel(meeting.date)}
                                {meeting.time ? ` · ${meeting.time}` : ''}
                              </span>
                              <Status value={meeting.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty icon={CalendarDays} title="No meetings requested" description="Arrange a conversation with an inventor when you are ready." />
                    )}
                  </Panel>
                </div>
              </div>
            )}

            {role === 'admin' && (
              <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                <div className="min-w-0 space-y-5">
                  <Panel title="Review queue" description="Pending submissions awaiting a decision" href="/dashboard/listings" linkLabel="Open queue" icon={FileCheck2}>
                    {Array.isArray(extra) && extra.length ? (
                      <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                        {extra.slice(0, 5).map((ip: any) => (
                          <div key={ip._id} className="flex items-start gap-3 px-5 py-4 sm:px-6">
                            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-50 text-amber-700 dark:from-amber-950/40 dark:to-orange-950/20 dark:text-amber-300">
                              <FileCheck2 className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <h3 className="line-clamp-2 text-sm font-medium text-slate-800 dark:text-zinc-200">{ip.title}</h3>
                              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
                                {inferAssetType(ip)} · {ip.ownerOrganization || 'Independent'}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs text-slate-400 dark:text-zinc-500">{dateLabel(ip.createdAt)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty
                        icon={ShieldCheck}
                        title={extraError ? 'Review queue unavailable' : 'No submissions waiting'}
                        description={extraError ? 'Use the review workspace or refresh this dashboard.' : 'New IP submissions will appear here for review.'}
                        href="/dashboard/listings"
                        label="Open review workspace"
                      />
                    )}
                  </Panel>
                  <Panel title="Recent platform activity" description="Events recorded in the audit trail" href="/dashboard/reports" linkLabel="View reports" icon={Clock3}>
                    {data.recentLogs?.length ? (
                      <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                        {data.recentLogs.slice(0, 4).map((log: any) => (
                          <div key={log.id} className="flex gap-3 px-5 py-4 sm:px-6">
                            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-br from-primary to-[#1e3a8a]" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold capitalize text-slate-700 dark:text-zinc-200">
                                {String(log.action).toLowerCase().replace(/_/g, ' ')}
                              </p>
                              <p className="mt-1 line-clamp-2 break-words text-xs leading-relaxed text-slate-500 dark:text-zinc-400">{log.details}</p>
                              <p className="mt-2 text-xs text-slate-400 dark:text-zinc-500">
                                {log.userName} · {dateLabel(log.createdAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty icon={Clock3} title="No activity recorded yet" description="Account and listing activity will appear as the platform is used." />
                    )}
                  </Panel>
                </div>
                <div className="min-w-0 space-y-5">
                  <Panel title="Financial overview" description="Recorded transaction totals" href="/dashboard/escrow" linkLabel="Escrow" icon={Sparkles}>
                    <dl className="divide-y divide-slate-100 px-5 dark:divide-zinc-800 sm:px-6">
                      {[
                        ['Transaction volume', data.treasury?.gmv],
                        ['Platform commissions', data.treasury?.commissions],
                        ['Active escrow', data.treasury?.activeEscrow],
                      ].map(([label, value]) => (
                        <div key={String(label)} className="flex flex-wrap items-center justify-between gap-2 py-4">
                          <dt className="text-xs text-slate-500 dark:text-zinc-400">{label}</dt>
                          <dd className="text-base font-semibold tabular-nums text-slate-900 dark:text-white">{money(value)}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400 dark:border-zinc-800 dark:text-zinc-500 sm:px-6">
                      Subscription billing: {data.treasury?.subscriptionRevenue == null ? 'Not tracked' : money(data.treasury.subscriptionRevenue)}
                    </p>
                  </Panel>
                  <Panel title="Marketplace sectors" description="Classification across submitted IP" icon={Layers3}>
                    {data.industryStats?.length ? (
                      <div className="space-y-4 p-5 sm:p-6">
                        {[...data.industryStats]
                          .sort((a: any, b: any) => b.value - a.value)
                          .slice(0, 5)
                          .map((sector: any) => (
                            <div key={sector.name}>
                              <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                                <span className="min-w-0 break-words text-slate-600 dark:text-zinc-300">{sector.name}</span>
                                <span className="font-semibold tabular-nums text-slate-800 dark:text-zinc-200">{sector.value}</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-primary to-[#1e3a8a]"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      (sector.value / Math.max(1, ...data.industryStats.map((item: any) => item.value))) * 100,
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <Empty icon={Layers3} title="Sector data is not available yet" description="Classifications appear after IP analysis." />
                    )}
                  </Panel>
                </div>
              </div>
            )}

            {role !== 'admin' && (
              <details className={cn(surface, 'group')}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-medium text-slate-700 dark:text-zinc-200 sm:px-6">
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    {role === 'owner' ? 'Portfolio insights & institution rankings' : 'More workspace insights'}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <div className="space-y-6 border-t border-slate-100 p-5 dark:border-zinc-800 sm:p-6">
                  <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {data.stats
                      ?.filter((item: any) => !config.metrics.some((metric) => metric.source === item.label))
                      .map((item: any) => (
                        <div key={item.label} className="rounded-xl bg-gradient-to-br from-slate-50 to-sky-50/40 p-3 dark:from-zinc-800/60 dark:to-zinc-900">
                          <dt className="text-xs text-slate-500 dark:text-zinc-400">{item.label}</dt>
                          <dd className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">{item.value}</dd>
                          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">{item.change}</p>
                        </div>
                      ))}
                  </dl>
                  {role === 'owner' && data.benchmarking && (
                    <React.Fragment>
                      <BenchmarkSummary data={data.benchmarking} />
                      <div className="grid gap-5 border-t border-slate-100 pt-5 dark:border-zinc-800 lg:grid-cols-2">
                        {[
                          { title: 'Inventor rankings', rows: data.benchmarking.topIndividuals || [], name: 'name', value: 'avgCommercialScore' },
                          { title: 'Institution rankings', rows: data.benchmarking.institutionLeaderboard || [], name: 'organization', value: 'benchmarkScore' },
                        ].map((group) => (
                          <div key={group.title}>
                            <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-zinc-200">{group.title}</h3>
                            <ol className="space-y-3">
                              {group.rows.map((row: any) => (
                                <li key={row.rank} className="flex items-start gap-3 text-xs">
                                  <span className="font-medium tabular-nums text-slate-400">{row.rank}</span>
                                  <span className="min-w-0 flex-1 break-words text-slate-600 dark:text-zinc-300">
                                    {row[group.name]}
                                    {row.isYou || row.isYourOrg ? ' (you)' : ''}
                                  </span>
                                  <span className="font-medium tabular-nums text-slate-800 dark:text-zinc-200">{row[group.value]}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        ))}
                      </div>
                    </React.Fragment>
                  )}
                </div>
              </details>
            )}
          </>
        )
      )}
    </div>
  );
};
