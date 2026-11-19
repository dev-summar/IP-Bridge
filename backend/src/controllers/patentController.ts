import { Request, Response } from 'express';
import { dbStore, getUseMongo } from '../services/dbStore';
import { PatentAnalysisModel } from '../models/schemas';
import { IAuthRequest } from '../middleware/auth';
import { analyzePatentWithAI, queryJsonLLM, ratePrototypeReadiness } from '../services/aiParser';
import {
  buildDuplicateDescriptionSet,
  comparePatentsByQualityThenScore,
  isQualityPatentAnalysis,
} from '../services/analysisQuality';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth';
import { validateListingEvidence } from '../services/listingRequirements';

async function checkAccessAndEnrich(
  p: any,
  userId: string,
  userRole: string,
  preload?: {
    analysis?: any | null;
    owner?: any | null;
    accessRequest?: any | null;
    hasInterest?: boolean;
    hasMeeting?: boolean;
    relationsLoaded?: boolean;
  }
) {
  const analysis =
    preload && 'analysis' in preload
      ? preload.analysis
      : await dbStore.patentAnalysis.findOne({ patentId: String(p._id) });
  const owner =
    preload && 'owner' in preload
      ? preload.owner
      : await dbStore.users.findById(p.ownerId);

  let accessStatus = 'none';
  let hasAccess = false;
  let hasExpressedInterest = false;
  let hasMeetingDone = false;

  if (userId) {
    if (p.ownerId === userId || userRole === 'admin') {
      hasAccess = true;
      accessStatus = 'approved';
      hasExpressedInterest = true;
      hasMeetingDone = true;
    } else if (preload?.relationsLoaded) {
      const request = preload.accessRequest;
      if (request) {
        accessStatus = request.status;
        if (request.status === 'approved') hasAccess = true;
      }
      hasExpressedInterest = !!preload.hasInterest;
      hasMeetingDone = !!preload.hasMeeting;
    } else {
      const request = await dbStore.accessRequests.findOne({ patentId: p._id.toString(), buyerId: userId });
      if (request) {
        accessStatus = request.status;
        if (request.status === 'approved') {
          hasAccess = true;
        }
      }

      const interests = await dbStore.interestRequests.find({ patentId: p._id.toString(), buyerId: userId });
      hasExpressedInterest = interests.length > 0;

      const meetings = await dbStore.meetingRequests.find({ patentId: p._id.toString(), buyerId: userId, status: 'accepted' });
      hasMeetingDone = meetings.length > 0;
    }
  }

  const enrichedPatent: any = {
    ...p,
    ownerName: owner ? owner.name : 'Unknown Owner',
    ownerOrganization: owner ? owner.organization : 'N/A',
    accessStatus,
    hasExpressedInterest,
    hasMeetingDone
  };

  if (userRole !== 'admin' && String(p.ownerId) !== String(userId)) {
    delete enrichedPatent.reviewHistory;
    delete enrichedPatent.grantReviewedBy;
    delete enrichedPatent.grantReviewedPdfUrl;
  }

  if (hasAccess) {
    const cleanAbstract = p.abstract.replace(/\s*\(\d+[-a-zA-Z0-9]*\)/g, '').replace(/\s{2,}/g, ' ').trim();
    enrichedPatent.abstract = cleanAbstract;
    
    if (analysis) {
      const cleanDesc = analysis.summary.description.replace(/\s*\(\d+[-a-zA-Z0-9]*\)/g, '').replace(/\s{2,}/g, ' ').trim();
      enrichedPatent.analysis = {
        ...analysis,
        patentId: String(p._id),
        summary: {
          ...analysis.summary,
          description: cleanDesc
        }
      };
    } else {
      enrichedPatent.analysis = null;
    }
  } else {
    // Mask details
    const domainText = (analysis?.industryClassification?.[0] || 'Technology').trim();
    enrichedPatent.title = `Confidential ${domainText} Innovation`;
    enrichedPatent.patentNumber = 'Restricted';
    
    const rawDesc = analysis?.summary?.description || p.abstract || '';
    const cleanDescription = rawDesc
      .replace(/\s*\(\d+[-a-zA-Z0-9]*\)/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    enrichedPatent.abstract = cleanDescription.length > 150 
      ? cleanDescription.substring(0, 150) + '...' 
      : cleanDescription;
      
    enrichedPatent.pdfUrl = undefined;
    enrichedPatent.analysis = {
      patentId: String(p._id),
      summary: {
        description: cleanDescription,
        problemSolved: 'Locked. Request access to unlock.',
        commercialValue: 'Locked. Request access to unlock.',
        keyInnovation: 'Locked. Request access to unlock.'
      },
      industryClassification: analysis ? analysis.industryClassification : ['Technology'],
      keywords: [],
      commercialApplications: {
        potentialIndustries: [],
        useCases: [],
        adoptionOpportunities: []
      },
      commercialPotentialScore: analysis ? analysis.commercialPotentialScore : null,
      commercialBreakdown: analysis?.commercialBreakdown || null,
      potentialBuyers: [],
      marketOpportunity: null,
      filingYear: analysis?.filingYear || null
    };
  }

  return enrichedPatent;
}

async function loadAnalysesByPatentIds(patentIds: string[]): Promise<Map<string, any>> {
  const map = new Map<string, any>();
  if (patentIds.length === 0) return map;

  if (getUseMongo()) {
    const rows = await PatentAnalysisModel.find({
      patentId: { $in: patentIds.map(String) },
    }).lean();
    for (const row of rows) {
      map.set(String(row.patentId), row);
    }
    return map;
  }

  const wanted = new Set(patentIds.map(String));
  const rows = await dbStore.patentAnalysis.find();
  for (const row of rows) {
    if (wanted.has(String(row.patentId))) map.set(String(row.patentId), row);
  }
  return map;
}

async function loadOwnersByIds(ownerIds: string[]): Promise<Map<string, any>> {
  const map = new Map<string, any>();
  const unique = [...new Set(ownerIds.filter(Boolean))];
  await Promise.all(
    unique.map(async (id) => {
      const owner = await dbStore.users.findById(id);
      if (owner) map.set(String(id), owner);
    })
  );
  return map;
}

const SEARCH_STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'system', 'method', 'device', 'apparatus',
  'processing', 'about', 'from', 'this', 'that', 'new',
]);
const STRONG_KEYWORD_SCORE = 60;
const AI_MATCH_RESULT_LIMIT = 24;
const AI_MATCH_CANDIDATE_LIMIT = 16;
const AI_MATCH_TIMEOUT_MS = 8000;

