import {
  assessCommercialPotential,
  coarseDomains,
  priceIntellectualProperty,
  publicLines,
  spreadBreakdownAroundScore,
  technicalThemes,
} from './commercialModel';

export interface IAISummary {
  description: string;
  problemSolved: string;
  commercialValue: string;
  keyInnovation: string;
}

export interface IAIApplications {
  potentialIndustries: string[];
  useCases: string[];
  adoptionOpportunities: string[];
}

export interface IPatentAIAnalysis {
  summary: IAISummary;
  industryClassification: string[];
  keywords: string[];
  commercialApplications: IAIApplications;
  commercialPotentialScore: number;
  potentialBuyers?: string[];
  marketOpportunity?: string;
  filingYear?: number;
  scoreRationale?: string;
  commercialBreakdown?: {
    technicalFeasibility: number;
    marketDemand: number;
    implementationSpeed: number;
    licensingValue: number;
    ipProtection: number;
  };
}

// Local score when the model is unreachable. Uses the filing text, not a shared industry template.
function getLocalFallback(title: string, abstract: string): IPatentAIAnalysis {
  const assessment = assessCommercialPotential({ title, abstract });
  const domains = coarseDomains([], title, abstract);
  const themes = technicalThemes(title, abstract, 5);
  const clean = abstract.replace(/\s*\(\d+[-a-zA-Z0-9]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
  const description = (sentences.slice(0, 2).join(' ') || title).slice(0, 480);
  const problemSentence = sentences.find((sentence) => /problem|challenge|limitation|existing|traditional|conventional/i.test(sentence));
  return {
    summary: {
      description,
      problemSolved: problemSentence || `The listing addresses a practical gap in ${domains[0].toLowerCase()}.`,
      keyInnovation: themes.length ? `The disclosure centers on ${themes.slice(0, 3).join(', ')}.` : title,
      commercialValue: assessment.scoreRationale,
    },
    industryClassification: domains,
    keywords: themes.length ? themes : [domains[0].toLowerCase()],
    commercialApplications: {
      potentialIndustries: domains,
      useCases: sentences.slice(0, 2).length
        ? sentences.slice(0, 2).map((sentence) => sentence.slice(0, 180))
        : [`Evaluation for ${domains[0].toLowerCase()} adoption`],
      adoptionOpportunities: assessment.commercialPotentialScore >= 75
        ? ['Licensing', 'Strategic partnership']
        : ['Pilot licensing', 'Collaborative development'],
    },
    commercialPotentialScore: assessment.commercialPotentialScore,
    commercialBreakdown: assessment.commercialBreakdown,
    scoreRationale: assessment.scoreRationale,
    potentialBuyers: [`${domains[0]} operators`, `Specialist ${domains[0].toLowerCase()} companies`],
    marketOpportunity: assessment.scoreRationale,
  };
}

function buildAnalysisPrompt(title: string, abstract: string): string {
  return `You are a world-class patent commercialization analyst. Analyze the patent titled "${title}" with abstract: "${abstract}".

Provide a comprehensive commercial readiness analysis. You MUST return ONLY a valid JSON object matching this TypeScript interface:
{
  summary: {
    description: string; // 1-2 sentence description of what the technology does. Do NOT include any patent reference numerals (like (100), (200), (102-4)) or bracketed labels. Make it clean and professional.
    problemSolved: string; // What problem it solves compared to legacy methods.
    commercialValue: string; // What is the commercial value proposition (gains, reductions).
    keyInnovation: string; // Key technological novelty.
  },
  industryClassification: string[]; // List of primary industries, e.g. ["AI", "Healthcare", "FinTech", "Energy", "Robotics", "Agriculture", "Manufacturing"]
  keywords: string[]; // 3-5 tech keywords
  commercialApplications: {
    potentialIndustries: string[]; // Commercial industries that could adopt it
    useCases: string[]; // 2-3 concrete business use cases
    adoptionOpportunities: string[]; // 2-3 licensing/integration opportunities (e.g. ["Licensing", "Strategic Partnership", "Joint Research", "Technology Transfer"])
  },
  commercialPotentialScore: number; // 0 to 100. Score this patent from its abstract. Do not reuse a default industry score.
  scoreRationale: string; // One sentence naming the strongest and weakest factor, quoting a short phrase from the abstract.
  potentialBuyers: string[]; // 3-4 target buyers/licensees, e.g. ["Pharmaceutical Companies", "Hospitals"]
  marketOpportunity: string; // A 2-3 sentence market opportunity summary highlighting market needs
  filingYear: number; // The approximate/actual filing year of this patent, e.g. 2021
  commercialBreakdown: { // Independent sub-scores. They must not all sit within 10 points of the headline score.
    technicalFeasibility: number;
    marketDemand: number;
    implementationSpeed: number;
    licensingValue: number;
    ipProtection: number;
  }
}

IMPORTANT: Return ONLY the raw JSON string starting with "{" and ending with "}". Do NOT wrap the JSON inside markdown code blocks (do not use \`\`\`json ... \`\`\`). Do NOT include any introductory or wrap-up text.`;
}

function normalizeParsedAnalysis(parsed: IPatentAIAnalysis, title: string, abstract: string): IPatentAIAnalysis {
  if (!parsed.potentialBuyers) parsed.potentialBuyers = parsed.commercialApplications?.potentialIndustries || [];
  if (!parsed.marketOpportunity) {
    parsed.marketOpportunity = parsed.summary?.commercialValue || 'This technology presents high potential for integration into enterprise systems.';
  }
  if (!parsed.filingYear) parsed.filingYear = 2022;

  const assessment = assessCommercialPotential({
    title,
    abstract,
    industries: parsed.industryClassification,
  });
  const breakdown = parsed.commercialBreakdown;
  const values = breakdown
    ? [
        breakdown.technicalFeasibility,
        breakdown.marketDemand,
        breakdown.implementationSpeed,
        breakdown.licensingValue,
        breakdown.ipProtection,
      ]
    : [];
  const spread = values.length ? Math.max(...values) - Math.min(...values) : 0;
  if (!breakdown || spread < 12) {
    parsed.commercialBreakdown = spreadBreakdownAroundScore(assessment, parsed.commercialPotentialScore);
  }
  if (!parsed.scoreRationale) parsed.scoreRationale = assessment.scoreRationale;
  parsed.commercialPotentialScore = Math.min(100, Math.max(0, Math.round(parsed.commercialPotentialScore)));

  return parsed;
}

function parseAnalysisJson(rawContent: string, title: string, abstract: string): IPatentAIAnalysis {
  let cleanJson = rawContent.trim();
  if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```(json)?/, '').replace(/```$/, '').trim();
  }

  const parsed = JSON.parse(cleanJson) as IPatentAIAnalysis;
  if (!parsed.summary || !parsed.industryClassification || !parsed.commercialApplications || typeof parsed.commercialPotentialScore !== 'number') {
    throw new Error('Parsed JSON is missing required structure fields.');
  }

  return normalizeParsedAnalysis(parsed, title, abstract);
}

