import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import {
  Building,
  FileText,
  ExternalLink,
  CheckCircle2,
  Lock,
  MessageSquare,
  Calendar,
  Cpu,
  TrendingUp,
  Lightbulb,
  Sparkles,
} from 'lucide-react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { inferAssetType, inferTRL, formatINR, getTRLShortLabel, getTRLDescription } from '../../constants/ip';
import { getCommercialPotentialLabel, getCommercialBreakdown } from '../../utils/patentAnalysis';
import { cn } from '../../utils/cn';
import { contentSwap, springSnappy, transition } from '../../utils/motion';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'commercial', label: 'Commercial' },
  { id: 'technical', label: 'Technical' },
  { id: 'ai', label: 'AI Insights' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

interface IPDetailViewProps {
  patent: any;
  isUnlocked: boolean;
  score: number;
  readiness: { label: string };
  breakdown: ReturnType<typeof getCommercialBreakdown>;
  radarData: { subject: string; value: number; fullMark: number }[];
  strokeDashoffset: number;
  circumference: number;
  normalizedRadius: number;
  stroke: number;
  scoreClass: string;
  onUnlockClick: () => void;
  onBookMeeting: () => void;
  onMakeOffer: () => void;
  onAskQuestion: () => void;
  accessPending?: boolean;
  accessRejected?: boolean;
  hasExpressedInterest?: boolean;
  onCompleteUnlock?: () => void;
  completeUnlockLoading?: boolean;
}

function inferIndustryMatch(analysis: any): number {
  if (!analysis) return 0;
  const industries = analysis.commercialApplications?.potentialIndustries?.length ?? 0;
  const buyers = analysis.potentialBuyers?.length ?? 0;
  const base = analysis.commercialPotentialScore ?? 50;
  return Math.min(98, Math.round(base * 0.6 + industries * 4 + buyers * 3));
}

function licensingRecommendation(analysis: any): string {
  if (!analysis) return 'Run AI analysis for licensing guidance.';
  const score = analysis.commercialPotentialScore ?? 50;
  if (score >= 85) return 'Strong candidate for exclusive licensing or strategic acquisition.';
  if (score >= 70) return 'Suitable for non-exclusive licensing with sector-focused partners.';
  return 'Early-stage IP — consider collaborative R&D or pilot licensing before full transfer.';
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800/80 last:border-0">
      <span className="text-sm text-zinc-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 text-right">{value}</span>
    </div>
  );
}