function tokenizeSearchQuery(query: string): { q: string; queryTokens: string[] } {
  const q = query.toLowerCase();
  const queryTokens = q
    .split(/[\s,.\-/]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !SEARCH_STOP_WORDS.has(token));
  return { q, queryTokens };
}

function matchedQueryTokens(p: any, analysis: any, queryTokens: string[], q: string): string[] {
  const title = String(p.title || '').toLowerCase();
  const abstract = String(p.abstract || '').toLowerCase();
  if (queryTokens.length === 0) {
    return title.includes(q) || abstract.includes(q) ? [q] : [];
  }
  return queryTokens.filter((token) => {
    if (title.includes(token) || abstract.includes(token)) return true;
    if (analysis?.keywords?.some((kw: string) => kw.toLowerCase().includes(token))) return true;
    if (analysis?.industryClassification?.some((ind: string) => ind.toLowerCase().includes(token))) return true;
    return false;
  });
}

function rankKeywordMatches(patents: any[], analysisMap: Map<string, any>, query: string) {
  const { q, queryTokens } = tokenizeSearchQuery(query);
  return patents
    .map((patent) => {
      const analysis = analysisMap.get(String(patent._id)) ?? null;
      const matchPercentage = scorePatentKeywordMatch(patent, analysis, queryTokens, q);
      const matchedTokens = matchedQueryTokens(patent, analysis, queryTokens, q);
      const matchReason =
        matchPercentage > 0
          ? `Matched search keywords: [${matchedTokens.join(', ')}] with ${matchPercentage}% relevance to your target technical needs.`
          : 'No direct keyword overlap found with your query.';
      return { patent, analysis, matchPercentage, matchReason };
    })
    .filter((row) => row.matchPercentage > 0)
    .sort((a, b) => b.matchPercentage - a.matchPercentage);
}

