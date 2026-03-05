/**
 * BoldSign e-signing API client.
 *
 * All e-sign operations go through this client.
 * Supports mock mode when BOLDSIGN_API_KEY is not set.
 *
 * API docs: https://www.boldsign.com/help/api/
 * Auth: X-API-KEY header
 * Base URL: https://api.boldsign.com/v1
 */

import { logger } from '@/lib/logger';

// ============================================================
// Types
// ============================================================

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

function generateMockDocumentId(): string {
  const chars = 'abcdef0123456789';
  let id = 'mock-bs-';
  for (let i = 0; i < 24; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function generateMockStatus(documentId: string): EnvelopeStatus {
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

// ============================================================
// Client
// ============================================================

const BOLDSIGN_BASE_URL = 'https://api.boldsign.com/v1';

export class BoldSignClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.BOLDSIGN_API_KEY || '';
    this.baseUrl = process.env.BOLDSIGN_BASE_URL || BOLDSIGN_BASE_URL;
  }

  /** Check if running in mock mode (no API key configured) */
  isMockMode(): boolean {
    return !this.apiKey || this.apiKey === 'mock';
  }

  private getHeaders(): Record<string, string> {
    return {
      'X-API-KEY': this.apiKey,
    };
  }

  /**
   * Create and send an envelope for signing.
   *
   * BoldSign API: POST /v1/document/send
   * Uses multipart/form-data to upload PDF files along with signer details.
   */
  async createEnvelope(
    params: CreateEnvelopeParams,
  ): Promise<{ documentId: string }> {
    if (this.isMockMode()) {
      const documentId = generateMockDocumentId();
      logger.info('BoldSign mock: created envelope', {
        documentId,
        title: params.title,
        signerCount: params.signers.length,
      });
      return { documentId };
    }

    const formData = new FormData();
    formData.append('Title', params.title);
    if (params.message) formData.append('Message', params.message);
    if (params.expiryDays != null) formData.append('ExpiryDays', String(params.expiryDays));
    if (params.enableSigningOrder != null) {
      formData.append('EnableSigningOrder', String(params.enableSigningOrder));
    }
    if (params.brandId) formData.append('BrandId', params.brandId);

    // Add signers
    for (let i = 0; i < params.signers.length; i++) {
      const signer = params.signers[i];
      formData.append(`Signers[${i}][Name]`, signer.name);
      formData.append(`Signers[${i}][EmailAddress]`, signer.emailAddress);
      if (signer.signerOrder != null) {
        formData.append(`Signers[${i}][SignerOrder]`, String(signer.signerOrder));
      }
      if (signer.signerType) {
        formData.append(`Signers[${i}][SignerType]`, signer.signerType);
      }
      if (signer.formFields) {
        for (let j = 0; j < signer.formFields.length; j++) {
          const field = signer.formFields[j];
          formData.append(`Signers[${i}][FormFields][${j}][FieldType]`, field.fieldType);
          formData.append(`Signers[${i}][FormFields][${j}][PageNumber]`, String(field.pageNumber));
          formData.append(
            `Signers[${i}][FormFields][${j}][Bounds][X]`,
            String(field.bounds.x),
          );
          formData.append(
            `Signers[${i}][FormFields][${j}][Bounds][Y]`,
            String(field.bounds.y),
          );
          formData.append(
            `Signers[${i}][FormFields][${j}][Bounds][Width]`,
            String(field.bounds.width),
          );
          formData.append(
            `Signers[${i}][FormFields][${j}][Bounds][Height]`,
            String(field.bounds.height),
          );
          if (field.isRequired != null) {
            formData.append(
              `Signers[${i}][FormFields][${j}][IsRequired]`,
              String(field.isRequired),
            );
          }
        }
      }
    }

    // Add file URLs
    if (params.fileUrls) {
      for (const url of params.fileUrls) {
        formData.append('FileUrls', url);
      }
    }

    // Add file content
    if (params.files) {
      for (const file of params.files) {
        const content =
          typeof file.content === 'string'
            ? Buffer.from(file.content, 'base64')
            : file.content;
        const blob = new Blob([new Uint8Array(content)], {
          type: file.contentType || 'application/pdf',
        });
        formData.append('Files', blob, file.fileName);
      }
    }

    const response = await fetch(`${this.baseUrl}/document/send`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('BoldSign createEnvelope failed', {
        status: response.status,
        error: errorText,
      });
      throw new Error(
        `BoldSign API error: ${response.status} ${response.statusText}`,
      );
    }

    const result = (await response.json()) as { documentId: string };
    logger.info('BoldSign envelope created', {
      documentId: result.documentId,
      title: params.title,
    });
    return result;
  }

  /**
   * Get envelope/document status.
   *
   * BoldSign API: GET /v1/document/properties?documentId={id}
   */
  async getStatus(documentId: string): Promise<EnvelopeStatus> {
    if (this.isMockMode()) {
      logger.info('BoldSign mock: getStatus', { documentId });
      return generateMockStatus(documentId);
    }

    const url = `${this.baseUrl}/document/properties?documentId=${encodeURIComponent(documentId)}`;
    const response = await fetch(url, {
      headers: {
        ...this.getHeaders(),
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('BoldSign getStatus failed', {
        documentId,
        status: response.status,
        error: errorText,
      });
      throw new Error(
        `BoldSign API error: ${response.status} ${response.statusText}`,
      );
    }

    return (await response.json()) as EnvelopeStatus;
  }

  /**
   * Download signed document as Buffer.
   *
   * BoldSign API: GET /v1/document/download?documentId={id}
   */
  async downloadDocument(documentId: string): Promise<Buffer> {
    if (this.isMockMode()) {
      logger.info('BoldSign mock: downloadDocument', { documentId });
      return Buffer.from(`%PDF-1.4 mock signed document ${documentId}`, 'utf-8');
    }

    const url = `${this.baseUrl}/document/download?documentId=${encodeURIComponent(documentId)}`;
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('BoldSign downloadDocument failed', {
        documentId,
        status: response.status,
        error: errorText,
      });
      throw new Error(
        `BoldSign API error: ${response.status} ${response.statusText}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Map BoldSign event status to our internal envelope status.
   */
  static mapEventStatus(
    boldSignStatus: string,
  ): string {
    const statusMap: Record<string, string> = {
      Completed: 'completed',
      Declined: 'declined',
      Expired: 'expired',
      Revoked: 'revoked',
      Sent: 'sent',
      InProgress: 'in_progress',
      Draft: 'draft',
      WaitingForOthers: 'waiting_for_others',
    };
    return statusMap[boldSignStatus] ?? boldSignStatus.toLowerCase();
  }
}
