import {
  dominantTopics,
  patentToSemanticDoc,
  scoreDocsForBuyer,
  type BuyerTasteProfile,
  type FitResult,
} from './semanticMatch';

export interface WeightedSearch {
  query: string;
  /** 1 = newest, decays toward 0 for older searches */
  recencyWeight: number;
  source?: string;
}

export interface UserPreferenceProfile {
  interests: string[];
  domains: string[];
  pastSearchQueries: string[];
  weightedSearches?: WeightedSearch[];
  savedPatentIds?: string[];
  affinityIndustries?: string[];
  affinityKeywords?: string[];
  engagedPatentIds?: string[];
  excludePatentIds?: string[];
  /** Explicit “not for me” */
  ignoredPatentIds?: string[];
  /** Opened several times with no save/enquire */
  openedWithoutEngageIds?: string[];
}

export type MatchRail = 'forYou' | 'fromSearches' | 'fromSaves' | 'inYourDomains' | 'trending';

export interface FeaturedMatchResult {
  patent: any;
  analysis: any | null;
  /** Fit only — never commercial quality. */
  matchPercentage: number;
  matchReasons: string[];
  whyChips: string[];
  primarySignal: 'interest' | 'search' | 'domain' | 'save' | 'engagement' | 'commercial';
  scoreBreakdown: {
    domain: number;
    interest: number;
    search: number;
    saveAffinity: number;
    engagement: number;
    commercial: number;
    quality: number;
    phraseBonus: number;
    fit: number;
  };
}

function hasPersonalSignal(profile: UserPreferenceProfile): boolean {
  return !!(
    profile.domains?.length ||
    profile.interests?.length ||
    profile.weightedSearches?.length ||
    profile.pastSearchQueries?.length ||
    profile.savedPatentIds?.length ||
    profile.engagedPatentIds?.length ||
    profile.affinityKeywords?.length ||
    profile.affinityIndustries?.length
  );
}

function primaryFromReasons(reasons: string[]): FeaturedMatchResult['primarySignal'] {
  const text = reasons.join(' ').toLowerCase();
  if (text.includes('search')) return 'search';
  if (text.includes('interest')) return 'interest';
  if (text.includes('domain') || text.includes('focus')) return 'domain';
  if (text.includes('saved') || text.includes('save')) return 'save';
  if (text.includes('enquir') || text.includes('unlock')) return 'engagement';
  return 'interest';
}

/**
 * Personalized Discover ranker.
 * Match % = semantic fit to the buyer only. Commercial score is not mixed in.
 */