function isAiMatchList(value: any): value is Array<{ patentId: string; matchPercentage: number; reason: string }> {
  return (
    Array.isArray(value) &&
    value.every(
      (match) =>
        match &&
        typeof match.patentId === 'string' &&
        typeof match.matchPercentage === 'number' &&
        Number.isFinite(match.matchPercentage) &&
        typeof match.reason === 'string'
    )
  );
}

function scorePatentKeywordMatch(
  p: any,
  analysis: any,
  queryTokens: string[],
  q: string
): number {
  let score = 0;
  if (queryTokens.length === 0) {
    if (p.title.toLowerCase().includes(q) || p.abstract.toLowerCase().includes(q)) {
      score = 65;
    }
    return score;
  }

  let totalPoints = 0;
  queryTokens.forEach((token) => {
    if (p.title.toLowerCase().includes(token)) totalPoints += 35;
    if (analysis?.keywords?.some((kw: string) => kw.toLowerCase().includes(token))) totalPoints += 25;
    if (p.abstract.toLowerCase().includes(token)) totalPoints += 15;
    if (analysis?.industryClassification?.some((ind: string) => ind.toLowerCase().includes(token))) {
      totalPoints += 20;
    }
  });

  if (totalPoints > 0) {
    score = Math.min(99, Math.round(45 + (totalPoints / (queryTokens.length * 35)) * 54));
  }
  return score;
}

// Get approved patents for marketplace (paginated)
export async function getMarketplacePatents(req: Request, res: Response) {
  try {
    const { query, industry, status } = req.query;
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(48, Math.max(1, parseInt(String(req.query.limit || '12'), 10) || 12));
    const paginate = req.query.page !== undefined || req.query.limit !== undefined;

    let patents = await dbStore.patents.find();

    // Decode token if present
    let userId = '';
    let userRole = '';
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const verified = jwt.verify(token, JWT_SECRET) as any;
        const activeUser = typeof verified.id === 'string' ? await dbStore.users.findById(verified.id) : null;
        if (activeUser) { userId = String(activeUser._id); userRole = activeUser.role; }
      } catch (err) {}
    }

    let filtered = patents.filter((p) => {
      if (status && userRole === 'admin') return p.status === status;
      return p.status === 'approved' && (!status || status === 'approved');
    });

    const analysisMap = await loadAnalysesByPatentIds(filtered.map((p) => String(p._id)));
    const duplicateDescriptions = buildDuplicateDescriptionSet(
      filtered.map((p) => analysisMap.get(String(p._id))).filter(Boolean)
    );

    if (industry) {
      const industryLower = (industry as string).toLowerCase();
      filtered = filtered.filter((p) =>
        analysisMap
          .get(String(p._id))
          ?.industryClassification?.some((i: string) => i.toLowerCase() === industryLower)
      );
    }

    if (query) {
      const { q, queryTokens } = tokenizeSearchQuery(String(query));

      filtered = filtered
        .map((p) => ({
          patent: p,
          matchPercentage: scorePatentKeywordMatch(
            p,
            analysisMap.get(String(p._id)),
            queryTokens,
            q
          ),
        }))
        .filter((row) => row.matchPercentage > 0)
        .sort((a, b) => {
          if (b.matchPercentage !== a.matchPercentage) {
            return b.matchPercentage - a.matchPercentage;
          }
          return comparePatentsByQualityThenScore(
            a.patent,
            b.patent,
            analysisMap,
            duplicateDescriptions
          );
        })
        .map((row) => ({ ...row.patent, matchPercentage: row.matchPercentage }));
    } else {
      filtered.sort((a, b) =>
        comparePatentsByQualityThenScore(a, b, analysisMap, duplicateDescriptions)
      );
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * limit;
    const pageSlice = paginate ? filtered.slice(start, start + limit) : filtered;

    const ownerMap = await loadOwnersByIds(pageSlice.map((p) => p.ownerId));

    const patentsWithAnalysis = [];
    for (const p of pageSlice) {
      const enriched = await checkAccessAndEnrich(p, userId, userRole, {
        analysis: analysisMap.get(String(p._id)) ?? null,
        owner: ownerMap.get(String(p.ownerId)) ?? null,
      });
      if ((p as any).matchPercentage !== undefined) {
        enriched.matchPercentage = (p as any).matchPercentage;
      }
      enriched.isAiEvaluated = isQualityPatentAnalysis(
        analysisMap.get(String(p._id)),
        duplicateDescriptions
      );
      patentsWithAnalysis.push(enriched);
    }

    // Persist search for personalized Discover (individuals)
    if (userId && (query || industry)) {
      try {
        await dbStore.searchHistory.create({
          userId,
          query: String(query || industry).trim().slice(0, 500),
          source: industry && !query ? 'industry' : 'keyword',
          resultCount: total,
        });
      } catch {
        /* non-blocking */
      }
    }

    if (!paginate) {
      return res.json(patentsWithAnalysis);
    }

    return res.json({
      data: patentsWithAnalysis,
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to retrieve marketplace patents.', error: error.message });
  }
}

// Semantic matching uses the same configured AI provider as analysis, pricing, and readiness.
export async function getAIMatchedPatents(req: Request, res: Response) {
  try {
    const { query } = req.body;
    if (typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ message: 'Matching query is required.' });
    }

    // Decode token if present
    let userId = '';
    let userRole = '';
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const verified = jwt.verify(token, JWT_SECRET) as any;
        const activeUser = typeof verified.id === 'string' ? await dbStore.users.findById(verified.id) : null;
        if (activeUser) { userId = String(activeUser._id); userRole = activeUser.role; }
      } catch (err) {}
    }

    const patents = await dbStore.patents.find({ status: 'approved' });
    if (patents.length === 0) return res.json([]);

    const analysisMap = await loadAnalysesByPatentIds(patents.map((patent) => String(patent._id)));
    const keywordMatches = rankKeywordMatches(patents, analysisMap, query.trim());
    const keywordHit = keywordMatches[0]?.matchPercentage >= STRONG_KEYWORD_SCORE;

    let ranked = keywordMatches;
    if (!keywordHit) {
      const semantic = await semanticMatchPatents(query.trim(), patents, analysisMap);
      if (semantic) ranked = semantic.length > 0 ? semantic : keywordMatches;
    }

    const results = await enrichMatchedPatents(ranked.slice(0, AI_MATCH_RESULT_LIMIT), userId, userRole);
    if (userId) {
      try {
        await dbStore.searchHistory.create({
          userId,
          query: String(query).trim().slice(0, 500),
          source: 'ai-match',
          resultCount: results.length,
        });
      } catch {
        /* non-blocking */
      }
    }
    return res.json(results);
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to process AI matching.', error: error.message });
  }
}

