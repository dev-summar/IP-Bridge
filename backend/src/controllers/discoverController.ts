import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { dbStore } from '../services/dbStore';
import { IAuthRequest, JWT_SECRET } from '../middleware/auth';
import {
  rankFeaturedPatents,
  buildFeaturedRails,
  extractInterestHintsFromQuery,
  WeightedSearch,
} from '../services/featuredMatch';
import {
  analyzePatentWithAI,
  estimateIPPricing,
  ratePrototypeReadiness,
} from '../services/aiParser';

async function decodeOptionalUser(req: Request): Promise<{ userId: string; userRole: string }> {
  let userId = '';
  let userRole = '';
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const verified = jwt.verify(authHeader.substring(7), JWT_SECRET) as any;
      const user = typeof verified.id === 'string' ? await dbStore.users.findById(verified.id) : null;
      if (user) { userId = String(user._id); userRole = user.role; }
    } catch {
      /* ignore */
    }
  }
  return { userId, userRole };
}

async function enrichMasked(
  p: any,
  analysis: any | null,
  userId: string,
  userRole: string
) {
  const owner = await dbStore.users.findById(p.ownerId);
  let hasAccess = false;
  if (userId && (p.ownerId === userId || userRole === 'admin')) {
    hasAccess = true;
  } else if (userId) {
    const request = await dbStore.accessRequests.findOne({
      patentId: String(p._id),
      buyerId: userId,
    });
    hasAccess = request?.status === 'approved';
  }

  const base: any = {
    ...p,
    ownerName: owner ? owner.name : 'Unknown Owner',
    ownerOrganization: owner ? owner.organization : 'N/A',
  };
  base.accessStatus = hasAccess ? 'approved' : 'none';
  if (userRole !== 'admin' && String(p.ownerId) !== userId) {
    delete base.reviewHistory;
    delete base.grantReviewedBy;
    delete base.grantReviewedPdfUrl;
  }

  if (hasAccess) {
    base.analysis = analysis
      ? { ...analysis, patentId: String(p._id) }
      : null;
    return base;
  }

  const domainText = (analysis?.industryClassification?.[0] || 'Technology').trim();
  base.title = `Confidential ${domainText} Innovation`;
  base.patentNumber = 'Restricted';
  const rawDesc = analysis?.summary?.description || p.abstract || '';
  const cleanDescription = rawDesc
    .replace(/\s*\(\d+[-a-zA-Z0-9]*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  base.abstract =
    cleanDescription.length > 150
      ? cleanDescription.substring(0, 150) + '...'
      : cleanDescription;
  base.pdfUrl = undefined;
  base.analysis = {
    patentId: String(p._id),
    summary: {
      description: cleanDescription,
      problemSolved: 'Locked. Request access to unlock.',
      commercialValue: 'Locked. Request access to unlock.',
      keyInnovation: 'Locked. Request access to unlock.',
    },
    industryClassification: analysis?.industryClassification || ['Technology'],
    keywords: [],
    commercialApplications: {
      potentialIndustries: [],
      useCases: [],
      adoptionOpportunities: [],
    },
    commercialPotentialScore: analysis?.commercialPotentialScore ?? null,
    commercialBreakdown: analysis?.commercialBreakdown || null,
    pricingGuidance: null,
    readinessAssessment: null,
  };
  return base;
}

/**
 * GET /api/patents/featured
 * Personalized Discover feed — interests, domains, searches, saves, engagement.
 */
export async function getFeaturedPatents(req: Request, res: Response) {
  try {
    const limit = Math.min(24, Math.max(1, parseInt(String(req.query.limit || '12'), 10) || 12));
    const { userId, userRole } = await decodeOptionalUser(req);

    const patents = await dbStore.patents.find({ status: 'approved' });
    const analyses = await dbStore.patentAnalysis.find();
    const analysisMap = new Map<string, any>();
    for (const a of analyses) {
      analysisMap.set(String(a.patentId), a);
    }

    let interests: string[] = [];
    let domains: string[] = [];
    let pastSearchQueries: string[] = [];
    let savedPatentIds: string[] = [];
    let affinityIndustries: string[] = [];
    let affinityKeywords: string[] = [];
    let engagedPatentIds: string[] = [];
    let weightedSearches: WeightedSearch[] = [];
    let learnedInterests: string[] = [];

    if (userId) {
      const user = await dbStore.users.findById(userId);
      if (user) {
        interests = [...(user.interests || [])];
        domains = user.domains || [];
        savedPatentIds = (user.savedPatents || []).map(String);
      }

      const history = await dbStore.searchHistory.find({ userId }, { limit: 40 });
      pastSearchQueries = history.map((h: any) => h.query).filter(Boolean);
      weightedSearches = history.map((h: any, idx: number) => ({
        query: h.query,
        recencyWeight: Math.max(0.2, 1 - idx / Math.max(history.length, 1)),
        source: h.source,
      }));

      // Auto-learn interest hints from recent searches (merge soft into ranking profile)
      for (const q of pastSearchQueries.slice(0, 15)) {
        learnedInterests.push(...extractInterestHintsFromQuery(q));
      }
      learnedInterests = [...new Set(learnedInterests)];
      // Persist new hints so taste grows over time (non-destructive merge)
      if (user && learnedInterests.length > 0) {
        const merged = [...new Set([...interests, ...learnedInterests])].slice(0, 30);
        if (merged.length > interests.length) {
          interests = merged;
          try {
            await dbStore.users.update(userId, { interests: merged });
          } catch {
            /* non-blocking */
          }
        }
      }

      // Affinity from saved patents
      for (const sid of savedPatentIds.slice(0, 40)) {
        const a = analysisMap.get(String(sid));
        if (a?.industryClassification) affinityIndustries.push(...a.industryClassification);
        if (a?.keywords) affinityKeywords.push(...a.keywords);
      }

      // Engagement: interest requests, access requests, meetings
      try {
        const [myInterests, myAccess, myMeetings] = await Promise.all([
          dbStore.interestRequests.find({ buyerId: userId }),
          dbStore.accessRequests.find({ buyerId: userId }),
          dbStore.meetingRequests.find({ buyerId: userId }),
        ]);
        engagedPatentIds = [
          ...myInterests.map((r: any) => String(r.patentId)),
          ...myAccess.map((r: any) => String(r.patentId)),
          ...myMeetings.map((r: any) => String(r.patentId)),
        ];
        for (const eid of [...new Set(engagedPatentIds)].slice(0, 40)) {
          const a = analysisMap.get(eid);
          if (a?.industryClassification) affinityIndustries.push(...a.industryClassification);
          if (a?.keywords) affinityKeywords.push(...a.keywords);
        }
      } catch {
        /* optional collections */
      }

      affinityIndustries = [...new Set(affinityIndustries.map((i) => i.toLowerCase()))].slice(0, 20);
      affinityKeywords = [...new Set(affinityKeywords.map((k) => k.toLowerCase()))].slice(0, 40);
      engagedPatentIds = [...new Set(engagedPatentIds)];
    }

    const profile = {
      interests,
      domains,
      pastSearchQueries,
      weightedSearches,
      savedPatentIds,
      affinityIndustries,
      affinityKeywords,
      engagedPatentIds,
    };

    const ranked = rankFeaturedPatents(patents, analysisMap, profile, Math.max(limit, 18));
    const rails = buildFeaturedRails(ranked, profile);

    const enrichRow = async (row: (typeof ranked)[0]) => {
      const enriched = await enrichMasked(row.patent, row.analysis, userId, userRole);
      return {
        ...enriched,
        matchPercentage: row.matchPercentage,
        matchReasons: row.matchReasons,
        whyChips: row.whyChips,
        primarySignal: row.primarySignal,
        scoreBreakdown: row.scoreBreakdown,
        featured: true,
      };
    };

    const results = [];
    for (const row of ranked.slice(0, limit)) {
      results.push(await enrichRow(row));
    }

    const enrichRail = async (rows: typeof ranked) => {
      const out = [];
      for (const row of rows) out.push(await enrichRow(row));
      return out;
    };

    const personalized = !!(
      userId &&
      (interests.length ||
        domains.length ||
        pastSearchQueries.length ||
        savedPatentIds.length ||
        engagedPatentIds.length)
    );

    return res.json({
      personalized,
      profileSignals: {
        interests,
        domains,
        recentSearches: pastSearchQueries.slice(0, 8),
        savedCount: savedPatentIds.length,
        learnedFromSearches: learnedInterests.slice(0, 8),
        affinityIndustries: affinityIndustries.slice(0, 8),
      },
      patents: results,
      rails: {
        forYou: await enrichRail(rails.forYou),
        fromSearches: await enrichRail(rails.fromSearches),
        fromSaves: await enrichRail(rails.fromSaves),
        inYourDomains: await enrichRail(rails.inYourDomains),
        trending: await enrichRail(rails.trending),
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      message: 'Failed to load featured patents.',
      error: error.message,
    });
  }
}


/** POST /api/searches — record a discover search for personalization */
export async function recordSearch(req: Request, res: Response) {
  try {
    const authReq = req as IAuthRequest;
    const { query, source, resultCount } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ message: 'query is required.' });
    }

    const row = await dbStore.searchHistory.create({
      userId: authReq.user!.id,
      query: query.trim().slice(0, 500),
      source: ['keyword', 'ai-match', 'industry', 'featured'].includes(source)
        ? source
        : 'keyword',
      resultCount: typeof resultCount === 'number' ? resultCount : undefined,
    });

    // Grow buyer taste from this search
    const hints = extractInterestHintsFromQuery(query);
    if (hints.length > 0) {
      try {
        const user = await dbStore.users.findById(authReq.user!.id);
        if (user) {
          const merged = [...new Set([...(user.interests || []), ...hints])].slice(0, 30);
          await dbStore.users.update(authReq.user!.id, { interests: merged });
        }
      } catch {
        /* non-blocking */
      }
    }

    return res.status(201).json(row);
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to record search.', error: error.message });
  }
}

