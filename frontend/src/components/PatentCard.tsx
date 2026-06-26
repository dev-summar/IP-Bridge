import React, { useState } from 'react';
import { 
  ArrowRight, Bookmark, BookmarkCheck, ShieldCheck, 
  Sparkles, TrendingUp, Award, Building, User,
  Calendar, Compass, ArrowUpRight, Target, ChevronDown, ChevronUp, Lock,
  Mail, RefreshCw, AlertCircle
} from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { getCommercialScore, getMarketReadiness, isLockedAnalysisField } from '../utils/patentAnalysis';

interface PatentCardProps {
  patent: any;
  isSaved: boolean;
  onToggleBookmark: (id: string, e: React.MouseEvent) => void;
  onExplore: (id: string) => void;
  showMatchReason?: boolean;
}

export const PatentCard: React.FC<PatentCardProps> = ({
  patent,
  isSaved,
  onToggleBookmark,
  onExplore,
  showMatchReason = false
}) => {
  const [expanded, setExpanded] = useState(false);

  const getFilingStatus = (patentNumber: string) => {
    if (patentNumber.endsWith('-B1') || patentNumber.endsWith('-B2') || patentNumber.includes('B2') || patentNumber.includes('B1')) {
      return 'Granted';
    }
    return 'Published';
  };

  const getArrayField = (field: any): string[] => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === 'string') {
      if (field.includes(',')) {
        return field.split(',').map(s => s.trim()).filter(Boolean);
      }
      return field.split(/\s{2,}|,\s*/).map(s => s.trim()).filter(Boolean);
    }
    return [];
  };

  const getStringField = (field: any, fallback = ''): string => {
    if (!field) return fallback;
    if (typeof field === 'string') return field;
    if (typeof field === 'object') {
      return field.description || field.problemSolved || JSON.stringify(field);
    }
    return String(field);
  };

  const analysis = patent.analysis;
  const isUnlocked = patent.accessStatus === 'approved';
  const score = getCommercialScore(analysis);
  const readiness = getMarketReadiness(score);
  const status = getFilingStatus(patent.patentNumber);

  // Extract fields safely
  const domainText = analysis?.industryClassification?.[0] || analysis?.industryClassification || 'Technology';
  const domain = getStringField(domainText, 'Technology');
  const firstDomainName = domain.split(/[\s&/]+/)[0];

  // Commercial fields — only use real AI data when unlocked (no fake fallbacks when locked)
  let potentialIndustries = getArrayField(analysis?.commercialApplications?.potentialIndustries);
  let potentialBuyers = getArrayField(analysis?.potentialBuyers);
  let adoptionOpportunities = getArrayField(analysis?.commercialApplications?.adoptionOpportunities);

  let useCase = '';

  if (isUnlocked) {
    const useCases = getArrayField(analysis?.commercialApplications?.useCases);
    if (adoptionOpportunities.length === 0) {
      adoptionOpportunities = ['Licensing', 'Strategic Partnership', 'Technology Transfer'];
    }
    useCase = getStringField(useCases[0], 'Targeted technology deployment.');
  }

  const problemSolved = isUnlocked && !isLockedAnalysisField(analysis?.summary?.problemSolved)
    ? getStringField(analysis?.summary?.problemSolved)
    : '';
  const description = isUnlocked && !isLockedAnalysisField(analysis?.summary?.description)
    ? getStringField(analysis?.summary?.description, patent.abstract)
    : patent.abstract;
  const businessValue = isUnlocked && !isLockedAnalysisField(analysis?.summary?.commercialValue)
    ? getStringField(analysis?.summary?.commercialValue)
    : '';
  const marketOpportunity = isUnlocked
    ? getStringField(analysis?.marketOpportunity)
    : '';

  return (
    <Card 
      onClick={() => onExplore(patent._id)}
      className="cursor-pointer hover:border-lvx-blue/40 dark:hover:border-zinc-700 hover:shadow-premium-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-card-foreground premium-transition flex flex-col justify-between p-0 overflow-hidden rounded-2xl text-left"
    >
      <div className="p-5 space-y-4">
        {/* SECTION 1 — Technology Snapshot */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2.5">
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-1.5">
              {patent.accessStatus !== 'approved' ? (
                <Badge variant="outline" className="px-2 py-0.5 text-[8px] font-bold text-amber-700 bg-amber-55/40 border border-amber-200 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-900/30 rounded-full flex items-center gap-0.5">
                  <Lock className="h-2.5 w-2.5" />
                  Locked
                </Badge>
              ) : (
                <Badge variant="success" className="px-2 py-0.5 text-[8px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-900/30 rounded-full flex items-center gap-0.5">
                  <ShieldCheck className="h-2.5 w-2.5" />
                  Verified
                </Badge>
              )}

              <Badge variant="outline" className="px-1.5 py-0.5 text-[8px] font-mono text-zinc-500 border-zinc-200 dark:text-zinc-400 dark:border-zinc-800 rounded">
                {status}
              </Badge>

              <span className="text-[8.5px] font-bold text-lvx-blue font-mono tracking-heading bg-lvx-blue/10 px-2 py-0.5 rounded">
                {firstDomainName} Domain
              </span>
            </div>

            {/* Patent Title */}
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 leading-snug group-hover:text-lvx-blue premium-transition line-clamp-2">
                {patent.title}
              </h3>
              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono block mt-0.5">Patent: {patent.patentNumber}</span>
            </div>
          </div>

          {/* Right scores */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="text-[10px] font-bold text-lvx-blue bg-lvx-blue/10 px-2 py-0.5 rounded font-sans whitespace-nowrap">
              Potential: {score}/100
            </span>
            <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded border ${readiness.color} whitespace-nowrap`}>
              Readiness: {readiness.label}
            </span>
          </div>
        </div>

        {/* SECTION 2 — Executive Summary (High-density 2x2 grid) / Summary Brief */}
        {patent.accessStatus === 'approved' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <div className="border-l border-zinc-200 dark:border-zinc-800 pl-2 text-xs">
              <span className="text-[8.5px] font-bold text-zinc-400 uppercase font-mono tracking-label">Problem Solved</span>
              <p className="text-zinc-700 dark:text-zinc-300 text-[11px] leading-snug mt-0.5 font-medium line-clamp-2">{problemSolved || '—'}</p>
            </div>
            <div className="border-l border-zinc-200 dark:border-zinc-800 pl-2 text-xs">
              <span className="text-[8.5px] font-bold text-zinc-400 uppercase font-mono tracking-label">Technology Solution</span>
              <p className="text-zinc-805 dark:text-zinc-200 text-[11px] leading-snug mt-0.5 font-medium line-clamp-2">{description}</p>
            </div>
            <div className="border-l border-zinc-200 dark:border-zinc-800 pl-2 text-xs">
              <span className="text-[8.5px] font-bold text-lvx-blue uppercase font-mono tracking-label">Business Value</span>
              <p className="text-lvx-charcoal/90 text-[11px] leading-snug mt-0.5 font-medium line-clamp-2">{businessValue}</p>
            </div>
            <div className="border-l border-zinc-200 dark:border-zinc-800 pl-2 text-xs">
              <span className="text-[8.5px] font-bold text-zinc-400 uppercase font-mono tracking-label">Primary Use Case</span>
              <p className="text-zinc-650 dark:text-zinc-400 text-[11px] leading-snug mt-0.5 font-medium line-clamp-2">{useCase}</p>
            </div>
          </div>
        ) : (
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 pl-2 text-xs space-y-1">
            <span className="text-[8.5px] font-bold text-zinc-400 uppercase font-mono tracking-label">Technology Summary</span>
            <p className="text-zinc-700 dark:text-zinc-300 text-[11.5px] leading-relaxed font-sans font-medium line-clamp-3">
              {patent.abstract}
            </p>
          </div>
        )}

        {/* Expandable Details Button */}
        <button 
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="w-full flex items-center justify-center gap-1 py-1.5 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/40 dark:hover:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-800/80 rounded-lg text-[10px] font-bold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 premium-transition"
        >
          <span>{expanded ? "Hide commercialization details" : "Show commercialization details"}</span>
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {/* SECTION 3 & 4 — Expanded Commercial Details */}
        {expanded && (
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-4 animate-fadeIn">
            {!isUnlocked ? (
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                <span>Request access to view AI commercialization brief, target buyers, and market opportunity.</span>
              </div>
            ) : (
              <>
            {/* Section 3 Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[8.5px] font-bold text-zinc-400 uppercase font-mono block">Potential Industries</span>
                <div className="flex flex-wrap gap-1">
                  {potentialIndustries.slice(0, 3).map((ind) => (
                    <Badge key={ind} variant="indigo" className="px-2 py-0.5 text-[8.5px] font-semibold bg-lvx-blue/10 text-lvx-blue border-0 rounded">{ind}</Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[8.5px] font-bold text-zinc-400 uppercase font-mono block">Potential Buyers</span>
                <div className="flex flex-wrap gap-1">
                  {potentialBuyers.slice(0, 3).map((buyer) => (
                    <Badge key={buyer} variant="outline" className="px-2 py-0.5 text-[8.5px] font-semibold text-zinc-600 border-zinc-200 dark:text-zinc-400 dark:border-zinc-800 rounded">{buyer}</Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[8.5px] font-bold text-zinc-400 uppercase font-mono block">Adoption Path</span>
                <div className="flex flex-wrap gap-1">
                  {adoptionOpportunities.slice(0, 3).map((path) => (
                    <Badge key={path} variant="neutral" className="px-2 py-0.5 text-[8.5px] font-bold text-zinc-800 bg-zinc-50 border border-zinc-200/60 dark:text-zinc-300 dark:bg-zinc-800 dark:border-zinc-800 rounded">{path}</Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 4 Market Opportunity Box */}
            <div className="bg-gradient-to-br from-lvx-blue/10 to-transparent dark:to-transparent border border-lvx-blue/20 p-3.5 rounded-xl text-left space-y-1">
              <div className="flex items-center gap-1 text-lvx-blue">
                <Target className="h-3.5 w-3.5 shrink-0" />
                <span className="text-[8px] font-bold uppercase font-mono tracking-label">Market Opportunity</span>
              </div>
              <p className="text-[10px] text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans font-medium">
                {marketOpportunity || 'Market opportunity summary will appear after AI analysis completes.'}
              </p>
            </div>
              </>
            )}
          </div>
        )}

        {/* Pricing & Availability Info */}
        <div className="flex items-center justify-between text-xs pt-1.5 border-t border-zinc-50 dark:border-zinc-800/50">
          <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
            Asking: {patent.askingPrice 
              ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(patent.askingPrice) 
              : 'Contact Owner'}
          </span>
          <div className="flex gap-1.5">
            {patent.isForSale && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450 border border-emerald-100/50 dark:border-emerald-900/30 rounded">
                Acquisition
              </span>
            )}
            {patent.isForLicense && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-lvx-blue/10 text-lvx-blue border border-lvx-blue/20 rounded">
                Licensing
              </span>
            )}
          </div>
        </div>

        {/* SECTION 5 — Inventor & Organization Footer Bar */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 pt-2 border-t border-zinc-50 dark:border-zinc-800/50">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3 text-zinc-400" />
            <span className="font-semibold text-zinc-700 dark:text-zinc-355">{patent.ownerName}</span>
          </div>
          <span className="text-zinc-300 dark:text-zinc-800">•</span>
          <div className="flex items-center gap-1">
            <Building className="h-3 w-3 text-zinc-400" />
            <span className="truncate max-w-[150px]">{patent.ownerOrganization || 'N/A'}</span>
          </div>
          <span className="text-zinc-300 dark:text-zinc-800">•</span>
          <div className="flex items-center gap-1 font-mono">
            <Calendar className="h-3 w-3 text-zinc-400" />
            <span>{analysis?.filingYear || 2021}</span>
          </div>
        </div>
      </div>

      {/* SECTION 6 — Actions Footer */}
      <div className="px-5 py-3.5 bg-zinc-50/50 dark:bg-zinc-900/40 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-4" onClick={(e) => e.stopPropagation()}>
        {/* Bookmark toggler */}
        <button
          onClick={(e) => onToggleBookmark(patent._id, e)}
          className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-400 hover:text-lvx-blue dark:hover:text-lvx-blue hover:border-zinc-300 dark:hover:border-zinc-700 premium-transition"
          title={isSaved ? "Saved" : "Save Technology"}
        >
          {isSaved ? (
            <BookmarkCheck className="h-3.5 w-3.5 text-lvx-blue fill-lvx-blue" />
          ) : (
            <Bookmark className="h-3.5 w-3.5" />
          )}
        </button>
        
        {/* CTAs */}
        <div className="flex items-center gap-2">
          {patent.accessStatus === 'approved' ? (
            <>
              {/* Tertiary CTA: View Technology */}
              <button
                onClick={() => onExplore(patent._id)}
                className="px-2 py-1 text-zinc-550 hover:text-lvx-blue dark:hover:text-lvx-blue text-[10px] font-bold premium-transition flex items-center gap-0.5"
              >
                <span>View</span>
                <ArrowUpRight className="h-3 w-3" />
              </button>

              {/* Secondary CTA: Request Discussion */}
              <button
                onClick={() => onExplore(patent._id)}
                className="px-2.5 py-1 rounded-md border border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-650 hover:text-zinc-850 dark:text-zinc-350 dark:hover:text-white text-[10px] font-bold premium-transition shadow-sm"
              >
                Request Discussion
              </button>

              {/* Primary CTA: Express Interest */}
              <button
                onClick={() => onExplore(patent._id)}
                className="px-3 py-1 rounded-md bg-lvx-blue hover:bg-lvx-blue-hover text-white text-[10px] font-bold flex items-center gap-1 shadow-sm premium-transition"
              >
                <span>Express Interest</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </>
          ) : (
            <button
              onClick={() => onExplore(patent._id)}
              className="px-3.5 py-1.5 rounded-md bg-lvx-blue hover:bg-lvx-blue-hover text-white text-[10px] font-bold flex items-center gap-1 shadow-sm premium-transition"
            >
              {!patent.hasExpressedInterest ? (
                <>
                  <Mail className="h-3 w-3" />
                  <span>Express Interest</span>
                </>
              ) : patent.accessStatus === 'none' ? (
                <>
                  <Lock className="h-3 w-3" />
                  <span>Request Unlock</span>
                </>
              ) : patent.accessStatus === 'pending' ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>Pending Approval</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3" />
                  <span>Access Declined</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </Card>
  );
};