async function semanticMatchPatents(query: string, patents: any[], analysisMap: Map<string, any>) {
  const candidates = [...patents]
    .sort((a, b) => {
      const aScore = analysisMap.get(String(a._id))?.commercialPotentialScore || 0;
      const bScore = analysisMap.get(String(b._id))?.commercialPotentialScore || 0;
      return bScore - aScore;
    })
    .slice(0, AI_MATCH_CANDIDATE_LIMIT)
    .map((patent) => ({
      id: String(patent._id),
      title: patent.title,
      abstract: String(patent.abstract || '').slice(0, 320),
      keywords: (analysisMap.get(String(patent._id))?.keywords || []).slice(0, 8),
      industry: (analysisMap.get(String(patent._id))?.industryClassification || []).slice(0, 3),
    }));

  const prompt = `You are a patent matching AI.
The user needs: "${query.replace(/"/g, "'").slice(0, 500)}"

Patents:
${JSON.stringify(candidates)}

Score every patent from 0 to 100. Use 0 when it is irrelevant.
Return ONLY a JSON array of {"patentId": string, "matchPercentage": number, "reason": string}.
Each reason is one sentence and must not copy the title or abstract.`;

  const matchesList = await queryJsonLLM(prompt, {
    timeoutMs: AI_MATCH_TIMEOUT_MS,
    thinkingBudget: 0,
    singleProvider: true,
  });
  if (!isAiMatchList(matchesList)) {
    console.log('[AI Match] Falling back to local heuristics.');
    return null;
  }

  const byId = new Map(matchesList.map((match) => [match.patentId, match]));
  return patents
    .map((patent) => {
      const analysis = analysisMap.get(String(patent._id)) ?? null;
      const match = byId.get(String(patent._id));
      return {
        patent,
        analysis,
        matchPercentage: match ? Math.max(0, Math.min(100, Math.round(match.matchPercentage))) : 0,
        matchReason: match ? match.reason : 'No matching metrics provided by AI.',
      };
    })
    .filter((row) => row.matchPercentage > 20)
    .sort((a, b) => b.matchPercentage - a.matchPercentage);
}

