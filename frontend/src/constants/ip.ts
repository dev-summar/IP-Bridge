export const IP_CATEGORIES = [
  'AI',
  'Healthcare',
  'Agriculture',
  'Manufacturing',
  'IoT',
  'Education',
  'Sustainability',
] as const;

/** Suggested tech tags for buyer interests (signup + profile). */
export const INTEREST_SUGGESTIONS = [
  'edge AI',
  'drug delivery',
  'battery storage',
  'IoT security',
  'robotics',
  'clean energy',
  'medical imaging',
  'fintech',
] as const;

export const IP_TYPE_OPTIONS = [
  { value: 'utility_patent', label: 'Utility Patent' },
  { value: 'design', label: 'Design' },
  { value: 'other', label: 'Other' },
] as const;
export type IPType = typeof IP_TYPE_OPTIONS[number]['value'];
export const ASSET_TYPES = ['Utility Patent', 'Design', 'Other'] as const;

export type AssetType = (typeof ASSET_TYPES)[number];

export function inferAssetType(patent: any): string {
  if (patent?.ipType === 'other') return patent.otherIpType?.trim() || 'Other';
  const type = IP_TYPE_OPTIONS.find(option => option.value === patent?.ipType);
  if (type) return type.label;
  if (patent?.assetType && patent.assetType !== 'Type not specified') return patent.assetType;
  return 'Utility Patent';
}

export function inferTRL(patent: any, analysis: any): number {
  if (patent?.trlLevel) return patent.trlLevel;
  const score = analysis?.commercialPotentialScore ?? 50;
  if (score >= 85) return 7;
  if (score >= 70) return 6;
  if (score >= 55) return 5;
  return 4;
}

/** Plain-language maturity label for list views (avoids raw "TRL 7"). */
export function getTRLShortLabel(trl: number): string {
  const labels: Record<number, string> = {
    1: 'Early research',
    2: 'Concept stage',
    3: 'Lab validated',
    4: 'Lab prototype',
    5: 'Pilot-ready',
    6: 'Field tested',
    7: 'Near market-ready',
    8: 'Production ready',
    9: 'Deployed',
  };
  return labels[trl] ?? 'In development';
}

/** Full TRL explanation for tooltips / detail pages. */
export function getTRLDescription(trl: number): string {
  const descriptions: Record<number, string> = {
    1: 'TRL 1 — Basic research',
    2: 'TRL 2 — Concept defined',
    3: 'TRL 3 — Proof of concept',
    4: 'TRL 4 — Lab prototype',
    5: 'TRL 5 — Validated in relevant setting',
    6: 'TRL 6 — Demonstrated in field',
    7: 'TRL 7 — Prototype in real conditions',
    8: 'TRL 8 — Qualified for deployment',
    9: 'TRL 9 — Proven in operations',
  };
  return descriptions[trl] ?? `TRL ${trl}`;
}

export function formatINR(value?: number): string {
  if (!value) return 'Contact for pricing';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatIndicativeBand(value?: { saleMin?: number; saleMax?: number; licenseAnnual?: number } | null): string {
  if (!value?.saleMin || !value?.saleMax) return 'Value pending';
  return `${formatINR(value.saleMin)} – ${formatINR(value.saleMax)}`;
}

/** Short rupee label for cards, so a price band stays on one line. */
export function formatINRCompact(value?: number): string {
  if (!value) return 'On request';
  const compact = (amount: number, unit: string) => {
    const rounded = amount >= 10 || Number.isInteger(amount) ? String(Math.round(amount)) : amount.toFixed(1).replace(/\.0$/, '');
    return `₹${rounded} ${unit}`;
  };
  if (value >= 10000000) return compact(value / 10000000, 'Cr');
  if (value >= 100000) return compact(value / 100000, 'L');
  return formatINR(value);
}

export function formatIndicativeBandCompact(value?: { saleMin?: number; saleMax?: number; licenseAnnual?: number } | null): string {
  if (!value?.saleMin || !value?.saleMax) return 'Value pending';
  return `${formatINRCompact(value.saleMin)} – ${formatINRCompact(value.saleMax)}`;
}

export const DEAL_PROGRESS_STEPS = [
  { id: 'nda', label: 'NDA signed' },
  { id: 'access', label: 'Access approved' },
  { id: 'discussion', label: 'Discussion done' },
  { id: 'offer', label: 'Offer accepted' },
  { id: 'escrow', label: 'Escrow funded' },
  { id: 'transfer', label: 'Transfer complete' },
] as const;

export type DealProgressInput = {
  ndaSigned?: boolean;
  accessStatus?: string | null;
  meetingStatus?: string | null;
  offerStatus?: string | null;
  txStatus?: string | null;
};

/** Active step index for ProgressSteps. 6 means every step is complete. */
export function getDealProgress(input: DealProgressInput): {
  currentIndex: number;
  nextLabel: string;
  nextHint: string;
  complete: boolean;
} {
  const tx = String(input.txStatus || '');
  const offer = String(input.offerStatus || '');
  const access = String(input.accessStatus || '');
  const meeting = String(input.meetingStatus || '');
  const nda = !!input.ndaSigned;

  if (tx === 'completed') {
    return { currentIndex: 6, nextLabel: 'Deal complete', nextHint: 'Download the assignment deed from Escrow.', complete: true };
  }
  if (tx === 'escrow_funded') {
    return { currentIndex: 5, nextLabel: 'Finish the transfer', nextHint: 'Release milestones and complete the assignment.', complete: false };
  }
  if (offer === 'accepted') {
    return { currentIndex: 4, nextLabel: 'Fund escrow', nextHint: 'Move the agreed amount into escrow to protect both sides.', complete: false };
  }
  if (offer === 'pending' || offer === 'countered') {
    return { currentIndex: 3, nextLabel: 'Resolve the offer', nextHint: offer === 'countered' ? 'Review the counter-offer and accept or decline.' : 'Accept, decline, or wait for the other party.', complete: false };
  }
  if (meeting === 'accepted' || meeting === 'pending') {
    return { currentIndex: 3, nextLabel: 'Make an offer', nextHint: 'Submit a sale or licence offer when you are ready.', complete: false };
  }
  if (access === 'approved') {
    return { currentIndex: 2, nextLabel: 'Make an offer', nextHint: 'A meeting is recommended, but you can submit an offer after unlock.', complete: false };
  }
  if (nda) {
    return { currentIndex: 1, nextLabel: 'Unlock details', nextHint: 'Request access, or approve the buyer if you are the inventor.', complete: false };
  }
  return { currentIndex: 0, nextLabel: 'Sign the NDA', nextHint: 'The invention stays hidden until the NDA is signed.', complete: false };
}
