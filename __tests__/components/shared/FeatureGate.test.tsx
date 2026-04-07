import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FeatureGate } from '@/components/shared/FeatureGate';

const mockUseOrg = vi.fn();
vi.mock('@/contexts/OrgContext', () => ({
  useOrg: () => mockUseOrg(),
}));

const mockUseUserRBAC = vi.fn();
vi.mock('@/hooks/useRBAC', () => ({
  useUserRBAC: () => mockUseUserRBAC(),
}));

function setup(flags: Record<string, boolean>, isAdmin = false, isLoading = false) {
  mockUseOrg.mockReturnValue({
    currentOrg: { feature_flags: flags },
    isLoading,
  });
  mockUseUserRBAC.mockReturnValue({ isAdmin });
}

describe('FeatureGate', () => {
  it('renders children when flag is enabled', () => {
    setup({ crm: true });
    render(
      <FeatureGate flag="crm">
        <div>CRM Content</div>
      </FeatureGate>,
    );
    expect(screen.getByText('CRM Content')).toBeInTheDocument();
  });

  it('shows empty state when flag is disabled', () => {
    setup({ crm: false });
    render(
      <FeatureGate flag="crm">
        <div>CRM Content</div>
      </FeatureGate>,
    );
    expect(screen.queryByText('CRM Content')).not.toBeInTheDocument();
    expect(screen.getByText('Feature not available')).toBeInTheDocument();
  });

  it('shows empty state when flag is missing', () => {
    setup({});
    render(
      <FeatureGate flag="crm">
        <div>CRM Content</div>
      </FeatureGate>,
    );
    expect(screen.queryByText('CRM Content')).not.toBeInTheDocument();
    expect(screen.getByText('Feature not available')).toBeInTheDocument();
  });

  it('bypasses flag check for admins', () => {
    setup({}, true);
    render(
      <FeatureGate flag="crm">
        <div>CRM Content</div>
      </FeatureGate>,
    );
    expect(screen.getByText('CRM Content')).toBeInTheDocument();
  });

  it('renders nothing while loading', () => {
    setup({}, false, true);
    const { container } = render(
      <FeatureGate flag="crm">
        <div>CRM Content</div>
      </FeatureGate>,
    );
    expect(container.innerHTML).toBe('');
  });

  it('handles null currentOrg gracefully', () => {
    mockUseOrg.mockReturnValue({ currentOrg: null, isLoading: false });
    mockUseUserRBAC.mockReturnValue({ isAdmin: false });
    render(
      <FeatureGate flag="crm">
        <div>CRM Content</div>
      </FeatureGate>,
    );
    expect(screen.getByText('Feature not available')).toBeInTheDocument();
  });
});