async function enrichMatchedPatents(
  rows: Array<{ patent: any; analysis: any; matchPercentage: number; matchReason: string }>,
  userId: string,
  userRole: string
) {
  const ownerMap = await loadOwnersByIds(rows.map((row) => row.patent.ownerId));
  const accessByPatent = new Map<string, any>();
  const interestIds = new Set<string>();
  const meetingIds = new Set<string>();

  if (userId && userRole !== 'admin') {
    const [accessRows, interestRows, meetingRows] = await Promise.all([
      dbStore.accessRequests.find({ buyerId: userId }),
      dbStore.interestRequests.find({ buyerId: userId }),
      dbStore.meetingRequests.find({ buyerId: userId }),
    ]);
    for (const row of accessRows) accessByPatent.set(String(row.patentId), row);
    for (const row of interestRows) interestIds.add(String(row.patentId));
    for (const row of meetingRows) {
      if (row.status === 'accepted') meetingIds.add(String(row.patentId));
    }
  }

  return Promise.all(
    rows.map(async (row) => {
      const id = String(row.patent._id);
      const enriched = await checkAccessAndEnrich(row.patent, userId, userRole, {
        analysis: row.analysis,
        owner: ownerMap.get(String(row.patent.ownerId)) ?? null,
        accessRequest: accessByPatent.get(id) ?? null,
        hasInterest: interestIds.has(id),
        hasMeeting: meetingIds.has(id),
        relationsLoaded: true,
      });
      const canSeeDetails = userRole === 'admin' || (userId !== '' && String(row.patent.ownerId) === userId);
      enriched.matchPercentage = row.matchPercentage;
      enriched.matchReason =
        canSeeDetails || row.matchReason.startsWith('Matched search keywords:')
          ? row.matchReason
          : 'Relevant to the technology you described.';
      return enriched;
    })
  );
}

// Register a new patent (Owner only)
export async function registerPatent(req: Request, res: Response) {
  try {
    const authReq = req as IAuthRequest;
    const {
      patentNumber,
      title,
      abstract,
      pdfUrl,
      askingPrice,
      isForSale,
      isForLicense,
      hasPrototype,
      hasProduct,
      prototypeDescription,
    } = req.body;

    if (!patentNumber || !title || !abstract) {
      return res.status(400).json({ message: 'Patent number, title, and abstract are required.' });
    }
    const evidence = validateListingEvidence(req.body);
    if (!evidence.valid) return res.status(400).json({ message: evidence.message });

    // Check duplicate patent number
    const existing = await dbStore.patents.find();
    if (existing.some(p => p.patentNumber.toLowerCase() === patentNumber.toLowerCase())) {
      return res.status(400).json({ message: 'A patent with this patent number is already registered.' });
    }

    const proto = Boolean(hasPrototype);
    const product = Boolean(hasProduct);

    // Create Patent
    const newPatent = await dbStore.patents.create({
      patentNumber,
      title,
      abstract,
      ...evidence.value,
      askingPrice: askingPrice ? Number(askingPrice) : 0,
      isForSale: isForSale !== undefined ? Boolean(isForSale) : true,
      isForLicense: isForLicense !== undefined ? Boolean(isForLicense) : true,
      hasPrototype: proto,
      hasProduct: product,
      prototypeDescription:
        typeof prototypeDescription === 'string' ? prototypeDescription.slice(0, 2000) : undefined,
      ownerId: authReq.user!.id,
      status: 'pending' // Admin must review
    });

    // Run AI analysis automatically
    const aiAnalysis = await analyzePatentWithAI(title, abstract);
    let readinessAssessment = undefined;
    if (proto || product || prototypeDescription) {
      readinessAssessment = await ratePrototypeReadiness({
        title,
        abstract,
        hasPrototype: proto,
        hasProduct: product,
        prototypeDescription:
          typeof prototypeDescription === 'string' ? prototypeDescription : undefined,
        commercialPotentialScore: aiAnalysis.commercialPotentialScore,
      });
      await dbStore.patents.update(String(newPatent._id), {
        trlLevel: readinessAssessment.trlLevel,
        readinessScore: readinessAssessment.readinessScore,
        readinessNotes: readinessAssessment.maturityLabel,
      });
    }

    const analysis = await dbStore.patentAnalysis.create({
      patentId: newPatent._id,
      ...aiAnalysis,
      ...(readinessAssessment ? { readinessAssessment } : {}),
    });

    // Write audit log
    await dbStore.auditLogs.create({
      userId: authReq.user!.id,
      action: 'PATENT_REGISTRATION',
      details: `Registered pending patent ${patentNumber}: "${title}"`
    });

    return res.status(201).json({
      message: 'Patent registered successfully and sent for AI/Admin review.',
      patent: await dbStore.patents.findById(String(newPatent._id)),
      analysis,
      readinessPrompt: {
        question: 'Do you have a prototype or a product based on this patent?',
        answered: proto || product || !!prototypeDescription,
      },
    });

  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to register patent.', error: error.message });
  }
}