// Live LLM query wrapper
export async function analyzePatentWithAI(title: string, abstract: string): Promise<IPatentAIAnalysis> {
  const parsed = await queryJsonLLM(buildAnalysisPrompt(title, abstract));
  if (parsed) {
    try {
      return parseAnalysisJson(JSON.stringify(parsed), title, abstract);
    } catch (err: any) {
      console.warn(`[AI] Invalid patent analysis response: ${err.message}`);
    }
  }
  console.log('[AI] Falling back to local diagnostics.');
  return getLocalFallback(title, abstract);
}

// Google validates the credential; accepted key formats can change over time.
export type JsonLlmOptions = {
  timeoutMs?: number;
  thinkingBudget?: number;
  /** Do not try a second provider after the first one fails. */
  singleProvider?: boolean;
};

export async function queryGeminiLLM(
  prompt: string,
  apiKey: string,
  options?: Pick<JsonLlmOptions, 'timeoutMs' | 'thinkingBudget'>
): Promise<any> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) throw new Error('GEMINI_API_KEY is missing.');

  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const generationConfig: Record<string, unknown> = {
    responseMimeType: 'application/json',
  };
  if (typeof options?.thinkingBudget === 'number') {
    generationConfig.thinkingConfig = { thinkingBudget: options.thinkingBudget };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': trimmedKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig,
    }),
    signal: AbortSignal.timeout(options?.timeoutMs ?? 45000)
  });

  if (!response.ok) {
    // Do not include provider response bodies: they may echo credentials.
    throw new Error(`Google Gemini API returned HTTP ${response.status}. Check the credential, model access, and quota.`);
  }

  const data = await response.json() as any;
  const rawContent = (data.candidates?.[0]?.content?.parts || [])
    .filter((part: any) => typeof part.text === 'string' && !part.thought)
    .map((part: any) => part.text).join('');
  if (!rawContent) {
    throw new Error('Google Gemini API returned empty content.');
  }

  let cleanJson = rawContent.trim();
  if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```(json)?/, '').replace(/```$/, '').trim();
  }

  return JSON.parse(cleanJson);
}

