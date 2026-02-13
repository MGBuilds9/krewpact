/**
 * Factory functions for generating valid test data matching canonical schema.
 * Each function returns a complete, valid record. Override fields via partial arg.
 */

const TEST_DIVISION_ID = '00000000-0000-0000-0000-000000000001';
const TEST_USER_ID = '00000000-0000-0000-0000-000000000099';
const TEST_ACCOUNT_ID = '00000000-0000-0000-0000-000000000010';
const TEST_CONTACT_ID = '00000000-0000-0000-0000-000000000020';
const TEST_LEAD_ID = '00000000-0000-0000-0000-000000000030';
const TEST_OPPORTUNITY_ID = '00000000-0000-0000-0000-000000000040';
const TEST_ESTIMATE_ID = '00000000-0000-0000-0000-000000000050';

let counter = 0;
function nextId(): string {
  counter++;
  return `00000000-0000-0000-0000-${String(counter).padStart(12, '0')}`;
}

/** Reset the auto-increment counter (call in beforeEach if needed) */
export function resetFixtureCounter() {
  counter = 0;
}

export function makeAccount(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId(),
    division_id: TEST_DIVISION_ID,
    account_name: 'Test Account Inc.',
    account_type: 'client',
    billing_address: null,
    shipping_address: null,
    notes: null,
    created_by: TEST_USER_ID,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeContact(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId(),
    account_id: TEST_ACCOUNT_ID,
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane.smith@example.com',
    phone: '416-555-0100',
    role_title: 'Project Manager',
    is_primary: false,
    communication_prefs: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeLead(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId(),
    division_id: TEST_DIVISION_ID,
    source: 'website',
    lead_name: 'Big Construction Project',
    company_name: 'ABC Builders',
    email: 'leads@abcbuilders.com',
    phone: '905-555-0200',
    stage: 'new' as const,
    estimated_value: 50000,
    probability_pct: 25,
    assigned_to: TEST_USER_ID,
    lost_reason: null,
    fit_score: 0,
    intent_score: 0,
    engagement_score: 0,
    total_score: 0,
    enrichment_data: {},
    enrichment_status: 'pending',
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeOpportunity(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId(),
    lead_id: TEST_LEAD_ID,
    account_id: TEST_ACCOUNT_ID,
    contact_id: TEST_CONTACT_ID,
    division_id: TEST_DIVISION_ID,
    opportunity_name: 'Renovation Phase 1',
    stage: 'intake' as const,
    target_close_date: '2026-06-01',
    estimated_revenue: 150000,
    probability_pct: 50,
    owner_user_id: TEST_USER_ID,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeActivity(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId(),
    opportunity_id: TEST_OPPORTUNITY_ID,
    lead_id: null,
    account_id: null,
    contact_id: null,
    activity_type: 'call' as const,
    title: 'Follow-up call',
    details: 'Discussed project timeline',
    due_at: '2026-02-15T10:00:00Z',
    completed_at: null,
    owner_user_id: TEST_USER_ID,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeEstimate(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId(),
    opportunity_id: TEST_OPPORTUNITY_ID,
    account_id: TEST_ACCOUNT_ID,
    contact_id: TEST_CONTACT_ID,
    division_id: TEST_DIVISION_ID,
    estimate_number: 'EST-2026-001',
    status: 'draft' as const,
    currency_code: 'CAD',
    subtotal_amount: 0,
    tax_amount: 0,
    total_amount: 0,
    margin_pct: null,
    revision_no: 1,
    owner_user_id: TEST_USER_ID,
    approved_at: null,
    approved_by: null,
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeEstimateLine(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId(),
    estimate_id: TEST_ESTIMATE_ID,
    parent_line_id: null,
    line_type: 'item',
    description: 'Labour — Framing crew',
    unit: 'hr',
    quantity: 40,
    unit_cost: 75,
    markup_pct: 10,
    line_total: 3300, // 40 * 75 * 1.10
    is_optional: false,
    sort_order: 0,
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

/** Well-known test IDs for cross-referencing in tests */
export const TEST_IDS = {
  DIVISION_ID: TEST_DIVISION_ID,
  USER_ID: TEST_USER_ID,
  ACCOUNT_ID: TEST_ACCOUNT_ID,
  CONTACT_ID: TEST_CONTACT_ID,
  LEAD_ID: TEST_LEAD_ID,
  OPPORTUNITY_ID: TEST_OPPORTUNITY_ID,
  ESTIMATE_ID: TEST_ESTIMATE_ID,
} as const;