// Get Owner Portfolio
export async function getMyPortfolio(req: Request, res: Response) {
  try {
    const authReq = req as IAuthRequest;
    const patents = await dbStore.patents.find({ ownerId: authReq.user!.id });
    
    const patentsWithAnalysis = [];
    for (const p of patents) {
      const analysis = await dbStore.patentAnalysis.findOne({ patentId: String(p._id) });
      patentsWithAnalysis.push({
        ...p,
        analysis
      });
    }

    return res.json(patentsWithAnalysis);
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch portfolio.', error: error.message });
  }
}

// Get Pending Reviews (Admin only)
export async function getPendingPatents(req: Request, res: Response) {
  try {
    const status = req.query.status || 'pending';
    if (!['all', 'pending', 'approved', 'rejected', 'changes_requested'].includes(String(status))) {
      return res.status(400).json({ message: 'Invalid listing status.' });
    }
    const patents = await dbStore.patents.find(status === 'all' ? {} : { status });
    patents.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    
    const patentsWithAnalysis = [];
    for (const p of patents) {
      const analysis = await dbStore.patentAnalysis.findOne({ patentId: String(p._id) });
      const owner = await dbStore.users.findById(p.ownerId);
      
      patentsWithAnalysis.push({
        ...p,
        analysis,
        ownerName: owner ? owner.name : 'Unknown Owner',
        ownerOrganization: owner ? owner.organization : 'N/A'
      });
    }

    return res.json(patentsWithAnalysis);
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch pending patents.', error: error.message });
  }
}

// Get Single Patent Details
export async function getPatentById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Reserved path segments must never be treated as Mongo ObjectIds
    const reserved = new Set([
      'featured',
      'pending',
      'reviews',
      'saved',
      'ai-match',
      'my-portfolio',
      'reanalyze-all',
    ]);
    if (reserved.has(String(id).toLowerCase())) {
      return res.status(404).json({ message: 'Patent route not found.' });
    }

    const patent = await dbStore.patents.findById(id);
    if (!patent) {
      return res.status(404).json({ message: 'Patent not found.' });
    }

    // Decode token if present
    let userId = '';
    let userRole = '';
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const verified = jwt.verify(token, JWT_SECRET) as any;
        const activeUser = typeof verified.id === 'string' ? await dbStore.users.findById(verified.id) : null;
        if (activeUser) { userId = String(activeUser._id); userRole = activeUser.role; }
      } catch (err) {}
    }

    if (patent.status !== 'approved' && userRole !== 'admin' && String(patent.ownerId) !== userId) {
      return res.status(404).json({ message: 'This listing is not available.' });
    }
    const enriched = await checkAccessAndEnrich(patent, userId, userRole);
    return res.json(enriched);
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch patent details.', error: error.message });
  }
}

