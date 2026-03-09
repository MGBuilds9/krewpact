import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorCard } from '@/components/ui/error-card';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('ErrorCard', () => {
  it('renders with default props', () => {
    const reset = vi.fn();
    render(<ErrorCard reset={reset} />);

    expect(screen.getByText('Something went wrong')).toBeDefined();
    expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeDefined();
    expect(screen.getByRole('button', { name: /try again/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /go home/i })).toBeDefined();
  });

  it('renders custom title and description', () => {
    const reset = vi.fn();
    render(
      <ErrorCard reset={reset} title="Custom Error" description="Something specific went wrong." />,
    );

    expect(screen.getByText('Custom Error')).toBeDefined();
    expect(screen.getByText('Something specific went wrong.')).toBeDefined();
  });

  it('shows error message when provided', () => {
    const reset = vi.fn();
    render(<ErrorCard reset={reset} errorMessage="Database connection failed" />);

    expect(screen.getByText('Database connection failed')).toBeDefined();
  });

  it('shows error digest when provided', () => {
    const reset = vi.fn();
    render(<ErrorCard reset={reset} errorDigest="abc123" />);

    expect(screen.getByText(/Error ID: abc123/)).toBeDefined();
  });

  it('calls reset when Try Again is clicked', () => {
    const reset = vi.fn();
    render(<ErrorCard reset={reset} />);

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it('renders Go Home link pointing to dashboard', () => {
    const reset = vi.fn();
    render(<ErrorCard reset={reset} />);

    const link = screen.getByRole('link', { name: /go home/i });
    expect(link.getAttribute('href')).toBe('/dashboard');
  });

  it('renders custom home href', () => {
    const reset = vi.fn();
    render(<ErrorCard reset={reset} homeHref="/portal" />);

    const link = screen.getByRole('link', { name: /go home/i });
    expect(link.getAttribute('href')).toBe('/portal');
  });

  it('hides error digest when not provided', () => {
    const reset = vi.fn();
    render(<ErrorCard reset={reset} />);

    expect(screen.queryByText(/Error ID:/)).toBeNull();
  });
});
