import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GlobalSearch } from '@/components/CRM/GlobalSearch';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('GlobalSearch', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('renders trigger button with Cmd+K shortcut', () => {
    render(<GlobalSearch />, { wrapper: createWrapper() });
    expect(screen.getByText('Search CRM...')).toBeInTheDocument();
    expect(screen.getByText('Cmd+K')).toBeInTheDocument();
  });

  it('opens modal on click', () => {
    render(<GlobalSearch />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Search CRM...'));
    expect(screen.getByPlaceholderText(/Search leads/i)).toBeInTheDocument();
  });

  it('opens modal on Cmd+K', () => {
    render(<GlobalSearch />, { wrapper: createWrapper() });
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.getByPlaceholderText(/Search leads/i)).toBeInTheDocument();
  });

  it('shows minimum characters message', () => {
    render(<GlobalSearch />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Search CRM...'));
    expect(screen.getByText(/Type at least 2 characters/i)).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    render(<GlobalSearch />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Search CRM...'));
    expect(screen.getByPlaceholderText(/Search leads/i)).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByText('Search CRM...')).toBeInTheDocument();
  });
});