// Review Patent (Admin only)
export async function reviewPatent(req: Request, res: Response) {
  try {
    const authReq = req as IAuthRequest;
    const { id } = req.params;
    const { status } = req.body;
    const notes = typeof req.body.notes === 'string' ? req.body.notes.trim() : '';

    if (!['approved', 'rejected', 'changes_requested'].includes(status)) {
      return res.status(400).json({ message: 'Invalid review status.' });
    }
    if (notes.length > 2000 || (status !== 'approved' && !notes)) {
      return res.status(400).json({ message: 'Explain the requested changes or rejection in up to 2,000 characters.' });
    }

    const patent = await dbStore.patents.findById(id);
    if (!patent) {
      return res.status(404).json({ message: 'Patent not found.' });
    }

    if (patent.status !== 'pending') {
      return res.status(409).json({ message: 'This listing has already been reviewed. Refresh the queue.' });
    }
    if (status === 'approved') {
      const evidence = validateListingEvidence(patent);
      if (!evidence.valid) return res.status(400).json({ message: `${evidence.message} Request changes from the inventor.` });
      if (req.body.grantVerified !== true) return res.status(400).json({ message: 'Check the official PDF and confirm the patent grant or design registration before publishing.' });
      if (req.body.reviewedPdfUrl !== patent.pdfUrl) return res.status(409).json({ message: 'The approval PDF changed. Refresh the listing and verify the current document.' });
    }
    const updated = await dbStore.patents.updateIfStatus(id, 'pending', {
      status,
      ...(status === 'approved' ? { grantReviewedAt: new Date(), grantReviewedBy: authReq.user!.id, grantReviewedPdfUrl: patent.pdfUrl } : {}),
      reviewHistory: [...(patent.reviewHistory || []), {
        status, notes, reviewerId: authReq.user!.id, reviewerName: authReq.user!.name, reviewedAt: new Date(),
      }],
    });
    if (!updated) return res.status(409).json({ message: 'Another reviewer updated this listing. Refresh the queue.' });

    await dbStore.auditLogs.create({
      userId: authReq.user!.id,
      action: `PATENT_REVIEW_${status.toUpperCase()}`,
      details: `Admin reviewed patent ${patent.patentNumber}: ${status}${notes ? `. Notes: ${notes}` : ''}`
    });

    return res.json({
      message: `Patent status updated to ${status}.`,
      patent: updated
    });

  } catch (error: any) {
    return res.status(500).json({ message: 'Patent review failed.', error: error.message });
  }
}

export async function resubmitPatent(req: Request, res: Response) {
  try {
    const user = (req as IAuthRequest).user!;
    const patent = await dbStore.patents.findById(req.params.id);
    if (!patent) return res.status(404).json({ message: 'Patent not found.' });
    if (String(patent.ownerId) !== user.id) return res.status(403).json({ message: 'Only the inventor can revise this listing.' });
    if (!['changes_requested', 'rejected'].includes(patent.status)) {
      return res.status(409).json({ message: 'Only listings returned for changes or rejected can be resubmitted.' });
    }
    const evidence = validateListingEvidence(req.body);
    if (!evidence.valid) return res.status(400).json({ message: evidence.message });
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const abstract = typeof req.body.abstract === 'string' ? req.body.abstract.trim() : '';
    const askingPrice = Number(req.body.askingPrice ?? patent.askingPrice ?? 0);
    const isForSale = req.body.isForSale === true;
    const isForLicense = req.body.isForLicense === true;
    if (!title || !abstract || !Number.isFinite(askingPrice) || askingPrice < 0 || (!isForSale && !isForLicense)) {
      return res.status(400).json({ message: 'Provide a title, abstract, valid asking price, and sale or licensing option.' });
    }
    const analysis = await analyzePatentWithAI(title, abstract);
    const hasPrototype = req.body.hasPrototype === true;
    const hasProduct = req.body.hasProduct === true;
    const prototypeDescription = typeof req.body.prototypeDescription === 'string' ? req.body.prototypeDescription.slice(0, 2000) : '';
    const readiness = hasPrototype || hasProduct || prototypeDescription ? await ratePrototypeReadiness({ title, abstract, hasPrototype, hasProduct, prototypeDescription, commercialPotentialScore: analysis.commercialPotentialScore }) : null;
    const updated = await dbStore.patents.updateIfStatus(req.params.id, patent.status, {
      title, abstract, askingPrice, isForSale, isForLicense, status: 'pending',
      ...evidence.value,
      hasPrototype, hasProduct, prototypeDescription,
      trlLevel: readiness?.trlLevel ?? null, readinessScore: readiness?.readinessScore ?? null, readinessNotes: readiness?.maturityLabel || '',
    });
    if (!updated) return res.status(409).json({ message: 'This listing changed while you were editing. Refresh your portfolio.' });
    await dbStore.patentAnalysis.upsert(req.params.id, { ...analysis, readinessAssessment: readiness });
    await dbStore.auditLogs.create({ userId: user.id, action: 'PATENT_RESUBMITTED', details: `Inventor resubmitted ${patent.patentNumber} for review.` });
    return res.json({ message: 'Your revised listing has been sent for review.', patent: updated });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to resubmit listing.', error: error.message });
  }
}

