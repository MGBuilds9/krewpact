import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

// Mock lucide-react so tests don't depend on SVG rendering
vi.mock('lucide-react', () => ({
  Construction: ({ className }: { className?: string }) => (
    <svg data-testid="construction-icon" className={className} />
  ),
}));

// Mock shadcn Card primitives
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
}));

// Mock isFeatureEnabled so tests control enabled/disabled state independently of flag values
vi.mock('@/lib/feature-flags', () => ({
  features: {},
  isFeatureEnabled: vi.fn((key: string) => key !== '__disabled_test_flag__'),
}));

import { FeatureGate } from '@/components/FeatureGate';
import { isFeatureEnabled } from '@/lib/feature-flags';

const mockIsFeatureEnabled = vi.mocked(isFeatureEnabled);

describe('FeatureGate', () => {
  it('shows children when feature is enabled', () => {
    mockIsFeatureEnabled.mockReturnValue(true);
    render(
      <FeatureGate feature="ai_suggestions" label="AI Suggestions">
        <div>Feature content</div>
      </FeatureGate>,
    );
    expect(screen.getByText('Feature content')).toBeDefined();
  });

  it('does not show ComingSoon when feature is enabled', () => {
    mockIsFeatureEnabled.mockReturnValue(true);
    render(
      <FeatureGate feature="ai_insights" label="AI Insights">
        <div>Insights content</div>
      </FeatureGate>,
    );
    expect(screen.queryByTestId('card')).toBeNull();
  });

  it('shows ComingSoon when feature is disabled', () => {
    mockIsFeatureEnabled.mockReturnValue(false);
    render(
      <FeatureGate feature="portals" label="Client Portals">
        <div>Portal content</div>
      </FeatureGate>,
    );
    expect(screen.queryByText('Portal content')).toBeNull();
    expect(screen.getByText('Client Portals')).toBeDefined();
  });

  it('shows the feature label in ComingSoon', () => {
    mockIsFeatureEnabled.mockReturnValue(false);
    render(
      <FeatureGate feature="finance" label="Finance Dashboard">
        <div>Finance</div>
      </FeatureGate>,
    );
    expect(screen.getByText('Finance Dashboard')).toBeDefined();
  });

  it('shows default description in ComingSoon when no description provided', () => {
    mockIsFeatureEnabled.mockReturnValue(false);
    render(
      <FeatureGate feature="schedule" label="Schedule">
        <div>Schedule</div>
      </FeatureGate>,
    );
    expect(
      screen.getByText('This feature is being prepared and will be available soon.'),
    ).toBeDefined();
  });

  it('shows custom description in ComingSoon when provided', () => {
    mockIsFeatureEnabled.mockReturnValue(false);
    render(
      <FeatureGate feature="bidding" label="Bidding" description="Bidding module launches Q3.">
        <div>Bidding content</div>
      </FeatureGate>,
    );
    expect(screen.getByText('Bidding module launches Q3.')).toBeDefined();
    expect(
      screen.queryByText('This feature is being prepared and will be available soon.'),
    ).toBeNull();
  });

  it('does not render broken output when feature key changes from disabled to enabled', () => {
    mockIsFeatureEnabled.mockReturnValue(false);
    const { rerender } = render(
      <FeatureGate feature="warranty" label="Warranty">
        <div>Warranty content</div>
      </FeatureGate>,
    );
    // Disabled — shows ComingSoon
    expect(screen.getByText('Warranty')).toBeDefined();
    expect(screen.queryByText('Warranty content')).toBeNull();

    // Switch to an enabled feature
    mockIsFeatureEnabled.mockReturnValue(true);
    rerender(
      <FeatureGate feature="ai_daily_digest" label="Daily Digest">
        <div>Digest content</div>
      </FeatureGate>,
    );
    expect(screen.getByText('Digest content')).toBeDefined();
    expect(screen.queryByText('Warranty')).toBeNull();
  });

  it('does not render broken output when feature key changes from enabled to disabled', () => {
    mockIsFeatureEnabled.mockReturnValue(true);
    const { rerender } = render(
      <FeatureGate feature="ai_suggestions" label="AI Suggestions">
        <div>Suggestions content</div>
      </FeatureGate>,
    );
    expect(screen.getByText('Suggestions content')).toBeDefined();

    mockIsFeatureEnabled.mockReturnValue(false);
    rerender(
      <FeatureGate feature="safety" label="Safety Module">
        <div>Safety content</div>
      </FeatureGate>,
    );
    expect(screen.queryByText('Suggestions content')).toBeNull();
    expect(screen.getByText('Safety Module')).toBeDefined();
    expect(screen.queryByText('Safety content')).toBeNull();
  });
});
