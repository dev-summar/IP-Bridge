import { dbStore } from './dbStore';
import {
  assessCommercialPotential,
  coarseDomains,
  priceIntellectualProperty,
  publicLines,
  publicTitle,
  toIndicativeValue,
  type CommercialAssessment,
  type IndicativeValue,
} from './commercialModel';

function storedPublicSummary(patent: { publicSummary?: unknown }): string[] | null {
  if (!Array.isArray(patent.publicSummary)) return null;
  const lines = patent.publicSummary.map((line) => String(line || '').trim()).filter(Boolean).slice(0, 3);
  return lines.length === 3 ? lines : null;
}

export interface ViewerGrants {
  signed: Set<string>;
  approved: Set<string>;
  accessStatus: Map<string, string>;
}

export async function disclosureGrantsFor(userId: string): Promise<ViewerGrants> {
  if (!userId) return { signed: new Set(), approved: new Set(), accessStatus: new Map() };
  const [ndas, access] = await Promise.all([
    dbStore.ndaSignatures.find({ buyerId: userId }),
    dbStore.accessRequests.find({ buyerId: userId }),
  ]);
  const accessStatus = new Map<string, string>();
  for (const row of access) accessStatus.set(String(row.patentId), row.status);
  return {
    signed: new Set(ndas.map((row: any) => String(row.patentId))),
    approved: new Set(
      access.filter((row: any) => row.status === 'approved').map((row: any) => String(row.patentId))
    ),
    accessStatus,
  };
}

export function disclosedTo(
  patent: { _id?: string; ownerId?: string } | null | undefined,
  userId: string,
  userRole: string,
  grants: ViewerGrants
): boolean {
  if (!patent) return false;
  if (userRole === 'admin') return true;
  if (userId && String(patent.ownerId) === String(userId)) return true;
  const id = String(patent._id);
  return grants.signed.has(id) && grants.approved.has(id);
}

export function listingName(
  patent: any,
  analysis: any,
  disclosed: boolean
): string {
  if (!patent) return 'Removed listing';
  if (disclosed) return patent.title || 'Untitled listing';
  return publicTitle(analysis?.industryClassification, patent.title, patent.abstract);
}

function snapshot(patent: any, analysis: any): { assessment: CommercialAssessment; indicativeValue: IndicativeValue } {
  const trl = patent?.trlLevel ?? analysis?.readinessAssessment?.trlLevel ?? null;
  const assessment = assessCommercialPotential({
    title: patent?.title,
    abstract: patent?.abstract || analysis?.summary?.description || '',
    industries: analysis?.industryClassification,
    hasPrototype: !!patent?.hasPrototype,
    hasProduct: !!patent?.hasProduct,
    trlLevel: trl,
    prototypeDescription: patent?.prototypeDescription,
  });
  const price = priceIntellectualProperty({
    title: patent?.title,
    abstract: patent?.abstract,
    industries: analysis?.industryClassification,
    hasPrototype: !!patent?.hasPrototype,
    hasProduct: !!patent?.hasProduct,
    trlLevel: trl,
    askingPrice: patent?.askingPrice,
    isForSale: patent?.isForSale,
    isForLicense: patent?.isForLicense,
    filingYear: analysis?.filingYear,
    assessment,
  });
  return { assessment, indicativeValue: toIndicativeValue(price) };
}

