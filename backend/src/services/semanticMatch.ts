/**
 * Domain-aware semantic matching.
 * Fit score is meaning overlap only — never commercial quality.
 * Ambiguous words like "network" only count inside a clear topic.
 */

export type MatchFeedbackEvent = 'open' | 'save' | 'enquire' | 'ignore';

export interface SemanticDoc {
  id: string;
  title?: string;
  abstract?: string;
  summaryLines?: string[];
  keywords?: string[];
  industries?: string[];
  useCases?: string[];
}

export interface FitResult {
  patentId: string;
  fitScore: number;
  topicOverlap: string[];
  reasonHints: string[];
}

const STOP = new Set([
  'the', 'and', 'for', 'with', 'system', 'method', 'device', 'apparatus', 'from', 'this',
  'that', 'into', 'using', 'based', 'related', 'technology', 'technologies', 'patent',
  'looking', 'need', 'want', 'please', 'find', 'search', 'about', 'have', 'been', 'were',
  'their', 'them', 'than', 'then', 'also', 'such', 'which', 'where', 'when', 'what',
]);

/** Topics keep “network”, “sensor”, etc. from bleeding across unrelated patents. */
const TOPICS: { id: string; label: string; terms: string[] }[] = [
  {
    id: 'healthcare',
    label: 'Healthcare',
    terms: [
      'health', 'medical', 'clinical', 'patient', 'hospital', 'biometric', 'physiological',
      'gait', 'plantar', 'footwear', 'biomech', 'imaging', 'diagnos', 'wearable', 'vital',
      'disability', 'triage', 'relief', 'evacuation', 'body', 'ankle', 'shoe',
    ],
  },
  {
    id: 'cyber_privacy',
    label: 'Security & privacy',
    terms: [
      'privacy', 'sovereign', 'cyber', 'encrypt', 'obfuscat', 'firewall', 'threat', 'vpn',
      'authentication', 'tamper', 'ransomware', 'honeypot', 'sandbox', 'exfiltrat',
      'zero-knowledge', 'zkp', 'malware', 'ddos', 'audit trail',
    ],
  },
  {
    id: 'ai_ml',
    label: 'AI & language models',
    terms: [
      'ai', 'llm', 'language model', 'machine learning', 'neural', 'agentic', 'prompt',
      'transformer', 'inference', 'tinyml', 'xai', 'orchestrat', 'embedding', 'model',
    ],
  },
  {
    id: 'energy_power',
    label: 'Energy & power',
    terms: [
      'turbine', 'wind', 'solar', 'battery', 'generator', 'electrical load', 'power generation',
      'kinetic', 'grid', 'charging', 'energy storage',
    ],
  },
  {
    id: 'wireless_comms',
    label: 'Wireless communications',
    terms: [
      'wireless', 'reflecting surface', 'rf', 'radio', 'beam', 'mesh network', 'antenna',
      'uav communication', 'signal steering', 'frequency', 'modulation',
    ],
  },
  {
    id: 'home_iot',
    label: 'Smart home & local networks',
    terms: [
      'smart home', 'home network', 'ssid', 'router', 'local area network', 'wide area network',
      'plc', 'gateway', 'wifi', 'wi-fi', 'iot device', 'premises', 'smart-home',
    ],
  },
  {
    id: 'robotics_uav',
    label: 'Robotics & drones',
    terms: ['uav', 'drone', 'rover', 'humanoid', 'unmanned', 'autonomous', 'robot', 'actuator'],
  },
  {
    id: 'aerospace',
    label: 'Aerospace',
    terms: ['airplane', 'aircraft', 'airborne', 'interceptor', 'debris', 'flight', 'aviation'],
  },
  {
    id: 'sports',
    label: 'Sports',
    terms: ['sport', 'officiat', 'cricket', 'bowling', 'batsman', 'arena', 'match'],
  },
  {
    id: 'education',
    label: 'Education & publishing',
    terms: [
      'academic', 'publication', 'publishing', 'faculty', 'classroom', 'student', 'campus',
      'attendance', 'teaching', 'institution', 'peer review',
    ],
  },
  {
    id: 'food_safety',
    label: 'Food & water safety',
    terms: ['consumab', 'contamin', 'water', 'food', 'potab', 'impurit', 'quality test'],
  },
  {
    id: 'construction',
    label: 'Construction',
    terms: [
      'concrete', 'column', 'beam', 'floor plan', 'scaffolding', 'brick', 'building plan',
      'construction', 'piping', 'hvac',
    ],
  },
  {
    id: 'accessibility',
    label: 'Accessibility',
    terms: ['accessibility', 'visually', 'wcag', 'impairment', 'screen reader'],
  },
  {
    id: 'transport',
    label: 'Vehicles & noise',
    terms: ['vehicle', 'noise', 'vibration', 'license plate', 'traffic', 'automotive'],
  },
];

