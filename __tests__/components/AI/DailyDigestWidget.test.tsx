import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DailyDigestWidget } from '@/components/AI/DailyDigestWidget';

const mockDigest = {
  id: 'digest-001',
  summary: 'You have 3 active projects and 2 overdue tasks requiring attention.',
  digest_date: '2026-03-12',
  sections: [
    {
      title: 'Projects',
      items: [
        { label: 'Oakville Renovation', value: '85%' },
        { label: 'Mississauga Commercial', value: '42%', url: '/projects/2' },
      ],
    },
    {
      title: 'CRM',
      items: [{ label: 'Open Leads', value: '7' }],
    },
  ],
};

const mockUseDigest = vi.fn();

vi.mock('@/hooks/use-ai', () => ({
  useDigest: () => mockUseDigest(),
}));

describe('DailyDigestWidget', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockUseDigest.mockReturnValue({ data: null, isLoading: false });
  });

  it('renders null when digest is not available', () => {
    mockUseDigest.mockReturnValue({ data: null, isLoading: true });

    const { container } = render(<DailyDigestWidget />);

    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when hook returns null digest', () => {
    mockUseDigest.mockReturnValue({ data: null, isLoading: false });

    const { container } = render(<DailyDigestWidget />);

    expect(container.firstChild).toBeNull();
  });

  it('renders digest summary when data is available', () => {
    mockUseDigest.mockReturnValue({ data: mockDigest, isLoading: false });

    render(<DailyDigestWidget />);

    expect(
      screen.getByText('You have 3 active projects and 2 overdue tasks requiring attention.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Daily Brief')).toBeInTheDocument();
  });

  it('renders expandable sections with items when expanded', async () => {
    mockUseDigest.mockReturnValue({ data: mockDigest, isLoading: false });

    const user = userEvent.setup();
    render(<DailyDigestWidget />);

    // sections not visible yet (collapsed by default)
    expect(screen.queryByText('Projects')).not.toBeInTheDocument();

    // click expand button
    const expandBtn = screen.getByRole('button', { name: /expand digest/i });
    await user.click(expandBtn);

    // section titles appear
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('CRM')).toBeInTheDocument();

    // items inside sections
    expect(screen.getByText('Oakville Renovation')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Mississauga Commercial')).toBeInTheDocument();
    expect(screen.getByText('42%')).toBeInTheDocument();
    expect(screen.getByText('Open Leads')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('collapses sections when expand button is clicked again', async () => {
    mockUseDigest.mockReturnValue({ data: mockDigest, isLoading: false });

    const user = userEvent.setup();
    render(<DailyDigestWidget />);

    const expandBtn = screen.getByRole('button', { name: /expand digest/i });
    await user.click(expandBtn);

    expect(screen.getByText('Projects')).toBeInTheDocument();

    const collapseBtn = screen.getByRole('button', { name: /collapse digest/i });
    await user.click(collapseBtn);

    expect(screen.queryByText('Projects')).not.toBeInTheDocument();
  });

  it('renders nothing when hook returns undefined', () => {
    mockUseDigest.mockReturnValue({ data: undefined, isLoading: false });

    const { container } = render(<DailyDigestWidget />);

    expect(container.firstChild).toBeNull();
  });
});
