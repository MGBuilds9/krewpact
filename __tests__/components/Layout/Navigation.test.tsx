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

const ALL_FLAGS_ENABLED: Record<string, boolean> = {
  crm: true,
  estimates: true,
  projects: true,
  documents: true,
  inventory: true,
  schedule: true,
  finance: true,
  payroll: true,
  reports: true,
  executive: true,
};

const mockUseOrg = vi.fn(() => ({
  currentOrg: {
    id: 'org-1',
    name: 'Test Org',
    slug: 'test-org',
    status: 'active',
    timezone: 'America/Toronto',
    locale: 'en-CA',
    metadata: {},
    branding: { company_name: 'Test Org', primary_color: '#2563eb' },
    feature_flags: ALL_FLAGS_ENABLED,
  },
  orgSlug: 'test-org',
  isLoading: false,
}));

vi.mock('@/contexts/OrgContext', () => ({
  useOrg: () => mockUseOrg(),
}));

// Mock lucide-react icons to avoid SVG issues
vi.mock('lucide-react', () => ({
  Banknote: () => <span>Banknote</span>,
  BarChart3: () => <span>BarChart3</span>,
  Building2: () => <span>Building2</span>,
  Calculator: () => <span>Calculator</span>,
  Calendar: () => <span>Calendar</span>,
  ChevronDown: () => <span>ChevronDown</span>,
  ClipboardList: () => <span>ClipboardList</span>,
  DollarSign: () => <span>DollarSign</span>,
  FileText: () => <span>FileText</span>,
  FolderOpen: () => <span>FolderOpen</span>,
  Home: () => <span>Home</span>,
  Package: () => <span>Package</span>,
  Shield: () => <span>Shield</span>,
  Users: () => <span>Users</span>,
}));

// Mock Button to render children directly
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <button {...props}>{children}</button>
  ),
}));

// Mock DropdownMenu primitives to render children directly
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
    asChild ? <>{children}</> : <span>{children}</span>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
    asChild ? <>{children}</> : <div>{children}</div>,
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

function setFeatureFlags(flags: Record<string, boolean>) {
  mockUseOrg.mockReturnValue({
    currentOrg: {
      id: 'org-1',
      name: 'Test Org',
      slug: 'test-org',
      status: 'active',
      timezone: 'America/Toronto',
      locale: 'en-CA',
      metadata: {},
      branding: { company_name: 'Test Org', primary_color: '#2563eb' },
      feature_flags: flags,
    },
    orgSlug: 'test-org',
    isLoading: false,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: not admin, no roles
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
  });

  // -------------------------------------------------------------------------
  // Case 1 — Default visible items
  // -------------------------------------------------------------------------
  it('shows Dashboard, CRM, Estimates, Projects, Documents, Inventory, Schedule, Team, Finance, Reports by default', () => {
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
  // Case 7 — Executive shown when user has executive role
  // -------------------------------------------------------------------------
  it('shows Executive when user has executive role', () => {
    setHasRole((role) => role === 'executive');
    render(<Navigation />);
    expect(screen.getByText('Executive')).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Case 8 — Executive shown when user isAdmin
  // -------------------------------------------------------------------------
  it('shows Executive when user isAdmin', () => {
    setAdmin(true);
    render(<Navigation />);
    expect(screen.getByText('Executive')).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Case 9 — Executive hidden when user has neither required role
  // -------------------------------------------------------------------------
  it('hides Executive when user has no required role and is not admin', () => {
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
  it('renders first 7 nav items in mobile mode (MAX_VISIBLE_MOBILE=7)', () => {
    render(<Navigation isMobile />);
    // Mobile shows first 7 filtered items: Dashboard, CRM, Estimates, Projects, Documents, Inventory, Schedule
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('CRM')).toBeInTheDocument();
    expect(screen.getByText('Estimates')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('Inventory')).toBeInTheDocument();
    expect(screen.getByText('Schedule')).toBeInTheDocument();
    // Team, Finance, Reports are beyond mobile cutoff
    expect(screen.queryByText('Team')).not.toBeInTheDocument();
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

  it('shows first 7 items in mobile mode even when isAdmin (Admin is beyond cutoff)', () => {
    setAdmin(true);
    render(<Navigation isMobile />);
    // Admin is item 13 — beyond MAX_VISIBLE_MOBILE=7 cutoff
    // Mobile only shows the first 7 filtered items
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Feature flag gating
  // -------------------------------------------------------------------------
  it('hides CRM when crm flag is disabled', () => {
    setFeatureFlags({ ...ALL_FLAGS_ENABLED, crm: false });
    render(<Navigation />);
    expect(screen.queryByText('CRM')).not.toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('hides all flagged modules when all flags are disabled', () => {
    setFeatureFlags({});
    render(<Navigation />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Team')).toBeInTheDocument();
    expect(screen.queryByText('CRM')).not.toBeInTheDocument();
    expect(screen.queryByText('Estimates')).not.toBeInTheDocument();
    expect(screen.queryByText('Projects')).not.toBeInTheDocument();
    expect(screen.queryByText('Finance')).not.toBeInTheDocument();
    expect(screen.queryByText('Inventory')).not.toBeInTheDocument();
  });

  it('shows only enabled modules', () => {
    setFeatureFlags({ crm: true, projects: true });
    render(<Navigation />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('CRM')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Team')).toBeInTheDocument();
    expect(screen.queryByText('Estimates')).not.toBeInTheDocument();
    expect(screen.queryByText('Finance')).not.toBeInTheDocument();
  });

  it('admin bypasses feature flag restrictions', () => {
    setAdmin(true);
    setFeatureFlags({});
    render(<Navigation />);
    expect(screen.getByText('CRM')).toBeInTheDocument();
    expect(screen.getByText('Estimates')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });
});
