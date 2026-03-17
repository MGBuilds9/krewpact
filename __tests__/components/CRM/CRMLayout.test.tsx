import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/org/test-org/crm/leads',
  useParams: () => ({ orgSlug: 'test-org' }),
}));

vi.mock('@/hooks/useOrgRouter', () => ({
  useOrgRouter: () => ({ orgPath: (p: string) => `/org/test-org${p}` }),
}));

vi.mock('@/components/CRM/GlobalSearch', () => ({
  GlobalSearch: () => <div data-testid="global-search" />,
}));

import CRMLayout from '@/app/(dashboard)/org/[orgSlug]/crm/layout';

describe('CRMLayout', () => {
  it('renders tab navigation', () => {
    render(
      <CRMLayout>
        <div>child</div>
      </CRMLayout>,
    );
    expect(screen.getByText('Leads')).toBeInTheDocument();
    expect(screen.getByText('Accounts')).toBeInTheDocument();
    expect(screen.getByText('Opportunities')).toBeInTheDocument();
    expect(screen.getByText('Contacts')).toBeInTheDocument();
  });

  it('does NOT render a CRM h1 heading (was removed to fix double-header)', () => {
    render(
      <CRMLayout>
        <div>child</div>
      </CRMLayout>,
    );
    const headings = screen.queryAllByRole('heading', { level: 1 });
    const crmHeading = headings.find((h) => h.textContent === 'CRM');
    expect(crmHeading).toBeUndefined();
  });

  it('does NOT render the old description text', () => {
    render(
      <CRMLayout>
        <div>child</div>
      </CRMLayout>,
    );
    expect(
      screen.queryByText('Manage leads, accounts, contacts, and opportunities'),
    ).not.toBeInTheDocument();
  });

  it('renders GlobalSearch', () => {
    render(
      <CRMLayout>
        <div>child</div>
      </CRMLayout>,
    );
    expect(screen.getByTestId('global-search')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <CRMLayout>
        <div data-testid="crm-child">Content</div>
      </CRMLayout>,
    );
    expect(screen.getByTestId('crm-child')).toBeInTheDocument();
  });

  it('highlights the active tab based on pathname', () => {
    render(
      <CRMLayout>
        <div>child</div>
      </CRMLayout>,
    );
    const leadsLink = screen.getByText('Leads');
    expect(leadsLink.className).toContain('bg-background');
    expect(leadsLink.className).toContain('shadow-sm');
  });

  it('renders all expected CRM tabs', () => {
    render(
      <CRMLayout>
        <div>child</div>
      </CRMLayout>,
    );
    const expectedTabs = [
      'Dashboard',
      'Tasks',
      'Leads',
      'Accounts',
      'Contacts',
      'Opportunities',
      'Bidding',
      'Sequences',
      'Settings',
    ];
    for (const tab of expectedTabs) {
      expect(screen.getByText(tab)).toBeInTheDocument();
    }
  });
});
