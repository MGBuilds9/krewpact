import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Navigation } from '@/components/Layout/Navigation';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('next/navigation', () => ({
  usePathname: () => '/org/test-org/dashboard',
  useParams: () => ({ orgSlug: 'test-org' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/hooks/useOrgRouter', () => ({
  useOrgRouter: () => ({
    orgSlug: 'test-org',
    orgPath: (path: string) => `/org/test-org${path.startsWith('/') ? path : `/${path}`}`,
    push: vi.fn(),
    replace: vi.fn(),
    router: { push: vi.fn(), replace: vi.fn() },
  }),
}));

const mockHasRole = vi.fn().mockReturnValue(false);
const mockUseUserRBAC = vi.fn(() => ({
  isAdmin: false,
  hasRole: mockHasRole,
  hasPermission: vi.fn().mockReturnValue(false),
  isLoading: false,
  roles: [],
  permissions: [],
  primaryRole: null,
  divisionIds: [],
}));

vi.mock('@/hooks/useRBAC', () => ({
  useUserRBAC: () => mockUseUserRBAC(),
}));

const mockIsFeatureEnabled = vi.fn((_key: string) => false);

vi.mock('@/lib/feature-flags', () => ({
  isFeatureEnabled: (key: string) => mockIsFeatureEnabled(key),
}));

// Mock lucide-react icons to avoid SVG issues
vi.mock('lucide-react', () => ({
  BarChart3: () => <span>BarChart3</span>,
  Building2: () => <span>Building2</span>,
  Calculator: () => <span>Calculator</span>,
  Calendar: () => <span>Calendar</span>,
  ClipboardList: () => <span>ClipboardList</span>,
  DollarSign: () => <span>DollarSign</span>,
  FileText: () => <span>FileText</span>,
  FolderOpen: () => <span>FolderOpen</span>,
  Home: () => <span>Home</span>,
  Shield: () => <span>Shield</span>,
  Users: () => <span>Users</span>,
}));

// Mock Tooltip primitives (Radix) to render children directly
vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
    asChild ? <>{children}</> : <span>{children}</span>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

// Mock next/link to render a plain anchor
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setAdmin(isAdmin: boolean) {
  mockUseUserRBAC.mockReturnValue({
    isAdmin,
    hasRole: mockHasRole,
    hasPermission: vi.fn().mockReturnValue(false),
    isLoading: false,
    roles: [],
    permissions: [],
    primaryRole: null,
    divisionIds: [],
  });
}

function setHasRole(roleFn: (role: string) => boolean) {
  mockHasRole.mockImplementation(roleFn);
}

function setFeatureFlag(key: string, enabled: boolean) {
  mockIsFeatureEnabled.mockImplementation((k) => (k === key ? enabled : false));
}

function enableFeatureFlags(...keys: string[]) {
  mockIsFeatureEnabled.mockImplementation((k) => keys.includes(k));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: not admin, no roles, all feature flags off
    mockUseUserRBAC.mockReturnValue({
      isAdmin: false,
      hasRole: mockHasRole,
      hasPermission: vi.fn().mockReturnValue(false),
      isLoading: false,
      roles: [],
      permissions: [],
      primaryRole: null,
      divisionIds: [],
    });
    mockHasRole.mockReturnValue(false);
    mockIsFeatureEnabled.mockReturnValue(false);
  });

  // -------------------------------------------------------------------------
  // Case 1 — Default visible items (no feature flag required)
  // -------------------------------------------------------------------------
  it('shows Dashboard, CRM, Estimates, Projects, Documents, Team, Reports by default', () => {
    render(<Navigation />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('CRM')).toBeInTheDocument();
    expect(screen.getByText('Estimates')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('Team')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Case 2 — Schedule hidden when flag is false
  // -------------------------------------------------------------------------
  it('hides Schedule when schedule feature flag is false', () => {
    render(<Navigation />);
    expect(screen.queryByText('Schedule')).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Case 3 — Finance hidden when flag is false
  // -------------------------------------------------------------------------
  it('hides Finance when finance feature flag is false', () => {
    render(<Navigation />);
    expect(screen.queryByText('Finance')).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Case 4 — Executive hidden when flag is false
  // -------------------------------------------------------------------------
  it('hides Executive when executive feature flag is false', () => {
    render(<Navigation />);
    expect(screen.queryByText('Executive')).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Case 5 — Admin visible when isAdmin is true
  // -------------------------------------------------------------------------
  it('shows Admin when isAdmin is true', () => {
    setAdmin(true);
    render(<Navigation />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Case 6 — Admin hidden when isAdmin is false
  // -------------------------------------------------------------------------
  it('hides Admin when isAdmin is false', () => {
    render(<Navigation />);
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Case 7 — Executive shown when flag true AND user hasRole('executive')
  // -------------------------------------------------------------------------
  it('shows Executive when feature flag is true and user has executive role', () => {
    enableFeatureFlags('executive');
    setHasRole((role) => role === 'executive');
    render(<Navigation />);
    expect(screen.getByText('Executive')).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Case 8 — Executive shown when flag true AND user isAdmin
  // -------------------------------------------------------------------------
  it('shows Executive when feature flag is true and user isAdmin', () => {
    enableFeatureFlags('executive');
    setAdmin(true);
    render(<Navigation />);
    expect(screen.getByText('Executive')).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Case 9 — Executive hidden when flag true but user has neither role
  // -------------------------------------------------------------------------
  it('hides Executive when feature flag is true but user has no required role and is not admin', () => {
    enableFeatureFlags('executive');
    // hasRole returns false (default), isAdmin false (default)
    render(<Navigation />);
    expect(screen.queryByText('Executive')).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Case 10 — Active link gets bg-primary class
  // -------------------------------------------------------------------------
  it('applies bg-primary class to the active Dashboard link (pathname matches /dashboard)', () => {
    // usePathname returns '/org/test-org/dashboard', strippedPath = '/dashboard'
    render(<Navigation />);
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).not.toBeNull();
    expect(dashboardLink?.className).toContain('bg-primary');
  });

  it('does not apply bg-primary to inactive links', () => {
    render(<Navigation />);
    const crmLink = screen.getByText('CRM').closest('a');
    expect(crmLink?.className).not.toContain('bg-primary');
  });

  // -------------------------------------------------------------------------
  // Case 11 — Mobile rendering
  // -------------------------------------------------------------------------
  it('renders default nav items in mobile mode (isMobile=true)', () => {
    render(<Navigation isMobile />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('CRM')).toBeInTheDocument();
    expect(screen.getByText('Estimates')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('Team')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('renders a <nav> element in mobile mode', () => {
    const { container } = render(<Navigation isMobile />);
    expect(container.querySelector('nav')).toBeInTheDocument();
  });

  it('applies bg-primary to active link in mobile mode', () => {
    render(<Navigation isMobile />);
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink?.className).toContain('bg-primary');
  });

  it('shows Schedule in mobile mode when feature flag is enabled', () => {
    setFeatureFlag('schedule', true);
    render(<Navigation isMobile />);
    expect(screen.getByText('Schedule')).toBeInTheDocument();
  });

  it('shows Finance in mobile mode when feature flag is enabled', () => {
    setFeatureFlag('finance', true);
    render(<Navigation isMobile />);
    expect(screen.getByText('Finance')).toBeInTheDocument();
  });

  it('shows Admin in mobile mode when isAdmin is true', () => {
    setAdmin(true);
    render(<Navigation isMobile />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });
});
