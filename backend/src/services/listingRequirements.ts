export const IP_TYPES = ['utility_patent', 'design', 'other'] as const;
export type IPType = typeof IP_TYPES[number];
export interface ListingEvidence {
  pdfUrl: string;
  ipType: IPType;
  otherIpType: string;
  registrationStatus: 'granted' | 'registered';
  grantConfirmed: true;
}

export function isHttpDocumentLink(value: unknown): boolean {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 2048) return false;
  try {
    const url = new URL(value.trim());
    return ['http:', 'https:'].includes(url.protocol) && !!url.hostname && !url.username && !url.password;
  } catch { return false; }
}

// Links can be signed or hosted by a document service, so PDF content is checked by the reviewer.
export function validateListingEvidence(input: any): { valid: true; value: ListingEvidence } | { valid: false; message: string } {
  if (!isHttpDocumentLink(input.pdfUrl)) return { valid: false, message: 'An HTTP(S) link to the official grant or registration PDF is required.' };
  if (!IP_TYPES.includes(input.ipType)) return { valid: false, message: 'Choose Utility Patent, Design, or Other as the IP type.' };
  const otherIpType = typeof input.otherIpType === 'string' ? input.otherIpType.trim() : '';
  if (input.ipType === 'other' && (!otherIpType || otherIpType.length > 80)) return { valid: false, message: 'Describe the other IP type in up to 80 characters.' };
  if (!['granted', 'registered'].includes(input.registrationStatus) ||
    (input.ipType === 'utility_patent' && input.registrationStatus !== 'granted') ||
    (input.ipType === 'design' && input.registrationStatus !== 'registered')) {
    return { valid: false, message: 'Only granted patents or approved registrations can be submitted. Pending or merely published applications are not eligible.' };
  }
  if (input.grantConfirmed !== true) return { valid: false, message: 'Confirm that this IP has been granted or registered and that the PDF is its official approval document.' };
  return { valid: true, value: {
    pdfUrl: input.pdfUrl.trim(), ipType: input.ipType,
    otherIpType: input.ipType === 'other' ? otherIpType : '',
    registrationStatus: input.registrationStatus, grantConfirmed: true,
  } };
}
