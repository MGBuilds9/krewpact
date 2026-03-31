import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockUseOrg = vi.fn();

vi.mock('@/contexts/OrgContext', () => ({
  useOrg: () => mockUseOrg(),
}));

import { useSetupProgress } from '@/hooks/useSetupProgress';

function makeOrg(overrides: Record<string, unknown> = {}) {
  return {
    currentOrg: {
      id: 'org-1',
      name: 'Test Org',
      slug: 'test-org',
      status: 'active',
      metadata: {},
      branding: { company_name: 'Test Org', primary_color: '#2563eb', logo_url: '' },
      feature_flags: {},
      ...overrides,
    },
    orgSlug: 'test-org',
    isLoading: false,
  };
}

describe('useSetupProgress', () => {
  it('returns isDismissed true when no org', () => {
    mockUseOrg.mockReturnValue({ currentOrg: null, orgSlug: '', isLoading: false });
    const { result } = renderHook(() => useSetupProgress());
    expect(result.current.isDismissed).toBe(true);
    expect(result.current.steps).toEqual([]);
  });

  it('returns isDismissed true when metadata has setup_checklist_dismissed', () => {
    mockUseOrg.mockReturnValue(makeOrg({ metadata: { setup_checklist_dismissed: true } }));
    const { result } = renderHook(() => useSetupProgress());
    expect(result.current.isDismissed).toBe(true);
  });

  it('returns 0 completed when org is fresh (defaults)', () => {
    mockUseOrg.mockReturnValue(makeOrg());
    const { result } = renderHook(() => useSetupProgress());
    expect(result.current.completed).toBe(0);
    expect(result.current.total).toBe(4);
    expect(result.current.isDismissed).toBe(false);
  });

  it('marks branding complete when logo_url is set', () => {
    mockUseOrg.mockReturnValue(makeOrg({ branding: { logo_url: '/logo.png', primary_color: '#2563eb' } }));
    const { result } = renderHook(() => useSetupProgress());
    const branding = result.current.steps.find((s) => s.key === 'branding');
    expect(branding?.completed).toBe(true);
  });

  it('marks branding complete when primary_color differs from default', () => {
    mockUseOrg.mockReturnValue(makeOrg({ branding: { primary_color: '#ff0000', logo_url: '' } }));
    const { result } = renderHook(() => useSetupProgress());
    const branding = result.current.steps.find((s) => s.key === 'branding');
    expect(branding?.completed).toBe(true);
  });

  it('marks branding incomplete when using default color and no logo', () => {
    mockUseOrg.mockReturnValue(makeOrg({ branding: { primary_color: '#2563eb', logo_url: '' } }));
    const { result } = renderHook(() => useSetupProgress());
    const branding = result.current.steps.find((s) => s.key === 'branding');
    expect(branding?.completed).toBe(false);
  });

  it('marks modules complete when at least one flag is true', () => {
    mockUseOrg.mockReturnValue(makeOrg({ feature_flags: { crm: true } }));
    const { result } = renderHook(() => useSetupProgress());
    const modules = result.current.steps.find((s) => s.key === 'modules');
    expect(modules?.completed).toBe(true);
  });

  it('marks modules incomplete when all flags are false or empty', () => {
    mockUseOrg.mockReturnValue(makeOrg({ feature_flags: { crm: false } }));
    const { result } = renderHook(() => useSetupProgress());
    const modules = result.current.steps.find((s) => s.key === 'modules');
    expect(modules?.completed).toBe(false);
  });

  it('marks team complete when metadata.team_invited is truthy', () => {
    mockUseOrg.mockReturnValue(makeOrg({ metadata: { team_invited: true } }));
    const { result } = renderHook(() => useSetupProgress());
    const team = result.current.steps.find((s) => s.key === 'team');
    expect(team?.completed).toBe(true);
  });

  it('marks profile complete when metadata.profile_completed is truthy', () => {
    mockUseOrg.mockReturnValue(makeOrg({ metadata: { profile_completed: true } }));
    const { result } = renderHook(() => useSetupProgress());
    const profile = result.current.steps.find((s) => s.key === 'profile');
    expect(profile?.completed).toBe(true);
  });

  it('returns correct completed count with partial progress', () => {
    mockUseOrg.mockReturnValue(
      makeOrg({
        branding: { logo_url: '/logo.png', primary_color: '#2563eb' },
        feature_flags: { crm: true },
        metadata: {},
      }),
    );
    const { result } = renderHook(() => useSetupProgress());
    expect(result.current.completed).toBe(2);
    expect(result.current.total).toBe(4);
  });
});
