import {
  buildDuplicateDescriptionSet,
  isQualityPatentAnalysis,
} from './analysisQuality';

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'system', 'method', 'device', 'apparatus',
  'processing', 'about', 'from', 'this', 'that', 'new', 'into', 'using',
  'based', 'related', 'technology', 'technologies', 'patent', 'looking',
  'need', 'want', 'please', 'find', 'search',
]);

/** Soft synonym / related-term expansion so “battery” also hits energy storage etc. */
const TERM_EXPANSIONS: Record<string, string[]> = {
  ai: ['artificial', 'intelligence', 'neural', 'ml', 'machine', 'learning', 'model', 'inference'],
  healthcare: ['medical', 'clinical', 'pharma', 'hospital', 'patient', 'therapy', 'diagnostic'],
  medical: ['healthcare', 'clinical', 'diagnostic', 'imaging', 'patient'],
  battery: ['energy', 'storage', 'lithium', 'charging', 'cell', 'power'],
  energy: ['battery', 'solar', 'grid', 'renewable', 'power'],
  iot: ['sensor', 'embedded', 'edge', 'wireless', 'gateway'],
  robotics: ['robot', 'automation', 'actuator', 'drone', 'autonomous'],
  fintech: ['finance', 'payment', 'ledger', 'blockchain', 'banking'],
  agriculture: ['farming', 'crop', 'agri', 'soil', 'irrigation'],
  manufacturing: ['industrial', 'factory', 'assembly', 'production'],
  security: ['privacy', 'encryption', 'cyber', 'sovereignty', 'firewall'],
  footwear: ['gait', 'biomechanical', 'shoe', 'wearable'],
  imaging: ['radiology', 'scan', 'ct', 'mri', 'medical'],
};

export function tokenizePreferenceText(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,.\-/|_+]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

function expandTokens(tokens: string[]): string[] {
  const out = new Set<string>();
  for (const t of tokens) {
    out.add(t);
    const extras = TERM_EXPANSIONS[t];
    if (extras) extras.forEach((e) => out.add(e));
  }
  return [...out];
}

function phraseInHaystack(phrase: string, haystack: string): boolean {
  const p = phrase.toLowerCase().trim();
  if (p.length < 3) return false;
  return haystack.includes(p);
}

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
  /** Prefer this over flat queries when available */
  weightedSearches?: WeightedSearch[];
  savedPatentIds?: string[];
  /** Industries/keywords learned from saved + engaged patents */
  affinityIndustries?: string[];
  affinityKeywords?: string[];
  /** Patent IDs buyer already engaged with (interest/access/meeting) — boost similar */
  engagedPatentIds?: string[];
  /** Exclude own patents if any */
  excludePatentIds?: string[];
}

export type MatchRail = 'forYou' | 'fromSearches' | 'fromSaves' | 'inYourDomains' | 'trending';

export interface FeaturedMatchResult {
  patent: any;
  analysis: any | null;
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
  };
}

function patentHaystack(patent: any, analysis: any | null) {
  const industries = (analysis?.industryClassification || []).map((i: string) => i.toLowerCase());
  const keywords = (analysis?.keywords || []).map((k: string) => k.toLowerCase());
  const useCases = (analysis?.commercialApplications?.useCases || []).map((u: string) =>
    u.toLowerCase()
  );
  const potentialIndustries = (
    analysis?.commercialApplications?.potentialIndustries || []
  ).map((i: string) => i.toLowerCase());
  const title = (patent.title || '').toLowerCase();
  const abstract = (patent.abstract || '').toLowerCase();
  const desc = (analysis?.summary?.description || '').toLowerCase();
  const haystack = [
    title,
    abstract,
    desc,
    ...keywords,
    ...useCases,
    ...potentialIndustries,
    ...industries,
  ].join(' ');
  return { industries, keywords, useCases, potentialIndustries, title, abstract, haystack };
}