// Toggle Save Patent (Buyer only)
export async function toggleSavePatent(req: Request, res: Response) {
  try {
    const authReq = req as IAuthRequest;
    const { id } = req.params;

    const patent = await dbStore.patents.findById(id);
    if (!patent) {
      return res.status(404).json({ message: 'Patent not found.' });
    }

    const user = await dbStore.users.findById(authReq.user!.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    let saved = user.savedPatents || [];
    let isSavedNow = false;

    if (saved.includes(id)) {
      saved = saved.filter((pid: string) => pid !== id);
    } else {
      saved.push(id);
      isSavedNow = true;
    }

    await dbStore.users.update(authReq.user!.id, { savedPatents: saved });

    return res.json({
      message: isSavedNow ? 'Patent saved to bookmarks.' : 'Patent removed from bookmarks.',
      isSaved: isSavedNow,
      savedPatents: saved
    });

  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to bookmark patent.', error: error.message });
  }
}

// Get Saved Patents (Buyer only)
export async function getSavedPatents(req: Request, res: Response) {
  try {
    const authReq = req as IAuthRequest;
    const user = await dbStore.users.findById(authReq.user!.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const savedIds = user.savedPatents || [];
    const list = [];

    for (const pid of savedIds) {
      const p = await dbStore.patents.findById(pid);
      if (p && p.status === 'approved') {
        const analysis = await dbStore.patentAnalysis.findOne({ patentId: String(p._id) });
        const owner = await dbStore.users.findById(p.ownerId);
        list.push({
          ...p,
          analysis,
          ownerName: owner ? owner.name : 'Unknown Owner',
          ownerOrganization: owner ? owner.organization : 'N/A'
        });
      }
    }

    return res.json(list);
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch bookmarked patents.', error: error.message });
  }
}

// Re-run AI analysis for a single patent (owner or admin)
export async function reanalyzePatent(req: Request, res: Response) {
  try {
    const authReq = req as IAuthRequest;
    const { id } = req.params;

    const patent = await dbStore.patents.findById(id);
    if (!patent) {
      return res.status(404).json({ message: 'Patent not found.' });
    }

    const isOwner = String(patent.ownerId) === String(authReq.user!.id);
    const isAdmin = authReq.user!.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Only the patent owner or admin can re-run AI analysis.' });
    }

    console.log(`[AI] Re-analyzing patent ${patent.patentNumber}...`);
    const aiAnalysis = await analyzePatentWithAI(patent.title, patent.abstract);
    const analysis = await dbStore.patentAnalysis.upsert(String(patent._id), aiAnalysis);

    await dbStore.auditLogs.create({
      userId: authReq.user!.id,
      action: 'PATENT_REANALYZED',
      details: `AI analysis refreshed for patent ${patent.patentNumber} (score: ${analysis.commercialPotentialScore})`
    });

    return res.json({
      message: 'Patent re-analyzed successfully.',
      analysis
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to re-analyze patent.', error: error.message });
  }
}

// Re-run AI analysis for all patents (admin only)
export async function reanalyzeAllPatents(req: Request, res: Response) {
  try {
    const patents = await dbStore.patents.find();
    const results = [];

    for (const patent of patents) {
      console.log(`[AI] Re-analyzing patent ${patent.patentNumber}...`);
      const aiAnalysis = await analyzePatentWithAI(patent.title, patent.abstract);
      const analysis = await dbStore.patentAnalysis.upsert(String(patent._id), aiAnalysis);
      results.push({
        patentId: patent._id,
        patentNumber: patent.patentNumber,
        title: patent.title,
        commercialPotentialScore: analysis.commercialPotentialScore
      });
    }

    await dbStore.auditLogs.create({
      userId: (req as IAuthRequest).user!.id,
      action: 'PATENTS_BULK_REANALYZED',
      details: `Bulk AI re-analysis completed for ${results.length} patent(s).`
    });

    return res.json({
      message: `Re-analyzed ${results.length} patent(s) successfully.`,
      results
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to bulk re-analyze patents.', error: error.message });
  }
}
