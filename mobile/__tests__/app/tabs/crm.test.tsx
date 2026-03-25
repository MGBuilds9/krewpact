import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';
import CRMScreen from '@/app/(tabs)/crm';

const mockUseQuery = useQuery as jest.Mock;

describe('CRMScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading indicator while fetching', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: jest.fn(),
      isFetching: true,
    });
    const { toJSON } = render(<CRMScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders error state', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: jest.fn(),
      isFetching: false,
    });
    render(<CRMScreen />);
    expect(screen.getByText(/Failed to load leads/i)).toBeTruthy();
  });

  it('renders CRM header', () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isFetching: false,
    });
    render(<CRMScreen />);
    expect(screen.getByText('CRM')).toBeTruthy();
  });

  it('renders empty state when no leads', () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isFetching: false,
    });
    render(<CRMScreen />);
    expect(screen.getByText('No leads found.')).toBeTruthy();
  });

  it('shows lead count', () => {
    const leads = [
      {
        id: '1',
        company_name: 'Acme Corp',
        status: 'new',
        city: 'Mississauga',
        province: 'ON',
        industry: 'Construction',
        source_channel: 'website',
        lead_score: 85,
      },
    ];
    mockUseQuery.mockReturnValue({
      data: leads,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isFetching: false,
    });
    render(<CRMScreen />);
    expect(screen.getByText('1 leads')).toBeTruthy();
  });

  it('renders lead cards with formatStatus applied', () => {
    mockUseQuery.mockReturnValue({
      data: [
        {
          id: '1',
          company_name: 'MDM Corp',
          status: 'qualified',
          city: null,
          province: null,
          industry: null,
          source_channel: null,
          lead_score: null,
        },
      ],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isFetching: false,
    });
    render(<CRMScreen />);
    expect(screen.getByText('MDM Corp')).toBeTruthy();
    expect(screen.getByText('qualified')).toBeTruthy();
  });

  it('renders unknown company fallback', () => {
    mockUseQuery.mockReturnValue({
      data: [
        {
          id: '2',
          company_name: null,
          status: 'new',
          city: null,
          province: null,
          industry: null,
          source_channel: null,
          lead_score: null,
        },
      ],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isFetching: false,
    });
    render(<CRMScreen />);
    expect(screen.getByText('Unknown Company')).toBeTruthy();
  });
});