/**
 * Ambiguous tokens only contribute when a topic’s anchor words are also present.
 * Stops “network” matching wind turbines, privacy gateways, and home Wi‑Fi the same way.
 */
const AMBIGUOUS: Record<string, { topicId: string; anchors: string[] }[]> = {
  network: [
    { topicId: 'home_iot', anchors: ['home', 'ssid', 'router', 'wifi', 'wi-fi', 'premises', 'smart home'] },
    { topicId: 'wireless_comms', anchors: ['wireless', 'mesh', 'rf', 'radio', 'uav', 'reflect', 'antenna'] },
    { topicId: 'cyber_privacy', anchors: ['privacy', 'threat', 'vpn', 'firewall', 'encrypt', 'cyber'] },
    { topicId: 'energy_power', anchors: ['turbine', 'grid', 'generator', 'electrical'] },
    { topicId: 'education', anchors: ['campus', 'student', 'attendance', 'classroom'] },
  ],
  sensor: [
    { topicId: 'healthcare', anchors: ['health', 'gait', 'biometric', 'physiological', 'footwear', 'vital'] },
    { topicId: 'home_iot', anchors: ['home', 'iot', 'gateway', 'premises'] },
    { topicId: 'transport', anchors: ['vehicle', 'noise', 'vibration'] },
    { topicId: 'robotics_uav', anchors: ['drone', 'uav', 'rover', 'robot'] },
  ],
  processor: [
    { topicId: 'ai_ml', anchors: ['ai', 'llm', 'model', 'inference', 'neural'] },
    { topicId: 'healthcare', anchors: ['imaging', 'medical', 'patient'] },
    { topicId: 'cyber_privacy', anchors: ['encrypt', 'threat', 'privacy'] },
  ],
  edge: [
    { topicId: 'ai_ml', anchors: ['ai', 'inference', 'tinyml', 'model'] },
    { topicId: 'healthcare', anchors: ['imaging', 'medical', 'hospital'] },
    { topicId: 'home_iot', anchors: ['device', 'iot', 'gateway'] },
  ],
  security: [
    { topicId: 'cyber_privacy', anchors: ['privacy', 'encrypt', 'threat', 'vpn', 'ransomware'] },
    { topicId: 'home_iot', anchors: ['home', 'ssid', 'router', 'unauthorized'] },
    { topicId: 'aerospace', anchors: ['airborne', 'intercept', 'aircraft'] },
  ],
};

const HASH_DIM = 64;
const TOPIC_DIM = TOPICS.length;

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function tokenize(text: string): string[] {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, ' ')
    .split(/[\s,\-/|_+]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP.has(token));
}

