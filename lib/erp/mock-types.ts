/**
 * Type definitions for mock ERPNext response generators.
 */

export interface AccountData {
  id: string;
  account_name: string;
  account_type?: string;
  billing_address?: Record<string, unknown> | null;
}

export interface EstimateData {
  id: string;
  estimate_number: string;
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
  currency_code?: string;
  account_id?: string | null;
  contact_id?: string | null;
}

export interface EstimateLineData {
  description: string;
  quantity: number;
  unit_cost: number;
  unit?: string | null;
  line_total: number;
}

let mockCounter = 0;

export function nextMockId(prefix: string): string {
  mockCounter++;
  return `${prefix}-MOCK-${String(mockCounter).padStart(3, '0')}`;
}

/** Reset mock counter (for testing) */
export function resetMockCounter(): void {
  mockCounter = 0;
}
