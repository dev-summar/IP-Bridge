export function getCommercialScore(analysis: any): number {
  const score = analysis?.commercialPotentialScore;
  return typeof score === 'number' && !Number.isNaN(score) ? score : 50;
}

export function getMarketReadiness(score: number) {
  if (score >= 85) {
    return {
      label: 'High',
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/20 dark:border-emerald-900/30'
    };
  }
  if (score >= 70) {
    return {
      label: 'Medium',
      color: 'text-lvx-blue bg-lvx-blue/10 border-lvx-blue/20'
    };
  }
  return {
    label: 'Low',
    color: 'text-zinc-600 bg-zinc-50 border-zinc-200 dark:text-zinc-400 dark:bg-zinc-950/10 dark:border-zinc-800'
  };
}

/** Plain-language commercial potential for list views (avoids raw "Score 87"). */
export function getCommercialPotentialLabel(score: number): string {
  if (score >= 85) return 'High licensing potential';
  if (score >= 70) return 'Good licensing potential';
  if (score >= 55) return 'Emerging potential';
  return 'Early-stage potential';
}

/** Tooltip text pairing score number with meaning. */
export function getCommercialPotentialDescription(score: number): string {
  return `AI commercial score ${score}/100 — ${getCommercialPotentialLabel(score).toLowerCase()}`;
}

export function getCommercialBreakdown(analysis: any) {
  if (analysis?.commercialBreakdown) {
    return analysis.commercialBreakdown;
  }
  const score = getCommercialScore(analysis);
  const clamp = (v: number) => Math.min(100, Math.max(0, Math.round(v)));
  return {
    technicalFeasibility: clamp(score * 0.95),
    marketDemand: clamp(score * 1.02),
    implementationSpeed: clamp(score * 0.88),
    licensingValue: clamp(score * 0.98),
    ipProtection: clamp(score * 0.94)
  };
}

export function isLockedAnalysisField(value: string | undefined | null): boolean {
  if (!value) return true;
  return value.startsWith('Locked.') || value.includes('Request access to unlock');
}
