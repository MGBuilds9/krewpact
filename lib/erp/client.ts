/**
 * ERPNext REST API client.
 * All server-side ERPNext calls go through this client.
 * Auth: token-based (API key + secret).
 * See CLAUDE.md for conventions.
 */
export class ErpClient {
  private baseUrl: string;
  private apiKey: string;
  private apiSecret: string;

  constructor() {
    this.baseUrl = process.env.ERPNEXT_BASE_URL || '';
    this.apiKey = process.env.ERPNEXT_API_KEY || '';
    this.apiSecret = process.env.ERPNEXT_API_SECRET || '';
  }

  /** Check if running in mock mode (no real ERPNext instance) */
  isMockMode(): boolean {
    return !this.baseUrl || this.baseUrl === 'mock';
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

  async get<T>(doctype: string, name: string): Promise<T> {
    const url = this.getResourceUrl(doctype, name);
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`ERPNext API error: ${response.status} ${response.statusText}`);
    }

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
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`ERPNext API error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    return json.data as T[];
  }

  async create<T>(doctype: string, data: Record<string, unknown>): Promise<T> {
    const url = this.getResourceUrl(doctype);
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      throw new Error(`ERPNext API error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    return json.data as T;
  }

  async update<T>(doctype: string, name: string, data: Record<string, unknown>): Promise<T> {
    const url = this.getResourceUrl(doctype, name);
    const response = await fetch(url, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      throw new Error(`ERPNext API error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    return json.data as T;
  }

  async delete(doctype: string, name: string): Promise<void> {
    const url = this.getResourceUrl(doctype, name);
    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`ERPNext API error: ${response.status} ${response.statusText}`);
    }
  }
}
