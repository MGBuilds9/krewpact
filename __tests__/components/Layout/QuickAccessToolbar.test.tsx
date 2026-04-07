import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QuickAccessToolbar } from '@/components/Layout/QuickAccessToolbar';

const mockPush = vi.fn();
let mockPathname = '/dashboard';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useParams: () => ({ orgSlug: 'test-org' }),
}));

vi.mock('@/hooks/useOrgRouter', () => ({
  useOrgRouter: () => ({ push: mockPush }),
}));

vi.mock('lucide-react', () => ({
  Briefcase: () => <span data-testid="icon-briefcase" />,
  Camera: () => <span data-testid="icon-camera" />,
  ChevronDown: () => <span data-testid="icon-chevron" />,
  DollarSign: () => <span data-testid="icon-dollar" />,
  FileText: () => <span data-testid="icon-filetext" />,
  FolderPlus: () => <span data-testid="icon-folderplus" />,
  Plus: () => <span data-testid="icon-plus" />,
  TrendingUp: () => <span data-testid="icon-trendingup" />,
  UserPlus: () => <span data-testid="icon-userplus" />,
}));

describe('QuickAccessToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('context-aware primary action', () => {
    it('on /crm/leads: shows New Lead as the only visible button (others in dropdown)', () => {
      mockPathname = '/crm/leads';
      render(<QuickAccessToolbar />);
      // Primary is visible.
      expect(screen.getAllByText('New Lead').length).toBeGreaterThan(0);
      // The other CRM actions move into the dropdown — not in the DOM as
      // plain text buttons until the trigger is opened.
      expect(screen.queryByText('New Opportunity')).not.toBeInTheDocument();
      expect(screen.queryByText('New Account')).not.toBeInTheDocument();
    });

    it('on /crm/opportunities: shows New Opportunity as primary', () => {
      mockPathname = '/crm/opportunities';
      render(<QuickAccessToolbar />);
      expect(screen.getAllByText('New Opportunity').length).toBeGreaterThan(0);
      expect(screen.queryByText('New Lead')).not.toBeInTheDocument();
    });

    it('on /crm/accounts: shows New Account as primary', () => {
      mockPathname = '/crm/accounts';
      render(<QuickAccessToolbar />);
      expect(screen.getAllByText('New Account').length).toBeGreaterThan(0);
      expect(screen.queryByText('New Lead')).not.toBeInTheDocument();
    });

    it('on /crm/dashboard (no specific entity): shows all CRM actions', () => {
      mockPathname = '/crm/dashboard';
      render(<QuickAccessToolbar />);
      // No specific primary match → falls through to the flat list of
      // every action in the group.
      expect(screen.getAllByText('New Lead').length).toBeGreaterThan(0);
      expect(screen.getAllByText('New Opportunity').length).toBeGreaterThan(0);
      expect(screen.getAllByText('New Account').length).toBeGreaterThan(0);
    });

    it('reveals demoted actions when the "More" dropdown is opened', async () => {
      mockPathname = '/crm/leads';
      render(<QuickAccessToolbar />);
      const moreButton = screen.getByLabelText('More actions');
      await userEvent.click(moreButton);
      // Now the hidden actions become visible in the dropdown portal.
      expect(screen.getByText('New Opportunity')).toBeInTheDocument();
      expect(screen.getByText('New Account')).toBeInTheDocument();
    });
  });

  describe('context group selection', () => {
    it('does not show project actions on CRM path', () => {
      mockPathname = '/crm/leads';
      render(<QuickAccessToolbar />);
      expect(screen.queryByText('New Project')).not.toBeInTheDocument();
    });

    it('on /projects/123: shows New Project as primary', () => {
      mockPathname = '/projects/123';
      render(<QuickAccessToolbar />);
      expect(screen.getAllByText('New Project').length).toBeGreaterThan(0);
      // Other project actions demoted.
      expect(screen.queryByText('Upload Photo')).not.toBeInTheDocument();
      expect(screen.queryByText('Create Report')).not.toBeInTheDocument();
    });

    it('does not show CRM actions on projects path', () => {
      mockPathname = '/projects';
      render(<QuickAccessToolbar />);
      expect(screen.queryByText('New Lead')).not.toBeInTheDocument();
    });

    it('on /estimates/new: shows New Estimate', () => {
      mockPathname = '/estimates/new';
      render(<QuickAccessToolbar />);
      expect(screen.getAllByText('New Estimate').length).toBeGreaterThan(0);
    });
  });

  describe('default actions on non-context paths', () => {
    it('shows all default actions on /dashboard', () => {
      mockPathname = '/dashboard';
      render(<QuickAccessToolbar />);
      // /dashboard doesn't match any context group's primaryOn hint,
      // AND /projects is in the /dashboard→default group with primaryOn
      // /projects which doesn't match /dashboard — so all default
      // actions render flat. (The 'New Project' label is shared with
      // projectActions but we're in defaultActions here.)
      expect(screen.getAllByText('New Project').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Create Report').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Log Expense').length).toBeGreaterThan(0);
    });

    it('shows default actions for unrecognized paths like /settings/profile', () => {
      mockPathname = '/settings/profile';
      render(<QuickAccessToolbar />);
      expect(screen.getAllByText('Log Expense').length).toBeGreaterThan(0);
    });
  });

  describe('pathname transitions', () => {
    it('context changes when pathname changes between renders', () => {
      mockPathname = '/dashboard';
      const { rerender } = render(<QuickAccessToolbar />);
      expect(screen.getAllByText('Log Expense').length).toBeGreaterThan(0);
      expect(screen.queryByText('New Lead')).not.toBeInTheDocument();

      mockPathname = '/crm/opportunities';
      rerender(<QuickAccessToolbar />);
      expect(screen.queryByText('Log Expense')).not.toBeInTheDocument();
      expect(screen.getAllByText('New Opportunity').length).toBeGreaterThan(0);
    });

    it('works with org-prefixed paths like /org/test-org/crm/leads', () => {
      mockPathname = '/org/test-org/crm/leads';
      render(<QuickAccessToolbar />);
      expect(screen.getAllByText('New Lead').length).toBeGreaterThan(0);
      expect(screen.queryByText('New Opportunity')).not.toBeInTheDocument();
    });

    it('works with org-prefixed /org/test-org/projects/123', () => {
      mockPathname = '/org/test-org/projects/123';
      render(<QuickAccessToolbar />);
      expect(screen.getAllByText('New Project').length).toBeGreaterThan(0);
    });
  });

  describe('click behavior', () => {
    it('calls orgPush with correct path when primary action clicked', async () => {
      mockPathname = '/crm/leads';
      render(<QuickAccessToolbar />);
      const button = screen.getAllByText('New Lead')[0];
      await userEvent.click(button);
      expect(mockPush).toHaveBeenCalledWith('/crm/leads/new');
    });

    it('calls orgPush with query string for project action', async () => {
      mockPathname = '/projects';
      render(<QuickAccessToolbar />);
      const button = screen.getAllByText('New Project')[0];
      await userEvent.click(button);
      expect(mockPush).toHaveBeenCalledWith('/projects?openNew=true');
    });

    it('applies custom className prop', () => {
      mockPathname = '/dashboard';
      const { container } = render(<QuickAccessToolbar className="test-class" />);
      expect(container.firstChild).toHaveClass('test-class');
    });
  });
});
