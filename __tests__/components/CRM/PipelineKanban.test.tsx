'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { Opportunity, PipelineData } from '@/hooks/useCRM';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/crm/opportunities',
  useParams: () => ({ orgSlug: 'test-org' }),
}));

// Mock useCRM hooks
vi.mock('@/hooks/useCRM', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useCRM')>();
  return {
    ...actual,
    useOpportunityStageTransition: () => ({ mutate: vi.fn(), isPending: false }),
  };
});

// Mock @dnd-kit/core — provide minimal implementations so the component renders without real DnD
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  closestCorners: vi.fn(),
  useSensor: vi.fn().mockReturnValue({}),
  useSensors: vi.fn().mockReturnValue([]),
  useDroppable: () => ({ isOver: false, setNodeRef: vi.fn() }),
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  }),
  PointerSensor: vi.fn(),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Translate: { toString: () => undefined } },
}));

import { PipelineKanban } from '@/components/CRM/PipelineKanban';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function makeOpp(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: 'opp-1',
    opportunity_name: 'Test Opportunity',
    lead_id: null,
    account_id: null,
    contact_id: null,
    division_id: null,
    stage: 'intake',
    target_close_date: null,
    estimated_revenue: 50000,
    probability_pct: 60,
    owner_user_id: null,
    created_at: '2026-02-12T10:00:00Z',
    updated_at: '2026-02-12T10:00:00Z',
    ...overrides,
  };
}

describe('PipelineKanban', () => {
  it('renders empty state when no stages', () => {
    const data: PipelineData = { stages: {} };

    render(
      <Wrapper>
        <PipelineKanban data={data} />
      </Wrapper>,
    );

    expect(screen.getByText('No opportunities in pipeline')).toBeInTheDocument();
    expect(
      screen.getByText('Create opportunities from your leads to see them here'),
    ).toBeInTheDocument();
  });

  it('renders stage columns with correct labels', () => {
    const data: PipelineData = {
      stages: {
        intake: { opportunities: [], total_value: 0, count: 0 },
        site_visit: { opportunities: [], total_value: 0, count: 0 },
        estimating: { opportunities: [], total_value: 0, count: 0 },
      },
    };

    render(
      <Wrapper>
        <PipelineKanban data={data} />
      </Wrapper>,
    );

    expect(screen.getByText('Intake')).toBeInTheDocument();
    expect(screen.getByText('Site Visit')).toBeInTheDocument();
    expect(screen.getByText('Estimating')).toBeInTheDocument();
  });

  it('shows opportunity cards in correct columns', () => {
    const opp1 = makeOpp({ id: 'opp-1', opportunity_name: 'Alpha Deal', stage: 'intake' });
    const opp2 = makeOpp({
      id: 'opp-2',
      opportunity_name: 'Beta Deal',
      stage: 'proposal',
      estimated_revenue: 75000,
    });

    const data: PipelineData = {
      stages: {
        intake: { opportunities: [opp1], total_value: 50000, count: 1 },
        proposal: { opportunities: [opp2], total_value: 75000, count: 1 },
      },
    };

    render(
      <Wrapper>
        <PipelineKanban data={data} />
      </Wrapper>,
    );

    expect(screen.getByText('Alpha Deal')).toBeInTheDocument();
    expect(screen.getByText('Beta Deal')).toBeInTheDocument();
  });

  it('displays weighted pipeline header', () => {
    const opp = makeOpp({
      id: 'opp-1',
      estimated_revenue: 100000,
      probability_pct: 50,
      stage: 'intake',
    });

    const data: PipelineData = {
      stages: {
        intake: { opportunities: [opp], total_value: 100000, count: 1 },
      },
    };

    render(
      <Wrapper>
        <PipelineKanban data={data} />
      </Wrapper>,
    );

    // WeightedPipelineHeader renders "Total Pipeline", "Weighted Pipeline", "Opportunities"
    expect(screen.getByText('Total Pipeline')).toBeInTheDocument();
    expect(screen.getByText('Weighted Pipeline')).toBeInTheDocument();
    expect(screen.getByText('Opportunities')).toBeInTheDocument();
    // $100,000.00 appears in header, column, and card — use getAllByText
    const totalMatches = screen.getAllByText('$100,000.00');
    expect(totalMatches.length).toBeGreaterThanOrEqual(1);
    // Opportunity count shown in header
    const countMatches = screen.getAllByText('1');
    expect(countMatches.length).toBeGreaterThanOrEqual(1);
  });

  it('shows deal count badges on columns', () => {
    const opp1 = makeOpp({ id: 'opp-1', stage: 'intake' });
    const opp2 = makeOpp({ id: 'opp-2', stage: 'intake', opportunity_name: 'Second Deal' });

    const data: PipelineData = {
      stages: {
        intake: { opportunities: [opp1, opp2], total_value: 100000, count: 2 },
        proposal: { opportunities: [], total_value: 0, count: 0 },
      },
    };

    render(
      <Wrapper>
        <PipelineKanban data={data} />
      </Wrapper>,
    );

    // The Badge in the intake column should show "2", proposal should show "0"
    const badges = screen.getAllByText('2');
    expect(badges.length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