// ---------------------------------------------------------------------------
// Shared LLM JSON helper (Gemini primary → MIET LLM → local fallback)
// ---------------------------------------------------------------------------

export async function queryJsonLLM(prompt: string, options?: JsonLlmOptions): Promise<any | null> {
  const provider = (process.env.AI_ANALYSIS_PROVIDER || '').trim().toLowerCase();
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  const apiKey = process.env.LLM_API_KEY?.trim();
  const endpoint = process.env.LLM_API_ENDPOINT || 'https://ai-services.mietjmu.in/gateway/llm/chat';
  const modelName = process.env.LLM_MODEL || 'qwen3:latest';
  const preferGemini = !!geminiApiKey && !['miet', 'llm'].includes(provider);

  if (preferGemini && geminiApiKey) {
    try {
      return await queryGeminiLLM(prompt, geminiApiKey, options);
    } catch (err: any) {
      console.warn(`[AI] Gemini JSON query failed: ${err.message}`);
      if (options?.singleProvider) return null;
    }
  }

  if (apiKey) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
        }),
        signal: AbortSignal.timeout(options?.timeoutMs ?? 25000),
      });
      if (!response.ok) throw new Error(`Gateway HTTP ${response.status}`);
      const data = (await response.json()) as any;
      const raw = data.choices?.[0]?.message?.content || data.message?.content || '';
      if (!raw) throw new Error('Empty LLM content');
      let clean = raw.trim();
      if (clean.startsWith('```')) {
        clean = clean.replace(/^```(json)?/, '').replace(/```$/, '').trim();
      }
      return JSON.parse(clean);
    } catch (err: any) {
      console.warn(`[AI] LLM JSON query failed: ${err.message}`);
      if (options?.singleProvider) return null;
    }
  }

  if (geminiApiKey && !preferGemini) {
    try {
      return await queryGeminiLLM(prompt, geminiApiKey, options);
    } catch (err: any) {
      console.warn(`[AI] Gemini fallback JSON failed: ${err.message}`);
    }
  }

  return null;
}

function summaryIsParaphrase(lines: string[], title: string, abstract: string): boolean {
  const words = `${title} ${abstract}`.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((word) => word.length > 2);
  const grams = new Set<string>();
  for (let i = 0; i < words.length - 4; i += 1) grams.add(words.slice(i, i + 5).join(' '));
  return lines.every((line) => {
    const parts = line.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    for (let i = 0; i < parts.length - 4; i += 1) {
      if (grams.has(parts.slice(i, i + 5).join(' '))) return false;
    }
    return true;
  });
}

