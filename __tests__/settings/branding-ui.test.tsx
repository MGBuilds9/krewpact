import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useParams: () => ({ orgSlug: 'test-org' }),
}));
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) =>
    React.createElement('img', { src: props.src as string, alt: props.alt as string }),
}));
vi.mock('@/components/shared/PageHeader', () => ({
  PageHeader: ({ title, description }: { title: string; description?: string }) =>
    React.createElement(
      'div',
      { 'data-testid': 'page-header' },
      React.createElement('h1', null, title),
      description && React.createElement('p', null, description),
    ),
}));
// Stable reference — avoids infinite useEffect re-render loop
const mockBrandingData = {
  branding: {
    company_name: 'Test Co',
    company_description: 'A test company',
    erp_company: 'Test Co ERP',
    footer_text: '© Test Co 2026',
    support_url: 'https://support.test.co',
    primary_color: '#2563eb',
    accent_color: '#f59e0b',
  },
};
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: mockBrandingData, isLoading: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import BrandingPageContent from '@/app/(dashboard)/org/[orgSlug]/settings/branding/_page-content';

describe('BrandingPageContent', () => {
  it('renders company_description field', () => {
    render(<BrandingPageContent />);
    expect(screen.getByLabelText('Company Description')).toBeInTheDocument();
  });

  it('renders erp_company field', () => {
    render(<BrandingPageContent />);
    expect(screen.getByLabelText('ERP Company Name')).toBeInTheDocument();
  });

  it('renders footer_text field', () => {
    render(<BrandingPageContent />);
    expect(screen.getByLabelText('Footer Text')).toBeInTheDocument();
  });

  it('renders support_url field', () => {
    render(<BrandingPageContent />);
    expect(screen.getByLabelText('Support URL')).toBeInTheDocument();
  });

  it('renders live preview card', () => {
    render(<BrandingPageContent />);
    expect(screen.getByText('Live Preview')).toBeInTheDocument();
  });
});
