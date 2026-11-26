/**
 * Commercial score and price are computed from the listing itself.
 * Public copy is a short paraphrase, never the abstract, inventor, or filing reference.
 */

import { CARD_SUMMARIES } from '../data/cardSummaries';

export interface CommercialBreakdown {
  technicalFeasibility: number;
  marketDemand: number;
  implementationSpeed: number;
  licensingValue: number;
  ipProtection: number;
}

export interface ScoreEvidence {
  dimension: string;
  score: number;
  note: string;
}

export interface CommercialAssessment {
  commercialPotentialScore: number;
  commercialBreakdown: CommercialBreakdown;
  scoreRationale: string;
  scoreEvidence: ScoreEvidence[];
  domain: string;
}

export interface IndicativeValue {
  saleMin: number;
  saleMax: number;
  licenseAnnual: number;
  confidence: number;
  currency: 'INR';
}

export interface ModelPrice {
  suggestedSaleMinInr: number;
  suggestedSaleMaxInr: number;
  suggestedLicenseAnnualInr: number;
  currency: 'INR';
  confidence: number;
  rationale: string;
  pricingFactors: string[];
  comparableNote: string;
  generatedAt: Date;
}

const BUCKETS: { name: string; test: RegExp }[] = [
  { name: 'Healthcare', test: /medic|clinical|hospital|patient|imaging|diagnos|biometric|physiological|gait|plantar|footwear|biomech/i },
  { name: 'Security', test: /privacy|sovereign|cyber|encrypt|obfuscat|firmware|tamper|unauthorized|\bvpn\b|authentication|threat/i },
  { name: 'AI', test: /\bai\b|\bllm\b|language model|machine learning|neural|agentic|tinyml|\bxai\b/i },
  { name: 'Robotics', test: /\buav\b|drone|rover|humanoid|unmanned/i },
  { name: 'Energy', test: /wind turbine|battery|solar|power generation|kinetic energy/i },
  { name: 'Communications', test: /wireless|mesh network|radio frequency|reflecting surface/i },
  { name: 'Education', test: /academic|publication|publishing/i },
  { name: 'Sports', test: /sport|officiat/i },
  { name: 'Aerospace', test: /airplane|airborne|aircraft/i },
  { name: 'Food safety', test: /consumab|contamination|water and food/i },
  { name: 'Accessibility', test: /accessibility|visually disabled|impairment/i },
  { name: 'Smart home', test: /smart home|home network/i },
  { name: 'Transport', test: /vehicle|noise regulation|vibration sensor/i },
  { name: 'Manufacturing', test: /factory|industrial iot|assembly line/i },
  { name: 'FinTech', test: /fintech|payment|settlement/i },
  { name: 'Agriculture', test: /agri|crop|farm|irrigation/i },
];

const STOP = new Set([
  'about', 'after', 'also', 'and', 'are', 'based', 'being', 'between', 'comprising', 'configured',
  'device', 'from', 'have', 'into', 'method', 'patent', 'present', 'system', 'that', 'their',
  'these', 'this', 'those', 'through', 'under', 'using', 'wherein', 'which', 'with', 'within',
  'would', 'such', 'than', 'then', 'them', 'they', 'your', 'for', 'the',
]);

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function textOf(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 4 && !STOP.has(word));
}

function hits(value: string, pattern: RegExp): number {
  return (value.match(pattern) || []).length;
}

function patternHits(pattern: RegExp, value: string): number {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  return (value.match(new RegExp(pattern.source, flags)) || []).length;
}

export function coarseDomains(industries: string[] = [], title = '', abstract = ''): string[] {
  const ranked = BUCKETS.map((bucket) => ({
    name: bucket.name,
    score: patternHits(bucket.test, title) * 3 + patternHits(bucket.test, abstract),
  }))
    .filter((bucket) => bucket.score > 0)
    .sort((a, b) => b.score - a.score);
  if (ranked.length) return ranked.slice(0, 2).map((bucket) => bucket.name);
  const fromLabels = BUCKETS.filter((bucket) => bucket.test.test(industries.join(' '))).map((bucket) => bucket.name);
  return fromLabels.length ? fromLabels.slice(0, 2) : ['Technology'];
}

export function technicalThemes(title: string, abstract: string, limit = 5): string[] {
  const freq = new Map<string, number>();
  for (const token of tokens(`${title} ${abstract}`)) freq.set(token, (freq.get(token) || 0) + 1);
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word]) => word);
}

