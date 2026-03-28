/**
 * Reusable test data for E2E flow tests.
 * All names include a timestamp suffix to avoid collisions.
 */

function ts(): string {
  return Date.now().toString(36);
}

export const fixtures = {
  project: {
    name: () => `E2E Test Project ${ts()}`,
    description: 'Automated E2E test project — safe to delete',
    status: 'active' as const,
  },

  dailyLog: {
    weather: 'Clear' as const,
    temperature: 15,
    crewSize: 8,
    notes: () => `E2E daily log entry ${ts()}`,
  },

  lead: {
    companyName: () => `E2E Test Company ${ts()}`,
    contactName: 'Test Contact',
    contactEmail: () => `e2e-${ts()}@test.krewpact.com`,
    phone: '416-555-0100',
    source: 'website' as const,
  },

  expense: {
    description: () => `E2E expense ${ts()}`,
    amount: 150.0,
    category: 'Materials',
    vendor: 'Test Vendor Inc.',
  },

  estimate: {
    name: () => `EST-E2E-${ts()}`,
    lineItems: [
      { description: 'Labour — General', qty: 40, rate: 75, unit: 'hr' },
      { description: 'Materials — Concrete', qty: 10, rate: 120, unit: 'yd3' },
      { description: 'Equipment Rental', qty: 1, rate: 500, unit: 'day' },
    ],
  },

  teamMember: {
    email: () => `e2e-member-${ts()}@test.krewpact.com`,
    firstName: 'E2E',
    lastName: 'Tester',
    role: 'project_coordinator' as const,
  },
};

/**
 * Org slug used in URL paths for the test organization.
 * Defaults to 'mdm-group' (the primary MDM org).
 */
export const TEST_ORG_SLUG = process.env.E2E_ORG_SLUG ?? 'acme-construction';

/**
 * Build a dashboard URL with the test org slug.
 */
export function orgUrl(path: string): string {
  return `/org/${TEST_ORG_SLUG}${path.startsWith('/') ? path : `/${path}`}`;
}
