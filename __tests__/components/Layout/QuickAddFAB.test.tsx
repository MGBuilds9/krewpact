import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QuickAddFAB } from '@/components/Layout/QuickAddFAB';

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
  ClipboardList: () => <span data-testid="icon-clipboard" />,
  DollarSign: () => <span data-testid="icon-dollar" />,
  FileText: () => <span data-testid="icon-filetext" />,
  Plus: () => <span data-testid="icon-plus" />,
}));

// Mock shadcn DropdownMenu — render children directly so items are always visible
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
    <div>{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button onClick={onClick} data-testid="dropdown-item">
      {children}
    </button>
  ),
}));

// Mock shadcn Tooltip — render children directly
vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
    <>{children}</>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

describe('QuickAddFAB', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the FAB trigger button with aria-label', () => {
    mockPathname = '/dashboard';
    render(<QuickAddFAB />);
    expect(screen.getByRole('button', { name: /quick add/i })).toBeInTheDocument();
  });

  it('shows project actions when pathname includes /projects', () => {
    mockPathname = '/projects/123';
    render(<QuickAddFAB />);
    expect(screen.getByText('New Project')).toBeInTheDocument();
    expect(screen.getByText('Field Report')).toBeInTheDocument();
  });

  it('does not show Log Expense on project path', () => {
    mockPathname = '/projects';
    render(<QuickAddFAB />);
    expect(screen.queryByText('Log Expense')).not.toBeInTheDocument();
  });

  it('shows document actions when pathname includes /documents', () => {
    mockPathname = '/documents/all';
    render(<QuickAddFAB />);
    expect(screen.getByText('Upload File')).toBeInTheDocument();
  });

  it('shows only Upload File on documents path (not New Project or Log Expense)', () => {
    mockPathname = '/documents';
    render(<QuickAddFAB />);
    expect(screen.queryByText('New Project')).not.toBeInTheDocument();
    expect(screen.queryByText('Log Expense')).not.toBeInTheDocument();
    expect(screen.getByText('Upload File')).toBeInTheDocument();
  });

  it('shows default actions for other paths', () => {
    mockPathname = '/dashboard';
    render(<QuickAddFAB />);
    expect(screen.getByText('New Project')).toBeInTheDocument();
    expect(screen.getByText('Log Expense')).toBeInTheDocument();
    expect(screen.getByText('Upload File')).toBeInTheDocument();
  });

  it('shows default actions for unrecognized paths like /settings', () => {
    mockPathname = '/settings/billing';
    render(<QuickAddFAB />);
    expect(screen.getByText('Log Expense')).toBeInTheDocument();
  });

  it('works with org-prefixed path /org/test-org/projects/123', () => {
    mockPathname = '/org/test-org/projects/123';
    render(<QuickAddFAB />);
    expect(screen.getByText('New Project')).toBeInTheDocument();
    expect(screen.getByText('Field Report')).toBeInTheDocument();
    expect(screen.queryByText('Log Expense')).not.toBeInTheDocument();
  });

  it('works with org-prefixed path /org/test-org/documents', () => {
    mockPathname = '/org/test-org/documents';
    render(<QuickAddFAB />);
    expect(screen.getByText('Upload File')).toBeInTheDocument();
    expect(screen.queryByText('New Project')).not.toBeInTheDocument();
  });

  it('calls orgPush with correct href when project action is clicked', async () => {
    mockPathname = '/projects';
    render(<QuickAddFAB />);
    const newProjectBtn = screen.getByText('New Project');
    await userEvent.click(newProjectBtn);
    expect(mockPush).toHaveBeenCalledWith('/projects?new=true');
  });

  it('calls orgPush with correct href when Field Report is clicked', async () => {
    mockPathname = '/projects/abc';
    render(<QuickAddFAB />);
    const reportBtn = screen.getByText('Field Report');
    await userEvent.click(reportBtn);
    expect(mockPush).toHaveBeenCalledWith('/reports/new');
  });

  it('calls orgPush with correct href when Upload File is clicked on documents path', async () => {
    mockPathname = '/documents';
    render(<QuickAddFAB />);
    const uploadBtn = screen.getByText('Upload File');
    await userEvent.click(uploadBtn);
    expect(mockPush).toHaveBeenCalledWith('/documents?upload=true');
  });

  it('calls orgPush with correct href for Log Expense on default path', async () => {
    mockPathname = '/dashboard';
    render(<QuickAddFAB />);
    const expenseBtn = screen.getByText('Log Expense');
    await userEvent.click(expenseBtn);
    expect(mockPush).toHaveBeenCalledWith('/expenses/new');
  });
});