const TITLE_ACRONYMS = new Set(['AI', 'LLM', 'UAV', 'IOT', 'VPN', 'IT', 'XAI', 'GPS', 'RF', 'ML', 'CNN', 'WCAG', 'RPA', 'SDN', 'PLC', 'WAN', 'LAN', 'BAN', 'DSP']);

function cleanPatentProse(value: string): string {
  return value
    .replace(/\s*\(\s*\d+\s*[-–]\s*\d+\s*\)/g, '')
    .replace(/\s*\(\s*\d+(?:\s*[-–]\s*[a-zA-Z0-9]+)+\s*\)/g, '')
    .replace(/\s*\(\s*\d+\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .trim();
}

function readableHeading(value: string): string {
  const words = value.split(/\s+/).filter(Boolean).map((word, index) => {
    const parts = word.split('-').map((part) => {
      const letters = part.replace(/[^A-Za-z0-9]/g, '');
      if (TITLE_ACRONYMS.has(letters.toUpperCase()) && letters.length >= 2 && letters.length <= 5) {
        return part.replace(letters, letters.toUpperCase());
      }
      const lower = part.toLowerCase();
      if (index === 0) return lower.charAt(0).toUpperCase() + lower.slice(1);
      return lower;
    });
    return parts.join('-');
  });
  return words.join(' ').replace(/\.$/, '');
}

/** Short public name taken from the filing title, without legal filler. */
export function plainHeadline(title: string, abstract = ''): string {
  let heading = cleanPatentProse(title)
    .replace(/^(embodiments of the present disclosure relate to|the present disclosure (relates to|provides|pertains to)|the present invention discloses)\s+/i, '')
    .replace(/^(a|an|the)\s+/i, '')
    .replace(/^(system and method|method and system|device, a system to|device,\s+a system)\s+(for|to)\s+/i, '')
    .replace(/^system and method for\s+/i, '')
    .replace(/^system for\s+/i, '')
    .replace(/^method for\s+/i, '')
    .replace(/\s+system and method thereof$/i, '')
    .replace(/\s+and method thereof$/i, '')
    .replace(/\s+method thereof$/i, '')
    .replace(/\s+and a method thereof$/i, '')
    .replace(/\s+thereof$/i, '')
    .trim();
  if (heading.length < 8) heading = cleanPatentProse(abstract).split(/(?<=[.!?])\s+/)[0] || title;
  if (heading.length > 48) {
    const andAt = heading.toLowerCase().indexOf(' and ');
    if (andAt > 14 && andAt <= 48) heading = heading.slice(0, andAt);
    else {
      const cut = heading.slice(0, 48);
      const space = cut.lastIndexOf(' ');
      heading = space > 18 ? cut.slice(0, space) : cut;
    }
  }
  return readableHeading(heading);
}

export function publicTitle(_industries: string[] = [], title = '', abstract = ''): string {
  return plainHeadline(title, abstract);
}

function focusClause(sentence: string): string {
  const cut = sentence.split(/\s+(?:to generate|to capture|to receive|to determine|to process|including|configured to|which is|in order to|thereby)\s+/i)[0];
  return cut && cut.split(/\s+/).length >= 7 ? cut : sentence;
}

const CARD_LINE = 46;

function clipClause(value: string, max = CARD_LINE): string {
  let text = value.replace(/\s+/g, ' ').trim().replace(/^[,\s]+/, '').replace(/[;,:\s]+$/, '');
  text = text
    .replace(/^(the present disclosure (relates to|provides|pertains to)|the present invention discloses|embodiments of the present disclosure relates to)\s+/i, '')
    .replace(/^(the|a|an)\s+(system|device|apparatus|method)\s+(includes|can include|comprises)\s+/i, '')
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/\s+\d{2,4}\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (text.length > max) {
    const comma = text.lastIndexOf(',', max);
    const andAt = text.toLowerCase().lastIndexOf(' and ', max);
    let cutAt = Math.max(comma, andAt);
    if (cutAt < 16) cutAt = text.lastIndexOf(' ', max);
    if (cutAt < 16) cutAt = max;
    text = text.slice(0, cutAt);
    const dangling = /\b(a|an|the|and|or|via|to|of|for|with|from|within|between|using|into|by|one|more|across|in|on)\s*$/i;
    while (dangling.test(text)) text = text.replace(dangling, '').trim();
    text = text.replace(/[;,:\s]+$/, '');
  }
  if (!text) return '';
  const sentence = text.charAt(0).toUpperCase() + text.slice(1);
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

function isFilingLead(sentence: string): boolean {
  return /^(a|an|the)\s+/i.test(sentence)
    && /\b(system|method|apparatus|device)\b/i.test(sentence)
    && sentence.length < 280
    && !/\b(sensor|processor|gateway|engine|module|circuit|turbine|rover)\b/i.test(sentence);
}

function substantiveClauses(abstract: string): string[] {
  const clean = cleanPatentProse(abstract).replace(/\s+([.!?])/g, '$1');
  const sentences = clean
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.replace(/\b(are|is)\s+disclosed\b/gi, '').replace(/\s+([.!?])/g, '$1').trim())
    .filter((sentence) => sentence.length > 25);
  const body = sentences.length > 1 ? sentences.filter((sentence, index) => index > 0 || !isFilingLead(sentence)) : sentences;

  const clauses: string[] = [];
  for (const sentence of body) {
    const lead = /present disclosure|present invention discloses|embodiments of the present disclosure/i.test(sentence)
      && sentence.length < 220;
    if (lead && body.length > 1) continue;
        const bits = String(sentence || '')
      .split(/;\s+/)
      .map((bit) => String(bit || '').trim())
      .filter((bit) => bit.split(/\s+/).length >= 8);
    clauses.push(...(bits.length ? bits : [sentence]));
  }
  return clauses;
}

const SUMMARY_LINE = 52;

const GERUND: Record<string, string> = {
  monitoring: 'Monitors', securing: 'Secures', generating: 'Creates', publishing: 'Publishes',
  testing: 'Tests', detecting: 'Detects', managing: 'Manages', tracking: 'Tracks',
  inspecting: 'Inspects', updating: 'Updates', obfuscating: 'Hides', confirming: 'Confirms',
  analyzing: 'Analyzes', protecting: 'Protects', controlling: 'Controls', optimizing: 'Improves',
  identifying: 'Identifies', predicting: 'Predicts', preventing: 'Prevents', enabling: 'Enables',
  providing: 'Provides', assessing: 'Assesses', measuring: 'Measures', capturing: 'Captures',
  authenticating: 'Checks', anonymizing: 'Hides', orchestrating: 'Coordinates',
  restricting: 'Limits', intercepting: 'Intercepts', certifying: 'Certifies', regulating: 'Regulates',
  integrating: 'Combines', evaluating: 'Evaluates', screening: 'Screens',
};

const OUTCOMES: { test: RegExp; line: string }[] = [
  { test: /privacy|exfiltrat|outbound|data leak|sovereign/i, line: 'Keeps private data from leaving the site.' },
  { test: /instability|injury|plantar|gait|footwear/i, line: 'Flags instability from the combined readings.' },
  { test: /officiat|consensus|humanoid/i, line: 'Builds an officiating record the group can share.' },
  { test: /prompt|honeypot|jailbreak|language model/i, line: 'Scores risky prompts and filters unsafe answers.' },
  { test: /anonymiz|peer review|academic|publication/i, line: 'Hides who wrote it, then screens the paper.' },
  { test: /reflecting surface|unmanned aerial|beam steer/i, line: 'Steers a wireless signal toward the receiver.' },
  { test: /imaging|radiolog|inference/i, line: 'Reads the scan on the device, then logs it.' },
  { test: /consumab|contamin|potab/i, line: 'Checks whether the sample is safe to use.' },
  { test: /firmware|software update|patch deploy/i, line: 'Applies the update without stopping the device.' },
  { test: /inspect|defect|crack|airplane/i, line: 'Finds damage and records what it saw.' },
  { test: /turbine|wind farm/i, line: 'Keeps power output steady as the wind shifts.' },
  { test: /noise|vibration/i, line: 'Measures the disturbance against a set limit.' },
  { test: /accessib|visually|screen reader|impairment/i, line: 'Makes the page usable for someone who cannot see it.' },
  { test: /disaster|relief|triage|wearable/i, line: 'Helps responders see who needs help first.' },
  { test: /tamper|spoof/i, line: 'Notices when someone tampers with the device.' },
  { test: /decoy|obfuscat/i, line: 'Hides the real signal among lookalike traffic.' },
  { test: /digital twin/i, line: 'Keeps a live model in step with the real asset.' },
  { test: /intercept|airborne threat/i, line: 'Detects an airborne threat and tracks it.' },
  { test: /orchestrat/i, line: 'Splits the task across models and merges the result.' },
  { test: /audit/i, line: 'Writes an audit trail of what happened.' },
  { test: /blockchain|ledger/i, line: 'Writes the result to a ledger others can check.' },
  { test: /vpn|ssid|home network/i, line: 'Limits which devices can join the network.' },
  { test: /projector|display/i, line: 'Adjusts the picture to the room it is in.' },
];

function fitSummary(value: string, max = SUMMARY_LINE): string {
  let text = value.replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '');
  if (text.length > max) {
    const cut = text.slice(0, max);
    const space = cut.lastIndexOf(' ');
    text = (space > 18 ? cut.slice(0, space) : cut).replace(/\b(a|an|the|and|or|of|for|with|to|from|in|on)$/i, '').trim();
  }
  if (!text) return '';
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

function jobLine(title: string, abstract: string): string {
  const topic = plainHeadline(title, abstract).replace(/\.$/, '');
  const words = topic.split(/\s+/).filter(Boolean);
  const verb = GERUND[words[0]?.toLowerCase() || ''];
  const rest = words.slice(1).join(' ');
  if (verb && rest) return fitSummary(`${verb} ${rest.charAt(0).toLowerCase()}${rest.slice(1)}`);
  const lower = topic.charAt(0).toLowerCase() + topic.slice(1);
  return fitSummary(`Handles ${lower}`);
}

function mechanismPhrases(abstract: string): string[] {
  const clean = cleanPatentProse(abstract).toLowerCase();
  const found: string[] = [];
  const re = /\b((?:[a-z]{3,}\s+){0,2}(?:sensors?|gateways?|processors?|controllers?|networks?|engines?|modules?|circuits?|units?|panels?|ledgers?|models?|loggers?|antennas?|turbines?|rovers?|cameras?|filters?|algorithms?|wearables?))\b/g;
  const lead = /^(and|with|from|that|this|using|based|present|system|method|device|said|other|such|into|over|under|across|between|within|their|these|those|which|where|also|each|both|more|than|including|configured|plurality|respective|associated|various|different|particular|selected|given|first|second|third|via|for|the|its|any|all|can|may|being|used|use|data|information|disclosed|embodiment|apparatus|thereof|herein|having|having|one|two)\s+/i;
  let match: RegExpExecArray | null;
  while ((match = re.exec(clean))) {
    let phrase = match[1].trim();
    while (lead.test(phrase)) phrase = phrase.replace(lead, '').trim();
    if (phrase.split(/\s+/).length > 3 || phrase.length < 6) continue;
    if (!found.includes(phrase)) found.push(phrase);
    if (found.length === 3) break;
  }
  return found;
}

function howLine(title: string, abstract: string): string {
  const skip = /^(system|method|device|present|using|based|include|integrat|incorporat|processor|configur|plural|disclos|embodim|apparat|wherein|process|provide|related|compris|other|which|their|about|would|could|should|being|through|within|between|across|associated|respective|various|information)/;
  const themes = technicalThemes(title, abstract, 8).filter((word) => word.length > 5 && !skip.test(word));
  if (themes.length >= 2) return fitSummary(`It centers on ${themes[0]} and ${themes[1]}`);
  if (themes.length === 1) return fitSummary(`It centers on ${themes[0]}`);
  return 'It combines sensing with a decision step.';
}

function resultLine(title: string, abstract: string): string {
  const text = `${title} ${abstract}`;
  const matched = OUTCOMES.find((item) => item.test.test(text));
  if (matched) return matched.line;
  const last = substantiveClauses(abstract).slice(-1)[0] || '';
  const verb = last.match(/\b(transmits?|sends?|blocks?|detects?|alerts?|generates?|records?|filters?|steers?|compares?|updates?|prevents?|reduces?|identifies?|stores?|notifies?|predicts?)\b/i);
  if (verb) return fitSummary(`In use it ${verb[1].toLowerCase().replace(/s$/, '')}s a result someone can act on`);
  return 'Produces a result a buyer can judge before an NDA.';
}

function savedSummary(title: string): string[] | null {
  const trimmed = title.trim();
  if (CARD_SUMMARIES[trimmed]) return [...CARD_SUMMARIES[trimmed]];
  const folded = trimmed.toLowerCase().replace(/\s+/g, ' ');
  const key = Object.keys(CARD_SUMMARIES).find((item) => item.toLowerCase().replace(/\s+/g, ' ') === folded);
  return key ? [...CARD_SUMMARIES[key]] : null;
}

/** Three-line summary of this patent. Paraphrased, not a cut of the abstract. */
export function publicLines(input: {
  title?: string;
  abstract?: string;
  domain?: string;
  isForSale?: boolean;
  isForLicense?: boolean;
  trlLevel?: number | null;
  score?: number;
}): string[] {
  const title = input.title || '';
  const abstract = input.abstract || '';
  const saved = savedSummary(title);
  if (saved) return saved;
  const lines = [jobLine(title, abstract), howLine(title, abstract), resultLine(title, abstract)]
    .map((line) => fitSummary(line))
    .filter((line, index, all) => line.length > 12 && all.indexOf(line) === index);
  return lines.slice(0, 3);
}

/** Stable 0–1 fingerprint from title+abstract so similar patents do not collapse to one score. */
function contentFingerprint(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10_000) / 10_000;
}

export function assessCommercialPotential(input: {
  title?: string;
  abstract?: string;
  industries?: string[];
  hasPrototype?: boolean;
  hasProduct?: boolean;
  trlLevel?: number | null;
  prototypeDescription?: string;
}): CommercialAssessment {
  const title = input.title || '';
  const abstract = input.abstract || '';
  const notes = input.prototypeDescription || '';
  const body = textOf(title, abstract, notes);
  const lower = body.toLowerCase();
  const themes = technicalThemes(title, abstract, 8);
  const domain = coarseDomains(input.industries, title, abstract)[0];
  const words = tokens(body);
  const unique = new Set(words).size;
  const sentences = abstract.split(/[.!?]+/).map((part) => part.trim()).filter((part) => part.length > 25);
  const absLen = abstract.trim().length;
  const fingerprint = contentFingerprint(`${title}\n${abstract}`.toLowerCase());

  // Problem the invention claims to solve
  const pain = hits(
    lower,
    /problem|challenge|limitation|bottleneck|inefficien|fail(?:ure)?|cost|risk|delay|manual|shortage|drift|exposure|error|unsafe|breach|outage|downtime|false (?:positive|negative)|privacy leak|latency|congestion/g
  );
  const outcome = hits(
    lower,
    /reduces?|improves?|enables?|prevents?|detects?|protects?|accelerat|automat|optimiz|mitigat|eliminat|increases?|decreases?/g
  );
  const setting = hits(
    lower,
    /hospital|factory|clinic|grid|farm|warehouse|patient|manufacturer|operator|field|industrial|battlefield|disaster|campus|plant|utility|airport|vehicle|smart home|enterprise|defence|defense/g
  );
  const buyer = hits(
    lower,
    /buyer|licensee|operator|clinician|oem|enterprise|municipality|utility|hospital|manufacturer|farmer|responder|developer|integrator/g
  );

  // Tech depth / differentiation
  const techDepth = hits(
    lower,
    /\bai\b|\bml\b|neural|tinyml|llm|edge comput|zero[- ]knowledge|cryptograph|blockchain|sensor fusion|computer vision|nlp|reinforcement|federated|digital twin|fpga|asic|rtos|mesh network|uav|drone|robot|biometric|rfid|gnss|lidar|radar|plc|scada|ontology|knowledge graph/g
  );
  const contrast = hits(lower, /existing|traditional|conventional|prior art|current(?:ly)?|unlike|instead of|without|overcomes?/g);
  const novelty = hits(lower, /novel|unique|first|proprietary|inventive|non-obvious|improvement|embodiment/g);
  const quantified = hits(lower, /\d+\s?%|\d+\s?x|\b\d+(?:\.\d+)?\s?(?:cr|lakh|million|ms|seconds?|hours?|days?|ghz|mhz|kbps|mbps)\b|\b\d{2,}\b/g);
  const claimStyle = hits(lower, /comprising|configured to|wherein|apparatus|circuit|sensor|algorithm|module|processor|memory/g);

  // Trend / future demand signals (India + global licensing appetite)
  const trend = hits(
    lower,
    /edge ai|generative|sovereign|privacy[- ]preserv|climate|net[- ]zero|renewable|ev\b|battery|telemedic|precision agri|industry 4\.0|iot\b|cyber|zero trust|deepfake|synthetic data|digital public|upi|fintech|space|defence|defense|semiconductor|make in india|atmanirbhar/g
  );
  const futureUse = hits(
    lower,
    /scalable|real[- ]time|autonomous|predictive|continuous monitoring|always[- ]on|multi[- ]tenant|cloud[- ]native|offline|low[- ]power|battery[- ]powered/g
  );

  const proof = hits(lower, /tested|prototype|pilot|clinical|validated|demonstrated|deployed|trial|benchmark|simulation|field test/g);

  // --- Dimension scores (wide dynamic range) ---
  let market =
    18 +
    Math.min(pain, 4) * 9 +
    Math.min(outcome, 4) * 5 +
    Math.min(setting, 3) * 7 +
    Math.min(buyer, 2) * 6 +
    Math.min(trend, 4) * 8 +
    Math.min(futureUse, 3) * 4 +
    Math.min(quantified, 3) * 5 +
    (input.industries?.length ? 4 : 0);
  if (sentences.length < 2) market -= 10;
  if (pain === 0 && outcome === 0) market -= 12;
  if (domain === 'Healthcare' || domain === 'Security' || domain === 'Energy') market += 3;
  if (domain === 'Education' || domain === 'Sports') market -= 4;
  market = clamp(market + Math.round((fingerprint - 0.5) * 8), 18, 96);

  let differentiation =
    16 +
    Math.min(unique, 18) * 1.8 +
    Math.min(techDepth, 5) * 7 +
    Math.min(contrast, 3) * 6 +
    Math.min(novelty, 3) * 5 +
    Math.min(themes.length, 6) * 3 +
    (absLen > 500 ? 8 : absLen > 280 ? 4 : absLen < 160 ? -14 : 0);
  if (techDepth === 0 && themes.length < 3) differentiation -= 10;
  differentiation = clamp(differentiation + Math.round((fingerprint - 0.5) * 10), 16, 97);

  const declaredTrl = input.trlLevel && input.trlLevel >= 1 && input.trlLevel <= 9 ? input.trlLevel : 0;
  let readiness = declaredTrl ? 12 + declaredTrl * 8 : 22;
  if (input.hasProduct) readiness += 20;
  else if (input.hasPrototype) readiness += 12;
  readiness += Math.min(proof, 4) * 7;
  if (notes.trim().length > 80) readiness += 7;
  if (!declaredTrl && !input.hasPrototype && !input.hasProduct && proof === 0) readiness = Math.min(readiness, 38);
  readiness = clamp(readiness + Math.round((fingerprint - 0.5) * 6), 14, 96);

  let protection =
    20 +
    Math.min(claimStyle, 6) * 7 +
    Math.min(sentences.length, 7) * 4 +
    (unique > 12 ? 10 : unique > 7 ? 5 : 0) +
    (quantified > 0 ? 6 : 0) +
    (absLen > 400 ? 6 : absLen < 140 ? -12 : 0);
  protection = clamp(protection + Math.round((1 - fingerprint) * 6), 14, 95);

  let licensing =
    20 +
    (setting > 0 ? 12 : 0) +
    Math.min(buyer, 2) * 7 +
    Math.min(pain, 3) * 5 +
    Math.min(trend, 3) * 6 +
    (input.industries?.length ? 6 : 0);
  if (domain === 'Healthcare' || domain === 'Energy' || domain === 'AI' || domain === 'Security') licensing += 7;
  if (domain === 'Education' || domain === 'Sports') licensing -= 5;
  if (input.hasProduct) licensing += 10;
  else if (!input.hasPrototype && !declaredTrl) licensing -= 8;
  licensing = clamp(licensing + Math.round((fingerprint - 0.5) * 7), 16, 94);

  const breakdown: CommercialBreakdown = {
    technicalFeasibility: differentiation,
    marketDemand: market,
    implementationSpeed: readiness,
    licensingValue: licensing,
    ipProtection: protection,
  };

  // Weight market + tech + trend-linked licensing more than boilerplate readiness
  let commercialPotentialScore =
    breakdown.marketDemand * 0.28 +
    breakdown.technicalFeasibility * 0.26 +
    breakdown.licensingValue * 0.18 +
    breakdown.ipProtection * 0.16 +
    breakdown.implementationSpeed * 0.12;

  // Extra tilt from clear problem→tech→trend stack
  const stackBoost =
    (pain > 0 && techDepth > 0 ? 4 : 0) +
    (trend > 0 && outcome > 0 ? 3 : 0) +
    (setting > 0 && buyer > 0 ? 2 : 0) -
    (pain === 0 && techDepth === 0 ? 6 : 0);
  commercialPotentialScore = clamp(commercialPotentialScore + stackBoost + (fingerprint - 0.5) * 5, 22, 97);

  const ranked = [
    {
      dimension: 'Market demand',
      score: breakdown.marketDemand,
      note:
        pain > 0
          ? `Names a concrete problem${trend > 0 ? ' in a trending demand area' : ''}.`
          : trend > 0
            ? 'Touches a trending space, but buyer pain is weakly stated.'
            : 'Buyer pain and demand signals are only lightly described.',
    },
    {
      dimension: 'Technical differentiation',
      score: breakdown.technicalFeasibility,
      note: themes.length
        ? `Distinct themes: ${themes.slice(0, 3).join(', ')}${techDepth > 0 ? ' with modern technical depth' : ''}.`
        : 'The technical description is still broad.',
    },
    {
      dimension: 'Implementation speed',
      score: breakdown.implementationSpeed,
      note: input.hasProduct
        ? 'A product is already declared.'
        : input.hasPrototype
          ? 'A prototype is declared.'
          : proof > 0
            ? 'The text mentions testing or validation.'
            : 'No prototype or validation is declared.',
    },
    {
      dimension: 'IP strength',
      score: breakdown.ipProtection,
      note:
        sentences.length > 3
          ? 'The disclosure has enough structure to support a narrower claim set.'
          : 'The disclosure is short, so claim scope is harder to judge.',
    },
    {
      dimension: 'Licensing path',
      score: breakdown.licensingValue,
      note:
        setting > 0
          ? `A ${domain.toLowerCase()} buyer setting is identifiable${buyer > 0 ? ' with a clear licensee type' : ''}.`
          : `The ${domain.toLowerCase()} adoption path is still general.`,
    },
  ].sort((a, b) => b.score - a.score);

  const strongest = ranked[0];
  const weakest = ranked[ranked.length - 1];
  const scoreRationale = `${strongest.dimension} is the strongest signal (${strongest.score}/100): ${strongest.note} ${weakest.dimension} is the constraint (${weakest.score}/100): ${weakest.note}`;

  return {
    commercialPotentialScore,
    commercialBreakdown: breakdown,
    scoreRationale,
    scoreEvidence: ranked,
    domain,
  };
}

function sectorEconomics(domain: string): { multiplier: number; royalty: number; label: string } {
  switch (domain) {
    case 'Healthcare':
      return { multiplier: 1.34, royalty: 0.08, label: 'Healthcare licensing comps run higher because of regulatory and clinical switching costs' };
    case 'Energy':
      return { multiplier: 1.28, royalty: 0.07, label: 'Energy and hardware deals price the build cost and qualification cycle' };
    case 'Robotics':
      return { multiplier: 1.2, royalty: 0.075, label: 'Robotics and sensing deals sit between software licenses and equipment supply' };
    case 'Security':
      return { multiplier: 1.18, royalty: 0.1, label: 'Security software supports a higher annual license rate' };
    case 'AI':
      return { multiplier: 1.14, royalty: 0.12, label: 'AI listings are usually licensed, so the annual rate is a larger share of value' };
    case 'FinTech':
      return { multiplier: 1.1, royalty: 0.11, label: 'FinTech value is mostly contractual license revenue' };
    case 'Manufacturing':
      return { multiplier: 1.05, royalty: 0.08, label: 'Manufacturing transfers often mix a license with integration work' };
    case 'Agriculture':
      return { multiplier: 0.94, royalty: 0.07, label: 'Agriculture adoption cycles keep the outright band tighter' };
    default:
      return { multiplier: 1, royalty: 0.09, label: 'General technology uses the mid university-transfer band' };
  }
}

const TRL_MIDPOINT: Record<number, number> = {
  1: 1_600_000,
  2: 2_400_000,
  3: 3_800_000,
  4: 5_800_000,
  5: 8_500_000,
  6: 12_000_000,
  7: 17_000_000,
  8: 24_000_000,
  9: 32_000_000,
};

function roundTo(value: number, step: number): number {
  return Math.max(step, Math.round(value / step) * step);
}

export function priceIntellectualProperty(input: {
  title?: string;
  abstract?: string;
  industries?: string[];
  hasPrototype?: boolean;
  hasProduct?: boolean;
  trlLevel?: number | null;
  askingPrice?: number;
  isForSale?: boolean;
  isForLicense?: boolean;
  filingYear?: number | null;
  assessment?: CommercialAssessment;
}): ModelPrice {
  const assessment = input.assessment || assessCommercialPotential(input);
  const breakdown = assessment.commercialBreakdown;
  const domain = assessment.domain;
  const sector = sectorEconomics(domain);
  const trl = input.trlLevel && input.trlLevel >= 1 && input.trlLevel <= 9
    ? input.trlLevel
    : input.hasProduct
      ? 8
      : input.hasPrototype
        ? 5
        : 3;

  let mid = TRL_MIDPOINT[trl] * sector.multiplier;
  const scoreTilt = Math.pow(1.012, assessment.commercialPotentialScore - 62);
  const quality =
    (breakdown.marketDemand * 0.34 +
      breakdown.ipProtection * 0.28 +
      breakdown.technicalFeasibility * 0.22 +
      breakdown.licensingValue * 0.16) /
    100;
  mid *= scoreTilt * (0.8 + quality * 0.48);

  const year = input.filingYear && input.filingYear > 1990 ? input.filingYear : null;
  const age = year ? new Date().getFullYear() - year : null;
  if (age !== null && age <= 3) mid *= 1.08;
  else if (age !== null && age >= 12) mid *= 0.84;

  const forSale = input.isForSale !== false;
  const forLicense = input.isForLicense !== false;
  if (forLicense && !forSale) mid *= 0.9;

  const ask = Number(input.askingPrice) || 0;
  let askNote = 'The inventor asking price is not used as the price.';
  if (ask > 0) {
    const ratio = ask / mid;
    if (ratio >= 0.45 && ratio <= 2.2) {
      mid = mid * 0.88 + ask * 0.12;
      askNote = 'The inventor ask nudges the band by a small amount and does not set it.';
    } else if (ratio > 2.2) {
      askNote = 'The inventor ask sits well above this band, so the model keeps the comparable range.';
    } else {
      askNote = 'The inventor ask sits well below this band, so the model keeps the comparable range.';
    }
  }

  const abstractLength = (input.abstract || '').trim().length;
  let confidence = 46;
  if (abstractLength > 280) confidence += 8;
  if (abstractLength > 700) confidence += 8;
  if (input.trlLevel) confidence += 10;
  if (input.hasPrototype) confidence += 7;
  if (input.hasProduct) confidence += 10;
  confidence = clamp(confidence, 36, 88);
  const width = confidence >= 72 ? 0.16 : confidence >= 56 ? 0.24 : 0.34;

  const saleMin = roundTo(mid * (1 - width), 100_000);
  const saleMax = roundTo(Math.max(mid * (1 + width * 1.2), saleMin + 100_000), 100_000);
  let license = mid * sector.royalty * (0.72 + (breakdown.licensingValue / 100) * 0.55);
  if (forLicense && !forSale) license *= 1.18;
  if (forSale && !forLicense) license *= 0.8;
  const licenseAnnual = roundTo(license, 50_000);

  const factors = [
    `${sector.label}.`,
    `Maturity input is TRL ${trl}${input.hasProduct ? ' with a product declared' : input.hasPrototype ? ' with a prototype declared' : ''}.`,
    `Commercial score ${assessment.commercialPotentialScore}/100, led by ${assessment.scoreEvidence[0]?.dimension.toLowerCase() || 'market demand'} at ${assessment.scoreEvidence[0]?.score ?? breakdown.marketDemand}.`,
    `Outright band width reflects confidence ${confidence}/100.`,
    askNote,
  ];

  return {
    suggestedSaleMinInr: saleMin,
    suggestedSaleMaxInr: saleMax,
    suggestedLicenseAnnualInr: licenseAnnual,
    currency: 'INR',
    confidence,
    rationale: `${publicTitle(input.industries, input.title, input.abstract)} is priced from maturity, ${domain.toLowerCase()} deal comps, and the score split. Indicative outright range is ₹${saleMin.toLocaleString('en-IN')} to ₹${saleMax.toLocaleString('en-IN')}, with an annual license near ₹${licenseAnnual.toLocaleString('en-IN')}. ${assessment.scoreRationale}`,
    pricingFactors: factors,
    comparableNote: 'Indicative Indian transfer band for negotiation. It is not a formal valuation certificate.',
    generatedAt: new Date(),
  };
}

export function toIndicativeValue(price: ModelPrice): IndicativeValue {
  return {
    saleMin: price.suggestedSaleMinInr,
    saleMax: price.suggestedSaleMaxInr,
    licenseAnnual: price.suggestedLicenseAnnualInr,
    confidence: price.confidence,
    currency: 'INR',
  };
}

/** Keep an LLM headline score, but replace a flat copied breakdown with independent factors. */
export function spreadBreakdownAroundScore(assessment: CommercialAssessment, headline: number): CommercialBreakdown {
  const delta = clamp(headline, 0, 100) - assessment.commercialPotentialScore;
  const shift = (value: number) => clamp(value + delta);
  return {
    technicalFeasibility: shift(assessment.commercialBreakdown.technicalFeasibility),
    marketDemand: shift(assessment.commercialBreakdown.marketDemand),
    implementationSpeed: shift(assessment.commercialBreakdown.implementationSpeed),
    licensingValue: shift(assessment.commercialBreakdown.licensingValue),
    ipProtection: shift(assessment.commercialBreakdown.ipProtection),
  };
}
