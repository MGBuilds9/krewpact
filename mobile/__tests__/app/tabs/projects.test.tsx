import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';
import ProjectsScreen from '@/app/(tabs)/projects';

const mockUseQuery = useQuery as jest.Mock;

describe('ProjectsScreen', () => {
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
    const { toJSON } = render(<ProjectsScreen />);
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
    render(<ProjectsScreen />);
    expect(screen.getByText(/Failed to load projects/i)).toBeTruthy();
  });

  it('renders Projects header', () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isFetching: false,
    });
    render(<ProjectsScreen />);
    expect(screen.getByText('Projects')).toBeTruthy();
  });

  it('renders empty state when no projects', () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isFetching: false,
    });
    render(<ProjectsScreen />);
    expect(screen.getByText('No projects found.')).toBeTruthy();
  });

  it('renders project cards with formatStatus applied', () => {
    mockUseQuery.mockReturnValue({
      data: [
        {
          id: '1',
          project_name: 'Bridge Renewal',
          project_number: 'P-101',
          status: 'on_hold',
          start_date: null,
          target_completion_date: null,
        },
        {
          id: '2',
          project_name: 'Tower Build',
          project_number: 'P-102',
          status: 'active',
          start_date: '2026-01-01',
          target_completion_date: '2026-06-30',
        },
      ],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isFetching: false,
    });
    render(<ProjectsScreen />);
    expect(screen.getByText('Bridge Renewal')).toBeTruthy();
    expect(screen.getByText('Tower Build')).toBeTruthy();
    expect(screen.getByText('on hold')).toBeTruthy();
    expect(screen.getByText('active')).toBeTruthy();
  });
});
