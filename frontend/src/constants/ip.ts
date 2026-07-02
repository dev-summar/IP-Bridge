export const IP_CATEGORIES = [
  'AI',
  'Healthcare',
  'Agriculture',
  'Manufacturing',
  'IoT',
  'Education',
  'Sustainability',
] as const;

export const ASSET_TYPES = [
  'Patent',
  'Software IP',
  'Copyright',
  'Industrial Design',
  'Trademark',
  'Research Innovation',
  'University Technology',
] as const;

export type AssetType = (typeof ASSET_TYPES)[number];

export function inferAssetType(patent: any): AssetType {
  if (patent?.assetType) return patent.assetType;
  return 'Patent';
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

export const DEAL_PROGRESS_STEPS = [
  { id: 'nda', label: 'NDA Signed' },
  { id: 'access', label: 'Access Approved' },
  { id: 'discussion', label: 'Discussion Complete' },
  { id: 'offer', label: 'Offer Accepted' },
  { id: 'escrow', label: 'Escrow Funded' },
  { id: 'transfer', label: 'Transfer Completed' },
] as const;
