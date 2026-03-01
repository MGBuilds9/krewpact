import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EmailAnalyticsCard } from '@/components/CRM/EmailAnalyticsCard';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('EmailAnalyticsCard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            total_sent: 0,
            total_opened: 0,
            total_clicked: 0,
            total_replied: 0,
            open_rate: 0,
            click_rate: 0,
            reply_rate: 0,
          },
        }),
      ),
    );

    render(<EmailAnalyticsCard />, { wrapper: createWrapper() });
    // Loading state shows skeleton cards
    const cards = document.querySelectorAll('.animate-pulse');
    expect(cards.length).toBe(4);
  });

  it('renders metrics after data loads', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            total_sent: 150,
            total_opened: 45,
            total_clicked: 12,
            total_replied: 5,
            open_rate: 30.0,
            click_rate: 8.0,
            reply_rate: 3.3,
          },
        }),
      ),
    );

    render(<EmailAnalyticsCard />, { wrapper: createWrapper() });

    expect(await screen.findByText('150')).toBeInTheDocument();
    expect(await screen.findByText('45')).toBeInTheDocument();
    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(await screen.findByText('5')).toBeInTheDocument();
  });

  it('renders rate percentages', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            total_sent: 100,
            total_opened: 30,
            total_clicked: 8,
            total_replied: 3,
            open_rate: 30.0,
            click_rate: 8.0,
            reply_rate: 3.0,
          },
        }),
      ),
    );

    render(<EmailAnalyticsCard />, { wrapper: createWrapper() });

    expect(await screen.findByText('30%')).toBeInTheDocument();
    expect(await screen.findByText('8%')).toBeInTheDocument();
    expect(await screen.findByText('3%')).toBeInTheDocument();
  });

  it('passes templateId as query param', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            total_sent: 10,
            total_opened: 3,
            total_clicked: 1,
            total_replied: 0,
            open_rate: 30,
            click_rate: 10,
            reply_rate: 0,
          },
        }),
      ),
    );

    render(<EmailAnalyticsCard templateId="tpl-123" />, {
      wrapper: createWrapper(),
    });

    await screen.findByText('10');

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain('template_id=tpl-123');
  });
});
