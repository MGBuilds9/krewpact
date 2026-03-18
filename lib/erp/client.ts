/**
 * ERPNext REST API client.
 * All server-side ERPNext calls go through this client.
 * Auth: token-based (API key + secret).
 * See CLAUDE.md for conventions.
 */
import { logger } from '@/lib/logger';

const TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;
const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_RESET_MS = 30_000;

let consecutiveFailures = 0;
let circuitOpenUntil = 0;

function isCircuitOpen(): boolean {
  if (consecutiveFailures < CIRCUIT_THRESHOLD) return false;
  if (Date.now() > circuitOpenUntil) {
    // Half-open: allow one request through
    consecutiveFailures = CIRCUIT_THRESHOLD - 1;
    return false;
  }
  return true;
}

function recordSuccess(): void {
  consecutiveFailures = 0;
}

function recordFailure(): void {
  consecutiveFailures++;
  if (consecutiveFailures >= CIRCUIT_THRESHOLD) {
    circuitOpenUntil = Date.now() + CIRCUIT_RESET_MS;
    logger.warn('ERPNext circuit breaker OPEN', {
      failures: consecutiveFailures,
      resetAt: new Date(circuitOpenUntil).toISOString(),
    });
  }
}

function isRetryable(status: number): boolean {
  return status >= 500 || status === 408 || status === 429;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export class ErpClient {
  private baseUrl: string;
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    this.baseUrl = process.env.ERPNEXT_BASE_URL || '';
    this.apiKey = (process.env.ERPNEXT_API_KEY || '').trim();
    this.apiSecret = (process.env.ERPNEXT_API_SECRET || '').trim();
  }

  /** Check if running in mock mode (no real ERPNext instance) */
  isMockMode(): boolean {
    const mock = !this.baseUrl || this.baseUrl === 'mock';
    if (mock && process.env.NODE_ENV === 'production') {
      import('@sentry/nextjs').then((Sentry) => {
        Sentry.captureMessage('CRITICAL: ERPNext mock mode active in production', {
          level: 'error',
        });
      });
    }
    return mock;
  }

  getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `token ${this.apiKey}:${this.apiSecret}`,
      'Content-Type': 'application/json',
    };
  }

  getResourceUrl(doctype: string, name?: string): string {
    const base = `${this.baseUrl}/api/resource/${doctype}`;
    if (name) {
      return `${base}/${encodeURIComponent(name)}`;
    }
    return base;
  }

  private shouldRetryError(err: Error, attempt: number, url: string): boolean {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      logger.warn('ERPNext request timed out', { url, attempt });
      return attempt < MAX_RETRIES - 1;
    }
    if (err.message.includes('circuit breaker')) return false;
    if (!err.name?.includes('Timeout') && !err.message.includes('fetch')) return false;
    return attempt < MAX_RETRIES - 1;
  }

  private async _fetch(url: string, init?: RequestInit): Promise<Response> {
    if (isCircuitOpen()) {
      throw new Error('ERPNext circuit breaker is open — skipping request');
    }

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });

        if (response.ok) {
          recordSuccess();
          return response;
        }

        if (isRetryable(response.status) && attempt < MAX_RETRIES - 1) {
          const backoff = 1000 * Math.pow(2, attempt);
          logger.warn('ERPNext retrying', { url, status: response.status, attempt, backoff });
          await sleep(backoff);
          continue;
        }

        recordFailure();
        throw new Error(`ERPNext API error: ${response.status} ${response.statusText}`);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (this.shouldRetryError(lastError, attempt, url)) {
          await sleep(1000 * Math.pow(2, attempt));
          continue;
        }
        throw lastError;
      }
    }

    recordFailure();
    throw lastError || new Error('ERPNext request failed after retries');
  }

  async get<T>(doctype: string, name: string): Promise<T> {
    const url = this.getResourceUrl(doctype, name);
    const response = await this._fetch(url, {
      headers: this.getAuthHeaders(),
    });

    const json = await response.json();
    return json.data as T;
  }

  async list<T>(
    doctype: string,
    filters?: Record<string, unknown>,
    fields?: string[],
    limit?: number,
  ): Promise<T[]> {
    const params = new URLSearchParams();
    if (filters) params.set('filters', JSON.stringify(filters));
    if (fields) params.set('fields', JSON.stringify(fields));
    if (limit) params.set('limit_page_length', String(limit));

    const url = `${this.getResourceUrl(doctype)}?${params.toString()}`;
    const response = await this._fetch(url, {
      headers: this.getAuthHeaders(),
    });

    const json = await response.json();
    return json.data as T[];
  }

  async create<T>(doctype: string, data: Record<string, unknown>): Promise<T> {
    const url = this.getResourceUrl(doctype);
    const response = await this._fetch(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ data }),
    });

    const json = await response.json();
    return json.data as T;
  }

  async update<T>(doctype: string, name: string, data: Record<string, unknown>): Promise<T> {
    const url = this.getResourceUrl(doctype, name);
    const response = await this._fetch(url, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ data }),
    });

    const json = await response.json();
    return json.data as T;
  }

  async delete(doctype: string, name: string): Promise<void> {
    const url = this.getResourceUrl(doctype, name);
    await this._fetch(url, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
  }
}
