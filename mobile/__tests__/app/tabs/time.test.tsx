import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TimeScreen from '@/app/(tabs)/time';

const mockUseQuery = useQuery as jest.Mock;
const mockUseMutation = useMutation as jest.Mock;
const mockUseQueryClient = useQueryClient as jest.Mock;

describe('TimeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQueryClient.mockReturnValue({ invalidateQueries: jest.fn() });
    mockUseMutation.mockReturnValue({ mutate: jest.fn(), isPending: false });
  });

  it('renders the Time Tracking header', () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isFetching: false,
    });
    render(<TimeScreen />);
    expect(screen.getByText('Time Tracking')).toBeTruthy();
  });

  it('renders project selector label', () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isFetching: false,
    });
    render(<TimeScreen />);
    expect(screen.getByText('Select Project')).toBeTruthy();
  });

  it('renders loading indicator when projects are loading', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: jest.fn(),
      isFetching: true,
    });
    const { toJSON } = render(<TimeScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('shows no projects available when list is empty', () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isFetching: false,
    });
    render(<TimeScreen />);
    expect(screen.getByText('No projects available.')).toBeTruthy();
  });

  it('renders project chips when projects are available', () => {
    mockUseQuery.mockReturnValue({
      data: [
        { id: 'p1', project_name: 'Telecom Build', project_number: 'T-001', status: 'active', start_date: null, target_completion_date: null },
      ],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
      isFetching: false,
    });
    render(<TimeScreen />);
    expect(screen.getByText('Telecom Build')).toBeTruthy();
    expect(screen.getByText('T-001')).toBeTruthy();
  });
});
