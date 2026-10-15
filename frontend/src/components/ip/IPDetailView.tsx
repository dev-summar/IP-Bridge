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
  ArrowRight,
  Clock3,
  ShieldCheck,
  Layers3,
  Handshake,
} from 'lucide-react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { inferAssetType, formatINR, getTRLShortLabel, getTRLDescription } from '../../constants/ip';
import { getCommercialPotentialLabel, getCommercialBreakdown } from '../../utils/patentAnalysis';
import { cn } from '../../utils/cn';
import { contentSwap, transition } from '../../utils/motion';

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
  viewerLabel?: string;
}

function licensingRecommendation(analysis: any): string {
  if (typeof analysis?.commercialPotentialScore !== 'number' || !Number.isFinite(analysis.commercialPotentialScore)) return 'No commercial assessment is available yet.';
  const score = analysis.commercialPotentialScore;
  if (score >= 85) return 'Strong candidate for exclusive licensing or strategic acquisition.';
  if (score >= 70) return 'Suitable for non-exclusive licensing with sector-focused partners.';
  return 'Early-stage IP — consider collaborative R&D or pilot licensing before full transfer.';
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-5 py-3 border-b border-slate-100 dark:border-zinc-800 last:border-0">
      <dt className="text-[13px] text-slate-500 dark:text-zinc-400 shrink-0">{label}</dt>
      <dd className="min-w-0 break-words text-[13px] font-medium text-slate-800 dark:text-zinc-100 text-right">{value}</dd>
    </div>
  );
}

