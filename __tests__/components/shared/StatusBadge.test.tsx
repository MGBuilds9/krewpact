import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { StatusBadge } from '@/components/shared/StatusBadge';

describe('StatusBadge', () => {
  it('renders formatted status text', () => {
    render(<StatusBadge status="in_progress" />);
    expect(screen.getByText('In Progress')).toBeDefined();
  });

  it('renders active status', () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText('Active')).toBeDefined();
  });

  it('renders pending status', () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText('Pending')).toBeDefined();
  });

  it('renders rejected status', () => {
    render(<StatusBadge status="rejected" />);
    expect(screen.getByText('Rejected')).toBeDefined();
  });

  it('renders cancelled status', () => {
    render(<StatusBadge status="cancelled" />);
    expect(screen.getByText('Cancelled')).toBeDefined();
  });

  it('formats multi-word snake_case status', () => {
    render(<StatusBadge status="awaiting_signature" />);
    expect(screen.getByText('Awaiting Signature')).toBeDefined();
  });

  it('accepts a variant override', () => {
    const { container } = render(<StatusBadge status="active" variant="destructive" />);
    // The badge should render; variant override accepted without error
    expect(container.firstElementChild).toBeDefined();
  });

  it('applies custom className', () => {
    const { container } = render(<StatusBadge status="active" className="test-class" />);
    expect(container.firstElementChild?.className).toContain('test-class');
  });

  it('renders unknown status with formatStatus applied', () => {
    render(<StatusBadge status="custom_value" />);
    expect(screen.getByText('Custom Value')).toBeDefined();
  });
});
