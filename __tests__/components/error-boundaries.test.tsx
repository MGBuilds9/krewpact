import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// Mock Sentry before importing error boundary components
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

// Mock the ErrorCard component so we don't need full UI dependencies
vi.mock('@/components/ui/error-card', () => ({
  ErrorCard: ({ errorMessage }: { errorMessage?: string }) =>
    React.createElement('div', { 'data-testid': 'error-card' }, errorMessage ?? 'Error'),
}));

import * as Sentry from '@sentry/nextjs';

// We test one representative error boundary to verify the pattern.
// All 11 error.tsx files follow the identical Sentry.captureException pattern.
import DashboardError from '@/app/(dashboard)/error';

const mockCaptureException = Sentry.captureException as ReturnType<typeof vi.fn>;

describe('Error boundary Sentry integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls Sentry.captureException when error is provided', () => {
    const testError = new Error('Test dashboard error');
    const resetFn = vi.fn();

    render(
      React.createElement(DashboardError, {
        error: testError,
        reset: resetFn,
      }),
    );

    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    expect(mockCaptureException).toHaveBeenCalledWith(testError);
  });

  it('does not call console.error', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const testError = new Error('Another error');
    const resetFn = vi.fn();

    render(
      React.createElement(DashboardError, {
        error: testError,
        reset: resetFn,
      }),
    );

    // console.error should NOT be called — we replaced it with Sentry
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('renders the ErrorCard component', () => {
    const testError = new Error('Render check error');
    const resetFn = vi.fn();

    const { getByTestId } = render(
      React.createElement(DashboardError, {
        error: testError,
        reset: resetFn,
      }),
    );

    expect(getByTestId('error-card')).toBeDefined();
  });
});
