/**
 * Takeoff Engine REST API client.
 * All server-side Takeoff Engine calls go through this client.
 * Auth: Bearer token.
 * Mirrors the ERPNext client pattern (circuit breaker, retries, timeout).
 */
import * as Sentry from '@sentry/nextjs';

import { logger } from '@/lib/logger';

const TIMEOUT_MS = 30_000;
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
    logger.warn('Takeoff Engine circuit breaker OPEN', {
      failures: consecutiveFailures,
      resetAt: new Date(circuitOpenUntil).toISOString(),
    });
    Sentry.addBreadcrumb({
      category: 'takeoff',
      message: `Circuit breaker opened after ${consecutiveFailures} failures`,
      level: 'warning',
    });
  }
}

function isRetryable(status: number): boolean {
  return status >= 500 || status === 408 || status === 429;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export class TakeoffEngineClient {
  private baseUrl: string;
  private token: string;

  constructor() {
    this.baseUrl = (process.env.TAKEOFF_ENGINE_URL || '').trim();
    this.token = (process.env.TAKEOFF_ENGINE_TOKEN || '').trim();
  }

  isMockMode(): boolean {
    return !this.baseUrl || this.baseUrl === 'mock';
  }

  getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  private async _fetch(url: string, init?: RequestInit): Promise<Response> {
    if (isCircuitOpen()) {
      throw new Error('Takeoff Engine circuit breaker is open — skipping request');
    }

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          ...init,
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });

        if (response.ok) {
          recordSuccess();
          return response;
        }

        if (isRetryable(response.status) && attempt < MAX_RETRIES - 1) {
          const backoff = 1000 * Math.pow(2, attempt);
          logger.warn('Takeoff Engine retrying', {
            url,
            status: response.status,
            attempt,
            backoff,
          });
          await sleep(backoff);
          continue;
        }

        recordFailure();
        throw new Error(`Takeoff Engine API error: ${response.status} ${response.statusText}`);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (
          (lastError.name === 'TimeoutError' || lastError.name === 'AbortError') &&
          attempt < MAX_RETRIES - 1
        ) {
          logger.warn('Takeoff Engine request timed out', { url, attempt });
          await sleep(1000 * Math.pow(2, attempt));
          continue;
        }
        if (lastError.message.includes('circuit breaker')) throw lastError;
        throw lastError;
      }
    }

    recordFailure();
    const finalError = lastError || new Error('Takeoff Engine request failed after retries');
    Sentry.captureException(finalError, {
      tags: { module: 'takeoff' },
      extra: { url, retries: MAX_RETRIES },
    });
    throw finalError;
  }

  async createJob(params: {
    estimate_id: string;
    file_urls: string[];
    filenames: string[];
    config?: Record<string, unknown>;
  }): Promise<{ job_id: string }> {
    if (this.isMockMode()) {
      logger.warn('TakeoffEngineClient: mock mode — createJob returning stub');
      return { job_id: `mock-job-${Date.now()}` };
    }
    const response = await this._fetch(`${this.baseUrl}/api/v1/jobs`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(params),
    });
    return response.json() as Promise<{ job_id: string }>;
  }

  async getJobStatus(engineJobId: string): Promise<Record<string, unknown>> {
    if (this.isMockMode()) {
      logger.warn('TakeoffEngineClient: mock mode — getJobStatus returning stub');
      return { job_id: engineJobId, status: 'pending' };
    }
    const response = await this._fetch(`${this.baseUrl}/api/v1/jobs/${engineJobId}`, {
      headers: this.getAuthHeaders(),
    });
    return response.json() as Promise<Record<string, unknown>>;
  }

  async getJobPages(engineJobId: string): Promise<Record<string, unknown>[]> {
    if (this.isMockMode()) {
      logger.warn('TakeoffEngineClient: mock mode — getJobPages returning stub');
      return [];
    }
    const response = await this._fetch(`${this.baseUrl}/api/v1/jobs/${engineJobId}/pages`, {
      headers: this.getAuthHeaders(),
    });
    return response.json() as Promise<Record<string, unknown>[]>;
  }

  async getJobLines(engineJobId: string): Promise<Record<string, unknown>[]> {
    if (this.isMockMode()) {
      logger.warn('TakeoffEngineClient: mock mode — getJobLines returning stub');
      return [];
    }
    const response = await this._fetch(`${this.baseUrl}/api/v1/jobs/${engineJobId}/lines`, {
      headers: this.getAuthHeaders(),
    });
    return response.json() as Promise<Record<string, unknown>[]>;
  }

  async cancelJob(engineJobId: string): Promise<void> {
    if (this.isMockMode()) {
      logger.warn('TakeoffEngineClient: mock mode — cancelJob no-op');
      return;
    }
    await this._fetch(`${this.baseUrl}/api/v1/jobs/${engineJobId}/cancel`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
  }

  async submitFeedback(engineJobId: string, feedback: Record<string, unknown>[]): Promise<void> {
    if (this.isMockMode()) {
      logger.warn('TakeoffEngineClient: mock mode — submitFeedback no-op');
      return;
    }
    await this._fetch(`${this.baseUrl}/api/v1/jobs/${engineJobId}/feedback`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(feedback),
    });
  }

  async healthCheck(): Promise<boolean> {
    if (this.isMockMode()) {
      logger.warn('TakeoffEngineClient: mock mode — healthCheck returning true');
      return true;
    }
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/health`, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const takeoffEngine = new TakeoffEngineClient();