export const IPDetailView: React.FC<IPDetailViewProps> = ({
  patent,
  isUnlocked,
  score,
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
  viewerLabel,
}) => {
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const tabPrefix = React.useId();
  const assetType = inferAssetType(patent);
  const analysis = patent.analysis;
  const trl = patent.trlLevel || analysis?.readinessAssessment?.trlLevel;
  const hasScore = typeof analysis?.commercialPotentialScore === 'number' && Number.isFinite(analysis.commercialPotentialScore);

  const industries: string[] = analysis?.industryClassification?.slice(0, 3) ?? [];
  const cardClass = 'rounded-2xl border border-slate-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900';
  const actionClass = 'w-full gap-2 rounded-xl bg-blue-600 px-5 py-3 text-[14px] text-white shadow-none hover:bg-blue-700';
  const accessState = accessPending ? 'Approval pending' : accessRejected ? 'Access declined' : isUnlocked ? viewerLabel || 'Full access' : 'NDA required';

  const unlockCta = accessPending ? (
    <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30">
      <p className="flex items-center gap-2 text-[13px] font-semibold text-amber-900 dark:text-amber-200"><Clock3 className="h-4 w-4 shrink-0" />Awaiting inventor approval</p>
      <p className="mt-1 text-[12px] leading-relaxed text-amber-800 dark:text-amber-300">Your request is with the inventor. Full details unlock after approval.</p>
    </div>
  ) : accessRejected ? (
    <div role="status" className="rounded-xl bg-red-50 p-4 text-[13px] text-red-700 dark:bg-red-950/30 dark:text-red-300">The inventor declined this access request.</div>
  ) : hasExpressedInterest && onCompleteUnlock ? (
    <Button onClick={onCompleteUnlock} isLoading={completeUnlockLoading} className={actionClass}>Complete unlock request<ArrowRight className="h-4 w-4" /></Button>
  ) : (
    <Button onClick={onUnlockClick} className={actionClass}>Unlock details<ArrowRight className="h-4 w-4" /></Button>
  );

  const accessSteps = [
    { title: 'Share your interest', description: 'Tell the inventor how you plan to use the IP.' },
    { title: 'Accept the NDA', description: 'Review the terms and record your consent.' },
    { title: 'Inventor approves', description: 'Access the complete profile and documents.' },
  ];

  const lockedBanner = (
    <section className={`${cardClass} overflow-hidden`} aria-labelledby="profile-access-heading">
      <div className="border-b border-blue-100 bg-blue-50/60 px-5 py-6 sm:px-7 dark:border-zinc-800 dark:bg-blue-950/20">
        <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-white text-blue-600 dark:border-blue-900 dark:bg-zinc-900 dark:text-blue-400"><Lock className="h-5 w-5" /></span>
        <h2 id="profile-access-heading" className="text-[20px] font-semibold tracking-tight text-slate-900 dark:text-white">Explore the full opportunity</h2>
        <p className="mt-2 max-w-lg text-[14px] leading-relaxed text-slate-600 dark:text-zinc-400">Full profile requires NDA approval. Access the information you need to evaluate this IP after inventor review.</p>
      </div>
      <div className="px-5 py-6 sm:px-7">
        <div className="grid gap-5 sm:grid-cols-3">
          {[
            { icon: FileText, title: 'Technology brief', detail: 'Full abstract and innovation details' },
            { icon: TrendingUp, title: 'Commercial insights', detail: 'Available AI analysis and use cases' },
            { icon: ShieldCheck, title: 'Official documents', detail: 'Available grant and registry files' },
          ].map(({ icon: Icon, title, detail }) => (
            <div key={title} className="flex items-start gap-3 sm:block">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-slate-400 sm:mb-3 dark:text-zinc-500" />
              <div><h3 className="text-[13px] font-semibold text-slate-800 dark:text-zinc-200">{title}</h3><p className="mt-1 text-[12px] leading-relaxed text-slate-500 dark:text-zinc-400">{detail}</p></div>
            </div>
          ))}
        </div>
        <div className="mt-7 border-t border-slate-100 pt-5 dark:border-zinc-800">
          <h3 className="text-[12px] font-semibold text-slate-700 dark:text-zinc-300">How access works</h3>
          <ol className="mt-4 grid gap-4 sm:grid-cols-3">
            {accessSteps.map((step, index) => (
              <li key={step.title} className="flex gap-3 sm:block">
                <span className="mb-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">{index + 1}</span>
                <div><p className="text-[12px] font-medium text-slate-800 dark:text-zinc-200">{step.title}</p><p className="mt-1 text-[12px] leading-relaxed text-slate-500 dark:text-zinc-400">{step.description}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );

  const sidebar = (
    <aside aria-label="Opportunity details and actions" className="min-w-0 space-y-4 lg:sticky lg:top-24">
      <section className={`${cardClass} p-5 sm:p-6`} aria-labelledby="opportunity-heading">
        <h2 id="opportunity-heading" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-zinc-400">Opportunity at a glance</h2>
        <p className="mt-5 text-[12px] text-slate-500 dark:text-zinc-400">Asking price</p>
        <p className={cn('mt-1 break-words font-semibold tracking-tight text-slate-900 dark:text-white', patent.askingPrice ? 'text-[30px] leading-tight' : 'text-[22px]')}>{formatINR(patent.askingPrice)}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {patent.isForLicense && <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"><Handshake className="h-3.5 w-3.5" />Licensing</span>}
          {patent.isForSale && <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:bg-zinc-800 dark:text-zinc-300"><Layers3 className="h-3.5 w-3.5" />Acquisition</span>}
        </div>
        <div className={cn('mt-6', !isUnlocked && 'fixed inset-x-0 bottom-0 z-30 mt-0 border-t border-slate-200 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-lg dark:border-zinc-800 dark:bg-zinc-900/95 lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none dark:lg:bg-transparent')}>
          {!isUnlocked ? unlockCta : (patent.isForSale || patent.isForLicense) ? <Button className={actionClass} onClick={onMakeOffer}>Make offer<ArrowRight className="h-4 w-4" /></Button> : null}
          {!isUnlocked && !accessPending && !accessRejected && <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 dark:text-zinc-400"><Lock className="h-3 w-3" />NDA and inventor approval required</p>}
        </div>
      </section>
      <section className={`${cardClass} p-5 sm:p-6`} aria-label="AI commercial assessment">
        <div className="mb-4 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-zinc-400"><Sparkles className="h-3.5 w-3.5" />AI commercial assessment</div>
        <div className="flex items-center gap-3">
          <div className="relative h-16 w-16 shrink-0" role="img" aria-label={hasScore ? `AI commercial score: ${score} out of 100` : 'AI commercial score not assessed'}>
            <svg aria-hidden="true" className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle className="text-slate-100 dark:text-zinc-800" strokeWidth={stroke} stroke="currentColor" fill="transparent" r={normalizedRadius} cx={50} cy={50} />
              {hasScore && <circle className={scoreClass} strokeWidth={stroke} strokeDasharray={`${circumference} ${circumference}`} style={{ strokeDashoffset }} strokeLinecap="round" stroke="currentColor" fill="transparent" r={normalizedRadius} cx={50} cy={50} />}
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[20px] font-semibold tabular-nums text-slate-900 dark:text-white">{hasScore ? score : '—'}</span>
          </div>
          <div><p className="text-[13px] font-semibold leading-snug text-slate-800 dark:text-zinc-100">{hasScore ? getCommercialPotentialLabel(score) : 'Not assessed'}</p><p className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400">{hasScore ? 'AI estimate · scored out of 100' : 'No assessment is available yet'}</p></div>
        </div>
        {isUnlocked && analysis?.commercialBreakdown && <div className="mt-5 h-44 border-t border-slate-100 pt-4 dark:border-zinc-800"><ResponsiveContainer width="100%" height="100%"><RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}><PolarGrid stroke="rgba(113,113,122,0.12)" /><PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 9 }} /><PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} /><Radar dataKey="value" stroke="#4a90e2" fill="#4a90e2" fillOpacity={0.15} /></RadarChart></ResponsiveContainer></div>}
      </section>
      <section className={`${cardClass} p-5 sm:p-6`} aria-label="Listing details">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-zinc-400">Listing details</h2>
        <dl className="mt-2">
          <MetaRow label="IP type" value={assetType} />
          <MetaRow label="Inventor" value={patent.ownerName || 'Not provided'} />
          <MetaRow label="Institution" value={patent.ownerOrganization || 'Independent'} />
          <MetaRow label="Reference" value={<span className="font-mono text-[11px]">{!isUnlocked ? <span className="inline-flex items-center gap-1 text-slate-400"><Lock className="h-3 w-3" />Private</span> : patent.patentNumber || 'Not provided'}</span>} />
        </dl>
        {isUnlocked && (
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 dark:border-zinc-800">
            <button type="button" onClick={onAskQuestion} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg text-[12px] font-medium text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-zinc-800"><MessageSquare className="h-3.5 w-3.5" />Ask question</button>
            <button type="button" onClick={onBookMeeting} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg text-[12px] font-medium text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-zinc-800"><Calendar className="h-3.5 w-3.5" />Book meeting</button>
          </div>
        )}
      </section>
    </aside>
  );

  const sectionContent = () => {
    if (!isUnlocked) {
      return (
        <div className="space-y-5">
          <section className={`${cardClass} p-5 sm:p-7`} aria-labelledby="technology-overview-heading">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-zinc-500">Public preview</p>
            <h2 id="technology-overview-heading" className="text-[18px] font-semibold text-slate-900 dark:text-white">Technology overview</h2>
            <p className="mt-3 text-[15px] leading-[1.85] text-slate-600 dark:text-zinc-300">{patent.abstract || 'The inventor has not provided a public summary yet.'}</p>
          </section>
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
                <dd className="font-medium text-zinc-900 dark:text-white mt-1" title={trl ? getTRLDescription(trl) : undefined}>
                  {trl ? getTRLShortLabel(trl) : 'Not assessed'}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Asset type</dt>
                <dd className="font-medium text-zinc-900 dark:text-white mt-1">{assetType}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Official status</dt>
                <dd className="font-medium text-zinc-900 dark:text-white mt-1">{patent.registrationStatus === 'granted' ? 'Granted' : patent.registrationStatus === 'registered' ? 'Registered' : 'Not provided'}</dd>
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
                <p className="text-2xl font-semibold text-zinc-900 dark:text-white mt-0.5">{hasScore ? score : '—'}<span className="text-sm font-normal text-zinc-400">/100</span></p>
              </div>
              <div>
                <TrendingUp className="h-4 w-4 text-zinc-400 mb-2" />
                <p className="text-sm text-zinc-500">Industry focus</p>
                <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-white">{industries.join(' · ') || 'Not assessed'}</p>
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
    <div className={cn('space-y-7', !isUnlocked && 'pb-36 lg:pb-0')}>
      <header className="border-b border-slate-200/80 pb-7 dark:border-zinc-800">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-400"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" />IP opportunity</p>
          <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium', isUnlocked ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300' : accessPending ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300' : 'border-slate-200 bg-white text-slate-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300')}>
            {isUnlocked ? <CheckCircle2 className="h-3.5 w-3.5" /> : accessPending ? <Clock3 className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}{accessState}
          </span>
        </div>
        <h1 className="max-w-[850px] break-words text-[28px] font-semibold leading-[1.22] tracking-[-0.035em] text-slate-900 sm:text-[34px] lg:text-[38px] dark:text-white">{patent.title}</h1>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-[12px] font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"><Layers3 className="h-3.5 w-3.5" />{assetType}</span>
          {industries.map(industry => <span key={industry} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">{industry}</span>)}
          {trl && <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300" title={getTRLDescription(trl)}>{getTRLShortLabel(trl)}</span>}
        </div>
        <p className="mt-4 inline-flex items-center gap-2 text-[13px] text-slate-500 dark:text-zinc-400"><Building className="h-4 w-4 text-slate-400" />{patent.ownerOrganization || 'Independent inventor'}</p>
      </header>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-7">
        <div className="min-w-0 space-y-5">
          {isUnlocked ? (
            <section className={`${cardClass} overflow-hidden`}>
              <div className="overflow-x-auto border-b border-slate-100 px-3 pt-3 dark:border-zinc-800 sm:px-5">
                <div role="tablist" aria-label="IP information" className="flex min-w-max gap-1 pb-3">
                  {SECTIONS.map((section, index) => (
                    <button key={section.id} id={`${tabPrefix}-${section.id}`} role="tab" aria-selected={activeSection === section.id} aria-controls={`${tabPrefix}-panel`} tabIndex={activeSection === section.id ? 0 : -1} type="button"
                      onClick={() => setActiveSection(section.id)}
                      onKeyDown={event => {
                        let next = index;
                        if (event.key === 'ArrowRight') next = (index + 1) % SECTIONS.length;
                        else if (event.key === 'ArrowLeft') next = (index - 1 + SECTIONS.length) % SECTIONS.length;
                        else if (event.key === 'Home') next = 0;
                        else if (event.key === 'End') next = SECTIONS.length - 1;
                        else return;
                        event.preventDefault(); setActiveSection(SECTIONS[next].id);
                        document.getElementById(`${tabPrefix}-${SECTIONS[next].id}`)?.focus();
                      }}
                      className={cn('rounded-lg px-3 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500', activeSection === section.id ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white')}>{section.label}</button>
                  ))}
                </div>
              </div>
              <div id={`${tabPrefix}-panel`} role="tabpanel" aria-labelledby={`${tabPrefix}-${activeSection}`} tabIndex={0} className="p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:p-7">
                <AnimatePresence mode="wait"><motion.div key={activeSection} variants={contentSwap} initial="initial" animate="animate" exit="exit" transition={transition}>{sectionContent()}</motion.div></AnimatePresence>
              </div>
            </section>
          ) : sectionContent()}
        </div>
        {sidebar}
      </div>
    </div>
  );
};
