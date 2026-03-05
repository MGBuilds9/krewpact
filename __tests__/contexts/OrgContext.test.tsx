import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('next/navigation', () => ({
  useParams: vi.fn().mockReturnValue({ orgSlug: 'mdm-group' }),
  useRouter: vi.fn().mockReturnValue({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/lib/api-client', () => ({
  apiFetch: vi.fn(),
}));

import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';
import { OrgProvider, useOrg } from '@/contexts/OrgContext';

const mockApiFetch = vi.mocked(apiFetch);
const mockUseParams = vi.mocked(useParams);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <OrgProvider>{children}</OrgProvider>
      </QueryClientProvider>
    );
  };
}

describe('OrgContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ orgSlug: 'mdm-group' });
  });

  it('provides org slug from URL params', () => {
    mockApiFetch.mockResolvedValue({
      id: 'org-1',
      name: 'MDM Group',
      slug: 'mdm-group',
      status: 'active',
      timezone: 'America/Toronto',
      locale: 'en-CA',
      metadata: {},
      branding: {},
      feature_flags: {},
    });

    const { result } = renderHook(() => useOrg(), { wrapper: createWrapper() });
    expect(result.current.orgSlug).toBe('mdm-group');
  });

  it('fetches org details from API', async () => {
    const orgData = {
      id: 'org-1',
      name: 'MDM Group',
      slug: 'mdm-group',
      status: 'active',
      timezone: 'America/Toronto',
      locale: 'en-CA',
      metadata: {},
      branding: { company_name: 'MDM Group', primary_color: '#0f172a' },
      feature_flags: {},
    };
    mockApiFetch.mockResolvedValue(orgData);

    const { result } = renderHook(() => useOrg(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.currentOrg).toEqual(orgData);
    });

    expect(mockApiFetch).toHaveBeenCalledWith('/api/org/mdm-group');
  });

  it('defaults to "mdm-group" slug when param is missing', () => {
    mockUseParams.mockReturnValue({});
    mockApiFetch.mockResolvedValue({ id: 'mdm-group-org', slug: 'mdm-group' });

    const { result } = renderHook(() => useOrg(), { wrapper: createWrapper() });
    expect(result.current.orgSlug).toBe('mdm-group');
  });

  it('throws when used outside provider', () => {
    expect(() => {
      renderHook(() => useOrg());
    }).toThrow('useOrg must be used within an OrgProvider');
  });
});