function normalizeSummaryLines(parsed: any, title: string, abstract: string): string[] | null {
  const raw = Array.isArray(parsed?.lines) ? parsed.lines : Array.isArray(parsed) ? parsed : null;
  if (!raw) return null;
  const lines = raw.slice(0, 3).map((line: unknown) => String(line || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (lines.length !== 3) return null;
  const fitted = lines.map((line: string) => {
    let text = line.replace(/^["']|["']$/g, '').replace(/[.!?]+$/, '').trim();
    if (text.length > 58) {
      const cut = text.slice(0, 58);
      const space = cut.lastIndexOf(' ');
      text = (space > 24 ? cut.slice(0, space) : cut).replace(/\b(a|an|the|and|or|of|for|with|to|from)$/i, '').trim();
    }
    if (text.split(/\s+/).length < 4) return '';
    return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
  });
  if (fitted.some((line: string) => !line)) return null;
  if (!summaryIsParaphrase(fitted, title, abstract)) return null;
  return fitted;
}

/** Three short paraphrased lines. Falls back to a local summary if the model is unavailable. */
export async function summarizeCardLines(title: string, abstract: string): Promise<string[]> {
  const prompt = `Rewrite this patent as a marketplace summary. Do not quote the abstract.
Return JSON only: {"lines":["sentence","sentence","sentence"]}
Rules:
- Exactly 3 sentences.
- Each sentence is 6 to 10 words and under 55 characters.
- Line 1: what the invention does.
- Line 2: how it does it, in plain words.
- Line 3: the practical result.
- Paraphrase. Do not reuse five words in a row from the title or abstract.
- No inventor, patent number, "disclosed", "comprising", or "embodiment".

Title: ${title}
Abstract: ${abstract.slice(0, 1800)}`;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parsed = await queryJsonLLM(prompt, { timeoutMs: 30000, thinkingBudget: 0 });
    const lines = normalizeSummaryLines(parsed, title, abstract);
    if (lines) return lines;
  }
  return publicLines({ title, abstract });
}

export interface IIPPricingGuidance {
  suggestedSaleMinInr: number;
  suggestedSaleMaxInr: number;
  suggestedLicenseAnnualInr: number;
  currency: string;
  confidence: number;
  rationale: string;
  pricingFactors: string[];
  comparableNote?: string;
  generatedAt: Date;
}

export interface IReadinessAssessmentResult {
  trlLevel: number;
  readinessScore: number;
  maturityLabel: string;
  strengths: string[];
  gaps: string[];
  nextSteps: string[];
  generatedAt: Date;
}

type PricingContext = {
  title: string;
  abstract: string;
  industryClassification?: string[];
  keywords?: string[];
  keyInnovation?: string;
  problemSolved?: string;
  useCases?: string[];
  commercialPotentialScore?: number;
  commercialBreakdown?: IPatentAIAnalysis['commercialBreakdown'];
  hasPrototype?: boolean;
  hasProduct?: boolean;
  askingPrice?: number;
  marketOpportunity?: string;
  trlLevel?: number;
};

function extractAbstractSnippet(abstract: string, maxLen = 140): string {
  const clean = abstract.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const sentence = clean.split(/(?<=[.!?])\s+/)[0] || clean;
  return sentence.length > maxLen ? `${sentence.slice(0, maxLen - 1)}…` : sentence;
}

function extractPatentKeywords(title: string, abstract: string, extra: string[] = []): string[] {
  const stop = new Set([
    'about', 'after', 'also', 'based', 'being', 'between', 'comprising', 'configured',
    'device', 'method', 'patent', 'present', 'system', 'thereof', 'using', 'wherein', 'which',
    'with', 'within', 'would', 'their', 'these', 'those', 'through', 'under', 'such',
  ]);
  const tokens = `${title} ${abstract} ${extra.join(' ')}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 4 && !stop.has(w));
  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([w]) => w);
}

function sectorMultiplier(
  title: string,
  abstract: string,
  industries: string[] = []
): { mult: number; label: string } {
  const t = `${title} ${abstract} ${industries.join(' ')}`.toLowerCase();
  if (t.match(/health|medic|pharma|clinical|radiolog|diagnos/)) {
    return { mult: 1.35, label: 'Healthcare / med-tech' };
  }
  if (t.match(/semiconductor|battery|energy|solar|power/)) {
    return { mult: 1.3, label: 'Deep-tech hardware / energy' };
  }
  if (t.match(/ai|machine learning|neural|computer vision|llm/)) {
    return { mult: 1.25, label: 'AI / software IP' };
  }
  if (t.match(/iot|cyber|security|privacy|network/)) {
    return { mult: 1.2, label: 'Cyber / IoT security' };
  }
  if (t.match(/wearable|sensor|gait|footwear|biomech/)) {
    return { mult: 1.22, label: 'Wearables / sensing' };
  }
  if (t.match(/agri|food|water|environment/)) {
    return { mult: 1.1, label: 'Agri / sustainability' };
  }
  const primary = industries[0] || 'General technology';
  return { mult: 1, label: primary };
}

function maturityBand(hasProduct: boolean, hasPrototype: boolean, trlLevel?: number): {
  mult: number;
  label: string;
} {
  if (hasProduct || (trlLevel && trlLevel >= 8)) {
    return { mult: 1.55, label: 'Product or late-stage prototype (TRL 8+)' };
  }
  if (hasPrototype || (trlLevel && trlLevel >= 5)) {
    return { mult: 1.28, label: 'Working prototype validated (TRL 5–7)' };
  }
  if (trlLevel && trlLevel >= 3) {
    return { mult: 1.05, label: 'Proof-of-concept / lab validation (TRL 3–4)' };
  }
  return { mult: 0.82, label: 'Concept or early lab stage (TRL 1–2)' };
}

function buildPatentSpecificRationale(ctx: PricingContext, min: number, max: number): string {
  const snippet = extractAbstractSnippet(ctx.abstract);
  const keywords = extractPatentKeywords(ctx.title, ctx.abstract, ctx.keywords || []);
  const sector = sectorMultiplier(ctx.title, ctx.abstract, ctx.industryClassification);
  const maturity = maturityBand(!!ctx.hasProduct, !!ctx.hasPrototype, ctx.trlLevel);
  const score = ctx.commercialPotentialScore ?? 70;
  const invention =
    ctx.keyInnovation?.trim() ||
    snippet ||
    `the invention described in "${ctx.title}"`;

  return [
    `For "${ctx.title}", pricing reflects ${sector.label} comparables and ${maturity.label.toLowerCase()}.`,
    `The core IP covers ${invention}`,
    keywords.length > 0
      ? `Key technical themes (${keywords.slice(0, 4).join(', ')}) support a ${formatInrShort(min)}–${formatInrShort(max)} outright-sale band at commercial score ${score}/100.`
      : `Commercial score ${score}/100 supports a ${formatInrShort(min)}–${formatInrShort(max)} indicative band.`,
    'This is AI guidance for negotiation — not a formal valuation certificate.',
  ].join(' ');
}

function buildPatentSpecificFactors(ctx: PricingContext): string[] {
  const sector = sectorMultiplier(ctx.title, ctx.abstract, ctx.industryClassification);
  const maturity = maturityBand(!!ctx.hasProduct, !!ctx.hasPrototype, ctx.trlLevel);
  const keywords = extractPatentKeywords(ctx.title, ctx.abstract, ctx.keywords || []);
  const factors = [
    `Sector: ${sector.label} — derived from patent text and industries`,
    `Maturity: ${maturity.label}`,
    `Commercial potential: ${ctx.commercialPotentialScore ?? 70}/100`,
  ];
  if (keywords.length > 0) {
    factors.push(`Technical focus in abstract: ${keywords.slice(0, 4).join(', ')}`);
  }
  if (ctx.problemSolved?.trim()) {
    factors.push(`Problem addressed: ${extractAbstractSnippet(ctx.problemSolved, 100)}`);
  }
  if (ctx.useCases?.length) {
    factors.push(`Primary use case: ${ctx.useCases[0]}`);
  }
  if (ctx.askingPrice && ctx.askingPrice > 0) {
    factors.push(`Your listed asking price: ${formatInrShort(ctx.askingPrice)} (used as anchor)`);
  }
  return factors.slice(0, 6);
}

function formatInrShort(amount: number): string {
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(1)} Cr`;
  if (amount >= 100_000) return `₹${Math.round(amount / 100_000)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

function rationaleGroundingScore(rationale: string, title: string, abstract: string): number {
  const hay = `${title} ${abstract}`.toLowerCase();
  const keywords = extractPatentKeywords(title, abstract);
  if (!rationale?.trim() || keywords.length === 0) return 0;
  const lower = rationale.toLowerCase();
  let hits = 0;
  for (const kw of keywords) {
    if (lower.includes(kw)) hits++;
  }
  if (lower.includes(title.toLowerCase().slice(0, Math.min(20, title.length)))) hits += 2;
  return hits;
}

function heuristicPricing(ctx: PricingContext): IIPPricingGuidance {
  const assessment = assessCommercialPotential({
    title: ctx.title,
    abstract: ctx.abstract,
    industries: ctx.industryClassification,
    hasPrototype: ctx.hasPrototype,
    hasProduct: ctx.hasProduct,
    trlLevel: ctx.trlLevel,
  });
  return priceIntellectualProperty({
    title: ctx.title,
    abstract: ctx.abstract,
    industries: ctx.industryClassification,
    hasPrototype: ctx.hasPrototype,
    hasProduct: ctx.hasProduct,
    trlLevel: ctx.trlLevel,
    askingPrice: ctx.askingPrice,
    filingYear: undefined,
    assessment,
  });
}

function heuristicReadiness(
  hasPrototype: boolean,
  hasProduct: boolean,
  prototypeDescription?: string,
  commercialPotentialScore = 70
): IReadinessAssessmentResult {
  let trl = 3;
  if (hasProduct) trl = 8;
  else if (hasPrototype) trl = prototypeDescription && prototypeDescription.length > 80 ? 6 : 5;
  else trl = 3;

  const readinessScore = Math.min(
    100,
    Math.round(trl * 9 + commercialPotentialScore * 0.25 + (hasProduct ? 12 : hasPrototype ? 6 : 0))
  );

  const labels: Record<number, string> = {
    1: 'Basic principles',
    2: 'Technology concept',
    3: 'Proof of concept',
    4: 'Lab validation',
    5: 'Relevant environment validation',
    6: 'Demo prototype',
    7: 'System prototype',
    8: 'System complete / qualified',
    9: 'Operational product',
  };

  return {
    trlLevel: trl,
    readinessScore,
    maturityLabel: labels[trl] || 'Emerging',
    strengths: [
      hasProduct ? 'Product already in market or production' : hasPrototype ? 'Prototype available for demos' : 'Clear technical concept documented',
      `Commercial potential signal: ${commercialPotentialScore}/100`,
    ],
    gaps: hasProduct
      ? ['Document scale-up and regulatory evidence for buyers']
      : hasPrototype
        ? ['Bridge prototype to pilot customers', 'Collect performance benchmarks']
        : ['Build a working prototype', 'Define pilot use-case and KPIs'],
    nextSteps: hasProduct
      ? ['Package case studies', 'Set license vs sale strategy', 'Prepare diligence data room']
      : hasPrototype
        ? ['Run a paid pilot', 'File follow-on claims if needed', 'Request AI pricing guidance']
        : ['Confirm lab PoC', 'Decide make-vs-license path', 'Capture prototype photos/video'],
    generatedAt: new Date(),
  };
}

/** AI guidance for IP sale / license pricing (inventors). */
export async function estimateIPPricing(input: PricingContext): Promise<IIPPricingGuidance> {
  const score = input.commercialPotentialScore ?? 70;
  const keywords = extractPatentKeywords(input.title, input.abstract, input.keywords || []);

  const prompt = `You are an Indian IP valuation advisor for university inventors and SMEs.
Estimate indicative OUTRIGHT SALE and ANNUAL LICENSE pricing in INR for THIS specific patent only.
Guidance only — not a formal appraisal.

PATENT RECORD (use only this — do not invent unrelated technology):
Title: ${input.title}
Abstract: ${input.abstract}
Key innovation: ${input.keyInnovation || 'See abstract'}
Problem solved: ${input.problemSolved || 'See abstract'}
Industries: ${(input.industryClassification || []).join(', ') || 'General'}
Keywords: ${keywords.join(', ') || 'n/a'}
Use cases: ${(input.useCases || []).slice(0, 3).join('; ') || 'n/a'}
Commercial potential: ${score}/100
Breakdown: ${JSON.stringify(input.commercialBreakdown || {})}
TRL / maturity: ${input.trlLevel ?? 'unknown'} | Prototype: ${!!input.hasPrototype} | Product: ${!!input.hasProduct}
Inventor asking price (INR): ${input.askingPrice || 0}
Market note: ${input.marketOpportunity || 'n/a'}

INDIA BENCHMARKS (indicative):
- Early concept (TRL 1–3): sale ₹15L–75L, license ₹2L–8L/yr
- Validated prototype (TRL 4–6): sale ₹50L–2Cr, license ₹5L–20L/yr
- Product-ready (TRL 7–9): sale ₹1Cr–5Cr+, license ₹10L–50L/yr
Adjust within these bands using sector demand, IP strength, and the abstract specifics.

STRICT RULES:
1. rationale MUST mention the patent title OR quote a phrase from the abstract AND reference at least one technical theme (${keywords.slice(0, 4).join(', ') || 'from abstract'}).
2. pricingFactors MUST each explain why THIS patent earns that factor — no generic bullets like "high market demand" without tying to "${input.title}".
3. Do NOT discuss technologies not present in the title/abstract above.
4. suggestedSaleMinInr must be less than suggestedSaleMaxInr. All amounts in INR integers.

Return ONLY JSON:
{
  "suggestedSaleMinInr": number,
  "suggestedSaleMaxInr": number,
  "suggestedLicenseAnnualInr": number,
  "currency": "INR",
  "confidence": number,
  "rationale": string,
  "pricingFactors": string[],
  "comparableNote": string
}`;

  const fallback = heuristicPricing(input);
  const parsed = await queryJsonLLM(prompt);

  if (
    parsed &&
    typeof parsed.suggestedSaleMinInr === 'number' &&
    typeof parsed.suggestedSaleMaxInr === 'number' &&
    parsed.suggestedSaleMinInr < parsed.suggestedSaleMaxInr
  ) {
    const min = Math.round(parsed.suggestedSaleMinInr);
    const max = Math.round(parsed.suggestedSaleMaxInr);
    const llmRationale = typeof parsed.rationale === 'string' ? parsed.rationale.trim() : '';
    const grounded = rationaleGroundingScore(llmRationale, input.title, input.abstract) >= 2;
    const rationale = grounded
      ? llmRationale
      : buildPatentSpecificRationale(input, min, max);
    const factors =
      Array.isArray(parsed.pricingFactors) && parsed.pricingFactors.length >= 2 && grounded
        ? parsed.pricingFactors
        : buildPatentSpecificFactors(input);

    return {
      suggestedSaleMinInr: min,
      suggestedSaleMaxInr: max,
      suggestedLicenseAnnualInr: Math.round(
        parsed.suggestedLicenseAnnualInr || min * 0.1
      ),
      currency: 'INR',
      confidence: Math.min(
        100,
        Math.max(0, Math.round((parsed.confidence ?? 68) - (grounded ? 0 : 12)))
      ),
      rationale,
      pricingFactors: factors,
      comparableNote:
        parsed.comparableNote ||
        fallback.comparableNote,
      generatedAt: new Date(),
    };
  }

  return fallback;
}

/** Rate prototype / product readiness (TRL + score) after inventor declares maturity. */
export async function ratePrototypeReadiness(input: {
  title: string;
  abstract: string;
  hasPrototype: boolean;
  hasProduct: boolean;
  prototypeDescription?: string;
  commercialPotentialScore?: number;
}): Promise<IReadinessAssessmentResult> {
  const score = input.commercialPotentialScore ?? 70;
  const prompt = `You are a technology readiness (TRL) assessor for patents.
Inventor declared: hasPrototype=${input.hasPrototype}, hasProduct=${input.hasProduct}.
Prototype / product notes: ${input.prototypeDescription || 'none provided'}

Patent: ${input.title}
Abstract: ${input.abstract}
Commercial potential score: ${score}/100

Return ONLY JSON:
{
  "trlLevel": number, // 1-9 NASA/ISO TRL
  "readinessScore": number, // 0-100 overall commercialization readiness
  "maturityLabel": string,
  "strengths": string[],
  "gaps": string[],
  "nextSteps": string[]
}
Respect inventor declaration: if hasProduct=true TRL should be 7-9; if only prototype 4-7; if neither 1-4.`;

  const parsed = await queryJsonLLM(prompt);
  if (parsed && typeof parsed.trlLevel === 'number' && typeof parsed.readinessScore === 'number') {
    let trl = Math.min(9, Math.max(1, Math.round(parsed.trlLevel)));
    if (input.hasProduct) trl = Math.max(trl, 7);
    else if (input.hasPrototype) trl = Math.max(4, Math.min(trl, 7));
    else trl = Math.min(trl, 4);

    return {
      trlLevel: trl,
      readinessScore: Math.min(100, Math.max(0, Math.round(parsed.readinessScore))),
      maturityLabel: parsed.maturityLabel || `TRL ${trl}`,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
      generatedAt: new Date(),
    };
  }

  return heuristicReadiness(
    input.hasPrototype,
    input.hasProduct,
    input.prototypeDescription,
    score
  );
}