export const IPDetailView: React.FC<IPDetailViewProps> = ({
  patent,
  isUnlocked,
  score,
  readiness,
  radarData,
  strokeDashoffset,
  circumference,
  normalizedRadius,
  stroke,
  scoreClass,
  onUnlockClick,
  onBookMeeting,
  onMakeOffer,
  onAskQuestion,
  accessPending,
  accessRejected,
  hasExpressedInterest,
  onCompleteUnlock,
  completeUnlockLoading,
}) => {
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const assetType = inferAssetType(patent);
  const trl = inferTRL(patent, patent.analysis);
  const industryMatch = inferIndustryMatch(patent.analysis);
  const analysis = patent.analysis;

  const industries = analysis?.industryClassification?.slice(0, 2) ?? [];
  const metaLine = [
    patent.ownerOrganization,
    assetType,
    getTRLShortLabel(trl),
    formatINR(patent.askingPrice),
    score > 0 ? getCommercialPotentialLabel(score) : null,
    ...industries,
  ]
    .filter(Boolean)
    .join(' · ');

  const unlockCta = accessPending ? (
    <span className="text-sm text-zinc-500">Awaiting inventor approval</span>
  ) : accessRejected ? (
    <span className="text-sm text-red-600">Access declined</span>
  ) : hasExpressedInterest && onCompleteUnlock ? (
    <Button onClick={onCompleteUnlock} isLoading={completeUnlockLoading} size="sm" className="rounded-full px-5">
      Complete unlock request
    </Button>
  ) : (
    <Button onClick={onUnlockClick} size="sm" className="rounded-full px-5 gap-1.5">
      <Lock className="h-3.5 w-3.5" />
      Unlock details
    </Button>
  );

  const lockedBanner = !isUnlocked && (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={transition}
      className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <div className="flex items-start gap-3 min-w-0">
        <div className="shrink-0 w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          <Lock className="h-4 w-4 text-zinc-500" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-900 dark:text-white">Full profile requires NDA approval</p>
          <p className="text-sm text-zinc-500 mt-0.5 leading-relaxed">
            Executive summary, commercial analysis, and registry documents unlock after inventor review.
          </p>
        </div>
      </div>
      <div className="shrink-0 sm:pl-4">{unlockCta}</div>
    </motion.div>
  );

  const sidebar = (
    <aside className="space-y-8 lg:sticky lg:top-28">
      <div>
        <div className="flex items-center gap-4 mb-1">
          <div className="relative h-16 w-16 shrink-0">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle className="text-zinc-100 dark:text-zinc-800" strokeWidth={stroke} stroke="currentColor" fill="transparent" r={normalizedRadius} cx={50} cy={50} />
              <circle
                className={scoreClass}
                strokeWidth={stroke}
                strokeDasharray={`${circumference} ${circumference}`}
                style={{ strokeDashoffset }}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r={normalizedRadius}
                cx={50}
                cy={50}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-semibold text-zinc-900 dark:text-white">{score}</span>
            </div>
          </div>
          <div>
            <p className="text-sm text-zinc-500">Commercial potential</p>
            <p className="text-sm font-medium text-zinc-900 dark:text-white">
              {readiness.label} licensing potential
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-0">
        <MetaRow label="Asking price" value={formatINR(patent.askingPrice)} />
        <MetaRow
          label="Deal type"
          value={
            <span className="text-zinc-600 dark:text-zinc-400">
              {[patent.isForLicense && 'License', patent.isForSale && 'Acquire'].filter(Boolean).join(' · ') || '—'}
            </span>
          }
        />
        <MetaRow label="Inventor" value={patent.ownerName} />
        <MetaRow
          label="Institution"
          value={
            <span className="inline-flex items-center gap-1">
              <Building className="h-3.5 w-3.5 text-zinc-400" />
              {patent.ownerOrganization || '—'}
            </span>
          }
        />
        <MetaRow label="Patent no." value={<span className="font-mono text-xs">{patent.patentNumber}</span>} />
      </div>

      {isUnlocked && (patent.isForSale || patent.isForLicense) && (
        <Button className="w-full rounded-full" onClick={onMakeOffer}>
          Make offer
        </Button>
      )}

      {isUnlocked && (
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <button type="button" onClick={onAskQuestion} className="text-primary hover:underline inline-flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            Ask question
          </button>
          <button type="button" onClick={onBookMeeting} className="text-primary hover:underline inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Book meeting
          </button>
        </div>
      )}

      {isUnlocked && analysis && (
        <div className="pt-2">
          <p className="text-sm text-zinc-500 mb-3">AI breakdown</p>
          <div className="h-44 w-full -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                <PolarGrid stroke="rgba(113,113,122,0.12)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 9 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="value" stroke="#4a90e2" fill="#4a90e2" fillOpacity={0.15} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </aside>
  );

  const sectionContent = () => {
    if (!isUnlocked) {
      return (
        <div className="space-y-8">
          <div>
            <p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">{patent.abstract}</p>
          </div>
          {lockedBanner}
        </div>
      );
    }

    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-8">
            {analysis?.summary && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">What it does</h2>
                  <p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">{analysis.summary.description}</p>
                </div>
                <div>
                  <h2 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">Problem solved</h2>
                  <p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">{analysis.summary.problemSolved}</p>
                </div>
                <div>
                  <h2 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">Innovation highlights</h2>
                  <p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">{analysis.summary.keyInnovation}</p>
                </div>
              </div>
            )}
            <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
              <h2 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">Registry abstract</h2>
              <p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">{patent.abstract}</p>
            </div>
          </div>
        );

      case 'commercial':
        return (
          <div className="space-y-8">
            {analysis?.marketOpportunity && (
              <div>
                <h2 className="text-lg font-medium text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-zinc-400" />
                  Market opportunity
                </h2>
                <p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">{analysis.marketOpportunity}</p>
              </div>
            )}
            {analysis?.commercialApplications && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-zinc-900 dark:text-white mb-3">Industry fit</h2>
                  <p className="text-sm text-zinc-500 mb-2">
                    {analysis.commercialApplications.potentialIndustries.join(' · ')}
                  </p>
                </div>
                <div>
                  <h3 className="text-base font-medium text-zinc-800 dark:text-zinc-200 mb-3">Use cases</h3>
                  <ul className="space-y-2.5">
                    {analysis.commercialApplications.useCases.map((uc: string, i: number) => (
                      <li key={i} className="text-base text-zinc-600 dark:text-zinc-400 flex gap-2.5 leading-relaxed">
                        <span className="text-zinc-400 font-medium shrink-0">{i + 1}.</span>
                        {uc}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-base font-medium text-zinc-800 dark:text-zinc-200 mb-2">Competitive advantage</h3>
                  <p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {analysis.summary?.commercialValue || analysis.commercialApplications.adoptionOpportunities?.[0]}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {analysis.commercialApplications.adoptionOpportunities?.map((op: string, i: number) => (
                      <li key={i} className="text-base text-zinc-600 dark:text-zinc-400 flex gap-2 leading-relaxed">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        {op}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {analysis?.potentialBuyers?.length > 0 && (
              <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
                <h2 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">Potential acquirers</h2>
                <p className="text-base text-zinc-600 dark:text-zinc-400">{analysis.potentialBuyers.join(' · ')}</p>
              </div>
            )}
          </div>
        );

      case 'technical':
        return (
          <div className="space-y-8">
            <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-5 text-sm">
              <div>
                <dt className="text-zinc-500">Technology maturity</dt>
                <dd className="font-medium text-zinc-900 dark:text-white mt-1" title={getTRLDescription(trl)}>
                  {getTRLShortLabel(trl)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Asset type</dt>
                <dd className="font-medium text-zinc-900 dark:text-white mt-1">{assetType}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Patent status</dt>
                <dd className="font-medium text-emerald-600 mt-1">Verified / Active</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Filing reference</dt>
                <dd className="font-mono text-zinc-800 dark:text-zinc-200 mt-1">{patent.patentNumber}</dd>
              </div>
            </dl>
            <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-zinc-900 dark:text-white flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-zinc-400" />
                  Document preview
                </h2>
                {patent.pdfUrl && (
                  <a href={patent.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                    Download PDF <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 bg-zinc-50/80 dark:bg-zinc-900/40 text-center">
                <FileText className="h-9 w-9 text-zinc-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Official filing documentation</p>
                <p className="text-xs text-zinc-400 font-mono mt-1">{patent.patentNumber}</p>
              </div>
            </div>
            {analysis?.keywords && (
              <div>
                <h2 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">Technology keywords</h2>
                <p className="text-sm text-zinc-500 font-mono">{analysis.keywords.map((kw: string) => `#${kw}`).join('  ')}</p>
              </div>
            )}
          </div>
        );

      case 'ai':
        return (
          <div className="space-y-8">
            <div className="grid sm:grid-cols-3 gap-6">
              <div>
                <Lightbulb className="h-4 w-4 text-zinc-400 mb-2" />
                <p className="text-sm text-zinc-500">Commercial potential</p>
                <p className="text-2xl font-semibold text-zinc-900 dark:text-white mt-0.5">{score}<span className="text-sm font-normal text-zinc-400">/100</span></p>
              </div>
              <div>
                <TrendingUp className="h-4 w-4 text-zinc-400 mb-2" />
                <p className="text-sm text-zinc-500">Industry match</p>
                <p className="text-2xl font-semibold text-zinc-900 dark:text-white mt-0.5">{industryMatch}%</p>
              </div>
              <div>
                <Sparkles className="h-4 w-4 text-zinc-400 mb-2" />
                <p className="text-sm text-zinc-500">Licensing recommendation</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">{licensingRecommendation(analysis)}</p>
              </div>
            </div>
            {!analysis && (
              <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 rounded-xl px-4 py-3">
                AI analysis pending — ask admin to re-analyze.
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <p className="text-sm text-zinc-500 mb-6 leading-relaxed">{metaLine}</p>

      {isUnlocked && (
        <nav className="flex gap-1 mb-8 -mx-1 overflow-x-auto">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSection(s.id)}
              className={cn(
                'relative px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors',
                activeSection === s.id
                  ? 'text-white dark:text-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              )}
            >
              {activeSection === s.id && (
                <motion.span
                  layoutId="ip-detail-tab"
                  className="absolute inset-0 bg-zinc-900 dark:bg-white rounded-full -z-10"
                  transition={springSnappy}
                />
              )}
              {s.label}
            </button>
          ))}
        </nav>
      )}

      <div className="grid lg:grid-cols-[1fr_240px] gap-10 lg:gap-16 items-start">
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={isUnlocked ? activeSection : 'locked'}
              variants={contentSwap}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={transition}
            >
              {sectionContent()}
            </motion.div>
          </AnimatePresence>
        </div>
        {sidebar}
      </div>
    </div>
  );
};
