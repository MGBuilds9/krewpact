import { render, screen, waitFor } from '@testing-library/react';
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

describe('DailyDigestWidget', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders null (loading state) before fetch resolves', () => {
    // fetch never resolves — component stays hidden
    vi.spyOn(global, 'fetch').mockReturnValue(new Promise(() => {}));

    const { container } = render(<DailyDigestWidget />);

    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when API returns no digest', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ digest: null }), { status: 200 }),
    );

    const { container } = render(<DailyDigestWidget />);

    await waitFor(() => {
      // fetch settled but digest is null → component stays hidden
      expect(container.firstChild).toBeNull();
    });
  });

  it('renders digest summary after successful fetch', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ digest: mockDigest }), { status: 200 }),
    );

    render(<DailyDigestWidget />);

    expect(
      await screen.findByText(
        'You have 3 active projects and 2 overdue tasks requiring attention.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Daily Brief')).toBeInTheDocument();
  });

  it('renders expandable sections with items when expanded', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ digest: mockDigest }), { status: 200 }),
    );

    const user = userEvent.setup();
    render(<DailyDigestWidget />);

    // wait for card to appear
    await screen.findByText('Daily Brief');

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
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ digest: mockDigest }), { status: 200 }),
    );

    const user = userEvent.setup();
    render(<DailyDigestWidget />);

    await screen.findByText('Daily Brief');

    const expandBtn = screen.getByRole('button', { name: /expand digest/i });
    await user.click(expandBtn);

    expect(screen.getByText('Projects')).toBeInTheDocument();

    const collapseBtn = screen.getByRole('button', { name: /collapse digest/i });
    await user.click(collapseBtn);

    expect(screen.queryByText('Projects')).not.toBeInTheDocument();
  });

  it('renders nothing when API returns a non-ok response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('Internal Server Error', { status: 500 }),
    );

    const { container } = render(<DailyDigestWidget />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('renders nothing when fetch throws a network error', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network failure'));

    const { container } = render(<DailyDigestWidget />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('fetches from the correct endpoint', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ digest: mockDigest }), { status: 200 }));

    render(<DailyDigestWidget />);
    await screen.findByText('Daily Brief');

    expect(fetchSpy).toHaveBeenCalledWith('/api/ai/digest');
  });
});
