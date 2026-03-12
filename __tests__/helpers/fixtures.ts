/**
 * Factory functions for generating valid test data matching canonical schema.
 * Each function returns a complete, valid record. Override fields via partial arg.
 */

const TEST_ORG_ID = '00000000-0000-4000-a000-000000000000';
const TEST_DIVISION_ID = '00000000-0000-4000-a000-000000000001';
const TEST_USER_ID = '00000000-0000-4000-a000-000000000099';
const TEST_ACCOUNT_ID = '00000000-0000-4000-a000-000000000010';
const TEST_CONTACT_ID = '00000000-0000-4000-a000-000000000020';
const TEST_LEAD_ID = '00000000-0000-4000-a000-000000000030';
const TEST_OPPORTUNITY_ID = '00000000-0000-4000-a000-000000000040';
const TEST_ESTIMATE_ID = '00000000-0000-4000-a000-000000000050';

let counter = 0;
function nextId(): string {
  counter++;
  return `00000000-0000-4000-a000-${String(counter).padStart(12, '0')}`;
}

/** Reset the auto-increment counter (call in beforeEach if needed) */
export function resetFixtureCounter() {
  counter = 0;
}

export function makeAccount(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId(),
    org_id: TEST_ORG_ID,
    division_id: TEST_DIVISION_ID,
    account_name: 'Test Account Inc.',
    account_type: 'client',
    billing_address: null,
    shipping_address: null,
    notes: null,
    industry: null,
    phone: null,
    email: null,
    website: null,
    address: null,
    company_code: null,
    source: 'manual',
    total_projects: 0,
    lifetime_revenue: 0,
    first_project_date: null,
    last_project_date: null,
    is_repeat_client: false,
    tags: [],
    metadata: {},
    deleted_at: null,
    created_by: TEST_USER_ID,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeContact(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId(),
    org_id: TEST_ORG_ID,
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
    org_id: TEST_ORG_ID,
    company_name: 'Big Construction Project',
    domain: null,
    industry: null,
    address: null,
    city: null,
    province: null,
    postal_code: null,
    division_id: TEST_DIVISION_ID,
    source_channel: 'website',
    source_detail: null,
    utm_campaign: null,
    status: 'new' as const,
    lost_reason: null,
    lead_score: null,
    fit_score: null,
    intent_score: null,
    engagement_score: null,
    is_qualified: false,
    current_sequence_id: null,
    automation_paused: false,
    assigned_to: TEST_USER_ID,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    last_touch_at: null,
    next_followup_at: null,
    deleted_at: null,
    ...overrides,
  };
}

export function makeOpportunity(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId(),
    org_id: TEST_ORG_ID,
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
    org_id: TEST_ORG_ID,
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
    org_id: TEST_ORG_ID,
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
    org_id: TEST_ORG_ID,
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

const TEST_PROJECT_ID = '00000000-0000-4000-a000-000000000060';
const TEST_TASK_ID = '00000000-0000-4000-a000-000000000070';

export function makeProject(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId(),
    org_id: TEST_ORG_ID,
    division_id: TEST_DIVISION_ID,
    project_number: 'PRJ-2026-001',
    project_name: 'Test Construction Project',
    status: 'planning' as const,
    site_address: {
      street: '123 Main St',
      city: 'Mississauga',
      province: 'ON',
      postal_code: 'L5B 1M2',
    },
    baseline_budget: 500000,
    current_budget: 500000,
    start_date: '2026-03-01',
    target_completion_date: '2026-09-01',
    actual_completion_date: null,
    baseline_schedule: null,
    account_id: TEST_ACCOUNT_ID,
    contact_id: TEST_CONTACT_ID,
    contract_id: null,
    metadata: {},
    created_by: TEST_USER_ID,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId(),
    org_id: TEST_ORG_ID,
    project_id: TEST_PROJECT_ID,
    title: 'Install drywall',
    description: 'Install drywall in all bedrooms',
    status: 'todo' as const,
    priority: 'medium',
    assigned_user_id: TEST_USER_ID,
    milestone_id: null,
    due_at: '2026-04-01T00:00:00Z',
    start_at: null,
    completed_at: null,
    blocked_reason: null,
    metadata: {},
    created_by: TEST_USER_ID,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeExpenseClaim(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId(),
    org_id: TEST_ORG_ID,
    user_id: TEST_USER_ID,
    division_id: TEST_DIVISION_ID,
    project_id: TEST_PROJECT_ID,
    amount: 250.0,
    tax_amount: 32.5,
    category: 'materials',
    description: 'Lumber for framing',
    expense_date: '2026-02-10',
    currency_code: 'CAD',
    status: 'draft' as const,
    submitted_at: null,
    posted_at: null,
    erp_document_id: null,
    erp_document_type: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId(),
    org_id: TEST_ORG_ID,
    user_id: TEST_USER_ID,
    channel: 'in_app' as const,
    title: 'Task assigned to you',
    message: 'You have been assigned to "Install drywall"',
    state: 'queued' as const,
    payload: {},
    portal_account_id: null,
    read_at: null,
    send_at: null,
    sent_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeDailyLog(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId(),
    org_id: TEST_ORG_ID,
    project_id: TEST_PROJECT_ID,
    log_date: '2026-02-10',
    work_summary: 'Completed framing on 2nd floor',
    crew_count: 8,
    weather: { temp: 5, condition: 'cloudy' },
    delays: null,
    safety_notes: null,
    submitted_by: TEST_USER_ID,
    submitted_at: '2026-02-10T17:00:00Z',
    is_offline_origin: false,
    sync_client_id: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeBiddingOpportunity(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId(),
    org_id: TEST_ORG_ID,
    division_id: TEST_DIVISION_ID,
    title: 'Municipal Building Renovation Bid',
    source: 'merx' as const,
    url: 'https://merx.com/bid/12345',
    deadline: '2026-06-15T17:00:00Z',
    estimated_value: 500000,
    status: 'new' as const,
    assigned_to: TEST_USER_ID,
    opportunity_id: null,
    notes: null,
    metadata: {},
    created_by: TEST_USER_ID,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeEnrichmentJob(overrides: Record<string, unknown> = {}) {
  return {
    id: nextId(),
    lead_id: TEST_LEAD_ID,
    status: 'completed' as const,
    source: 'apollo',
    result: { company_size: '50-200' },
    error_message: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

/** Well-known test IDs for cross-referencing in tests */
export const TEST_IDS = {
  ORG_ID: TEST_ORG_ID,
  DIVISION_ID: TEST_DIVISION_ID,
  USER_ID: TEST_USER_ID,
  ACCOUNT_ID: TEST_ACCOUNT_ID,
  CONTACT_ID: TEST_CONTACT_ID,
  LEAD_ID: TEST_LEAD_ID,
  OPPORTUNITY_ID: TEST_OPPORTUNITY_ID,
  ESTIMATE_ID: TEST_ESTIMATE_ID,
  PROJECT_ID: TEST_PROJECT_ID,
  TASK_ID: TEST_TASK_ID,
} as const;