function textOf(doc: SemanticDoc | string): string {
  if (typeof doc === 'string') return doc;
  return [
    doc.title,
    doc.abstract,
    ...(doc.summaryLines || []),
    ...(doc.keywords || []),
    ...(doc.industries || []),
    ...(doc.useCases || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function hashToken(token: string): number {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % HASH_DIM;
}

function hasTerm(haystack: string, term: string): boolean {
  const needle = term.toLowerCase().trim();
  if (!needle) return false;
  if (needle.includes(' ')) return haystack.includes(needle);
  // Whole-word only — stops "lan" matching inside "language".
  return new RegExp(`(?:^|[^a-z0-9])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[^a-z0-9]|$)`).test(haystack);
}

function topicHits(haystack: string, topicId: string, terms: string[]): number {
  let score = 0;
  for (const term of terms) {
    if (hasTerm(haystack, term)) score += term.includes(' ') ? 2.2 : 1;
  }
  // Ambiguous words only if this topic is anchored in the same text.
  for (const [word, rules] of Object.entries(AMBIGUOUS)) {
    if (!hasTerm(haystack, word)) continue;
    const rule = rules.find((item) => item.topicId === topicId);
    if (!rule) continue;
    if (rule.anchors.some((anchor) => hasTerm(haystack, anchor))) score += 1.5;
  }
  return score;
}

/** Fixed-length vector: topic axes + hashed tokens. */
export function embedText(input: SemanticDoc | string): Float32Array {
  const haystack = textOf(input);
  const tokens = tokenize(haystack);
  const vector = new Float32Array(TOPIC_DIM + HASH_DIM);

  TOPICS.forEach((topic, index) => {
    vector[index] = topicHits(haystack, topic.id, topic.terms);
  });

  for (const token of tokens) {
    if (AMBIGUOUS[token]) {
      // Only hash ambiguous tokens when at least one topic rule matched.
      const allowed = AMBIGUOUS[token].some((rule) =>
        rule.anchors.some((anchor) => haystack.includes(anchor))
      );
      if (!allowed) continue;
    }
    const slot = TOPIC_DIM + hashToken(token);
    vector[slot] += 1;
    if (token.length > 5) {
      const bigram = token.slice(0, 4);
      vector[TOPIC_DIM + hashToken(bigram)] += 0.35;
    }
  }

  // Soft L2 normalize
  let norm = 0;
  for (let i = 0; i < vector.length; i += 1) norm += vector[i] * vector[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < vector.length; i += 1) vector[i] /= norm;
  return vector;
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < len; i += 1) dot += a[i] * b[i];
  return Math.max(0, Math.min(1, dot));
}

export function dominantTopics(input: SemanticDoc | string, limit = 3): string[] {
  const haystack = textOf(input);
  return TOPICS
    .map((topic) => ({ label: topic.label, score: topicHits(haystack, topic.id, topic.terms) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.label);
}

export function blendVectors(
  parts: Array<{ vector: Float32Array; weight: number }>
): Float32Array {
  const out = new Float32Array(TOPIC_DIM + HASH_DIM);
  let weightSum = 0;
  for (const part of parts) {
    if (!part.weight) continue;
    weightSum += part.weight;
    for (let i = 0; i < out.length; i += 1) out[i] += part.vector[i] * part.weight;
  }
  if (weightSum <= 0) return out;
  let norm = 0;
  for (let i = 0; i < out.length; i += 1) {
    out[i] /= weightSum;
    norm += out[i] * out[i];
  }
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < out.length; i += 1) out[i] /= norm;
  return out;
}

/** Convert cosine (0–1) into a buyer-facing fit percentage. */
export function fitPercentFromCosine(similarity: number): number {
  if (similarity < 0.08) return 0;
  // Stretch mid-range so useful overlaps land in 45–90, not a flat 10–20.
  const stretched = Math.pow(similarity, 0.72);
  return clamp(18 + stretched * 82);
}

export function patentToSemanticDoc(patent: any, analysis: any | null = null): SemanticDoc {
  return {
    id: String(patent._id || patent.id || ''),
    title: patent.title,
    abstract: patent.abstract,
    summaryLines: patent.publicSummary || patent.publicLines || [],
    keywords: analysis?.keywords || [],
    industries: analysis?.industryClassification || [],
    useCases: analysis?.commercialApplications?.useCases || [],
  };
}

export function scoreDocsAgainstQuery(
  query: string,
  docs: Array<{ patent: any; analysis?: any | null }>,
  options?: { minFit?: number }
): FitResult[] {
  const queryVector = embedText(query);
  const queryTopics = dominantTopics(query, 3);
  const minFit = options?.minFit ?? 22;
  const results: FitResult[] = [];

  for (const row of docs) {
    const doc = patentToSemanticDoc(row.patent, row.analysis || null);
    const patentVector = embedText(doc);
    const similarity = cosineSimilarity(queryVector, patentVector);
    const fitScore = fitPercentFromCosine(similarity);
    if (fitScore < minFit) continue;

    const patentTopics = dominantTopics(doc, 3);
    const topicOverlap = queryTopics.filter((topic) => patentTopics.includes(topic));
    // Penalize when query has a clear topic but the patent does not share it.
    let adjusted = fitScore;
    if (queryTopics.length && topicOverlap.length === 0 && fitScore < 70) {
      adjusted = clamp(fitScore * 0.72);
    } else if (topicOverlap.length) {
      adjusted = clamp(fitScore + Math.min(8, topicOverlap.length * 3));
    }
    // Precise phrase boosts keep LLM / turbine / home-wifi queries on the right family.
    const q = query.toLowerCase();
    const body = textOf(doc);
    if (/\b(llm|language model|prompt|agentic)\b/.test(q)) {
      if (/\b(llm|language model|prompt|agentic)\b/.test(body)) adjusted = clamp(adjusted + 12);
      else if (!/\b(ai|machine learning|neural)\b/.test(body)) adjusted = clamp(adjusted * 0.5);
      else adjusted = clamp(adjusted * 0.78);
    }
    if (/\b(wind turbine|turbine)\b/.test(q) && /\b(wind|turbine)\b/.test(body)) {
      adjusted = clamp(adjusted + 14);
    }
    if (/\b(wifi|wi-fi|ssid|smart home)\b/.test(q) && /\b(home|ssid|router|wifi|wi-fi|gateway)\b/.test(body)) {
      adjusted = clamp(adjusted + 12);
    }
    if (adjusted < minFit) continue;

    const reasonHints: string[] = [];
    if (topicOverlap.length) reasonHints.push(`Same focus: ${topicOverlap.slice(0, 2).join(', ')}`);
    const titleHit = tokenize(query).filter((token) => String(doc.title || '').toLowerCase().includes(token));
    if (titleHit.length) reasonHints.push(`Title overlap: ${titleHit.slice(0, 3).join(', ')}`);

    results.push({
      patentId: doc.id,
      fitScore: adjusted,
      topicOverlap,
      reasonHints,
    });
  }

  return results.sort((a, b) => b.fitScore - a.fitScore);
}

export interface BuyerTasteProfile {
  interests?: string[];
  domains?: string[];
  searches?: Array<{ query: string; weight: number }>;
  positiveDocs?: SemanticDoc[];
  ignoredPatentIds?: string[];
  openedWithoutEngageIds?: string[];
}

export function buildBuyerVector(profile: BuyerTasteProfile): Float32Array | null {
  const parts: Array<{ vector: Float32Array; weight: number }> = [];
  for (const interest of profile.interests || []) {
    parts.push({ vector: embedText(interest), weight: 1.4 });
  }
  for (const domain of profile.domains || []) {
    parts.push({ vector: embedText(domain), weight: 1.2 });
  }
  for (const search of profile.searches || []) {
    parts.push({ vector: embedText(search.query), weight: Math.max(0.25, search.weight) * 1.6 });
  }
  for (const doc of profile.positiveDocs || []) {
    parts.push({ vector: embedText(doc), weight: 1.8 });
  }
  if (!parts.length) return null;
  return blendVectors(parts);
}

export function scoreDocsForBuyer(
  profile: BuyerTasteProfile,
  docs: Array<{ patent: any; analysis?: any | null }>
): FitResult[] {
  const buyerVector = buildBuyerVector(profile);
  if (!buyerVector) return [];

  const ignored = new Set((profile.ignoredPatentIds || []).map(String));
  const softIgnored = new Set((profile.openedWithoutEngageIds || []).map(String));
  const buyerTopics = dominantTopics(
    [
      ...(profile.interests || []),
      ...(profile.domains || []),
      ...(profile.searches || []).map((row) => row.query),
    ].join(' '),
    4
  );

  const results: FitResult[] = [];
  for (const row of docs) {
    const id = String(row.patent._id);
    if (ignored.has(id)) continue;

    const doc = patentToSemanticDoc(row.patent, row.analysis || null);
    const similarity = cosineSimilarity(buyerVector, embedText(doc));
    let fitScore = fitPercentFromCosine(similarity);
    if (softIgnored.has(id)) fitScore = clamp(fitScore * 0.55);

    const patentTopics = dominantTopics(doc, 3);
    const topicOverlap = buyerTopics.filter((topic) => patentTopics.includes(topic));
    if (buyerTopics.length && topicOverlap.length === 0) fitScore = clamp(fitScore * 0.68);
    else if (topicOverlap.length) fitScore = clamp(fitScore + Math.min(10, topicOverlap.length * 3));

    if (fitScore < 28) continue;

    const reasonHints: string[] = [];
    if (topicOverlap.length) reasonHints.push(`Fits your focus: ${topicOverlap.slice(0, 2).join(', ')}`);
    const interestHit = (profile.interests || []).filter((interest) =>
      textOf(doc).includes(interest.toLowerCase())
    );
    if (interestHit.length) reasonHints.push(`Matches interest: ${interestHit.slice(0, 2).join(', ')}`);
    const searchHit = (profile.searches || [])
      .map((row) => row.query)
      .filter((query) => query.length > 3 && (cosineSimilarity(embedText(query), embedText(doc)) > 0.22))
      .slice(0, 2);
    if (searchHit.length) reasonHints.push(`Close to your search: ${searchHit[0].slice(0, 40)}`);

    results.push({ patentId: id, fitScore, topicOverlap, reasonHints });
  }

  return results.sort((a, b) => b.fitScore - a.fitScore);
}

/** Feedback weights used when blending positive docs from events. */
export const FEEDBACK_WEIGHT: Record<MatchFeedbackEvent, number> = {
  enquire: 3,
  save: 2,
  open: 0.35,
  ignore: 0,
};