/**
 * Aggressive personalization ranker for Discover.
 * Buyers with interests / searches / saves should overwhelmingly see those themes.
 */
export function rankFeaturedPatents(
  patents: any[],
  analysisMap: Map<string, any>,
  profile: UserPreferenceProfile,
  limit = 12
): FeaturedMatchResult[] {
  const domains = (profile.domains || []).map((d) => d.toLowerCase().trim()).filter(Boolean);
  const interests = (profile.interests || []).map((i) => i.toLowerCase().trim()).filter(Boolean);
  const affinityIndustries = (profile.affinityIndustries || []).map((i) => i.toLowerCase());
  const affinityKeywords = (profile.affinityKeywords || []).map((k) => k.toLowerCase());
  const savedSet = new Set((profile.savedPatentIds || []).map(String));
  const engagedSet = new Set((profile.engagedPatentIds || []).map(String));
  const excludeSet = new Set((profile.excludePatentIds || []).map(String));

  const weightedSearches: WeightedSearch[] =
    profile.weightedSearches && profile.weightedSearches.length > 0
      ? profile.weightedSearches
      : (profile.pastSearchQueries || []).map((query, idx, arr) => ({
          query,
          recencyWeight: 1 - idx / Math.max(arr.length, 1),
        }));

  const interestTokens = expandTokens(interests.flatMap(tokenizePreferenceText));
  const affinityTokens = expandTokens([
    ...affinityKeywords.flatMap(tokenizePreferenceText),
    ...affinityIndustries.flatMap(tokenizePreferenceText),
  ]);

  const analyses = patents.map((p) => analysisMap.get(String(p._id))).filter(Boolean);
  const duplicateDescriptions = buildDuplicateDescriptionSet(analyses);

  const hasPersonalSignal =
    domains.length > 0 ||
    interests.length > 0 ||
    weightedSearches.length > 0 ||
    affinityTokens.length > 0 ||
    savedSet.size > 0 ||
    engagedSet.size > 0;

  const scored: FeaturedMatchResult[] = [];

  for (const patent of patents) {
    const pid = String(patent._id);
    if (excludeSet.has(pid)) continue;
    // Don't recommend patents they already saved as "discovery" top — still allow later rails
    const analysis = analysisMap.get(pid) || null;
    const { industries, keywords, haystack, title } = patentHaystack(patent, analysis);

    const matchReasons: string[] = [];
    const whyChips: string[] = [];
    let domainScore = 0;
    let interestScore = 0;
    let searchScore = 0;
    let saveAffinity = 0;
    let engagement = 0;
    let phraseBonus = 0;

    // --- Domains (0–22) ---
    if (domains.length > 0) {
      const domainHits = domains.filter(
        (d) =>
          industries.some((ind: string) => ind.includes(d) || d.includes(ind)) ||
          haystack.includes(d)
      );
      domainScore = Math.round((domainHits.length / domains.length) * 22);
      if (domainHits.length > 0) {
        matchReasons.push(`In your domains: ${domainHits.slice(0, 3).join(', ')}`);
        whyChips.push(...domainHits.slice(0, 2).map((d) => `Domain: ${d}`));
      }
    }

    // --- Explicit interests (0–28) + phrase bonus ---
    if (interests.length > 0 || interestTokens.length > 0) {
      let hits = 0;
      const hitLabels: string[] = [];
      for (const interest of interests) {
        if (phraseInHaystack(interest, haystack)) {
          hits += 2.5;
          phraseBonus += 4;
          if (hitLabels.length < 4) hitLabels.push(interest);
        }
      }
      for (const token of interestTokens) {
        if (haystack.includes(token) || title.includes(token)) {
          hits += 1;
          if (hitLabels.length < 4 && !hitLabels.includes(token)) hitLabels.push(token);
        }
      }
      interestScore = Math.min(28, Math.round((hits / Math.max(interestTokens.length || interests.length, 1)) * 22 + Math.min(phraseBonus, 8)));
      if (hits > 0) {
        matchReasons.push(`Matches interests: ${hitLabels.slice(0, 3).join(', ')}`);
        whyChips.push(...hitLabels.slice(0, 2).map((h) => `Interest: ${h}`));
      }
    }

    // --- Past searches with recency (0–30) — strongest buyer signal ---
    if (weightedSearches.length > 0) {
      let weightedHits = 0;
      let weightSum = 0;
      const hitLabels: string[] = [];
      for (const s of weightedSearches.slice(0, 20)) {
        const q = s.query.toLowerCase().trim();
        const w = Math.max(0.25, s.recencyWeight);
        weightSum += w;
        const tokens = expandTokens(tokenizePreferenceText(q));
        let local = 0;
        if (phraseInHaystack(q, haystack) || phraseInHaystack(q, title)) {
          local += 3;
          phraseBonus += 5 * w;
        }
        for (const token of tokens) {
          if (haystack.includes(token)) local += 1;
        }
        if (local > 0) {
          weightedHits += local * w;
          if (hitLabels.length < 4) {
            const short = q.length > 36 ? `${q.slice(0, 36)}…` : q;
            hitLabels.push(short);
          }
        }
      }
      const norm = weightSum > 0 ? weightedHits / weightSum : 0;
      searchScore = Math.min(30, Math.round(Math.min(norm * 6, 30)));
      if (searchScore > 0) {
        matchReasons.push(`Because you searched: ${hitLabels.slice(0, 2).join(' · ')}`);
        whyChips.push(...hitLabels.slice(0, 2).map((h) => `Searched: ${h}`));
      }
    }

    // --- Save / engagement affinity (0–18) ---
    if (affinityTokens.length > 0 || affinityIndustries.length > 0) {
      let hits = 0;
      const labels: string[] = [];
      for (const ind of affinityIndustries) {
        if (industries.some((i: string) => i.includes(ind) || ind.includes(i))) {
          hits += 2;
          if (labels.length < 3) labels.push(ind);
        }
      }
      for (const token of affinityTokens.slice(0, 30)) {
        if (haystack.includes(token)) hits += 1;
      }
      // Similar to something they saved (not the same id)
      if (!savedSet.has(pid)) {
        saveAffinity = Math.min(14, Math.round(hits * 1.2));
      }
      if (saveAffinity > 0) {
        matchReasons.push(`Similar to IP you saved (${labels.slice(0, 2).join(', ') || 'themes'})`);
        whyChips.push('Like your saved IP');
      }
    }

    // Soft boost for patents in same cluster as engaged deals
    if (engagedSet.size > 0 && !engagedSet.has(pid) && affinityIndustries.length > 0) {
      const overlap = affinityIndustries.filter((ind) =>
        industries.some((i: string) => i.includes(ind) || ind.includes(i))
      );
      if (overlap.length > 0) {
        engagement = Math.min(8, overlap.length * 3);
        matchReasons.push(`Similar to patents you unlocked / enquired about`);
        whyChips.push('Like your activity');
      }
    }

    // Skip exact saved patents from "discover" ranking (they already know them)
    if (savedSet.has(pid) || engagedSet.has(pid)) {
      continue;
    }

    const commercial = Math.round(((analysis?.commercialPotentialScore ?? 50) / 100) * 8);
    const quality = isQualityPatentAnalysis(analysis, duplicateDescriptions) ? 4 : 0;
    phraseBonus = Math.min(10, Math.round(phraseBonus));

    let matchPercentage =
      domainScore +
      interestScore +
      searchScore +
      saveAffinity +
      engagement +
      commercial +
      quality +
      phraseBonus;

    // Primary signal for rails / UI
    const parts: Array<[FeaturedMatchResult['primarySignal'], number]> = [
      ['search', searchScore],
      ['interest', interestScore],
      ['domain', domainScore],
      ['save', saveAffinity],
      ['engagement', engagement],
      ['commercial', commercial + quality],
    ];
    parts.sort((a, b) => b[1] - a[1]);
    const primarySignal = parts[0][1] > 0 ? parts[0][0] : 'commercial';

    if (!hasPersonalSignal) {
      // Guest / cold start: rank by quality only — do not claim "for you"
      matchPercentage = Math.round(
        ((analysis?.commercialPotentialScore ?? 50) * 0.85) + (quality ? 10 : 0)
      );
      matchReasons.length = 0;
      whyChips.length = 0;
      matchReasons.push('High commercial potential');
      whyChips.push('Trending on platform');
      if (matchPercentage >= 72) {
        matchReasons.unshift('Top featured listing');
      }
    } else {
      // When personalized, heavily prefer personal matches — suppress weak unrelated noise
      if (matchPercentage < 28) {
        continue;
      }
      // Amplify clear personal hits so they dominate the feed
      if (searchScore >= 12 || interestScore >= 14 || domainScore >= 14) {
        matchPercentage = Math.min(99, Math.round(matchPercentage * 1.12));
      }
      matchPercentage = Math.min(99, Math.max(0, Math.round(matchPercentage)));
      if (matchPercentage >= 72) {
        matchReasons.unshift('Strong match for you');
      }
    }

    matchPercentage = Math.min(99, Math.max(0, Math.round(matchPercentage)));

    scored.push({
      patent,
      analysis,
      matchPercentage,
      matchReasons: matchReasons.slice(0, 4),
      whyChips: [...new Set(whyChips)].slice(0, 4),
      primarySignal: hasPersonalSignal ? primarySignal : 'commercial',
      scoreBreakdown: {
        domain: domainScore,
        interest: interestScore,
        search: searchScore,
        saveAffinity,
        engagement,
        commercial,
        quality,
        phraseBonus,
      },
    });
  }

  return scored
    .sort((a, b) => {
      if (b.matchPercentage !== a.matchPercentage) return b.matchPercentage - a.matchPercentage;
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
  const hasSaves = (profile.affinityKeywords?.length || profile.affinityIndustries?.length || 0) > 0;

  const forYou = ranked.filter((r) => r.matchPercentage >= 55).slice(0, 8);
  const fromSearches = hasSearches
    ? ranked.filter((r) => r.primarySignal === 'search' || r.scoreBreakdown.search >= 8).slice(0, 6)
    : [];
  const fromSaves = hasSaves
    ? ranked.filter((r) => r.primarySignal === 'save' || r.scoreBreakdown.saveAffinity >= 6).slice(0, 6)
    : [];
  const inYourDomains = hasInterests
    ? ranked
        .filter((r) => r.primarySignal === 'domain' || r.primarySignal === 'interest' || r.scoreBreakdown.domain >= 8)
        .slice(0, 6)
    : [];
  const used = new Set(
    [...forYou, ...fromSearches, ...fromSaves, ...inYourDomains].map((r) => String(r.patent._id))
  );
  const trending = ranked.filter((r) => !used.has(String(r.patent._id))).slice(0, 6);

  return { forYou, fromSearches, fromSaves, inYourDomains, trending };
}

/** Extract interest tags from a search query to auto-grow buyer taste. */
export function extractInterestHintsFromQuery(query: string): string[] {
  const tokens = tokenizePreferenceText(query);
  const hints: string[] = [];
  for (const t of tokens) {
    if (TERM_EXPANSIONS[t]) hints.push(t);
  }
  // Keep multi-word tech phrases
  const q = query.toLowerCase();
  for (const phrase of [
    'edge ai',
    'drug delivery',
    'medical imaging',
    'smart home',
    'battery storage',
    'clean energy',
    'iot security',
  ]) {
    if (q.includes(phrase)) hints.push(phrase);
  }
  return [...new Set(hints)].slice(0, 8);
}
