import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { PageHeader } from '@/components/shared/PageHeader';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe('PageHeader', () => {
  it('renders the title', () => {
    render(<PageHeader title="Projects" />);
    expect(screen.getByText('Projects')).toBeDefined();
  });

  it('renders the description when provided', () => {
    render(<PageHeader title="CRM" description="Manage your leads and opportunities." />);
    expect(screen.getByText('Manage your leads and opportunities.')).toBeDefined();
  });

  it('does not render description when omitted', () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.queryByText('Manage')).toBeNull();
  });

  it('renders an action node when provided', () => {
    render(<PageHeader title="Projects" action={<button>New Project</button>} />);
    expect(screen.getByRole('button', { name: 'New Project' })).toBeDefined();
  });

  it('renders a back link when backHref is provided', () => {
    render(<PageHeader title="Edit Project" backHref="/projects" />);
    const backLink = screen.getByRole('link');
    expect(backLink.getAttribute('href')).toBe('/projects');
  });

  it('does not render a back link when backHref is omitted', () => {
    render(<PageHeader title="Projects" />);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('applies className to the wrapper element', () => {
    const { container } = render(<PageHeader title="Test" className="custom-class" />);
    expect(container.firstChild?.toString()).toBeDefined();
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain('custom-class');
  });
});