/** GET /api/searches/mine — recent searches for the individual */
export async function getMySearches(req: Request, res: Response) {
  try {
    const authReq = req as IAuthRequest;
    const rows = await dbStore.searchHistory.find({ userId: authReq.user!.id }, { limit: 40 });
    return res.json(rows);
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch searches.', error: error.message });
  }
}

/**
 * POST /api/patents/:id/pricing-guidance
 * AI IP pricing guidance for inventors (owners of the patent or admin).
 */
export async function getPricingGuidance(req: Request, res: Response) {
  try {
    const authReq = req as IAuthRequest;
    const patent = await dbStore.patents.findById(req.params.id);
    if (!patent) return res.status(404).json({ message: 'Patent not found.' });

    if (patent.ownerId !== authReq.user!.id && authReq.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Only the inventor/owner can request pricing guidance.' });
    }

    const analysis = await dbStore.patentAnalysis.findOne({ patentId: String(patent._id) });
    const guidance = await estimateIPPricing({
      title: patent.title,
      abstract: patent.abstract,
      industryClassification: analysis?.industryClassification,
      keywords: analysis?.keywords,
      keyInnovation: analysis?.summary?.keyInnovation,
      problemSolved: analysis?.summary?.problemSolved,
      useCases: analysis?.commercialApplications?.useCases,
      commercialPotentialScore: analysis?.commercialPotentialScore,
      commercialBreakdown: analysis?.commercialBreakdown,
      hasPrototype: !!patent.hasPrototype,
      hasProduct: !!patent.hasProduct,
      askingPrice: patent.askingPrice,
      marketOpportunity: analysis?.marketOpportunity,
      trlLevel: patent.trlLevel,
    });

    if (analysis) {
      await dbStore.patentAnalysis.upsert(String(patent._id), {
        pricingGuidance: guidance,
      });
    }

    await dbStore.auditLogs.create({
      userId: authReq.user!.id,
      action: 'IP_PRICING_GUIDANCE',
      details: `Pricing guidance for ${patent.patentNumber}: ₹${guidance.suggestedSaleMinInr}–${guidance.suggestedSaleMaxInr}`,
    });

    return res.json({
      patentId: patent._id,
      askingPrice: patent.askingPrice || 0,
      commercialPotentialScore: analysis?.commercialPotentialScore ?? null,
      pricingGuidance: guidance,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to generate pricing guidance.', error: error.message });
  }
}

/**
 * POST /api/patents/:id/readiness
 * Inventor declares prototype/product; AI rates TRL + readiness.
 * Body: { hasPrototype, hasProduct, prototypeDescription? }
 */
export async function submitReadinessAssessment(req: Request, res: Response) {
  try {
    const authReq = req as IAuthRequest;
    const patent = await dbStore.patents.findById(req.params.id);
    if (!patent) return res.status(404).json({ message: 'Patent not found.' });

    if (patent.ownerId !== authReq.user!.id && authReq.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Only the inventor/owner can update readiness.' });
    }

    const hasPrototype = Boolean(req.body.hasPrototype);
    const hasProduct = Boolean(req.body.hasProduct);
    const prototypeDescription =
      typeof req.body.prototypeDescription === 'string'
        ? req.body.prototypeDescription.slice(0, 2000)
        : undefined;

    if (!hasPrototype && !hasProduct && !prototypeDescription) {
      // Still allow "neither" — rate as early TRL
    }

    const analysis = await dbStore.patentAnalysis.findOne({ patentId: String(patent._id) });
    const assessment = await ratePrototypeReadiness({
      title: patent.title,
      abstract: patent.abstract,
      hasPrototype,
      hasProduct,
      prototypeDescription,
      commercialPotentialScore: analysis?.commercialPotentialScore,
    });

    const updatedPatent = await dbStore.patents.update(String(patent._id), {
      hasPrototype,
      hasProduct,
      prototypeDescription,
      trlLevel: assessment.trlLevel,
      readinessScore: assessment.readinessScore,
      readinessNotes: assessment.maturityLabel,
    });

    if (analysis) {
      await dbStore.patentAnalysis.upsert(String(patent._id), {
        readinessAssessment: assessment,
      });
    }

    await dbStore.auditLogs.create({
      userId: authReq.user!.id,
      action: 'PROTOTYPE_READINESS',
      details: `Readiness for ${patent.patentNumber}: TRL ${assessment.trlLevel}, score ${assessment.readinessScore}`,
    });

    return res.json({
      patent: updatedPatent,
      readinessAssessment: assessment,
      prompt: {
        question: 'Do you have a prototype or a product based on this patent?',
        hasPrototype,
        hasProduct,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to rate readiness.', error: error.message });
  }
}

/**
 * POST /api/patents/:id/commercial-potential
 * Refresh AI commercial potential analysis for an individual patent (owner/admin).
 */
export async function refreshCommercialPotential(req: Request, res: Response) {
  try {
    const authReq = req as IAuthRequest;
    const patent = await dbStore.patents.findById(req.params.id);
    if (!patent) return res.status(404).json({ message: 'Patent not found.' });

    if (patent.ownerId !== authReq.user!.id && authReq.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Only the inventor/owner can refresh commercial potential.' });
    }

    const aiAnalysis = await analyzePatentWithAI(patent.title, patent.abstract);
    const existing = await dbStore.patentAnalysis.findOne({ patentId: String(patent._id) });

    const saved = await dbStore.patentAnalysis.upsert(String(patent._id), {
      summary: aiAnalysis.summary,
      industryClassification: aiAnalysis.industryClassification,
      keywords: aiAnalysis.keywords,
      commercialApplications: aiAnalysis.commercialApplications,
      commercialPotentialScore: aiAnalysis.commercialPotentialScore,
      potentialBuyers: aiAnalysis.potentialBuyers,
      marketOpportunity: aiAnalysis.marketOpportunity,
      filingYear: aiAnalysis.filingYear,
      commercialBreakdown: aiAnalysis.commercialBreakdown,
      ...(existing?.pricingGuidance ? { pricingGuidance: existing.pricingGuidance } : {}),
      ...(existing?.readinessAssessment
        ? { readinessAssessment: existing.readinessAssessment }
        : {}),
    });

    await dbStore.auditLogs.create({
      userId: authReq.user!.id,
      action: 'COMMERCIAL_POTENTIAL_REFRESH',
      details: `Refreshed commercial potential for ${patent.patentNumber}: ${aiAnalysis.commercialPotentialScore}/100`,
    });

    return res.json({
      patentId: patent._id,
      commercialPotentialScore: aiAnalysis.commercialPotentialScore,
      commercialBreakdown: aiAnalysis.commercialBreakdown,
      marketOpportunity: aiAnalysis.marketOpportunity,
      potentialBuyers: aiAnalysis.potentialBuyers,
      analysis: saved,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: 'Failed to refresh commercial potential.',
      error: error.message,
    });
  }
}
