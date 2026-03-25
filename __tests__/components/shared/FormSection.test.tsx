import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { FormSection } from '@/components/shared/FormSection';

describe('FormSection', () => {
  it('renders the section title', () => {
    render(
      <FormSection title="Contact Information">
        <input placeholder="Email" />
      </FormSection>,
    );
    expect(screen.getByText('Contact Information')).toBeDefined();
  });

  it('renders description when provided', () => {
    render(
      <FormSection title="Billing" description="Enter your billing address.">
        <input />
      </FormSection>,
    );
    expect(screen.getByText('Enter your billing address.')).toBeDefined();
  });

  it('does not render description when omitted', () => {
    render(
      <FormSection title="Details">
        <input />
      </FormSection>,
    );
    expect(screen.queryByText('Enter')).toBeNull();
  });

  it('renders children inside the section', () => {
    render(
      <FormSection title="Info">
        <input data-testid="field-one" />
        <input data-testid="field-two" />
      </FormSection>,
    );
    expect(screen.getByTestId('field-one')).toBeDefined();
    expect(screen.getByTestId('field-two')).toBeDefined();
  });

  it('applies custom className', () => {
    const { container } = render(
      <FormSection title="Section" className="custom-section">
        <span />
      </FormSection>,
    );
    expect(container.firstElementChild?.className).toContain('custom-section');
  });

  it('uses a fieldset element for semantic grouping', () => {
    const { container } = render(
      <FormSection title="Group">
        <input />
      </FormSection>,
    );
    expect(container.querySelector('fieldset')).toBeDefined();
  });

  it('uses a legend element for the title', () => {
    render(
      <FormSection title="My Legend">
        <input />
      </FormSection>,
    );
    expect(screen.getByText('My Legend').tagName.toLowerCase()).toBe('legend');
  });
});
