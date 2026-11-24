import { Request, Response } from 'express';
import { dbStore, getUseMongo } from '../services/dbStore';
import { PatentAnalysisModel } from '../models/schemas';
import { IAuthRequest } from '../middleware/auth';
import { analyzePatentWithAI, queryJsonLLM, ratePrototypeReadiness, summarizeCardLines } from '../services/aiParser';
import {
  buildDuplicateDescriptionSet,
  comparePatentsByQualityThenScore,
  isQualityPatentAnalysis,
} from '../services/analysisQuality';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth';
import { validateListingEvidence } from '../services/listingRequirements';
import { enrichPatentForViewer, type EnrichPreload } from '../services/disclosure';
import { assessCommercialPotential, priceIntellectualProperty, toIndicativeValue } from '../services/commercialModel';
import { scoreDocsAgainstQuery } from '../services/semanticMatch';
import { recordMatchEvent } from '../services/matchFeedback';

async function checkAccessAndEnrich(
  p: any,
  userId: string,
  userRole: string,
  preload?: EnrichPreload
) {
  return enrichPatentForViewer(p, userId, userRole, preload);
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

const AI_MATCH_RESULT_LIMIT = 24;
const AI_REASON_LIMIT = 10;
const AI_MATCH_TIMEOUT_MS = 8000;

function isAiReasonList(value: any): value is Array<{ patentId: string; reason: string }> {
  return (
    Array.isArray(value) &&
    value.every(
      (match) =>
        match &&
        typeof match.patentId === 'string' &&
        typeof match.reason === 'string' &&
        match.reason.trim().length > 0
    )
  );
}

/** Rank every approved listing by meaning. Fit % never includes commercial score. */
function rankSemanticMatches(patents: any[], analysisMap: Map<string, any>, query: string) {
  const fits = scoreDocsAgainstQuery(
    query,
    patents.map((patent) => ({
      patent,
      analysis: analysisMap.get(String(patent._id)) || null,
    })),
    { minFit: 24 }
  );
  const byId = new Map(fits.map((row) => [row.patentId, row]));
  return patents
    .map((patent) => {
      const analysis = analysisMap.get(String(patent._id)) ?? null;
      const fit = byId.get(String(patent._id));
      if (!fit) return null;
      const matchReason =
        fit.reasonHints[0] ||
        (fit.topicOverlap.length
          ? `Same focus as your search: ${fit.topicOverlap.slice(0, 2).join(', ')}.`
          : 'Close in meaning to what you described.');
      return {
        patent,
        analysis,
        matchPercentage: fit.fitScore,
        matchReason,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.matchPercentage - a.matchPercentage) as Array<{
    patent: any;
    analysis: any;
    matchPercentage: number;
    matchReason: string;
  }>;
}

// Get approved patents for marketplace (paginated)
export async function getMarketplacePatents(req: Request, res: Response) {
  try {
    const { query, industry, status, ipType, deal, trlMin, priceMin, priceMax } = req.query;
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

    if (ipType && ['utility_patent', 'design', 'other'].includes(String(ipType))) {
      filtered = filtered.filter((p) => p.ipType === String(ipType));
    }

    if (deal === 'sale') {
      filtered = filtered.filter((p) => p.isForSale !== false);
    } else if (deal === 'license') {
      filtered = filtered.filter((p) => p.isForLicense !== false);
    }

    const minTrl = Number(trlMin);
    if (Number.isFinite(minTrl) && minTrl >= 1 && minTrl <= 9) {
      filtered = filtered.filter((p) => {
        const trl = p.trlLevel ?? analysisMap.get(String(p._id))?.readinessAssessment?.trlLevel;
        return Number.isFinite(trl) && Number(trl) >= minTrl;
      });
    }

    const minPrice = Number(priceMin);
    const maxPrice = Number(priceMax);
    if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
      filtered = filtered.filter((p) => {
        const ask = Number(p.askingPrice) || 0;
        if (ask <= 0) return true;
        if (Number.isFinite(minPrice) && ask < minPrice) return false;
        if (Number.isFinite(maxPrice) && ask > maxPrice) return false;
        return true;
      });
    }

    if (query) {
      const ranked = rankSemanticMatches(filtered, analysisMap, String(query).trim());
      filtered = ranked
        .sort((a, b) => {
          if (b.matchPercentage !== a.matchPercentage) return b.matchPercentage - a.matchPercentage;
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
    // Always rank by meaning first. Commercial score is never mixed into fit %.
    let ranked = rankSemanticMatches(patents, analysisMap, query.trim());
    ranked = await attachAiMatchReasons(query.trim(), ranked);

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

/** LLM only writes why-lines for the top semantic hits. It does not re-rank. */
async function attachAiMatchReasons(
  query: string,
  ranked: Array<{ patent: any; analysis: any; matchPercentage: number; matchReason: string }>
) {
  const top = ranked.slice(0, AI_REASON_LIMIT);
  if (!top.length) return ranked;

  const candidates = top.map((row) => ({
    id: String(row.patent._id),
    title: row.patent.title,
    summary: (row.patent.publicSummary || []).slice(0, 3),
    industries: (row.analysis?.industryClassification || []).slice(0, 3),
    fitScore: row.matchPercentage,
  }));

  const prompt = `Explain why each patent fits the buyer need. Do not change the ranking or invent a new score.
Buyer need: "${query.replace(/"/g, "'").slice(0, 500)}"
Patents:
${JSON.stringify(candidates)}
Return ONLY JSON: [{"patentId": string, "reason": string}]
Each reason is one short sentence. Do not quote the abstract.`;

  const reasons = await queryJsonLLM(prompt, {
    timeoutMs: AI_MATCH_TIMEOUT_MS,
    thinkingBudget: 0,
    singleProvider: true,
  });
  if (!isAiReasonList(reasons)) return ranked;

  const byId = new Map(reasons.map((row) => [String(row.patentId), String(row.reason).trim()]));
  return ranked.map((row) => {
    const reason = byId.get(String(row.patent._id));
    return reason ? { ...row, matchReason: reason } : row;
  });
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
      if (row.status === 'accepted' || row.status === 'pending') meetingIds.add(String(row.patentId));
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
    const publicSummary = await summarizeCardLines(title, abstract);
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
      publicSummary,
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
      const assessment = assessCommercialPotential({
        title: p.title,
        abstract: p.abstract,
        industries: analysis?.industryClassification,
        hasPrototype: p.hasPrototype,
        hasProduct: p.hasProduct,
        trlLevel: p.trlLevel ?? analysis?.readinessAssessment?.trlLevel,
        prototypeDescription: p.prototypeDescription,
      });
      const indicativeValue = toIndicativeValue(priceIntellectualProperty({
        title: p.title,
        abstract: p.abstract,
        industries: analysis?.industryClassification,
        hasPrototype: p.hasPrototype,
        hasProduct: p.hasProduct,
        trlLevel: p.trlLevel ?? analysis?.readinessAssessment?.trlLevel,
        askingPrice: p.askingPrice,
        isForSale: p.isForSale,
        isForLicense: p.isForLicense,
        filingYear: analysis?.filingYear,
        assessment,
      }));
      patentsWithAnalysis.push({
        ...p,
        detailsVisible: true,
        indicativeValue,
        analysis: analysis
          ? {
              ...analysis,
              commercialPotentialScore: assessment.commercialPotentialScore,
              commercialBreakdown: assessment.commercialBreakdown,
              scoreRationale: assessment.scoreRationale,
              scoreEvidence: assessment.scoreEvidence,
            }
          : {
              commercialPotentialScore: assessment.commercialPotentialScore,
              commercialBreakdown: assessment.commercialBreakdown,
              scoreRationale: assessment.scoreRationale,
              industryClassification: [assessment.domain],
            },
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
    const publicSummary = await summarizeCardLines(title, abstract);
    const hasPrototype = req.body.hasPrototype === true;
    const hasProduct = req.body.hasProduct === true;
    const prototypeDescription = typeof req.body.prototypeDescription === 'string' ? req.body.prototypeDescription.slice(0, 2000) : '';
    const readiness = hasPrototype || hasProduct || prototypeDescription ? await ratePrototypeReadiness({ title, abstract, hasPrototype, hasProduct, prototypeDescription, commercialPotentialScore: analysis.commercialPotentialScore }) : null;
    const updated = await dbStore.patents.updateIfStatus(req.params.id, patent.status, {
      title, abstract, askingPrice, isForSale, isForLicense, status: 'pending',
      ...evidence.value,
      hasPrototype, hasProduct, prototypeDescription,
      trlLevel: readiness?.trlLevel ?? null, readinessScore: readiness?.readinessScore ?? null, readinessNotes: readiness?.maturityLabel || '',
      publicSummary,
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
    if (isSavedNow) {
      try {
        await recordMatchEvent({ userId: authReq.user!.id, patentId: id, event: 'save' });
      } catch {
        /* non-blocking */
      }
    }

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
        list.push(await checkAccessAndEnrich(p, authReq.user!.id, authReq.user!.role, {
          analysis: await dbStore.patentAnalysis.findOne({ patentId: String(p._id) }),
          owner: await dbStore.users.findById(p.ownerId),
        }));
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
    const publicSummary = await summarizeCardLines(patent.title, patent.abstract);
    await dbStore.patents.update(String(patent._id), { publicSummary });
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
