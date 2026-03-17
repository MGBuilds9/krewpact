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

  it('shows CRM actions when pathname includes /crm', () => {
    mockPathname = '/crm/leads';
    render(<QuickAccessToolbar />);
    expect(screen.getAllByText('New Lead').length).toBeGreaterThan(0);
    expect(screen.getAllByText('New Opportunity').length).toBeGreaterThan(0);
    expect(screen.getAllByText('New Account').length).toBeGreaterThan(0);
  });

  it('does not show project actions on CRM path', () => {
    mockPathname = '/crm/leads';
    render(<QuickAccessToolbar />);
    expect(screen.queryByText('New Project')).not.toBeInTheDocument();
  });

  it('shows project actions when pathname includes /projects', () => {
    mockPathname = '/projects/123';
    render(<QuickAccessToolbar />);
    expect(screen.getAllByText('New Project').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Upload Photo').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Create Report').length).toBeGreaterThan(0);
  });

  it('does not show CRM actions on projects path', () => {
    mockPathname = '/projects';
    render(<QuickAccessToolbar />);
    expect(screen.queryByText('New Lead')).not.toBeInTheDocument();
  });

  it('shows estimate actions when pathname includes /estimates', () => {
    mockPathname = '/estimates/new';
    render(<QuickAccessToolbar />);
    expect(screen.getAllByText('New Estimate').length).toBeGreaterThan(0);
  });

  it('shows default actions for non-context paths like /dashboard', () => {
    mockPathname = '/dashboard';
    render(<QuickAccessToolbar />);
    expect(screen.getAllByText('New Project').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Create Report').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Log Expense').length).toBeGreaterThan(0);
  });

  it('shows default actions for unrecognized paths', () => {
    mockPathname = '/settings/profile';
    render(<QuickAccessToolbar />);
    expect(screen.getAllByText('Log Expense').length).toBeGreaterThan(0);
  });

  it('context changes when pathname changes between renders', () => {
    mockPathname = '/dashboard';
    const { rerender } = render(<QuickAccessToolbar />);
    expect(screen.getAllByText('Log Expense').length).toBeGreaterThan(0);
    expect(screen.queryByText('New Lead')).not.toBeInTheDocument();

    mockPathname = '/crm/opportunities';
    rerender(<QuickAccessToolbar />);
    expect(screen.queryByText('Log Expense')).not.toBeInTheDocument();
    expect(screen.getAllByText('New Lead').length).toBeGreaterThan(0);
  });

  it('works with org-prefixed paths like /org/test-org/crm/leads', () => {
    mockPathname = '/org/test-org/crm/leads';
    render(<QuickAccessToolbar />);
    expect(screen.getAllByText('New Lead').length).toBeGreaterThan(0);
    expect(screen.getAllByText('New Opportunity').length).toBeGreaterThan(0);
  });

  it('works with org-prefixed /org/test-org/projects/123', () => {
    mockPathname = '/org/test-org/projects/123';
    render(<QuickAccessToolbar />);
    expect(screen.getAllByText('New Project').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Upload Photo').length).toBeGreaterThan(0);
  });

  it('calls orgPush with correct path when CRM action clicked', async () => {
    mockPathname = '/crm';
    render(<QuickAccessToolbar />);
    const buttons = screen.getAllByText('New Lead');
    await userEvent.click(buttons[0]);
    expect(mockPush).toHaveBeenCalledWith('/crm/leads/new');
  });

  it('calls orgPush with query string for project action', async () => {
    mockPathname = '/projects';
    render(<QuickAccessToolbar />);
    const buttons = screen.getAllByText('New Project');
    await userEvent.click(buttons[0]);
    expect(mockPush).toHaveBeenCalledWith('/projects?openNew=true');
  });

  it('applies custom className prop', () => {
    mockPathname = '/dashboard';
    const { container } = render(<QuickAccessToolbar className="test-class" />);
    expect(container.firstChild).toHaveClass('test-class');
  });
});
