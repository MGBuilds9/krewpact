/**
 * BoldSign API type definitions and mock data generators.
 */

export interface SignerInfo {
  name: string;
  emailAddress: string;
  signerOrder?: number;
  signerType?: 'Signer' | 'Reviewer';
  formFields?: FormField[];
}

export interface FormField {
  fieldType: 'Signature' | 'Initial' | 'DateSigned' | 'TextBox' | 'Checkbox';
  pageNumber: number;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isRequired?: boolean;
}

export interface CreateEnvelopeParams {
  /** Title/subject for the signing request */
  title: string;
  /** Message to include in the signing email */
  message?: string;
  /** Signers and their form field placements */
  signers: SignerInfo[];
  /** PDF file as Buffer or base64 string */
  files?: Array<{
    fileName: string;
    content: Buffer | string;
    contentType?: string;
  }>;
  /** URL of an existing PDF to use */
  fileUrls?: string[];
  /** Number of days before the envelope expires */
  expiryDays?: number;
  /** Reminder settings */
  enableSigningOrder?: boolean;
  /** Brand/template ID from BoldSign dashboard */
  brandId?: string;
}

export type EnvelopeStatusValue =
  | 'draft'
  | 'sent'
  | 'in_progress'
  | 'completed'
  | 'declined'
  | 'expired'
  | 'revoked'
  | 'waiting_for_others';

export interface EnvelopeStatus {
  documentId: string;
  status: EnvelopeStatusValue;
  signerDetails: Array<{
    signerEmail: string;
    signerName: string;
    status: string;
    signedDate?: string;
    declineReason?: string;
  }>;
  createdDate: string;
  activityDate: string;
  expiryDate?: string;
  senderDetail: {
    name: string;
    emailAddress: string;
  };
}

// ============================================================
// Mock data generators
// ============================================================

export function generateMockDocumentId(): string {
  return `mock-bs-${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
}

export function generateMockStatus(documentId: string): EnvelopeStatus {
  return {
    documentId,
    status: 'sent',
    signerDetails: [
      {
        signerEmail: 'signer@example.com',
        signerName: 'Mock Signer',
        status: 'Sent',
      },
    ],
    createdDate: new Date().toISOString(),
    activityDate: new Date().toISOString(),
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    senderDetail: {
      name: 'KrewPact',
      emailAddress: 'contracts@krewpact.com',
    },
  };
}
