import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Header } from '@/components/Layout/Header';

// ─── Clerk mocks ─────────────────────────────────────────────────────────────

const mockSignOut = vi.fn();

vi.mock('@clerk/nextjs', () => ({
  useUser: vi.fn(),
  useClerk: vi.fn(),
}));

// ─── Next.js navigation ──────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard'),
  useParams: vi.fn(() => ({})),
}));

// ─── Internal hooks ──────────────────────────────────────────────────────────

vi.mock('@/hooks/useOrgRouter', () => ({
  useOrgRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock('@/hooks/useRBAC', () => ({
  useUserRBAC: vi.fn(() => ({ isAdmin: false, primaryRole: null })),
}));

vi.mock('@/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn(),
}));

vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: vi.fn(() => ({ currentUser: null })),
}));

// ─── Context mocks ───────────────────────────────────────────────────────────

vi.mock('@/contexts/ImpersonationContext', () => ({
  useImpersonation: vi.fn(() => ({ isImpersonating: false, stopImpersonation: vi.fn() })),
}));

vi.mock('@/contexts/DivisionContext', () => ({
  useDivision: vi.fn(() => ({ division: null })),
}));

// ─── Component mocks ─────────────────────────────────────────────────────────

vi.mock('@/components/Notifications/NotificationBell', () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

vi.mock('@/components/Layout/Navigation', () => ({
  Navigation: () => <div data-testid="navigation" />,
}));

vi.mock('@/components/Layout/DivisionSelector', () => ({
  DivisionSelector: () => <div data-testid="division-selector" />,
}));

vi.mock('@/components/Layout/QuickAccessToolbar', () => ({
  QuickAccessToolbar: () => <div data-testid="quick-access-toolbar" />,
}));

vi.mock('@/components/Layout/MobileNavigationDrawer', () => ({
  MobileNavigationDrawer: () => <div data-testid="mobile-navigation-drawer" />,
}));

vi.mock('@/components/Layout/ShortcutsHelpOverlay', () => ({
  ShortcutsHelpOverlay: () => <div data-testid="shortcuts-help-overlay" />,
}));

vi.mock('@/components/Layout/ImpersonationSelector', () => ({
  ImpersonationSelector: () => <div data-testid="impersonation-selector" />,
}));

// CommandPalette is loaded via next/dynamic — mock the whole module
vi.mock('@/components/Layout/CommandPalette', () => ({
  CommandPalette: () => <div data-testid="command-palette" />,
}));

vi.mock('next/dynamic', () => ({
  default: (fn: () => Promise<{ default: React.ComponentType }>) => {
    // Eagerly resolve the dynamic import so tests don't need to wait
    let Comp: React.ComponentType = () => null;
    fn().then((m) => {
      Comp = m.default;
    });
    const Dynamic = (props: Record<string, unknown>) => <Comp {...props} />;
    return Dynamic;
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

import { useClerk, useUser } from '@clerk/nextjs';

import { useUserRBAC } from '@/hooks/useRBAC';

const mockUseUser = useUser as ReturnType<typeof vi.fn>;
const mockUseClerk = useClerk as ReturnType<typeof vi.fn>;
const mockUseUserRBAC = useUserRBAC as ReturnType<typeof vi.fn>;

function setupLoading() {
  mockUseUser.mockReturnValue({ user: null, isLoaded: false });
  mockUseClerk.mockReturnValue({ signOut: mockSignOut });
  mockUseUserRBAC.mockReturnValue({ isAdmin: false, primaryRole: null });
}

function setupLoaded(overrides?: { primaryRole?: string }) {
  mockUseUser.mockReturnValue({
    isLoaded: true,
    user: {
      firstName: 'John',
      lastName: 'Doe',
      imageUrl: '/img.png',
      primaryEmailAddress: { emailAddress: 'john@test.com' },
    },
  });
  mockUseClerk.mockReturnValue({ signOut: mockSignOut });
  mockUseUserRBAC.mockReturnValue({
    isAdmin: false,
    primaryRole: overrides?.primaryRole ?? null,
  });
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state (user is null)', () => {
    it('does not show user name text when user is null', () => {
      setupLoading();
      render(<Header />);

      expect(screen.queryByText('John Doe')).toBeNull();
    });

    it('does not render any text saying "Loading..."', () => {
      setupLoading();
      render(<Header />);

      expect(screen.queryByText(/loading\.\.\./i)).toBeNull();
    });

    it('does not render "Team Member" placeholder text when role is not loaded', () => {
      setupLoading();
      render(<Header />);

      expect(screen.queryByText(/team member/i)).toBeNull();
    });
  });

  describe('loaded state (user data available)', () => {
    it('does not render any text saying "Loading..."', () => {
      setupLoaded();
      render(<Header />);

      expect(screen.queryByText(/loading\.\.\./i)).toBeNull();
    });

    it('does not render "Team Member" placeholder text', () => {
      setupLoaded({ primaryRole: undefined });
      render(<Header />);

      expect(screen.queryByText(/team member/i)).toBeNull();
    });
  });
});
