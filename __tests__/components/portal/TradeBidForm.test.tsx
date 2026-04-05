'use client';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

// Mock tanstack query
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockUseQueryClient = vi.fn(() => ({
  invalidateQueries: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useQueryClient: () => mockUseQueryClient(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ orgSlug: 'test-org' }),
  useRouter: () => ({ push: vi.fn() }),
}));

import TradeBidsPage from '@/app/(portal)/portals/trade/bids/_page-content';

const mockProjects = [
  { id: 'proj-uuid-1', project_name: 'Harbour Bridge Rehab', project_number: 'P-001' },
  { id: 'proj-uuid-2', project_name: 'Westside Condo Tower', project_number: null },
];

function setupMocks({
  projectsLoading = false,
  projects = mockProjects,
  bidsLoading = false,
}: {
  projectsLoading?: boolean;
  projects?: typeof mockProjects;
  bidsLoading?: boolean;
} = {}) {
  mockUseQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === 'portal-projects') {
      return {
        data: projectsLoading ? undefined : { projects },
        isLoading: projectsLoading,
        isError: false,
      };
    }
    // portal-trade-bids
    return {
      data: bidsLoading ? undefined : { data: [], total: 0 },
      isLoading: bidsLoading,
      isError: false,
      refetch: vi.fn(),
    };
  });

  mockUseMutation.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  });
}

describe('TradeBidsPage — NewBidDialog', () => {
  it('renders the New Bid trigger button', () => {
    setupMocks();
    render(<TradeBidsPage />);
    expect(screen.getByRole('button', { name: /new bid/i })).toBeInTheDocument();
  });

  it('does NOT render a raw UUID placeholder input', async () => {
    setupMocks();
    render(<TradeBidsPage />);

    await userEvent.click(screen.getByRole('button', { name: /new bid/i }));

    // UUID input placeholder must not exist
    expect(
      screen.queryByPlaceholderText('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'),
    ).not.toBeInTheDocument();
  });

  it('renders a project select with options after opening the dialog', async () => {
    setupMocks();
    render(<TradeBidsPage />);

    await userEvent.click(screen.getByRole('button', { name: /new bid/i }));

    // Wait for the select trigger to appear
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  it('shows a skeleton while projects are loading', async () => {
    setupMocks({ projectsLoading: true });
    render(<TradeBidsPage />);

    await userEvent.click(screen.getByRole('button', { name: /new bid/i }));

    // No combobox yet — skeleton shown instead
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('disables submit while projects are loading', async () => {
    setupMocks({ projectsLoading: true });
    render(<TradeBidsPage />);

    await userEvent.click(screen.getByRole('button', { name: /new bid/i }));

    const submitBtn = screen.getByRole('button', { name: /submit bid/i });
    expect(submitBtn).toBeDisabled();
  });

  it('disables submit when no projects are available', async () => {
    setupMocks({ projects: [] });
    render(<TradeBidsPage />);

    await userEvent.click(screen.getByRole('button', { name: /new bid/i }));

    const submitBtn = screen.getByRole('button', { name: /submit bid/i });
    expect(submitBtn).toBeDisabled();
  });
});