function cleanText(value: string | undefined): string {
  return String(value || '')
    .replace(/\s*\(\d+[-a-zA-Z0-9]*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export interface EnrichPreload {
  analysis?: any | null;
  owner?: any | null;
  accessRequest?: any | null;
  accessKnown?: boolean;
  ndaSigned?: boolean;
  ndaKnown?: boolean;
  hasInterest?: boolean;
  hasMeeting?: boolean;
  relationsLoaded?: boolean;
}

export async function enrichPatentForViewer(
  patent: any,
  userId: string,
  userRole: string,
  preload: EnrichPreload = {}
) {
  const analysis =
    'analysis' in preload
      ? preload.analysis
      : await dbStore.patentAnalysis.findOne({ patentId: String(patent._id) });
  const owner =
    'owner' in preload
      ? preload.owner
      : await dbStore.users.findById(patent.ownerId);

  let accessStatus = 'none';
  let hasExpressedInterest = false;
  let hasMeetingDone = false;
  const isOwner = !!userId && String(patent.ownerId) === String(userId);
  const isAdmin = userRole === 'admin';

  if (isOwner || isAdmin) {
    accessStatus = 'approved';
    hasExpressedInterest = true;
    hasMeetingDone = true;
  } else if (preload.relationsLoaded || preload.accessKnown) {
    if (preload.accessRequest) accessStatus = preload.accessRequest.status;
    hasExpressedInterest = !!preload.hasInterest;
    hasMeetingDone = !!preload.hasMeeting;
  } else if (userId) {
    const request = await dbStore.accessRequests.findOne({
      patentId: String(patent._id),
      buyerId: userId,
    });
    if (request) accessStatus = request.status;
    const interests = await dbStore.interestRequests.find({
      patentId: String(patent._id),
      buyerId: userId,
    });
    hasExpressedInterest = interests.length > 0;
    const meetings = await dbStore.meetingRequests.find({
      patentId: String(patent._id),
      buyerId: userId,
    });
    // Pending or accepted counts — offer no longer waits for inventor accept
    hasMeetingDone = meetings.some((m: any) => m.status === 'accepted' || m.status === 'pending');
  }

  let ndaSigned = false;
  if (isOwner || isAdmin) {
    ndaSigned = true;
  } else if (preload.ndaKnown) {
    ndaSigned = !!preload.ndaSigned;
  } else if (userId) {
    const signature = await dbStore.ndaSignatures.findOne({
      patentId: String(patent._id),
      buyerId: userId,
    });
    ndaSigned = !!signature;
  }

  const disclosed = isOwner || isAdmin || (accessStatus === 'approved' && ndaSigned);
  const { assessment, indicativeValue } = snapshot(patent, analysis);
  const domains = coarseDomains(analysis?.industryClassification, patent.title, patent.abstract);

  const shared = {
    _id: patent._id,
    status: patent.status,
    ipType: patent.ipType,
    otherIpType: patent.otherIpType,
    assetType: patent.assetType,
    isForSale: patent.isForSale,
    isForLicense: patent.isForLicense,
    trlLevel: patent.trlLevel ?? analysis?.readinessAssessment?.trlLevel ?? null,
    hasPrototype: !!patent.hasPrototype,
    hasProduct: !!patent.hasProduct,
    createdAt: patent.createdAt,
    updatedAt: patent.updatedAt,
    accessStatus,
    hasExpressedInterest,
    hasMeetingDone,
    detailsVisible: disclosed,
    ndaSigned: isOwner || isAdmin ? false : ndaSigned,
    indicativeValue,
  };

  if (!disclosed) {
    const domain = domains[0] || 'Technology';
    return {
      ...shared,
      title: publicTitle(domains, patent.title, patent.abstract),
      publicLines: storedPublicSummary(patent) || publicLines({
        title: patent.title,
        abstract: patent.abstract,
        domain,
      }),
      analysis: {
        patentId: String(patent._id),
        industryClassification: domains,
        commercialPotentialScore: assessment.commercialPotentialScore,
        commercialBreakdown: assessment.commercialBreakdown,
      },
    };
  }

  const opened: any = {
    ...patent,
    ...shared,
    ndaSigned: isOwner || isAdmin ? true : ndaSigned,
    abstract: cleanText(patent.abstract),
    ownerName: owner?.name || 'Inventor',
    ownerOrganization: owner?.organization || '',
    analysis: analysis
      ? {
          ...analysis,
          patentId: String(patent._id),
          commercialPotentialScore: assessment.commercialPotentialScore,
          commercialBreakdown: assessment.commercialBreakdown,
          scoreRationale: assessment.scoreRationale,
          scoreEvidence: assessment.scoreEvidence,
          industryClassification: analysis.industryClassification?.length
            ? analysis.industryClassification
            : domains,
          summary: {
            ...analysis.summary,
            description: cleanText(analysis.summary?.description),
          },
        }
      : {
          patentId: String(patent._id),
          commercialPotentialScore: assessment.commercialPotentialScore,
          commercialBreakdown: assessment.commercialBreakdown,
          scoreRationale: assessment.scoreRationale,
          scoreEvidence: assessment.scoreEvidence,
          industryClassification: domains,
          summary: {
            description: cleanText(patent.abstract),
            problemSolved: '',
            commercialValue: assessment.scoreRationale,
            keyInnovation: '',
          },
        },
  };

  if (!isAdmin && !isOwner) {
    delete opened.reviewHistory;
    delete opened.grantReviewedBy;
    delete opened.grantReviewedPdfUrl;
    delete opened.grantReviewedAt;
  }

  return opened;
}
