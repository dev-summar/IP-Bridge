import React from 'react';
import { Bookmark, BookmarkCheck, ArrowRight, Building2 } from 'lucide-react';
import { formatINR, formatINRCompact, formatIndicativeBandCompact, inferAssetType, getTRLShortLabel } from '../constants/ip';
import { cn } from '../utils/cn';

interface PatentCardProps {
  patent: any;
  isSaved: boolean;
  onToggleBookmark: (id: string, e: React.MouseEvent) => void;
  onExplore: (id: string) => void;
  onIgnore?: (id: string, e: React.MouseEvent) => void;
  showMatchReason?: boolean;
  variant?: 'default' | 'compact';
  index?: number;
  showSave?: boolean;
}

export const PatentCard = ({ patent, isSaved, onToggleBookmark, onExplore, onIgnore, showMatchReason = false, variant = 'default', showSave = true }: PatentCardProps) => {
  const unlocked = patent.detailsVisible === true;
  const rawScore = patent.analysis?.commercialPotentialScore;
  const score = typeof rawScore === 'number' && Number.isFinite(rawScore) ? rawScore : null;
  const trl = patent.trlLevel ?? patent.analysis?.readinessAssessment?.trlLevel;
  const industry = patent.analysis?.industryClassification;
  const domain = (Array.isArray(industry) ? industry[0] : typeof industry === 'string' ? industry : '') || 'Technology';
  const matchReason = patent.matchReason || patent.matchReasons?.[0];
  const publicLines = (
    Array.isArray(patent.publicLines) && patent.publicLines.length
      ? patent.publicLines
      : Array.isArray(patent.publicSummary)
        ? patent.publicSummary
        : []
  ).filter(Boolean).slice(0, 3);
  const assetLabel = inferAssetType(patent);
  const hasTrl = Number.isFinite(trl) && trl >= 1 && trl <= 9;
  const licenseOnly = patent.isForLicense && !patent.isForSale;
  const offer = [patent.isForLicense ? 'Licensing' : null, patent.isForSale ? 'Sale' : null].filter(Boolean).join(' and ');
  const priceLabel = unlocked ? 'Asking price' : licenseOnly ? 'Yearly license' : 'Indicative value';
  const priceText = unlocked
    ? formatINR(patent.askingPrice)
    : licenseOnly && patent.indicativeValue?.licenseAnnual
      ? `${formatINRCompact(patent.indicativeValue.licenseAnnual)} / year`
      : formatIndicativeBandCompact(patent.indicativeValue);

  return (
    <article className={cn(
      'group flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900',
      variant === 'compact' ? 'gap-0' : 'sm:p-6',
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{domain}</span>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{assetLabel}</span>
        </div>
        {showSave && (
          <button
            type="button"
            onClick={e => onToggleBookmark(patent._id, e)}
            aria-pressed={isSaved}
            aria-label={isSaved ? `Unsave ${patent.title}` : `Save ${patent.title}`}
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary dark:border-zinc-700',
              isSaved ? 'bg-primary/5 text-primary' : 'text-zinc-500',
            )}
          >
            {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </button>
        )}
      </div>

      <h3 className="type-card-title mt-3 text-zinc-950 dark:text-white">
        <button
          type="button"
          onClick={() => onExplore(patent._id)}
          className="line-clamp-2 text-left hover:text-primary focus-visible:outline-primary"
        >
          {patent.title}
        </button>
      </h3>

      {unlocked && patent.patentNumber && <p className="mt-1 text-xs text-zinc-500">{patent.patentNumber}</p>}

      {unlocked ? (
        <p className="mt-3 text-base leading-6 text-zinc-700 line-clamp-4 dark:text-zinc-300">
          {patent.analysis?.summary?.problemSolved || patent.abstract || 'Open the listing for more information.'}
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {publicLines.map((line: string) => (
            <p key={line} className="text-base leading-6 text-zinc-700 dark:text-zinc-300">{line}</p>
          ))}
        </div>
      )}

      {unlocked && (
        <p className="mt-3 flex items-center gap-2 text-sm text-zinc-500">
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="truncate">{patent.ownerOrganization || 'Independent inventor'}</span>
        </p>
      )}

      {showMatchReason && matchReason && (
        <div className="mt-3 rounded-lg bg-emerald-50 p-2.5 text-sm leading-5 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300">
          <p>
            {patent.matchPercentage != null && <strong>{Math.round(patent.matchPercentage)}% fit. </strong>}
            {matchReason}
          </p>
          {onIgnore && (
            <button
              type="button"
              onClick={(e) => onIgnore(patent._id, e)}
              className="mt-2 text-xs font-medium text-emerald-900/70 underline-offset-2 hover:underline dark:text-emerald-200/80"
            >
              Not for me
            </button>
          )}
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <div>
          <p className="text-xs font-medium text-zinc-500">Commercial score</p>
          <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-zinc-950 dark:text-white">
            {score !== null ? `${Math.round(score)}` : '—'}
            {score !== null && <span className="text-sm font-medium text-zinc-400"> / 100</span>}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500">{priceLabel}</p>
          <p className="mt-1 text-base font-semibold leading-snug text-zinc-950 dark:text-white">{priceText}</p>
        </div>
      </div>

      <div className="mt-auto pt-4">
        {(hasTrl || offer) && (
          <p className="text-sm leading-5 text-zinc-500">
            {[hasTrl ? getTRLShortLabel(trl) : null, offer || null].filter(Boolean).join(' · ')}
          </p>
        )}
        <button
          type="button"
          onClick={() => onExplore(patent._id)}
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          View details
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
};
