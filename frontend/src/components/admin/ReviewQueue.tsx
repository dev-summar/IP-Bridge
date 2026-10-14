import { useCallback, useEffect, useState } from 'react';
import { Search, RefreshCw, CheckCircle2, FileText, MessageSquare, ExternalLink } from 'lucide-react';
import { apiFetch } from '../../hooks/useApi';
import { useAuthStore } from '../../context/authStore';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { formatINR, inferAssetType } from '../../constants/ip';
import { cn } from '../../utils/cn';

const statuses = [
  ['pending', 'Awaiting review'], ['changes_requested', 'Changes requested'],
  ['approved', 'Approved'], ['rejected', 'Rejected'], ['all', 'All listings'],
] as const;
type Decision = 'approved' | 'changes_requested' | 'rejected';
const labels: Record<string, string> = Object.fromEntries(statuses);
const decisionLabels = { approved: 'Approve and publish', changes_requested: 'Request changes', rejected: 'Reject listing' };
const dateLabel = (value: string) => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date unavailable';

export const ReviewQueue = () => {
  const { user } = useAuthStore();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [status, setStatus] = useState('pending');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [notes, setNotes] = useState('');
  const [decision, setDecision] = useState<Decision | null>(null);
  const [saving, setSaving] = useState(false);
  const [grantVerified, setGrantVerified] = useState(false);
  const load = useCallback(async () => {
    if (user?.role !== 'admin') { setLoading(false); return; }
    setLoading(true); setError(''); setGrantVerified(false);
    try {
      const records = await apiFetch('/api/patents/reviews?status=all');
      setListings(records);
      setSelectedId(current => records.some((r: any) => r._id === current) ? current : (records.find((r: any) => r.status === 'pending')?._id || records[0]?._id || ''));
    } catch (err: any) { setError(err.message || 'Unable to load the review queue.'); }
    finally { setLoading(false); }
  }, [user?.role]);
  useEffect(() => { load(); }, [load]);
  const selected = listings.find(r => r._id === selectedId);
  const filtered = listings.filter(r => (status === 'all' || r.status === status) &&
    [r.title, r.patentNumber, r.ownerName, r.ownerOrganization].some(value => String(value || '').toLowerCase().includes(search.trim().toLowerCase())));
  const select = (id: string) => { setSelectedId(id); setDecision(null); setNotes(''); setSuccess(''); setError(''); setGrantVerified(false); };
  useEffect(() => {
    if (!loading && !saving && !filtered.some(r => r._id === selectedId)) {
      setSelectedId(filtered[0]?._id || ''); setDecision(null); setNotes(''); setGrantVerified(false);
    }
  }, [status, search, listings, loading, saving, selectedId]);
  const submit = async () => {
    if (!selected || !decision) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const result = await apiFetch(`/api/patents/${selected._id}/review`, { method: 'PUT', body: { status: decision, notes, grantVerified, reviewedPdfUrl: selected.pdfUrl } });
      setListings(current => current.map(r => r._id === selected._id ? { ...r, ...result.patent } : r));
      setSuccess(decision === 'approved' ? 'Listing approved and published.' : decision === 'changes_requested' ? 'Feedback sent to the inventor’s portfolio.' : 'Listing rejected. The inventor can see your feedback.');
      setDecision(null); setNotes(''); setGrantVerified(false);
    } catch (err: any) { setError(err.message || 'Unable to save the review.'); }
    finally { setSaving(false); }
  };
  if (user?.role !== 'admin') return <EmptyState title="Administrator access required" description="Sign in with an admin account to review listings." />;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statuses.slice(0, 4).map(([key, label]) => (
          <button key={key} onClick={() => setStatus(key)} className={cn('text-left rounded-2xl border p-4 bg-white dark:bg-zinc-900', status === key ? 'border-primary ring-1 ring-primary/20' : 'border-zinc-200 dark:border-zinc-800')}>
            <p className="text-sm text-zinc-500">{label}</p><p className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-white">{loading ? '—' : listings.filter(r => r.status === key).length}</p>
          </button>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <label className="flex flex-1 items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3">
          <Search className="h-4 w-4 text-zinc-400" /><input aria-label="Search listings, inventors or institutions" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search listings, inventors or institutions" className="w-full bg-transparent py-3 text-sm outline-none" />
        </label>
        <select aria-label="Filter review status" value={status} onChange={e => setStatus(e.target.value)} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-3 text-sm">{statuses.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        <Button variant="outline" onClick={load} disabled={loading || saving} className="gap-2"><RefreshCw className="h-4 w-4" />Refresh</Button>
      </div>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</p>}
      {loading ? <p role="status" className="py-12 text-center text-sm text-zinc-500">Loading review queue…</p> : (
        <div className="grid lg:grid-cols-[minmax(260px,0.85fr)_minmax(0,1.4fr)] gap-5 items-start">
          <div className="space-y-3">
            <p className="text-sm text-zinc-500">{filtered.length} {filtered.length === 1 ? 'listing' : 'listings'}</p>
            {filtered.length === 0 ? <EmptyState icon={<CheckCircle2 className="h-8 w-8" />} title={search ? 'No matching listings' : 'Nothing in this queue'} description={search ? 'Try another search or status.' : 'New submissions will appear here.'} /> : filtered.map(r => (
              <button key={r._id} disabled={saving} onClick={() => select(r._id)} aria-pressed={r._id === selectedId} className={cn('w-full text-left rounded-2xl border bg-white dark:bg-zinc-900 p-4 transition-colors', r._id === selectedId ? 'border-primary ring-1 ring-primary/20' : 'border-zinc-200 dark:border-zinc-800 hover:border-primary/50')}>
                <div className="flex flex-wrap justify-between gap-2 mb-3"><span className="text-xs text-zinc-500">{r.patentNumber}</span><Badge variant={r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'danger' : 'warning'} className="text-xs">{labels[r.status] || r.status}</Badge></div>
                <h3 className="text-base font-semibold leading-snug line-clamp-2">{r.title}</h3>
                <p className="mt-2 text-sm text-primary">{inferAssetType(r)}</p>
                <p className="mt-2 text-sm text-zinc-500">{r.ownerName} · {r.ownerOrganization}</p>
                <p className="mt-3 text-xs text-zinc-400">Updated {dateLabel(r.updatedAt || r.createdAt)}</p>
              </button>
            ))}
          </div>
          {selected && (
            <section aria-label="Selected listing review" className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6 space-y-6">
              <div><p className="text-xs text-primary font-medium">{selected.patentNumber}</p><h2 className="mt-2 text-xl font-semibold leading-snug">{selected.title}</h2><p className="mt-3 text-sm text-zinc-500">Submitted by {selected.ownerName} · {selected.ownerOrganization}</p></div>
              <div className="flex flex-wrap gap-2"><Badge variant="indigo">{inferAssetType(selected)}</Badge><Badge>{labels[selected.status]}</Badge><Badge variant="outline">{formatINR(selected.askingPrice)}</Badge>{selected.isForSale && <Badge variant="outline">For sale</Badge>}{selected.isForLicense && <Badge variant="outline">For licensing</Badge>}</div>
              <p className="text-sm text-zinc-500">Declared official status: <strong>{selected.registrationStatus === 'granted' ? 'Granted' : selected.registrationStatus === 'registered' ? 'Registered / approved' : 'Not provided'}</strong></p>
              <div><h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><FileText className="h-4 w-4" />Submission abstract</h3><p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{selected.abstract}</p>
                {selected.pdfUrl && /^https?:\/\//i.test(selected.pdfUrl) ? <a href={selected.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary mt-3">Open official approval PDF<ExternalLink className="h-3.5 w-3.5" /></a> : <p className="mt-3 text-sm text-amber-700">The approval PDF is missing. Request changes before approving.</p>}
              </div>
              <div className="rounded-xl bg-zinc-50 dark:bg-zinc-950 p-4"><h3 className="text-sm font-semibold">AI commercial assessment</h3><p className="mt-2 text-sm text-zinc-500">{selected.analysis?.industryClassification?.join(', ') || 'Classification unavailable'}</p><p className="mt-2 text-sm">Commercial score: <strong>{selected.analysis?.commercialPotentialScore != null ? `${selected.analysis.commercialPotentialScore}/100` : 'Not assessed'}</strong></p></div>
              {!!selected.reviewHistory?.length && <div><h3 className="text-sm font-semibold mb-3">Review history</h3><ol className="space-y-3">{[...selected.reviewHistory].reverse().map((entry: any, index: number) => <li key={index} className="border-l-2 border-zinc-200 dark:border-zinc-700 pl-3 text-sm"><p className="font-medium">{labels[entry.status]} · {entry.reviewerName}</p><p className="text-xs text-zinc-500 mt-1">{dateLabel(entry.reviewedAt)}</p>{entry.notes && <p className="mt-2 whitespace-pre-wrap text-zinc-600 dark:text-zinc-300">{entry.notes}</p>}</li>)}</ol></div>}
              {selected.status === 'pending' ? <div className="border-t border-zinc-200 dark:border-zinc-800 pt-5 space-y-4">
                <label className="flex items-start gap-3 text-sm leading-relaxed"><input id="review-grant-verification" type="checkbox" checked={grantVerified} disabled={saving || !selected.pdfUrl || !selected.grantConfirmed || !selected.ipType || !['granted', 'registered'].includes(selected.registrationStatus)} onChange={event => setGrantVerified(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-blue-600" /><span>I checked the official PDF and verified that it shows a granted patent or approved registration matching this listing.</span></label>
                <label className="block text-sm font-medium" htmlFor="review-notes"><MessageSquare className="inline h-4 w-4 mr-2" />Feedback for the inventor</label>
                <textarea id="review-notes" rows={4} maxLength={2000} disabled={saving} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Explain what should be corrected, or add an approval note." className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-transparent p-3 text-sm focus:ring-2 focus:ring-primary/30 outline-none" />
                <p className="text-xs text-zinc-500">Required for requested changes or rejection. {notes.length}/2,000 characters.</p>
                {decision ? <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 space-y-3"><p className="text-sm font-semibold">Confirm: {decisionLabels[decision]}</p><p className="text-sm text-zinc-500">{decision === 'approved' ? 'This listing will appear in the marketplace.' : 'Your feedback will appear in the inventor’s portfolio.'}</p><div className="flex gap-2"><Button onClick={submit} isLoading={saving} disabled={decision === 'approved' ? !grantVerified : !notes.trim()}>Confirm decision</Button><Button variant="ghost" onClick={() => setDecision(null)} disabled={saving}>Back</Button></div></div> : <div className="flex flex-wrap gap-2"><Button disabled={!grantVerified} onClick={() => setDecision('approved')}>Approve and publish</Button><Button variant="outline" onClick={() => setDecision('changes_requested')} disabled={!notes.trim()}>Request changes</Button><Button variant="ghost" className="text-red-600" onClick={() => setDecision('rejected')} disabled={!notes.trim()}>Reject</Button></div>}
              </div> : <p className="text-sm text-zinc-500 border-t border-zinc-200 dark:border-zinc-800 pt-4">{selected.status === 'approved' ? 'This listing is published.' : 'Waiting for the inventor to revise and resubmit this listing.'}</p>}
            </section>
          )}
        </div>
      )}
    </div>
  );
};
