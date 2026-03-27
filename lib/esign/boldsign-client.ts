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

export type {
  CreateEnvelopeParams,
  EnvelopeStatus,
  EnvelopeStatusValue,
  FormField,
  SignerInfo,
} from './boldsign-types';
import type { CreateEnvelopeParams, EnvelopeStatus, FormField } from './boldsign-types';
import { generateMockDocumentId, generateMockStatus } from './boldsign-types';

// ============================================================
// FormData helpers
// ============================================================

const BOLDSIGN_BASE_URL = 'https://api.boldsign.com/v1';

function appendFormField(
  formData: FormData,
  signerIdx: number,
  fieldIdx: number,
  field: FormField,
): void {
  const prefix = `Signers[${signerIdx}][FormFields][${fieldIdx}]`;
  formData.append(`${prefix}[FieldType]`, field.fieldType);
  formData.append(`${prefix}[PageNumber]`, String(field.pageNumber));
  formData.append(`${prefix}[Bounds][X]`, String(field.bounds.x));
  formData.append(`${prefix}[Bounds][Y]`, String(field.bounds.y));
  formData.append(`${prefix}[Bounds][Width]`, String(field.bounds.width));
  formData.append(`${prefix}[Bounds][Height]`, String(field.bounds.height));
  if (field.isRequired != null) {
    formData.append(`${prefix}[IsRequired]`, String(field.isRequired));
  }
}

// ============================================================
// Client
// ============================================================

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
  async createEnvelope(params: CreateEnvelopeParams): Promise<{ documentId: string }> {
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

    params.signers.forEach((signer, i) => {
      formData.append(`Signers[${i}][Name]`, signer.name);
      formData.append(`Signers[${i}][EmailAddress]`, signer.emailAddress);
      if (signer.signerOrder != null) {
        formData.append(`Signers[${i}][SignerOrder]`, String(signer.signerOrder));
      }
      if (signer.signerType) {
        formData.append(`Signers[${i}][SignerType]`, signer.signerType);
      }
      signer.formFields?.forEach((field, j) => {
        appendFormField(formData, i, j, field);
      });
    });

    if (params.fileUrls) {
      for (const url of params.fileUrls) {
        formData.append('FileUrls', url);
      }
    }

    if (params.files) {
      for (const file of params.files) {
        const content =
          typeof file.content === 'string' ? Buffer.from(file.content, 'base64') : file.content;
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
      throw new Error(`BoldSign API error: ${response.status} ${response.statusText}`);
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
      throw new Error(`BoldSign API error: ${response.status} ${response.statusText}`);
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
      throw new Error(`BoldSign API error: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Map BoldSign event status to our internal envelope status.
   */
  static mapEventStatus(boldSignStatus: string): string {
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