export function rankFeaturedPatents(
  patents: any[],
  analysisMap: Map<string, any>,
  profile: UserPreferenceProfile,
  limit = 12
): FeaturedMatchResult[] {
  const excludeSet = new Set((profile.excludePatentIds || []).map(String));
  const savedSet = new Set((profile.savedPatentIds || []).map(String));
  const engagedSet = new Set((profile.engagedPatentIds || []).map(String));
  const personalized = hasPersonalSignal(profile);

  const docs = patents
    .filter((patent) => !excludeSet.has(String(patent._id)))
    .filter((patent) => !savedSet.has(String(patent._id)) && !engagedSet.has(String(patent._id)))
    .map((patent) => ({ patent, analysis: analysisMap.get(String(patent._id)) || null }));

  // Guests / cold start: no personal match %. Rank by commercial for browsing only.
  if (!personalized) {
    return docs
      .map(({ patent, analysis }) => {
        const commercial = analysis?.commercialPotentialScore ?? 50;
        return {
          patent,
          analysis,
          matchPercentage: 0,
          matchReasons: [] as string[],
          whyChips: [] as string[],
          primarySignal: 'commercial' as const,
          scoreBreakdown: {
            domain: 0,
            interest: 0,
            search: 0,
            saveAffinity: 0,
            engagement: 0,
            commercial: Math.round(commercial),
            quality: 0,
            phraseBonus: 0,
            fit: 0,
          },
        };
      })
      .sort(
        (a, b) =>
          (b.analysis?.commercialPotentialScore ?? 0) - (a.analysis?.commercialPotentialScore ?? 0)
      )
      .slice(0, limit);
  }

  const weightedSearches: WeightedSearch[] =
    profile.weightedSearches && profile.weightedSearches.length > 0
      ? profile.weightedSearches
      : (profile.pastSearchQueries || []).map((query, idx, arr) => ({
          query,
          recencyWeight: 1 - idx / Math.max(arr.length, 1),
        }));

  const positiveDocs = [
    ...(profile.savedPatentIds || []),
    ...(profile.engagedPatentIds || []),
  ]
    .map(String)
    .filter((id, index, all) => all.indexOf(id) === index)
    .slice(0, 30)
    .map((id) => {
      const patent = patents.find((row) => String(row._id) === id);
      if (!patent) return null;
      return patentToSemanticDoc(patent, analysisMap.get(id) || null);
    })
    .filter(Boolean) as ReturnType<typeof patentToSemanticDoc>[];

  const taste: BuyerTasteProfile = {
    interests: profile.interests || [],
    domains: profile.domains || [],
    searches: weightedSearches.map((row) => ({
      query: row.query,
      weight: Math.max(0.2, row.recencyWeight),
    })),
    positiveDocs,
    ignoredPatentIds: profile.ignoredPatentIds || [],
    openedWithoutEngageIds: profile.openedWithoutEngageIds || [],
  };

  const fits = scoreDocsForBuyer(taste, docs);
  const fitById = new Map(fits.map((row) => [row.patentId, row]));

  const scored: FeaturedMatchResult[] = [];
  for (const { patent, analysis } of docs) {
    const id = String(patent._id);
    const fit = fitById.get(id);
    if (!fit || fit.fitScore < 28) continue;

    const matchReasons = [...fit.reasonHints];
    if (fit.fitScore >= 72) matchReasons.unshift('Strong match for you');
    const whyChips = [
      ...fit.topicOverlap.slice(0, 2).map((topic) => `Focus: ${topic}`),
      ...(fit.reasonHints[0] ? [fit.reasonHints[0].slice(0, 42)] : []),
    ].slice(0, 4);

    scored.push({
      patent,
      analysis,
      matchPercentage: fit.fitScore,
      matchReasons: matchReasons.slice(0, 4),
      whyChips: [...new Set(whyChips)].slice(0, 4),
      primarySignal: primaryFromReasons(matchReasons),
      scoreBreakdown: {
        domain: fit.topicOverlap.length ? 12 : 0,
        interest: matchReasons.some((line) => /interest/i.test(line)) ? 14 : 0,
        search: matchReasons.some((line) => /search/i.test(line)) ? 16 : 0,
        saveAffinity: positiveDocs.length ? 8 : 0,
        engagement: (profile.engagedPatentIds || []).length ? 6 : 0,
        commercial: 0,
        quality: 0,
        phraseBonus: 0,
        fit: fit.fitScore,
      },
    });
  }

  return scored
    .sort((a, b) => {
      if (b.matchPercentage !== a.matchPercentage) return b.matchPercentage - a.matchPercentage;
      // Commercial only breaks ties — never inflates the match %.
      return (
        (b.analysis?.commercialPotentialScore ?? 0) - (a.analysis?.commercialPotentialScore ?? 0)
      );
    })
    .slice(0, limit);
}

/** Split ranked results into buyer-facing rails. */
export function buildFeaturedRails(
  ranked: FeaturedMatchResult[],
  profile: UserPreferenceProfile
): Record<MatchRail, FeaturedMatchResult[]> {
  const hasSearches =
    (profile.weightedSearches?.length || profile.pastSearchQueries?.length || 0) > 0;
  const hasInterests = (profile.interests?.length || 0) > 0 || (profile.domains?.length || 0) > 0;
  const hasSaves = (profile.savedPatentIds?.length || 0) > 0 || (profile.affinityKeywords?.length || 0) > 0;

  const forYou = ranked.filter((row) => row.matchPercentage >= 55).slice(0, 8);
  const fromSearches = hasSearches
    ? ranked.filter((row) => row.primarySignal === 'search' || row.scoreBreakdown.search >= 8).slice(0, 6)
    : [];
  const fromSaves = hasSaves
    ? ranked
        .filter((row) => row.primarySignal === 'save' || row.scoreBreakdown.saveAffinity >= 6)
        .slice(0, 6)
    : [];
  const inYourDomains = hasInterests
    ? ranked
        .filter(
          (row) =>
            row.primarySignal === 'domain' ||
            row.primarySignal === 'interest' ||
            row.scoreBreakdown.domain >= 8
        )
        .slice(0, 6)
    : [];
  const used = new Set(
    [...forYou, ...fromSearches, ...fromSaves, ...inYourDomains].map((row) => String(row.patent._id))
  );
  const trending = ranked.filter((row) => !used.has(String(row.patent._id))).slice(0, 6);

  return { forYou, fromSearches, fromSaves, inYourDomains, trending };
}

/** Extract interest tags from a search query to auto-grow buyer taste. */
export function extractInterestHintsFromQuery(query: string): string[] {
  const q = query.toLowerCase();
  const hints: string[] = [];
  for (const topic of dominantTopics(query, 3)) hints.push(topic);
  for (const phrase of [
    'edge ai',
    'drug delivery',
    'medical imaging',
    'smart home',
    'battery storage',
    'clean energy',
    'iot security',
    'language model',
    'wind turbine',
    'data privacy',
  ]) {
    if (q.includes(phrase)) hints.push(phrase);
  }
  return [...new Set(hints)].slice(0, 8);
}

export type { FitResult };
