import React from 'react';
import { Bookmark, BookmarkCheck, ArrowRight, Building2, Lock, CheckCircle2 } from 'lucide-react';
import { formatINR, inferAssetType, getTRLShortLabel } from '../constants/ip';
import { cn } from '../utils/cn';

interface PatentCardProps {
  patent: any;
  isSaved: boolean;
  onToggleBookmark: (id: string, e: React.MouseEvent) => void;
  onExplore: (id: string) => void;
  showMatchReason?: boolean;
  variant?: 'default' | 'compact';
  index?: number;
  showSave?: boolean;
}

export const PatentCard = ({ patent, isSaved, onToggleBookmark, onExplore, showMatchReason = false, variant = 'default', showSave = true }: PatentCardProps) => {
  const unlocked = patent.accessStatus === 'approved';
  const rawScore = patent.analysis?.commercialPotentialScore;
  const score = typeof rawScore === 'number' && Number.isFinite(rawScore) ? rawScore : null;
  const trl = patent.trlLevel ?? patent.analysis?.readinessAssessment?.trlLevel;
  const industry = patent.analysis?.industryClassification;
  const domain = (Array.isArray(industry) ? industry[0] : typeof industry === 'string' ? industry : '') || 'Technology';
  const matchReason = patent.matchReason || patent.matchReasons?.[0];
  const description = unlocked && patent.analysis?.summary?.problemSolved && !patent.analysis.summary.problemSolved.startsWith('Locked.') ? patent.analysis.summary.problemSolved : patent.abstract;
  return (
    <article className={cn('group flex h-full flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 sm:p-6 text-left transition-shadow hover:shadow-md', variant === 'compact' && 'sm:p-5')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-xs font-medium"><span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">{domain}</span><span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-zinc-600 dark:text-zinc-300">{inferAssetType(patent)}</span></div>
        {showSave && <button type="button" onClick={e => onToggleBookmark(patent._id, e)} aria-pressed={isSaved} aria-label={isSaved ? `Unsave ${patent.title}` : `Save ${patent.title}`} className={cn('shrink-0 flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-700 focus-visible:ring-2 focus-visible:ring-primary hover:bg-primary/5', isSaved ? 'text-primary bg-primary/5' : 'text-zinc-500')}>
          {isSaved ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
        </button>}
      </div>
      <h3 className="mt-4 text-lg font-semibold leading-snug text-zinc-950 dark:text-white line-clamp-2"><button onClick={() => onExplore(patent._id)} className="text-left hover:text-primary focus-visible:outline-primary">{patent.title}</button></h3>
      {patent.patentNumber && patent.patentNumber !== 'Restricted' && <p className="mt-1 text-xs text-zinc-500">{patent.patentNumber}</p>}
      <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 line-clamp-3">{description || 'Open the listing for more information.'}</p>
      <p className="mt-4 flex items-center gap-2 text-sm text-zinc-500"><Building2 className="h-4 w-4 shrink-0" /><span className="truncate">{patent.ownerOrganization && patent.ownerOrganization !== 'N/A' ? patent.ownerOrganization : 'Institution not provided'}</span></p>
      {showMatchReason && matchReason && <p className="mt-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-2.5 text-sm text-emerald-800 dark:text-emerald-300 line-clamp-2">{patent.matchPercentage != null && <strong>{Math.round(patent.matchPercentage)}% match · </strong>}{matchReason}</p>}
      <div className="grid grid-cols-2 gap-3 mt-5 py-4 border-y border-zinc-100 dark:border-zinc-800">
        <div><p className="text-xs text-zinc-500">Technology readiness</p><p className="mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">{Number.isFinite(trl) && trl >= 1 && trl <= 9 ? getTRLShortLabel(trl) : 'Not assessed'}</p></div>
        <div><p className="text-xs text-zinc-500">AI commercial score</p><p className="mt-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">{score !== null ? `${Math.round(score)}/100` : 'Not assessed'}</p></div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-zinc-500">{patent.isForLicense && <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-1">Licensing</span>}{patent.isForSale && <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-2 py-1">Sale</span>}<span className="inline-flex items-center gap-1">{unlocked ? <><CheckCircle2 className="h-3.5 w-3.5" />Access granted</> : <><Lock className="h-3.5 w-3.5" />NDA and inventor approval</>}</span></div>
      <div className="mt-auto pt-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-zinc-500">Asking price</p><p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-white">{formatINR(patent.askingPrice)}</p></div><button type="button" onClick={() => onExplore(patent._id)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">View details<ArrowRight className="h-4 w-4" /></button></div>
    </article>
  );
};
